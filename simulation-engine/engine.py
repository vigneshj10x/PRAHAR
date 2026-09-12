"""
simulation-engine/engine.py

Reduced-Order Thermal Simulation Engine for THERMO-SHIELD.
Lumped-Parameter Resistance-Capacitance (RC) Transient Solver.

Physics formulation:
  - Multi-layer 1D conduction with ISO 6946 standard surface film resistances.
  - Directional Sol-Air exterior boundary conditions with directional solar irradiation.
  - Latitude-based vertical south surface tilt factor for winter design days.
  - Fenestration solar heat gain coefficient (SHGC) transmitted radiation.
  - Ground-coupling thermal model for bermed / trench shelter morphologies.
  - Altitude-dependent longwave sky radiation correction.
  - Infiltration and natural air exchange.
  - Nonlinear Phase Change Material (PCM) latent heat buffer via apparent heat capacity method.
  - Greenhouse longwave trapping for polyethylene-covered structures.
  - Humidity-dependent latent heat exchange.
  - Numerical integration with 48h periodic pre-conditioning spin-up.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
import math

try:
    from simulation_engine.materials import materials_db, Material
    from simulation_engine.geometry import calculate_geometry, EnvelopeGeometry
except ImportError:
    from materials import materials_db, Material
    from geometry import calculate_geometry, EnvelopeGeometry


@dataclass
class ClimateInput:
    """Hourly 24-hour climate profile and site conditions."""
    lat: float = 34.1526
    lon: float = 77.5771
    altitude: float = 3524.0                     # meters
    hourly_outdoor_temp: List[float] = field(default_factory=list) # 24 points (°C)
    hourly_solar_radiation: List[float] = field(default_factory=list) # 24 points global horizontal (W/m²)
    hourly_south_solar_rad: Optional[List[float]] = None # 24 points vertical south (W/m²)
    wind_speed: float = 3.5                      # m/s
    humidity_pct: float = 30.0                   # %

    def __post_init__(self):
        if not self.hourly_outdoor_temp:
            # Default Leh winter design day (-18°C night to -8°C day)
            self.hourly_outdoor_temp = [
                -18.0, -18.6, -19.0, -19.2, -19.4, -19.5,
                -18.8, -17.2, -14.5, -11.8, -9.5,  -8.4,
                -8.0,  -8.2,  -9.0,  -10.5, -12.4, -14.2,
                -15.5, -16.3, -16.9, -17.3, -17.6, -17.8
            ]
        if not self.hourly_solar_radiation:
            # Clear winter sky solar irradiance curve peaking at ~520 W/m²
            self.hourly_solar_radiation = [
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                15.0, 80.0, 210.0, 360.0, 480.0, 520.0,
                510.0, 440.0, 310.0, 150.0, 35.0, 0.0,
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0
            ]
        if self.hourly_south_solar_rad is None:
            # Latitude-based vertical south surface tilt factor for winter design day.
            lat_abs = abs(self.lat)
            solar_noon_alt = max(10.0, 90.0 - lat_abs - 23.45)
            f_tilt = max(1.0, min(3.0, 1.0 / max(0.25, math.tan(math.radians(solar_noon_alt)))))
            self.hourly_south_solar_rad = [r * f_tilt if r > 0 else 0.0 for r in self.hourly_solar_radiation]


@dataclass
class SimulationParams:
    """Input parameters matching docs/api-contract.md."""
    shape: str = "rectangular"
    orientation: float = 180.0                   # degrees (180 = South)
    wall_material: str = "adobe"
    roof_material: str = "timber_insulated_roof"
    glazing_material: str = "glazing_low_e"      # 'glazing_low_e' | 'polyethylene_sheet'
    insulation: float = 100.0                    # mm
    opening: float = 14.0                        # % aperture on south wall (5% to 28% for shelters, up to 95% in greenhouse_mode)
    thermal_mass: str = "high"                   # 'low' | 'medium' | 'high'
    length: float = 6.0                          # meters
    width: float = 4.0                           # meters
    height: float = 2.5                          # meters
    internal_gain_w: float = 220.0               # Occupants + minimal equipment (W)
    ach: float = 0.5                             # Air changes per hour
    greenhouse_mode: bool = False                # High-glazing experimental mode for agricultural validation only (up to 95% aperture)


@dataclass
class HourlyPoint:
    time: str
    hour: int
    temp: float          # Indoor temperature (°C)
    outdoor_temp: float  # Ambient temperature (°C)
    solar_rad: float     # Solar irradiance (W/m²)
    heat_flux: float     # Net heat flux (W/m²)


@dataclass
class SimulationResult:
    """Complete simulation output matching docs/api-contract.md."""
    u_value: float                               # Overall envelope U-value (W/m²·K)
    indoor_temp_series: List[HourlyPoint]        # 24-hour hourly series
    mean_indoor_temp: float                      # 24h average indoor temp (°C)
    min_indoor_temp: float                       # Min indoor temp (°C)
    max_indoor_temp: float                       # Max indoor temp (°C)
    solar_gain: float                            # Average solar thermal gain (W/m²)
    heat_loss: float                             # Average fabric + infiltration loss (W/m², negative)
    heating_demand: float                        # kWh/day required for 18°C setpoint
    comfort_percent: float                       # % of day within comfort band (18°C - 24°C)
    comfort_hours_5c: float                      # Hours per day above emergency survivability threshold (>5°C)
    weight: float                                # Total envelope weight (kg)
    cost: float                                  # Total estimated envelope cost (INR ₹)
    carbon_footprint: float                      # Total embodied carbon (kg CO2e)
    estimated: bool = False                      # False for physical simulation solver


class ReducedOrderThermalModel:
    """
    RC-Network Lumped Parameter Thermal Solver.
    Enhanced with ground-coupling, latitude-based solar, altitude-dependent
    longwave, greenhouse trapping, and humidity-dependent latent heat.
    """

    # Surface film heat transfer resistances (ISO 6946)
    R_SI = 0.13  # Internal surface film resistance (m²·K/W)
    R_SE = 0.04  # External surface film resistance (m²·K/W)
    AIR_DENSITY_SEA_LEVEL = 1.204  # kg/m³
    AIR_CP = 1005.0                # J/(kg·K)
    EPS_CONDUCTIVITY = 0.035       # High-density EPS insulation (W/m·K)

    # Ground-coupling parameters (CIBSE Guide A, EN ISO 13370)
    SOIL_CONDUCTIVITY = 1.5        # W/(m·K) — typical Himalayan rocky/gravel soil
    SOIL_DEPTH = 2.0               # m — depth to undisturbed ground temperature
    GROUND_TEMP_OFFSET = 2.0       # °C — ground temp ≈ annual_mean_air + offset (geothermal)

    # Shapes that are partially or fully earth-coupled
    GROUND_COUPLED_SHAPES = (
        "bunker_bermed", "igloo_catenary",
    )

    def __init__(self, params: SimulationParams, climate: ClimateInput):
        self.params = params
        self.climate = climate
        self.geometry = calculate_geometry(
            shape=params.shape,
            length=params.length,
            width=params.width,
            height=params.height,
            orientation_deg=params.orientation
        )

        # Retrieve materials from database
        self.wall_mat = materials_db.get(params.wall_material) or materials_db.get("concrete") or Material("concrete", "Concrete", "wall", 1.58, 2400.0, 1000.0, 150.0, 0.90, 0.65, None, None, 2400.0, 360.0, 0.15)
        self.roof_mat = materials_db.get(params.roof_material) or materials_db.get("timber_insulated_roof") or Material("timber_roof", "Timber", "roof", 0.12, 550.0, 1600.0, 120.0, 0.90, 0.60, None, None, 2800.0, 45.0, -0.45)
        self.eps_mat  = materials_db.get("eps_insulation") or Material("eps_insulation", "EPS", "insulation", 0.035, 24.0, 1300.0, 100.0, 0.90, 0.20, None, None, 650.0, 2.4, 3.30)
        self.glazing_mat = materials_db.get(getattr(params, "glazing_material", "glazing_low_e")) or materials_db.get("glazing_low_e")

        if self.glazing_mat and (self.glazing_mat.id in ("polyethylene_sheet", "agri_film") or "polyethylene" in self.glazing_mat.name.lower()):
            self.glazing_u_value = 5.80
            self.glazing_shgc = 0.87
        else:
            self.glazing_u_value = 1.40
            self.glazing_shgc = 0.58

        alt = max(0.0, climate.altitude)
        self.air_density = self.AIR_DENSITY_SEA_LEVEL * math.exp(-alt / 8500.0)
        self.longwave_alt_factor = math.exp(-alt / 8500.0)

        self.is_ground_coupled = params.shape in self.GROUND_COUPLED_SHAPES
        annual_mean_air = sum(climate.hourly_outdoor_temp) / len(climate.hourly_outdoor_temp)
        self.ground_temp = annual_mean_air + self.GROUND_TEMP_OFFSET
        if climate.altitude > 2000.0:
            self.ground_temp = max(self.ground_temp, 2.0)
        self.r_ground = self.SOIL_DEPTH / self.SOIL_CONDUCTIVITY
        self.u_ground = 1.0 / (self.R_SI + self.r_ground)

        if self.glazing_mat and self.glazing_mat.id in ("polyethylene_sheet", "agri_film"):
            self.ir_trapping_factor = 0.70
        else:
            self.ir_trapping_factor = 0.90

        if self.is_ground_coupled:
            self.ground_contact_frac = 0.55
        else:
            self.ground_contact_frac = 0.0

    def calculate_u_values(self) -> Tuple[float, float, float, float]:
        t_wall_m = self.wall_mat.thickness_m
        k_wall = max(0.001, self.wall_mat.thermal_conductivity)
        r_wall_substrate = t_wall_m / k_wall

        t_ins_m = max(0.0, self.params.insulation / 1000.0)
        k_ins = self.EPS_CONDUCTIVITY
        r_ins = t_ins_m / k_ins if t_ins_m > 0 else 0.0

        r_wall_total = self.R_SI + r_wall_substrate + r_ins + self.R_SE
        u_wall = 1.0 / max(0.05, r_wall_total)

        t_roof_m = self.roof_mat.thickness_m
        k_roof = max(0.001, self.roof_mat.thermal_conductivity)
        r_roof_substrate = t_roof_m / k_roof
        r_roof_ins = (t_ins_m * 1.25) / k_ins if t_ins_m > 0 else 0.0

        r_roof_total = self.R_SI + r_roof_substrate + r_roof_ins + self.R_SE
        u_roof = 1.0 / max(0.05, r_roof_total)

        u_glaze = self.glazing_u_value

        is_greenhouse = getattr(self.params, "greenhouse_mode", False)
        max_op = 0.95 if is_greenhouse else 0.28
        opening_frac = max(0.05, min(max_op, self.params.opening / 100.0))

        if is_greenhouse and self.params.shape in ("bunker_bermed", "monopitch"):
            slope_aperture = self.params.length * math.sqrt(self.params.width ** 2 + self.params.height ** 2)
            glazing_area = slope_aperture * opening_frac
            opaque_wall_area = max(0.1, self.geometry.wall_area_total)
            roof_area = max(0.0, self.geometry.roof_area - glazing_area)
        else:
            glazing_area = self.geometry.south_facing_area * opening_frac
            opaque_wall_area = max(1.0, self.geometry.wall_area_total - glazing_area)
            roof_area = self.geometry.roof_area

        total_shell_area = opaque_wall_area + roof_area + glazing_area
        u_overall = (
            (u_wall * opaque_wall_area) +
            (u_roof * roof_area) +
            (u_glaze * glazing_area)
        ) / total_shell_area

        return u_wall, u_roof, u_glaze, u_overall

    def calculate_thermal_capacitance(self, _u_wall: float) -> Tuple[float, float, float]:
        vol = self.geometry.volume
        c_air = vol * self.air_density * self.AIR_CP

        if self.wall_mat.density > 1500.0:
            d_eff_m = min(0.12, self.wall_mat.thickness_m * 0.40)
        elif self.wall_mat.density > 500.0:
            d_eff_m = min(0.08, self.wall_mat.thickness_m * 0.35)
        else:
            d_eff_m = min(0.05, self.wall_mat.thickness_m)

        internal_wall_area = self.geometry.wall_area_total
        mass_wall_active = internal_wall_area * d_eff_m * self.wall_mat.density

        if self.is_ground_coupled:
            floor_mass = self.geometry.floor_area * 0.20 * 2000.0
            mass_wall_active += floor_mass

        mass_scale = {
            "low": 1.0,
            "medium": 1.75,
            "high": 2.5
        }.get(str(self.params.thermal_mass).lower(), 1.5)

        c_solid = mass_wall_active * self.wall_mat.specific_heat * mass_scale

        mass_pcm_kg = 0.0
        if self.wall_mat.is_pcm:
            mass_pcm_kg = internal_wall_area * self.wall_mat.thickness_m * self.wall_mat.density

        return c_air, c_solid, mass_pcm_kg

    def solve(self) -> SimulationResult:
        u_wall, u_roof, u_glaze, u_overall = self.calculate_u_values()
        c_air, c_solid, mass_pcm_kg = self.calculate_thermal_capacitance(u_wall)
        c_total_sensible = c_air + c_solid

        is_greenhouse = getattr(self.params, "greenhouse_mode", False)
        max_op = 0.95 if is_greenhouse else 0.28
        opening_frac = max(0.05, min(max_op, self.params.opening / 100.0))

        if is_greenhouse and self.params.shape in ("bunker_bermed", "monopitch"):
            slope_aperture = self.params.length * math.sqrt(self.params.width ** 2 + self.params.height ** 2)
            glazing_area = slope_aperture * opening_frac
            opaque_south_wall = max(0.0, self.geometry.south_facing_area)
            opaque_other_walls = max(0.0, self.geometry.wall_area_total - self.geometry.south_facing_area)
            roof_area = max(0.0, self.geometry.roof_area - glazing_area)
        else:
            glazing_area = self.geometry.south_facing_area * opening_frac
            opaque_south_wall = max(0.0, self.geometry.south_facing_area - glazing_area)
            opaque_other_walls = max(0.0, self.geometry.wall_area_total - self.geometry.south_facing_area)
            roof_area = self.geometry.roof_area

        dt_sec = 60.0
        total_hours = 72
        total_steps = int((total_hours * 3600) / dt_sec)

        t_current = self.climate.hourly_outdoor_temp[0] + 5.0

        hourly_results: List[HourlyPoint] = []
        heat_losses: List[float] = []
        solar_gains: List[float] = []
        heating_demands: List[float] = []
        comfort_count = 0
        comfort_5c_count = 0

        for step in range(total_steps):
            current_time_sec = step * dt_sec
            hour_index = int((current_time_sec / 3600.0) % 24)
            minute_in_hour = int((current_time_sec % 3600.0) / 60.0)

            t_out = self.climate.hourly_outdoor_temp[hour_index]
            g_horiz = self.climate.hourly_solar_radiation[hour_index]
            g_south = self.climate.hourly_south_solar_rad[hour_index] if self.climate.hourly_south_solar_rad else g_horiz * 1.35

            q_solar_glaze = glazing_area * self.glazing_shgc * g_south
            ir_trap = self.ir_trapping_factor

            alpha_wall = self.wall_mat.solar_absorptivity
            alpha_roof = self.roof_mat.solar_absorptivity
            h_e = 1.0 / self.R_SE
            lw_alt = self.longwave_alt_factor

            t_sol_south = t_out + (alpha_wall * g_south - 0.9 * 30.0 * lw_alt) / h_e
            t_sol_roof = t_out + (alpha_roof * g_horiz - 0.9 * 60.0 * lw_alt) / h_e
            t_sol_other = t_out + (alpha_wall * (g_horiz * 0.2) - 0.9 * 20.0 * lw_alt) / h_e

            delta_t_buoyant = max(0.0, t_current - t_out)
            t_avg_k = ((t_current + t_out) / 2.0) + 273.15

            if delta_t_buoyant > 0.1:
                c_d = 0.62
                h_stack = max(1.0, self.geometry.height * 0.6)
                a_vent = max(0.01 * self.geometry.floor_area, 0.05 * glazing_area)
                v_buoyancy_m3_s = c_d * a_vent * math.sqrt((2.0 * 9.81 * h_stack * delta_t_buoyant) / max(200.0, t_avg_k))
                ach_buoyancy = (v_buoyancy_m3_s * 3600.0) / max(1.0, self.geometry.volume)
                ach_effective = self.params.ach + min(8.0, ach_buoyancy)
            else:
                ach_effective = self.params.ach

            h_inf = (self.geometry.volume * ach_effective / 3600.0) * self.air_density * self.AIR_CP

            q_cond_south = u_wall * opaque_south_wall * (t_sol_south - t_current)
            q_cond_other = u_wall * opaque_other_walls * (t_sol_other - t_current)
            q_cond_roof  = u_roof * roof_area * (t_sol_roof - t_current)

            if t_current > t_out and ir_trap > 0:
                effective_glaze_u = u_glaze * (1.0 - ir_trap * 0.35)
            else:
                effective_glaze_u = u_glaze
            q_cond_glaze = effective_glaze_u * glazing_area * (t_out - t_current)

            q_inf = h_inf * (t_out - t_current)

            q_ground = 0.0
            if self.is_ground_coupled:
                ground_contact_area = self.geometry.floor_area + self.ground_contact_frac * self.geometry.wall_area_total
                q_ground = self.u_ground * ground_contact_area * (self.ground_temp - t_current)

            q_latent = 0.0
            if self.climate.humidity_pct > 60.0 and t_current > 24.0:
                q_latent = -0.5 * self.geometry.floor_area * (self.climate.humidity_pct - 60.0) / 40.0 * max(0.0, t_current - 24.0)

            q_net_envelope = q_cond_south + q_cond_other + q_cond_roof + q_cond_glaze + q_inf + q_ground + q_latent
            q_internal = self.params.internal_gain_w
            q_total_net = q_solar_glaze + q_net_envelope + q_internal

            c_pcm_dynamic = 0.0
            if mass_pcm_kg > 0 and self.wall_mat.pcm_melting_point is not None and self.wall_mat.pcm_latent_heat is not None:
                t_m = self.wall_mat.pcm_melting_point
                l_f_j = self.wall_mat.pcm_latent_heat * 1000.0
                sigma = 1.5
                gaussian_factor = (1.0 / (sigma * math.sqrt(2.0 * math.pi))) * math.exp(-0.5 * (((t_current - t_m) / sigma) ** 2))
                c_pcm_dynamic = mass_pcm_kg * l_f_j * gaussian_factor

            c_effective = c_total_sensible + c_pcm_dynamic

            dt_indoor = (q_total_net / c_effective) * dt_sec
            t_current += dt_indoor

            if step >= int((48 * 3600) / dt_sec) and minute_in_hour == 0:
                heat_loss_flux = (q_cond_south + q_cond_other + q_cond_roof + q_cond_glaze + q_inf) / max(1.0, self.geometry.envelope_area)
                solar_gain_flux = (q_solar_glaze + (alpha_wall * g_south * opaque_south_wall / h_e * u_wall)) / max(1.0, self.geometry.envelope_area)
                net_flux = q_total_net / max(1.0, self.geometry.envelope_area)

                ua_total = (u_wall * (opaque_south_wall + opaque_other_walls)) + (u_roof * roof_area) + (u_glaze * glazing_area) + h_inf
                q_loss_at_setpoint_w = ua_total * (18.0 - t_out)
                q_aux_heat_w = max(0.0, q_loss_at_setpoint_w - q_solar_glaze - q_internal)
                q_heat_kwh = (q_aux_heat_w * 1.0) / 1000.0

                time_str = f"{hour_index:02d}:00"
                hourly_results.append(HourlyPoint(
                    time=time_str,
                    hour=hour_index,
                    temp=round(t_current, 2),
                    outdoor_temp=round(t_out, 1),
                    solar_rad=round(g_south, 1),
                    heat_flux=round(net_flux, 1)
                ))

                heat_losses.append(heat_loss_flux)
                solar_gains.append(solar_gain_flux)
                heating_demands.append(q_heat_kwh)

                if 18.0 <= t_current <= 24.0:
                    comfort_count += 1
                if t_current >= 5.0:
                    comfort_5c_count += 1

        all_temps = [p.temp for p in hourly_results]
        mean_temp = sum(all_temps) / len(all_temps)
        min_temp = min(all_temps)
        max_temp = max(all_temps)
        avg_solar = sum(solar_gains) / len(solar_gains)
        avg_loss = sum(heat_losses) / len(heat_losses)
        total_heat_demand = sum(heating_demands)
        comfort_pct = (comfort_count / 24.0) * 100.0
        comfort_5c_hours = float(comfort_5c_count)

        shell_weight = (
            (self.wall_mat.weight * self.geometry.wall_area_total) +
            (self.roof_mat.weight * self.geometry.roof_area) +
            (self.eps_mat.weight * (self.params.insulation / 100.0) * self.geometry.envelope_area)
        )
        shell_cost = (
            (self.wall_mat.cost * self.geometry.wall_area_total) +
            (self.roof_mat.cost * self.geometry.roof_area) +
            (self.eps_mat.cost * (self.params.insulation / 100.0) * self.geometry.envelope_area)
        )
        carbon_factor_wall = self.wall_mat.carbon_factor or 0.2
        carbon_factor_roof = self.roof_mat.carbon_factor or 0.5
        shell_carbon = (
            (carbon_factor_wall * self.wall_mat.weight * self.geometry.wall_area_total) +
            (carbon_factor_roof * self.roof_mat.weight * self.geometry.roof_area)
        )

        return SimulationResult(
            u_value=round(u_overall, 3),
            indoor_temp_series=hourly_results,
            mean_indoor_temp=round(mean_temp, 2),
            min_indoor_temp=round(min_temp, 2),
            max_indoor_temp=round(max_temp, 2),
            solar_gain=round(avg_solar, 1),
            heat_loss=round(avg_loss, 1),
            heating_demand=round(total_heat_demand, 2),
            comfort_percent=round(comfort_pct, 1),
            comfort_hours_5c=round(comfort_5c_hours, 1),
            weight=round(shell_weight, 1),
            cost=round(shell_cost, 0),
            carbon_footprint=round(shell_carbon, 1),
            estimated=False
        )


def simulate(params: Optional[SimulationParams] = None, climate: Optional[ClimateInput] = None) -> SimulationResult:
    """Primary API Entry Point."""
    if params is None:
        params = SimulationParams()
    if climate is None:
        climate = ClimateInput()

    model = ReducedOrderThermalModel(params=params, climate=climate)
    return model.solve()
