/**
 * src/store/resultsStore.ts — simulation output state (Zustand).
 * Written by the SIMULATE action; read by RightPanel.
 */
import { create } from 'zustand'
import type { SimulationResult, ScenarioKey, ResultStatus } from '@/domain'

export type { ResultStatus }

interface ResultsState {
  status:                    ResultStatus
  indoorTemp:                number
  solarGain:                 number
  heatLoss:                  number
  comfortHours:              number
  heatingDemand:             number
  estimated:                 boolean
  scenarioKey:               ScenarioKey | undefined
  runCount:                  number      // incremented on every SIMULATE — drives animation resets
  replayTemperature:         number     // current temperature during 24-hour thermal replay animation
  uValue?:                   number
  weight?:                   number
  cost?:                     number
  comfortPercent?:           number
  verifiedAgainstSurrogate?: boolean
  deltaFromSurrogate?:       number | null
  indoorTempSeries?:         any[]
}

interface ResultsActions {
  setResults:           (r: SimulationResult) => void
  setReplayTemperature: (temp: number) => void
  reset:                () => void
}

export type ResultsStore = ResultsState & ResultsActions

const DEFAULTS: ResultsState = {
  status:                    'idle',
  indoorTemp:                0,
  solarGain:                 0,
  heatLoss:                  0,
  comfortHours:              0,
  heatingDemand:             0,
  estimated:                 false,
  scenarioKey:               undefined,
  runCount:                  0,
  replayTemperature:         0,
  uValue:                    undefined,
  weight:                    undefined,
  cost:                      undefined,
  comfortPercent:            undefined,
  verifiedAgainstSurrogate:  false,
  deltaFromSurrogate:        null,
  indoorTempSeries:          undefined,
}

export const useResultsStore = create<ResultsStore>((set) => ({
  ...DEFAULTS,

  setResults: (r) => {
    console.log('[DIAGNOSTIC STEP 5][ResultsStore BEFORE Write]:', { incomingResult: r })
    set(state => {
      const nextState = {
        status:                    'ready' as const,
        indoorTemp:                r.indoorTemp,
        solarGain:                 r.solarGain,
        heatLoss:                  r.heatLoss,
        comfortHours:              r.comfortHours,
        heatingDemand:             r.heatingDemand,
        estimated:                 r.estimated,
        scenarioKey:               r.scenarioKey,
        uValue:                    r.uValue,
        weight:                    r.weight,
        cost:                      r.cost,
        comfortPercent:            r.comfortPercent,
        verifiedAgainstSurrogate:  (r as any).verifiedAgainstSurrogate ?? false,
        deltaFromSurrogate:        (r as any).deltaFromSurrogate ?? null,
        indoorTempSeries:          r.indoorTempSeries,
        runCount:                  state.runCount + 1,
      }
      console.log('[DIAGNOSTIC STEP 5][ResultsStore AFTER Write]:', { nextState })
      return nextState
    })
  },

  setReplayTemperature: (temp) =>
    set({ replayTemperature: temp }),

  reset: () => set({ ...DEFAULTS }),
}))
