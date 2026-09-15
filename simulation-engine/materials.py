"""
simulation-engine/materials.py

Python schema and loader for THERMO-SHIELD material database.
Loads data/materials.json with validation against the API contract schema.
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
import json

@dataclass(frozen=True)
class Material:
    id: str
    name: str
    category: str
    thermal_conductivity: float       # W/(m·K)
    density: float                    # kg/m³
    specific_heat: float              # J/(kg·K)
    thickness_mm: float               # mm
    emissivity: float                 # 0.0 to 1.0
    solar_absorptivity: float         # 0.0 to 1.0
    pcm_melting_point: Optional[float] # °C (if PCM, else None)
    pcm_latent_heat: Optional[float]   # kJ/kg (if PCM, else None)
    cost: float                       # INR (₹) / m²
    weight: float                     # kg / m²
    carbon_factor: Optional[float]    # kgCO2e / kg

    @property
    def thickness_m(self) -> float:
        """Returns layer thickness in meters."""
        return self.thickness_mm / 1000.0

    @property
    def r_value(self) -> float:
        """Thermal resistance R = thickness / conductivity (m²·K/W)."""
        if self.thermal_conductivity <= 0:
            return 0.0
        return self.thickness_m / self.thermal_conductivity

    @property
    def is_pcm(self) -> bool:
        """Returns True if material possesses latent heat storage capability."""
        return self.pcm_melting_point is not None and self.pcm_latent_heat is not None and self.pcm_latent_heat > 0


class MaterialDatabase:
    """In-memory index and lookup service for materials."""

    def __init__(self, data_path: Optional[Path] = None):
        if data_path is None:
            data_path = Path(__file__).parent / "data" / "materials.json"
        self.data_path = data_path
        self._materials: Dict[str, Material] = {}
        self.reload()

    def reload(self) -> None:
        """Loads and parses JSON material definitions."""
        with open(self.data_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        self._materials = {}
        for entry in raw_data:
            mat = Material(
                id=entry["id"],
                name=entry["name"],
                category=entry["category"],
                thermal_conductivity=float(entry["thermalConductivity"]),
                density=float(entry["density"]),
                specific_heat=float(entry["specificHeat"]),
                thickness_mm=float(entry["thickness"]),
                emissivity=float(entry["emissivity"]),
                solar_absorptivity=float(entry["solarAbsorptivity"]),
                pcm_melting_point=float(entry["pcmMeltingPoint"]) if entry.get("pcmMeltingPoint") is not None else None,
                pcm_latent_heat=float(entry["pcmLatentHeat"]) if entry.get("pcmLatentHeat") is not None else None,
                cost=float(entry["cost"]),
                weight=float(entry["weight"]),
                carbon_factor=float(entry["carbonFactor"]) if entry.get("carbonFactor") is not None else None,
            )
            self._materials[mat.id] = mat

    def get(self, material_id: str) -> Optional[Material]:
        """Fetch material by its unique ID."""
        return self._materials.get(material_id)

    def list_all(self) -> List[Material]:
        """Returns all registered materials."""
        return list(self._materials.values())

    def filter_by_category(self, category: str) -> List[Material]:
        """Returns all materials within a given category."""
        return [m for m in self._materials.values() if m.category == category]


# Global singleton instance
materials_db = MaterialDatabase()
