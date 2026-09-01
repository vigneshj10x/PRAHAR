/**
 * src/services/index.ts
 *
 * Simulation Service Factory.
 *
 * Reads configuration (e.g. import.meta.env.VITE_USE_MOCK_ENGINE) to supply
 * either the in-memory mock engine or a future real-time physics backend solver.
 *
 * ARCHITECTURAL SEAM:
 * When adding `apiSimulationService.ts` to connect to a backend solver API (EnergyPlus, OpenBPS, etc.),
 * switching the factory implementation below is the ONLY change required across the entire app.
 */

import type { SimulationService } from './simulationService'
import { mockSimulationService } from './mockSimulationService'

export * from './simulationService'
export * from './mockSimulationService'

let cachedService: SimulationService | null = null

/**
 * Returns the active simulation service instance.
 */
export function getSimulationService(): SimulationService {
  if (cachedService) {
    return cachedService
  }

  // Future integration point:
  // const useMock = import.meta.env.VITE_USE_MOCK_ENGINE !== 'false'
  // if (!useMock) {
  //   cachedService = new ApiSimulationService(import.meta.env.VITE_API_BASE_URL)
  //   return cachedService
  // }

  cachedService = mockSimulationService
  return cachedService
}
