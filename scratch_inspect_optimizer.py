import sys
from simulation_engine.surrogate.pipeline import recommend

cands = recommend(climate='leh', top_n=6)
print(f"Total Candidates: {len(cands)}")
for i, c in enumerate(cands):
    p = c['params']
    r = c['results']
    cid = c['id']
    print(f"\n--- Candidate #{i+1} [{cid}] ---")
    print(f"  Shape: {p['shape']} | Wall: {p['wallMaterial']} | Roof: {p['roofMaterial']}")
    print(f"  Insulation: {p['insulation']}mm | Opening: {p['opening']}% | Mass: {p['thermalMass']}")
    print(f"  Mean Temp: {r['meanIndoorTemp']}°C (Min: {r['minIndoorTemp']}°C, Max: {r['maxIndoorTemp']}°C)")
    print(f"  Solar Gain: {r['solarGain']} W/m² | Heat Loss: {r['heatLoss']} W/m²")
    print(f"  Comfort Hours (>5°C): {r['comfortHours5c']} hrs/day | Comfort %: {r['comfortPercent']}%")
    print(f"  Cost: ₹{r['cost']} | Weight: {r['weight']} kg")
    print(f"  Tradeoff: {c['tradeoffNotes']}")
