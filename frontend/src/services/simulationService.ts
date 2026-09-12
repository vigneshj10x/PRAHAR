/**
 * src/services/simulationService.ts
 *
 * Abstract contract interface for the Thermal Simulation Service.
 * Isolates simulation computation from UI consumption.
 */

import type {
  DesignParams,
  SimulationResult,
  HourlyReplayPoint,
  ScenarioKey,
  CandidateDesign,
  RecommendRequest,
  VerifyResponse,
  SimulationRequest,
} from '@/domain'

export interface ScenarioData {
  meta: {
    label: string
    description: string
  }
  params: DesignParams
  results: SimulationResult
  hourly: HourlyReplayPoint[]
}

export interface OptimizeResult {
  results: SimulationResult
  optimizedParams: DesignParams
}

export interface SimulationService {
  /**
   * Evaluates steady-state and diurnal thermal performance metrics for given design parameters.
   */
  getResults(params: DesignParams): Promise<SimulationResult>

  /**
   * Generates a 24-hour diurnal profile array of outdoor temp, solar radiation, indoor temp, and net flux.
   */
  getHourlyReplay(params: DesignParams): Promise<HourlyReplayPoint[]>

  /**
   * Computes optimal shelter parameters and corresponding performance results.
   */
  autoOptimize(params: DesignParams): Promise<OptimizeResult>

  /**
   * Retrieves reference pre-computed scenario data (A_baseline, B_improved, or C_optimized).
   */
  getScenario(key: ScenarioKey): Promise<ScenarioData>

  /**
   * Evaluates Pareto multi-objective front via the fast ML surrogate model.
   */
  recommend(req: RecommendRequest): Promise<CandidateDesign[]>

  /**
   * Executes high-fidelity numerical physics simulation to verify a candidate design.
   */
  verify(params: DesignParams | SimulationRequest): Promise<VerifyResponse>
}

