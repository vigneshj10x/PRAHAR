"""
backend/seed.py

Database seed utility for THERMO-SHIELD.
Populates the SQLite materials table with real thermophysical material specifications
from the simulation-engine material database (including Phase Change Materials,
insulation composites, and traditional vernacular envelope elements).
"""

import sys
import json
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from backend.database import engine, SessionLocal, init_db
    from backend.models import MaterialModel
except ImportError:
    from database import engine, SessionLocal, init_db
    from models import MaterialModel

# Default fallback materials if json file is not found
FALLBACK_MATERIALS = [
    {
        "id": "adobe",
        "name": "Dense Adobe / Sun-Dried Mud Brick",
        "category": "wall",
        "thermal_conductivity": 0.52,
        "density": 1700.0,
        "specific_heat": 1000.0,
        "thickness": 300.0,
        "emissivity": 0.90,
        "solar_absorptivity": 0.70,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 1200.0,
        "weight": 510.0,
        "carbon_factor": 0.08,
        "description": "High thermal mass vernacular mud masonry for desert and arid high-altitude buffering."
    },
    {
        "id": "stone",
        "name": "Granite / Basalt Dry Stone Masonry",
        "category": "wall",
        "thermal_conductivity": 1.80,
        "density": 2600.0,
        "specific_heat": 840.0,
        "thickness": 350.0,
        "emissivity": 0.92,
        "solar_absorptivity": 0.75,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 1800.0,
        "weight": 910.0,
        "carbon_factor": 0.05,
        "description": "Heavy stone construction providing significant diurnal thermal damping."
    },
    {
        "id": "timber",
        "name": "Deodar / Himalayan Cedar Timber Framing",
        "category": "wall",
        "thermal_conductivity": 0.13,
        "density": 520.0,
        "specific_heat": 1600.0,
        "thickness": 100.0,
        "emissivity": 0.90,
        "solar_absorptivity": 0.60,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 3200.0,
        "weight": 52.0,
        "carbon_factor": -0.80,
        "description": "Carbon-sequestering lightweight timber frame for rapid assembly."
    },
    {
        "id": "concrete",
        "name": "Reinforced Dense Concrete (M25)",
        "category": "wall",
        "thermal_conductivity": 1.58,
        "density": 2400.0,
        "specific_heat": 1000.0,
        "thickness": 150.0,
        "emissivity": 0.90,
        "solar_absorptivity": 0.65,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 2400.0,
        "weight": 360.0,
        "carbon_factor": 0.15,
        "description": "Standard structural reinforced concrete wall."
    },
    {
        "id": "pcm_enhanced_panel",
        "name": "Microencapsulated Paraffin PCM Panel (21.5°C)",
        "category": "pcm",
        "thermal_conductivity": 0.22,
        "density": 950.0,
        "specific_heat": 1800.0,
        "thickness": 25.0,
        "emissivity": 0.90,
        "solar_absorptivity": 0.40,
        "pcm_melting_point": 21.5,
        "pcm_latent_heat": 115.0,
        "cost": 3800.0,
        "weight": 23.75,
        "carbon_factor": 1.85,
        "description": "Latent heat thermal storage panel melting at 21.5°C to stabilize indoor temperatures."
    },
    {
        "id": "aerogel_insulation",
        "name": "Hydrophobic Silica Aerogel Blanket",
        "category": "insulation",
        "thermal_conductivity": 0.015,
        "density": 150.0,
        "specific_heat": 1000.0,
        "thickness": 25.0,
        "emissivity": 0.85,
        "solar_absorptivity": 0.20,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 6500.0,
        "weight": 3.75,
        "carbon_factor": 2.10,
        "description": "Ultra-low thermal conductivity super-insulation for extreme cold climates."
    },
    {
        "id": "eps_insulation",
        "name": "High-Density EPS Insulation Board",
        "category": "insulation",
        "thermal_conductivity": 0.035,
        "density": 24.0,
        "specific_heat": 1300.0,
        "thickness": 100.0,
        "emissivity": 0.90,
        "solar_absorptivity": 0.20,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 650.0,
        "weight": 2.4,
        "carbon_factor": 3.30,
        "description": "Rigid expanded polystyrene thermal envelope insulation."
    },
    {
        "id": "timber_insulated_roof",
        "name": "Insulated Timber Truss & Deck Roof",
        "category": "roof",
        "thermal_conductivity": 0.12,
        "density": 550.0,
        "specific_heat": 1600.0,
        "thickness": 120.0,
        "emissivity": 0.90,
        "solar_absorptivity": 0.60,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 2800.0,
        "weight": 45.0,
        "carbon_factor": -0.45,
        "description": "High-performance insulated roof deck structure."
    },
    {
        "id": "glazing_low_e",
        "name": "Double Glazed Low-E Argon Window Unit",
        "category": "glazing",
        "thermal_conductivity": 0.026,
        "density": 2500.0,
        "specific_heat": 840.0,
        "thickness": 24.0,
        "emissivity": 0.10,
        "solar_absorptivity": 0.12,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 4200.0,
        "weight": 30.0,
        "carbon_factor": 1.25,
        "description": "High-performance double low-E glazing unit."
    },
    {
        "id": "polyethylene_sheet",
        "name": "Agricultural Polyethylene Film (DIHAR / SKUAST Greenhouse Sheeting)",
        "category": "glazing",
        "thermal_conductivity": 0.33,
        "density": 920.0,
        "specific_heat": 2300.0,
        "thickness": 0.2,
        "emissivity": 0.70,
        "solar_absorptivity": 0.08,
        "pcm_melting_point": None,
        "pcm_latent_heat": None,
        "cost": 120.0,
        "weight": 0.18,
        "carbon_factor": 1.90,
        "description": "200-micron UV-stabilized LDPE greenhouse sheeting (SHGC ~ 0.87, U ~ 5.8 W/m²K) as used in DIHAR Ladakh trench structures."
    }
]


def seed_materials():
    """Seeds the database with materials catalog."""
    init_db()
    db = SessionLocal()
    try:
        # Check existing materials
        count = db.query(MaterialModel).count()
        if count > 0:
            print(f"[Seed] Materials table already contains {count} records. Updating/merging...")

        # Load from simulation-engine JSON if available
        json_paths = [
            Path(__file__).parent.parent / "simulation_engine" / "data" / "materials.json",
            Path(__file__).parent.parent / "simulation-engine" / "data" / "materials.json",
            Path(__file__).parent / "data" / "materials.json"
        ]

        entries_to_add = []
        loaded_from_json = False

        for jp in json_paths:
            if jp.exists():
                try:
                    with open(jp, "r", encoding="utf-8") as f:
                        raw_data = json.load(f)
                    for item in raw_data:
                        entries_to_add.append({
                            "id": item["id"],
                            "name": item["name"],
                            "category": item["category"],
                            "thermal_conductivity": float(item["thermalConductivity"]),
                            "density": float(item["density"]),
                            "specific_heat": float(item["specificHeat"]),
                            "thickness": float(item["thickness"]),
                            "emissivity": float(item["emissivity"]),
                            "solar_absorptivity": float(item["solarAbsorptivity"]),
                            "pcm_melting_point": float(item["pcmMeltingPoint"]) if item.get("pcmMeltingPoint") is not None else None,
                            "pcm_latent_heat": float(item["pcmLatentHeat"]) if item.get("pcmLatentHeat") is not None else None,
                            "cost": float(item["cost"]),
                            "weight": float(item["weight"]),
                            "carbon_factor": float(item["carbonFactor"]) if item.get("carbonFactor") is not None else None,
                            "description": item.get("description", f"{item['name']} for thermal envelope.")
                        })
                    loaded_from_json = True
                    print(f"[Seed] Loaded {len(entries_to_add)} materials from {jp.name}")
                    break
                except Exception as e:
                    print(f"[Seed] Warning: Could not read {jp}: {e}")

        if not loaded_from_json:
            entries_to_add = FALLBACK_MATERIALS
            print(f"[Seed] Seeding {len(entries_to_add)} default bioclimatic materials.")

        # Upsert into database
        for mat_data in entries_to_add:
            existing = db.query(MaterialModel).filter(MaterialModel.id == mat_data["id"]).first()
            if existing:
                for k, v in mat_data.items():
                    setattr(existing, k, v)
            else:
                db.add(MaterialModel(**mat_data))

        db.commit()
        total = db.query(MaterialModel).count()
        print(f"[Seed] Successfully seeded materials table. Total active materials in DB: {total}")
    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding materials: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_materials()
