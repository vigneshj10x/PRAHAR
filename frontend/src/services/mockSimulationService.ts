/**
 * src/services/mockSimulationService.ts
 *
 * PROTOTYPE — These results are controlled, pre-computed reference values for three
 * hand-calibrated scenarios in Leh, Ladakh (January winter), plus calibrated bioclimatic
 * response profiles for Jaisalmer, Delhi, Kochi, and Srinagar.
 * They are NOT the output of a validated dynamic CFD/thermal solver.
 *
 * This service implements the SimulationService interface and serves as the mock
 * provider until a real thermal physics engine / backend API is connected.
 */

import type {
  DesignParams,
  SimulationResult,
  HourlyReplayPoint,
  ScenarioKey,
  ScenariosShape,
} from '@/domain'
import type { SimulationService, ScenarioData, OptimizeResult } from './simulationService'
import scenarios from '@/data/scenarios.json'

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

/**
 * Synchronous core calculation used internally by the mock service.
 */
export function computeScenarioResults(params: DesignParams): SimulationResult {
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
 * Synchronous hourly replay generator used internally by the mock service.
 */
export function computeHourlyReplay(params: DesignParams): HourlyReplayPoint[] {
  let baseHourly: HourlyReplayPoint[] | null = null

  for (const key of KEYS) {
    if (isExactMatch(params, key)) {
      baseHourly = DATA[key].hourly as HourlyReplayPoint[]
      break
    }
  }

  if (!baseHourly) {
    const dA    = distanceTo(params, 'A_baseline')
    const dC    = distanceTo(params, 'C_optimized')
    const total = dA + dC + 1e-9
    const wA    = dC / total
    const wC    = dA / total

    const hA = DATA.A_baseline.hourly  as HourlyReplayPoint[]
    const hC = DATA.C_optimized.hourly as HourlyReplayPoint[]

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

export class MockSimulationService implements SimulationService {
  async getResults(params: DesignParams): Promise<SimulationResult> {
    return computeScenarioResults(params)
  }

  async getHourlyReplay(params: DesignParams): Promise<HourlyReplayPoint[]> {
    return computeHourlyReplay(params)
  }

  async autoOptimize(params: DesignParams): Promise<OptimizeResult> {
    const optimizedParams: DesignParams = {
      shape:        DATA.C_optimized.params.shape,
      orientation:  DATA.C_optimized.params.orientation,
      wallMaterial: DATA.C_optimized.params.wallMaterial,
      insulation:   DATA.C_optimized.params.insulation,
      openingRatio: DATA.C_optimized.params.openingRatio,
      thermalMass:  DATA.C_optimized.params.thermalMass,
      location:     params.location ?? 'leh',
    }
    const results = computeScenarioResults(optimizedParams)
    return { results, optimizedParams }
  }

  async getScenario(key: ScenarioKey): Promise<ScenarioData> {
    const scenario = DATA[key]
    const params: DesignParams = {
      shape:        scenario.params.shape,
      orientation:  scenario.params.orientation,
      wallMaterial: scenario.params.wallMaterial,
      insulation:   scenario.params.insulation,
      openingRatio: scenario.params.openingRatio,
      thermalMass:  scenario.params.thermalMass,
    }
    const results: SimulationResult = {
      indoorTemp:    scenario.results.indoorTemp,
      solarGain:     scenario.results.solarGain,
      heatLoss:      scenario.results.heatLoss,
      comfortHours:  scenario.results.comfortHours,
      heatingDemand: scenario.results.heatingDemand,
      estimated:     false,
      scenarioKey:   key,
    }
    return {
      meta: scenario.meta,
      params,
      results,
      hourly: scenario.hourly,
    }
  }
}

export const mockSimulationService = new MockSimulationService()
