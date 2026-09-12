"""
backend/test_risk_assessment.py

Automated test script for Location-Based Disaster Risk Assessment.
Tests 3 real high-altitude Indian locations with genuinely distinct risk profiles:
  1. Leh, Ladakh (34.1526°N, 77.5771°E)
  2. Chamoli / Joshimath, Uttarakhand (30.4124°N, 79.5663°E)
  3. Tawang, Arunachal Pradesh (27.5861°N, 91.8654°E)
"""

import sys
import json
import asyncio
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.risk_assessment import get_disaster_risk_assessment


def test_locations():
    asyncio.run(_async_test_locations())


async def _async_test_locations():
    locations = [
        ("Leh, Ladakh", 34.1526, 77.5771),
        ("Chamoli / Joshimath, Uttarakhand", 30.4124, 79.5663),
        ("Tawang, Arunachal Pradesh", 27.5861, 91.8654),
    ]

    print("=" * 80)
    print("THERMO-SHIELD: LOCATION-BASED DISASTER RISK ASSESSMENT TEST SUITE")
    print("=" * 80)

    results = {}

    for name, lat, lon in locations:
        print(f"\nEvaluating Disaster Risk Assessment for: {name} ({lat}°N, {lon}°E)...")
        res = await get_disaster_risk_assessment(lat, lon)
        results[name] = res

        print(f"  Elevation:   {res['location']['elevation']} m")
        print(f"  Slope Angle: {res['location']['slopeAngle']}° ({res['location']['aspect']} aspect)")
        print(f"  Overall:     {res['overallRiskSummary']}")
        print("\n  Individual 7 Risk Factors:")
        for r in res["risks"]:
            lvl = r["level"].upper()
            pad = " " * (8 - len(lvl))
            print(f"    [{lvl}]{pad} {r['title']}: {r['justification']}")
            print(f"              Source: {r['dataSource']}")

    # Assertions to verify physical and geographic contrast
    leh = results["Leh, Ladakh"]
    chamoli = results["Chamoli / Joshimath, Uttarakhand"]
    tawang = results["Tawang, Arunachal Pradesh"]

    # 1. Seismic Contrast
    assert any("Zone IV" in r["title"] for r in leh["risks"]), "Leh should be Zone IV"
    assert any("Zone V" in r["title"] for r in chamoli["risks"]), "Chamoli should be Zone V"
    assert any("Zone V" in r["title"] for r in tawang["risks"]), "Tawang should be Zone V"

    # 2. GLOF Contrast: Chamoli should have High/Moderate GLOF proximity (near Rishi Ganga / Raunthi)
    chamoli_glof = next(r for r in chamoli["risks"] if r["factor"] == "glof")
    assert chamoli_glof["level"] in ["High", "Moderate"], f"Chamoli GLOF should be High/Moderate, got {chamoli_glof['level']}"

    # 3. Extreme Cold / Frostbite: Leh should be High or Critical due to extreme winter sub-zero temperatures
    leh_cold = next(r for r in leh["risks"] if r["factor"] == "extreme_cold")
    assert leh_cold["level"] in ["High", "Critical"], f"Leh cold risk should be High/Critical, got {leh_cold['level']}"

    # 4. Landslide: Tawang and Chamoli should have significant landslide risk in active thrust belts
    tawang_ls = next(r for r in tawang["risks"] if r["factor"] == "landslide")
    assert tawang_ls["level"] in ["High", "Critical", "Moderate"], f"Tawang landslide risk unexpected: {tawang_ls['level']}"

    print("\n" + "=" * 80)
    print("ALL TESTS PASSED: Physical and geographical contrast verified successfully!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_locations())
