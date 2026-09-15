/**
 * frontend/src/services/index.ts
 *
 * Simulation Service Factory.
 *
 * Reads configuration (import.meta.env.VITE_USE_MOCK_ENGINE) to supply
 * either the in-memory mock engine or the real FastAPI backend HTTP solver.
 */

import type { SimulationService } from './simulationService'
import { mockSimulationService } from './mockSimulationService'
import { apiSimulationService } from './apiSimulationService'

export * from './simulationService'
export * from './mockSimulationService'
export * from './apiSimulationService'

let cachedService: SimulationService | null = null

/**
 * Returns the active simulation service instance based on environment flags.
 */
export function getSimulationService(): SimulationService {
  if (cachedService) {
    return cachedService
  }

  const useMock = import.meta.env.VITE_USE_MOCK_ENGINE === 'true'

  if (useMock) {
    cachedService = mockSimulationService
    return cachedService
  }

  cachedService = apiSimulationService
  return cachedService
}
