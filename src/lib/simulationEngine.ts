/**
 * simulationEngine.ts
 *
 * PROTOTYPE — These results are controlled, pre-computed reference values for three
 * hand-calibrated scenarios in Leh, Ladakh (January winter), plus calibrated bioclimatic
 * response profiles for Jaisalmer, Delhi, Kochi, and Srinagar.
 * They are NOT the output of a validated dynamic CFD/thermal solver.
 *
 * This module is the seam where a validated physics engine will plug in later —
 * e.g. EnergyPlus Python bindings, OpenBPS, or a custom finite-difference solver.
 */

import scenarios from '../data/scenarios.json'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DesignParams {
  shape:        string
  orientation:  number
  wallMaterial: string
  insulation:   number                      // mm  — 25 | 50 | 100 | 150
  openingRatio: number                      // %   — 5  | 10 | 14  | 20
  thermalMass:  'low' | 'medium' | 'high'
  location?:    string                      // leh | jaisalmer | delhi | kochi | srinagar
}

export interface SimulationResult {
  indoorTemp:    number   // °C   — 24 h average
  solarGain:     number   // W/m² — 24 h average incident on south façade
  heatLoss:      number   // W/m² — 24 h average (negative convention)
  comfortHours:  number   // h/day above local comfort threshold (~5 °C for Leh shelter)
  heatingDemand: number   // kWh/day required to reach 18 °C setpoint
  estimated:     boolean  // true → interpolated; false → exact scenario match
  scenarioKey?:  ScenarioKey
}

export interface HourlyPoint {
  hour:        number   // 0–23
  outdoorTemp: number   // °C
  solarRad:    number   // W/m²  — south-facing vertical surface
  indoorTemp:  number   // °C
  heatFlux:    number   // W/m²  — positive = net solar gain, negative = net fabric loss
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type ScenarioKey = 'A_baseline' | 'B_improved' | 'C_optimized'

type ScenariosShape = {
  [K in ScenarioKey]: {
    meta:   { label: string; description: string }
    params: {
      shape:        string
      orientation:  number
      wallMaterial: string
      insulation:   number
      openingRatio: number
      thermalMass:  'low' | 'medium' | 'high'
    }
    results: {
      indoorTemp:    number
      solarGain:     number
      heatLoss:      number
      comfortHours:  number
      heatingDemand: number
    }
    hourly: HourlyPoint[]
  }
}

const DATA = scenarios as unknown as ScenariosShape
const KEYS: readonly ScenarioKey[] = ['A_baseline', 'B_improved', 'C_optimized'] as const

function isExactMatch(params: DesignParams, key: ScenarioKey): boolean {
  const p = DATA[key].params
  return (
    params.shape        === p.shape        &&
    params.orientation  === p.orientation  &&
    params.wallMaterial === p.wallMaterial &&
    params.insulation   === p.insulation   &&
    params.openingRatio === p.openingRatio &&
    params.thermalMass  === p.thermalMass
  )
}

function distanceTo(params: DesignParams, key: ScenarioKey): number {
  const p = DATA[key].params

  const dIns   = (params.insulation - p.insulation) / 125
  const dOp    = (params.openingRatio - p.openingRatio) / 15
  const massMap: Record<string, number> = { low: 0, medium: 0.5, high: 1 }
  const dMass  = (massMap[params.thermalMass] ?? 0.5) - (massMap[p.thermalMass] ?? 0.5)
  const dAngle = Math.abs(params.orientation - p.orientation) / 180

  return Math.sqrt(
    dIns   * dIns   * 4.0 +
    dOp    * dOp    * 2.0 +
    dMass  * dMass  * 1.5 +
    dAngle * dAngle * 1.0 +
    1e-6
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * getScenarioResults — returns thermal performance metrics for the given design params.
 */
export function getScenarioResults(params: DesignParams): SimulationResult {
  // 1. Calculate base results in the reference parameter space
  let baseResult: SimulationResult | null = null

  for (const key of KEYS) {
    if (isExactMatch(params, key)) {
      const r = DATA[key].results
      baseResult = {
        indoorTemp:    r.indoorTemp,
        solarGain:     r.solarGain,
        heatLoss:      r.heatLoss,
        comfortHours:  r.comfortHours,
        heatingDemand: r.heatingDemand,
        estimated:     false,
        scenarioKey:   key,
      }
      break
    }
  }

  if (!baseResult) {
    const dist = KEYS.map((key) => ({ key, d: distanceTo(params, key) }))
    const snap = dist.find(({ d }) => d < 1e-9)

    if (snap) {
      const r = DATA[snap.key].results
      baseResult = {
        indoorTemp:    r.indoorTemp,
        solarGain:     r.solarGain,
        heatLoss:      r.heatLoss,
        comfortHours:  r.comfortHours,
        heatingDemand: r.heatingDemand,
        estimated:     true,
        scenarioKey:   snap.key,
      }
    } else {
      const weights = dist.map(({ d }) => 1 / (d * d))
      const wTotal  = weights.reduce((s, w) => s + w, 0)
      const norm    = weights.map((w) => w / wTotal)

      const blend = (field: keyof (typeof DATA)['A_baseline']['results']): number =>
        norm.reduce((sum, w, i) => sum + w * DATA[KEYS[i]].results[field], 0)

      baseResult = {
        indoorTemp:    +blend('indoorTemp').toFixed(2),
        solarGain:     +blend('solarGain').toFixed(1),
        heatLoss:      +blend('heatLoss').toFixed(1),
        comfortHours:  +blend('comfortHours').toFixed(1),
        heatingDemand: +blend('heatingDemand').toFixed(2),
        estimated:     true,
      }
    }
  }

  // 2. If non-Leh location, apply bioclimatic domain offsets
  const loc = params.location ?? 'leh'
  if (loc === 'jaisalmer') {
    return {
      indoorTemp:    +(baseResult.indoorTemp + 20.2).toFixed(1),
      solarGain:     +(baseResult.solarGain * 1.12).toFixed(0),
      heatLoss:      +(baseResult.heatLoss * 0.55).toFixed(0),
      comfortHours:  Math.min(24, +(baseResult.comfortHours * 1.4 + 9.0).toFixed(1)),
      heatingDemand: 0.0,
      estimated:     true,
      scenarioKey:   undefined,
    }
  }

  if (loc === 'delhi') {
    return {
      indoorTemp:    +(baseResult.indoorTemp + 14.5).toFixed(1),
      solarGain:     +(baseResult.solarGain * 0.95).toFixed(0),
      heatLoss:      +(baseResult.heatLoss * 0.72).toFixed(0),
      comfortHours:  Math.min(24, +(baseResult.comfortHours * 1.3 + 5.0).toFixed(1)),
      heatingDemand: +(Math.max(0, baseResult.heatingDemand * 0.35)).toFixed(1),
      estimated:     true,
      scenarioKey:   undefined,
    }
  }

  if (loc === 'kochi') {
    return {
      indoorTemp:    +(baseResult.indoorTemp + 25.0).toFixed(1),
      solarGain:     +(baseResult.solarGain * 1.05).toFixed(0),
      heatLoss:      +(baseResult.heatLoss * 0.30).toFixed(0),
      comfortHours:  24.0,
      heatingDemand: 0.0,
      estimated:     true,
      scenarioKey:   undefined,
    }
  }

  if (loc === 'srinagar') {
    return {
      indoorTemp:    +(baseResult.indoorTemp + 4.8).toFixed(1),
      solarGain:     +(baseResult.solarGain * 0.88).toFixed(0),
      heatLoss:      +(baseResult.heatLoss * 0.85).toFixed(0),
      comfortHours:  Math.min(24, +(baseResult.comfortHours * 1.1 + 1.2).toFixed(1)),
      heatingDemand: +(Math.max(0.5, baseResult.heatingDemand * 0.78)).toFixed(1),
      estimated:     true,
      scenarioKey:   undefined,
    }
  }

  return baseResult
}

/**
 * getHourlyReplay — returns the 24-element hourly data array for a given parameter set.
 */
export function getHourlyReplay(params: DesignParams): HourlyPoint[] {
  let baseHourly: HourlyPoint[] | null = null

  for (const key of KEYS) {
    if (isExactMatch(params, key)) {
      baseHourly = DATA[key].hourly as HourlyPoint[]
      break
    }
  }

  if (!baseHourly) {
    const dA    = distanceTo(params, 'A_baseline')
    const dC    = distanceTo(params, 'C_optimized')
    const total = dA + dC + 1e-9
    const wA    = dC / total
    const wC    = dA / total

    const hA = DATA.A_baseline.hourly  as HourlyPoint[]
    const hC = DATA.C_optimized.hourly as HourlyPoint[]

    baseHourly = hA.map((a, i) => {
      const c = hC[i]
      return {
        hour:        a.hour,
        outdoorTemp: a.outdoorTemp,
        solarRad:    Math.round(wA * a.solarRad   + wC * c.solarRad),
        indoorTemp:  +(wA * a.indoorTemp + wC * c.indoorTemp).toFixed(1),
        heatFlux:    +(wA * a.heatFlux   + wC * c.heatFlux).toFixed(1),
      }
    })
  }

  const loc = params.location ?? 'leh'
  if (loc === 'leh') return baseHourly

  // Bioclimatic hourly adjustments
  const offsetOut = loc === 'jaisalmer' ? 28 : loc === 'delhi' ? 22 : loc === 'kochi' ? 42 : 14
  const offsetIn  = loc === 'jaisalmer' ? 20.2 : loc === 'delhi' ? 14.5 : loc === 'kochi' ? 25.0 : 4.8

  return baseHourly.map((pt) => ({
    hour:        pt.hour,
    outdoorTemp: +(pt.outdoorTemp + offsetOut).toFixed(1),
    solarRad:    pt.solarRad,
    indoorTemp:  +(pt.indoorTemp + offsetIn).toFixed(1),
    heatFlux:    pt.heatFlux,
  }))
}
