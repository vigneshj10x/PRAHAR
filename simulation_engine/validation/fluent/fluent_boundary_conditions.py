"""
simulation-engine/validation/fluent/fluent_boundary_conditions.py

Applies real physics boundary conditions to the Fluent mesh using our actual
climate data, envelope properties, and single-source-of-truth material database.

Boundary physics applied:
1. Exterior Envelope Walls (north, east, west, roof, south):
   - Convective cooling with Jurges correlation heat transfer coefficient (h_ext)
   - Envelope layer thermal resistances (ISO 6946: substrate, insulation, air films)
   - Equivalent combined U-values (U_wall, U_roof, U_south) + ventilation conductance (U_vent)
   - Free-stream ambient temperature from ClimateInput
2. South Wall (solar aperture / glazing):
   - Composite conductance factoring opaque wall + low-E window aperture
   - Solar flux scaled with orientation cosine factor: cos(10.5°) at Leh (34°N)
3. Interior Zone:
   - Total thermal energy input (transmitted solar gain + occupant metabolic heat)
     converted into a volumetric heat source (W/m³) in the interior fluid zone
4. Floor:
   - Adiabatic boundary (q = 0.0 W/m²)
"""

import json
import math
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger("fluent_boundary_conditions")


def load_material_properties(material_id: str) -> Dict[str, float]:
    """
    Reads thermal conductivity, density, specific heat, and absorptivity
    directly from materials.json single source of truth.
    """
    possible_paths = [
        Path(__file__).parent.parent.parent / "data" / "materials.json",
        Path(__file__).parent.parent.parent.parent / "simulation_engine" / "data" / "materials.json",
        Path(__file__).parent.parent.parent.parent / "frontend" / "src" / "data" / "materials.json",
    ]

    mat_data = None
    for p in possible_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    mat_data = json.load(f)
                    break
            except Exception:
                continue

    if not mat_data:
        return {
            "thermal_conductivity": 0.48,
            "density": 1650.0,
            "specific_heat": 1150.0,
            "solar_absorptivity": 0.70,
        }

    target_id = material_id.lower().strip()
    for item in mat_data:
        m_id = item.get("id", "").lower().strip()
        if m_id == target_id or target_id in m_id or m_id in target_id:
            return {
                "thermal_conductivity": float(item.get("thermalConductivity", 0.5)),
                "density": float(item.get("density", 1600.0)),
                "specific_heat": float(item.get("specificHeat", 1000.0)),
                "solar_absorptivity": float(item.get("solarAbsorptivity", 0.70)),
            }

    return {
        "thermal_conductivity": 0.48,
        "density": 1650.0,
        "specific_heat": 1150.0,
        "solar_absorptivity": 0.70,
    }


def compute_jurges_h(wind_speed: float) -> float:
    """
    Computes external convective heat transfer coefficient h using the
    empirical Jurges correlation.
      h = 5.6 + 4.0 * V     (for V < 5.0 m/s)
      h = 7.2 * (V ** 0.78)  (for V >= 5.0 m/s)
    """
    v = max(0.1, float(wind_speed))
    if v < 5.0:
        return 5.6 + (4.0 * v)
    else:
        return 7.2 * (v ** 0.78)


def apply_boundary_conditions(session: Any, params: Any, climate: Any) -> Dict[str, Any]:
    """
    Applies complete physics boundary conditions to the Fluent session.
    """
    # ── 1. Climate Variables Extraction ──
    if hasattr(climate, "ambient_temp_mean"):
        t_ambient_c = float(climate.ambient_temp_mean)
    elif hasattr(climate, "hourly_outdoor_temp") and climate.hourly_outdoor_temp:
        t_ambient_c = float(sum(climate.hourly_outdoor_temp) / len(climate.hourly_outdoor_temp))
    else:
        t_ambient_c = -14.9

    t_ambient_k = t_ambient_c + 273.15

    wind_speed = float(getattr(climate, "wind_speed", 3.5))
    h_ext = compute_jurges_h(wind_speed)

    # Solar Irradiance: 24-hour mean global horizontal solar irradiance
    if hasattr(climate, "hourly_solar_radiation") and climate.hourly_solar_radiation:
        solar_ghi_24h = float(sum(climate.hourly_solar_radiation) / 24.0)
    elif hasattr(climate, "solar_irradiance"):
        solar_ghi_24h = float(climate.solar_irradiance) / 2.0
    else:
        solar_ghi_24h = 129.58

    # ── 2. Wall Material & Geometry ──
    wall_mat_name = getattr(params, "wall_material", "composite")
    mat_props = load_material_properties(wall_mat_name)

    length = float(getattr(params, "length", 6.0))
    width = float(getattr(params, "width", 4.0))
    height = float(getattr(params, "height", 2.5))
    shelter_volume = length * width * height
    envelope_area = 2.0 * (length * height + width * height) + (length * width)
    south_area = length * height

    # ── 3. Solar Gain with Orientation Factor ──
    # Cosine orientation factor for South facade at Leh (34°N): cos(10.5°) ≈ 0.983
    orientation_deg = float(getattr(params, "orientation", 180.0))
    azimuth_offset_rad = math.radians(orientation_deg - 180.0)
    orientation_factor = max(0.0, math.cos(azimuth_offset_rad) * math.cos(math.radians(10.5)))

    opening_ratio = float(getattr(params, "opening_ratio", None) or (getattr(params, "opening", 14.0) / 100.0))
    glazing_area = south_area * opening_ratio
    opaque_south_area = south_area - glazing_area
    glazing_shgc = 0.58

    g_south_mean = solar_ghi_24h * 1.35 * orientation_factor
    q_solar_glaze_W = glazing_area * glazing_shgc * g_south_mean

    # Opaque solar absorption component conducted into interior
    alpha_wall = mat_props["solar_absorptivity"]
    alpha_roof = 0.60

    # ── 4. Thermal Conductance (U-values) ──
    r_si = 0.13
    r_se = 1.0 / max(0.1, h_ext)

    d_wall = 0.15 if wall_mat_name == "concrete" else (0.05 if wall_mat_name == "pcm_enhanced_panel" else 0.10)
    k_wall = max(0.01, mat_props["thermal_conductivity"])
    d_ins = max(0.0, float(getattr(params, "insulation", 100.0)) / 1000.0)
    k_ins = 0.035
    r_ins = d_ins / k_ins if d_ins > 0 else 0.0

    r_wall_total = r_si + (d_wall / k_wall) + r_ins + r_se
    u_wall = 1.0 / max(0.05, r_wall_total)

    r_roof_total = r_si + (0.12 / 0.12) + ((d_ins * 1.25) / k_ins) + r_se
    u_roof = 1.0 / max(0.05, r_roof_total)

    u_glaze = 1.40
    u_south = (1.0 - opening_ratio) * u_wall + opening_ratio * u_glaze

    # Infiltration & buoyancy stack ventilation conductance
    ach_eff = 5.2
    u_vent = (shelter_volume * ach_eff * 1.2 * 1005.0) / (3600.0 * max(1.0, envelope_area))

    h_wall_eff = u_wall + u_vent
    h_roof_eff = u_roof + u_vent
    h_south_eff = u_south + u_vent

    # Total internal thermal heat: transmitted solar + occupants sensible metabolic heat (70W/person)
    n_occupants = int(getattr(params, "n_occupants", 4))
    q_occupants_W = n_occupants * 70.0
    q_opaque_south_gain_W = (alpha_wall * g_south_mean * opaque_south_area / max(1.0, h_ext)) * u_wall
    q_solar_total_W = q_solar_glaze_W + q_opaque_south_gain_W

    solar_gain_wm2 = q_solar_total_W / max(1.0, envelope_area)

    q_total_internal_W = q_solar_total_W + q_occupants_W
    volumetric_heat_source_w_m3 = q_total_internal_W / max(1.0, shelter_volume)

    bc_summary = {
        "t_ambient_c": t_ambient_c,
        "t_ambient_k": t_ambient_k,
        "wind_speed": wind_speed,
        "h_ext_wm2k": round(h_ext, 2),
        "solar_ghi_24h_wm2": round(solar_ghi_24h, 2),
        "orientation_factor": round(orientation_factor, 3),
        "opening_ratio": opening_ratio,
        "u_wall": round(u_wall, 3),
        "u_roof": round(u_roof, 3),
        "u_south": round(u_south, 3),
        "u_vent": round(u_vent, 3),
        "q_solar_total_W": round(q_solar_total_W, 1),
        "q_occupants_W": round(q_occupants_W, 1),
        "q_total_internal_W": round(q_total_internal_W, 1),
        "volumetric_heat_source_w_m3": round(volumetric_heat_source_w_m3, 3),
        "solar_gain_wm2": round(solar_gain_wm2, 2),
        "wall_material": wall_mat_name,
        "material_properties": mat_props,
    }

    logger.info("Applying boundary conditions to PyFluent: %s", bc_summary)

    # ── 5. Apply Boundary Conditions to PyFluent Session ──
    try:
        walls = session.settings.setup.boundary_conditions.wall

        # Exterior Convective Walls: north, east, west
        for wall in ["north_wall", "east_wall", "west_wall"]:
            walls[wall].thermal.thermal_condition = "Convection"
            walls[wall].thermal.heat_transfer_coeff = h_wall_eff
            walls[wall].thermal.free_stream_temp = t_ambient_k

        # South Wall
        walls["south_wall"].thermal.thermal_condition = "Convection"
        walls["south_wall"].thermal.heat_transfer_coeff = h_south_eff
        walls["south_wall"].thermal.free_stream_temp = t_ambient_k

        # Roof
        walls["roof"].thermal.thermal_condition = "Convection"
        walls["roof"].thermal.heat_transfer_coeff = h_roof_eff
        walls["roof"].thermal.free_stream_temp = t_ambient_k

        # Floor: Adiabatic
        walls["floor"].thermal.thermal_condition = "Heat Flux"
        walls["floor"].thermal.heat_flux = 0.0

        # Interior Cell Zone: Volumetric Sensible Heat Source
        fluid_int = session.settings.setup.cell_zone_conditions.fluid["interior"]
        fluid_int.sources.enable = True
        fluid_int.sources.terms["energy"] = [{"option": "value", "value": volumetric_heat_source_w_m3}]

    except Exception as general_err:
        logger.warning("Boundary condition session setup encountered: %s", general_err)

    return bc_summary
