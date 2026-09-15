"""
simulation-engine/validation/fluent/validation_cases.py

Defines 8 representative benchmark cases using real Leh winter climate values
matching the Phase 6 engine validation suite.

Covers:
  - Case 1: Leh winter, rectangular, concrete, 50mm insulation, 14% opening
  - Case 2: Leh winter, rectangular, composite, 100mm insulation, 14% opening
  - Case 3: Leh winter, rectangular, PCM panel, 75mm insulation, 14% opening
  - Case 4: Leh winter, rectangular, composite, 50mm insulation, 25% opening
  - Case 5: Leh winter, semi-dome equivalent (same floor area, documented box assumption),
            composite, 100mm insulation, 14% opening
  - Case 6: Leh winter, rectangular, composite, 150mm insulation, 5% opening
  - Case 7: Leh HIGH WIND (wind 8 m/s), composite, 100mm insulation, 14% opening
  - Case 8: Leh EXTREME COLD (-25°C ambient mean), composite, 100mm insulation, 14% opening
"""

import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional

# Attempt to import core engine dataclasses
try:
    from simulation_engine.engine import ClimateInput, SimulationParams
except ImportError:
    try:
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
        from simulation_engine.engine import ClimateInput, SimulationParams
    except ImportError:
        # Standalone fallback if simulation_engine is not in sys.path
        @dataclass
        class ClimateInput:
            lat: float = 34.1526
            lon: float = 77.5771
            altitude: float = 3524.0
            hourly_outdoor_temp: List[float] = field(default_factory=list)
            hourly_solar_radiation: List[float] = field(default_factory=list)
            wind_speed: float = 3.5
            humidity_pct: float = 30.0

            def __post_init__(self):
                if not self.hourly_outdoor_temp:
                    self.hourly_outdoor_temp = [
                        -18.0, -18.6, -19.0, -19.2, -19.4, -19.5,
                        -18.8, -17.2, -14.5, -11.8, -9.5,  -8.4,
                        -8.0,  -8.2,  -9.0,  -10.5, -12.4, -14.2,
                        -15.5, -16.3, -16.9, -17.3, -17.6, -17.8
                    ]
                if not self.hourly_solar_radiation:
                    self.hourly_solar_radiation = [
                        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                        15.0, 80.0, 210.0, 360.0, 480.0, 520.0,
                        510.0, 440.0, 310.0, 150.0, 35.0, 0.0,
                        0.0, 0.0, 0.0, 0.0, 0.0, 0.0
                    ]

        @dataclass
        class SimulationParams:
            shape: str = "rectangular"
            orientation: float = 180.0
            wall_material: str = "composite"
            roof_material: str = "timber_insulated_roof"
            glazing_material: str = "glazing_low_e"
            insulation: float = 100.0
            opening: float = 14.0
            thermal_mass: str = "high"
            length: float = 6.0
            width: float = 4.0
            height: float = 2.5
            internal_gain_w: float = 280.0
            ach: float = 0.5
            greenhouse_mode: bool = False


@dataclass
class DesignParams:
    """Standard design parameter carrier for Fluent CFD validation cases."""
    case_id: str
    label: str
    shape: str = "rectangular"
    length: float = 6.0
    width: float = 4.0
    height: float = 2.5
    wall_material: str = "composite"
    roof_material: str = "timber_insulated_roof"
    glazing_material: str = "glazing_low_e"
    insulation: float = 100.0       # mm
    opening: float = 14.0           # % aperture
    opening_ratio: float = 0.14     # fraction (0.0 to 1.0)
    orientation: float = 180.0      # degrees (180 = South)
    n_occupants: int = 4
    internal_gain_w: float = 280.0  # 4 * 70W ASHRAE sensible metabolic heat
    thermal_mass: str = "high"
    ach: float = 0.5
    notes: Optional[str] = None

    def to_simulation_params(self) -> SimulationParams:
        """Converts to SimulationParams for the RC engine."""
        return SimulationParams(
            shape=self.shape,
            orientation=self.orientation,
            wall_material=self.wall_material,
            roof_material=self.roof_material,
            glazing_material=self.glazing_material,
            insulation=self.insulation,
            opening=self.opening,
            thermal_mass=self.thermal_mass,
            length=self.length,
            width=self.width,
            height=self.height,
            internal_gain_w=self.internal_gain_w,
            ach=self.ach,
        )


@dataclass
class ValidationCase:
    case_id: str
    label: str
    design_params: DesignParams
    climate_input: ClimateInput
    notes: Optional[str] = None


# Baseline Leh Winter Climate (Lat: 34.15°N, Alt: 3524m, Mean Temp: -14.3°C, Wind: 3.5 m/s)
def create_leh_winter_climate(wind_speed: float = 3.5, temp_offset: float = 0.0) -> ClimateInput:
    base_temps = [
        -18.0, -18.6, -19.0, -19.2, -19.4, -19.5,
        -18.8, -17.2, -14.5, -11.8, -9.5,  -8.4,
        -8.0,  -8.2,  -9.0,  -10.5, -12.4, -14.2,
        -15.5, -16.3, -16.9, -17.3, -17.6, -17.8
    ]
    shifted_temps = [round(t + temp_offset, 2) for t in base_temps]
    base_solar = [
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        15.0, 80.0, 210.0, 360.0, 480.0, 520.0,
        510.0, 440.0, 310.0, 150.0, 35.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    ]
    return ClimateInput(
        lat=34.1526,
        lon=77.5771,
        altitude=3524.0,
        hourly_outdoor_temp=shifted_temps,
        hourly_solar_radiation=base_solar,
        wind_speed=wind_speed,
        humidity_pct=30.0,
    )


VALIDATION_CASES: List[ValidationCase] = [
    # Case 1: Leh winter, rectangular, concrete, 50mm insulation, 14% opening
    ValidationCase(
        case_id="case_1",
        label="Case 1: Concrete Baseline (50mm, 14% Open)",
        design_params=DesignParams(
            case_id="case_1",
            label="Concrete 50mm",
            shape="rectangular",
            wall_material="concrete",
            insulation=50.0,
            opening=14.0,
            opening_ratio=0.14,
            length=6.0,
            width=4.0,
            height=2.5,
            n_occupants=4,
        ),
        climate_input=create_leh_winter_climate(wind_speed=3.5),
        notes="Standard heavy concrete construction with minimal insulation in Leh winter.",
    ),

    # Case 2: Leh winter, rectangular, composite, 100mm insulation, 14% opening
    ValidationCase(
        case_id="case_2",
        label="Case 2: Composite Standard (100mm, 14% Open)",
        design_params=DesignParams(
            case_id="case_2",
            label="Composite 100mm",
            shape="rectangular",
            wall_material="composite",
            insulation=100.0,
            opening=14.0,
            opening_ratio=0.14,
            length=6.0,
            width=4.0,
            height=2.5,
            n_occupants=4,
        ),
        climate_input=create_leh_winter_climate(wind_speed=3.5),
        notes="Bio-composite wall construction with 100mm high-performance insulation.",
    ),

    # Case 3: Leh winter, rectangular, PCM panel, 75mm insulation, 14% opening
    ValidationCase(
        case_id="case_3",
        label="Case 3: PCM Latent Storage (75mm, 14% Open)",
        design_params=DesignParams(
            case_id="case_3",
            label="PCM Panel 75mm",
            shape="rectangular",
            wall_material="pcm_enhanced_panel",
            insulation=75.0,
            opening=14.0,
            opening_ratio=0.14,
            length=6.0,
            width=4.0,
            height=2.5,
            n_occupants=4,
        ),
        climate_input=create_leh_winter_climate(wind_speed=3.5),
        notes="Microencapsulated Phase Change Material panel with 75mm insulation.",
    ),

    # Case 4: Leh winter, rectangular, composite, 50mm insulation, 25% opening
    ValidationCase(
        case_id="case_4",
        label="Case 4: High Solar Aperture (50mm, 25% Open)",
        design_params=DesignParams(
            case_id="case_4",
            label="Composite 25% Aperture",
            shape="rectangular",
            wall_material="composite",
            insulation=50.0,
            opening=25.0,
            opening_ratio=0.25,
            length=6.0,
            width=4.0,
            height=2.5,
            n_occupants=4,
        ),
        climate_input=create_leh_winter_climate(wind_speed=3.5),
        notes="Enlarged south solar aperture (25%) evaluating direct passive solar gain in CFD.",
    ),

    # Case 5: Leh winter, semidome equivalent, composite, 100mm insulation, 14% opening
    # FIX 1 IMPLEMENTATION:
    # Must use rectangular box with same floor area as semi-dome and explicit documentation note.
    # Semi-dome of diameter 6.0m (radius 3.0m) -> Floor Area = pi * r^2 = 28.27 m².
    # Equivalent rectangular box: length = 5.65m, width = 5.00m (Floor Area = 28.25 m² ≈ 28.27 m²).
    ValidationCase(
        case_id="case_5",
        label="Case 5: Semi-Dome Equivalent (100mm, 14% Open)",
        design_params=DesignParams(
            case_id="case_5",
            label="Semi-Dome Equivalent",
            shape="rectangular",  # Built as equivalent rectangular box in Fluent CFD
            wall_material="composite",
            insulation=100.0,
            opening=14.0,
            opening_ratio=0.14,
            length=5.65,
            width=5.00,
            height=2.5,
            n_occupants=4,
            notes="Semi-dome approximated as equivalent rectangular volume. Dome curvature effects on convection not captured in this validation case.",
        ),
        climate_input=create_leh_winter_climate(wind_speed=3.5),
        notes="Semi-dome approximated as equivalent rectangular volume. Dome curvature effects on convection not captured in this validation case.",
    ),

    # Case 6: Leh winter, rectangular, composite, 150mm insulation, 5% opening
    ValidationCase(
        case_id="case_6",
        label="Case 6: Super-Insulated Passive (150mm, 5% Open)",
        design_params=DesignParams(
            case_id="case_6",
            label="Composite 150mm Super-Insulated",
            shape="rectangular",
            wall_material="composite",
            insulation=150.0,
            opening=5.0,
            opening_ratio=0.05,
            length=6.0,
            width=4.0,
            height=2.5,
            n_occupants=4,
        ),
        climate_input=create_leh_winter_climate(wind_speed=3.5),
        notes="High-altitude deep-winter bunker specification: 150mm envelope insulation with small 5% window aperture.",
    ),

    # Case 7: Leh HIGH WIND (wind 8 m/s), composite, 100mm, 14% opening
    ValidationCase(
        case_id="case_7",
        label="Case 7: High Wind Exposure (8 m/s, 100mm, 14% Open)",
        design_params=DesignParams(
            case_id="case_7",
            label="Composite High Wind 8m/s",
            shape="rectangular",
            wall_material="composite",
            insulation=100.0,
            opening=14.0,
            opening_ratio=0.14,
            length=6.0,
            width=4.0,
            height=2.5,
            n_occupants=4,
        ),
        climate_input=create_leh_winter_climate(wind_speed=8.0),
        notes="Evaluates exterior convective stripping under Khardung La gale conditions (wind speed 8.0 m/s).",
    ),

    # Case 8: Leh EXTREME COLD (-25°C ambient mean), composite, 100mm, 14% opening
    # Shifting baseline temp mean (-14.3°C) down by -10.7°C to achieve -25.0°C mean ambient
    ValidationCase(
        case_id="case_8",
        label="Case 8: Extreme Cold Outpost (-25°C, 100mm, 14% Open)",
        design_params=DesignParams(
            case_id="case_8",
            label="Composite Extreme Cold -25°C",
            shape="rectangular",
            wall_material="composite",
            insulation=100.0,
            opening=14.0,
            opening_ratio=0.14,
            length=6.0,
            width=4.0,
            height=2.5,
            n_occupants=4,
        ),
        climate_input=create_leh_winter_climate(wind_speed=3.5, temp_offset=-10.7),
        notes="Sub-zero arctic surge condition testing survival threshold with ambient temperatures reaching -30.2°C.",
    ),
]
