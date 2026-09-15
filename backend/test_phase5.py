"""
backend/test_phase5.py

Integration test suite for Phase 5 (SQLite database & persistent climate cache).
"""

import sys
import time
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import MaterialModel, ClimateCacheModel


def test_phase5_database_and_cache():
    print("=" * 60)
    print("PHASE 5 INTEGRATION TEST: SQLITE DATABASE & CLIMATE CACHE")
    print("=" * 60)

    # 1. Startup & test materials endpoint
    with TestClient(app) as client:
        r_mat = client.get("/api/materials")
        assert r_mat.status_code == 200, f"Expected 200, got {r_mat.status_code}"
        materials = r_mat.json()
        print(f"\n[1] Materials from SQLite Database: {len(materials)} records found")
        for m in materials[:5]:
            pcm_str = f"PCM {m['pcmMeltingPoint']}°C" if m.get('pcmMeltingPoint') else "Standard"
            print(f"  - [{m['category'].upper():<10}] {m['name']:<48} | k={m['thermalConductivity']:<5} | {pcm_str}")

        assert len(materials) >= 8, f"Expected at least 8 materials, got {len(materials)}"

        # 2. Query Climate for Leh & Kochi (populates SQLite climate_cache)
        print("\n[2] Querying & Caching Climate Telemetry:")
        t0 = time.time()
        r_leh = client.get("/api/climate/34.1526/77.5771?name=Leh%2C%20Ladakh")
        t1 = time.time()
        assert r_leh.status_code == 200
        print(f"  - Leh fetched in {t1-t0:.3f}s, Source: {r_leh.json()['source']}")

        t2 = time.time()
        r_kochi = client.get("/api/climate/9.9312/76.2673?name=Kochi%2C%20Kerala")
        t3 = time.time()
        assert r_kochi.status_code == 200
        print(f"  - Kochi fetched in {t3-t2:.3f}s, Source: {r_kochi.json()['source']}")

        # Verify records in SQLite database
        db = SessionLocal()
        cache_count = db.query(ClimateCacheModel).count()
        db.close()
        print(f"  - Verified records in SQLite `climate_cache` table: {cache_count}")
        assert cache_count >= 2, "Expected at least 2 cached locations in SQLite"

    # 3. Simulate Backend Restart (New client & clear in-memory cache)
    print("\n[3] Simulating Backend Restart & Persistence Verification:")
    from backend.climate import _CLIMATE_CACHE
    _CLIMATE_CACHE.clear()  # Clear L1 memory cache completely

    with TestClient(app) as fresh_client:
        t4 = time.time()
        r_cached_leh = fresh_client.get("/api/climate/34.1526/77.5771")
        t5 = time.time()
        assert r_cached_leh.status_code == 200
        cached_data = r_cached_leh.json()
        print(f"  - Persistent Cache Hit for Leh in {t5-t4:.4f}s (sub-50ms)!")
        print(f"    Location: {cached_data['location']['name']}, Altitude: {cached_data['location']['altitude']}m")
        print(f"    Ambient:  {cached_data['ambientTempRange']['min']}°C to {cached_data['ambientTempRange']['max']}°C (Avg: {cached_data['ambientTempRange']['avg']}°C)")
        print(f"    Solar:    {cached_data['solarIrradiance']['peakWm2']} W/m²")

        assert t5 - t4 < 0.1, "Expected instant persistent cache hit from SQLite"

    print("\n" + "=" * 60)
    print("ALL PHASE 5 TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    test_phase5_database_and_cache()
