/**
 * src/store/resultsStore.ts — simulation output state (Zustand).
 * Written by the SIMULATE action; read by RightPanel.
 */
import { create } from 'zustand'
import type { SimulationResult, ScenarioKey, ResultStatus } from '@/domain'

export type { ResultStatus }

interface ResultsState {
  status:            ResultStatus
  indoorTemp:        number
  solarGain:         number
  heatLoss:          number
  comfortHours:      number
  heatingDemand:     number
  estimated:         boolean
  scenarioKey:       ScenarioKey | undefined
  runCount:          number      // incremented on every SIMULATE — drives animation resets
  replayTemperature: number     // current temperature during 24-hour thermal replay animation
}

interface ResultsActions {
  setResults:           (r: SimulationResult) => void
  setReplayTemperature: (temp: number) => void
  reset:                () => void
}

export type ResultsStore = ResultsState & ResultsActions

const DEFAULTS: ResultsState = {
  status:            'idle',
  indoorTemp:        0,
  solarGain:         0,
  heatLoss:          0,
  comfortHours:      0,
  heatingDemand:     0,
  estimated:         false,
  scenarioKey:       undefined,
  runCount:          0,
  replayTemperature: 0,
}

export const useResultsStore = create<ResultsStore>((set) => ({
  ...DEFAULTS,

  setResults: (r) =>
    set(state => ({
      status:        'ready',
      indoorTemp:    r.indoorTemp,
      solarGain:     r.solarGain,
      heatLoss:      r.heatLoss,
      comfortHours:  r.comfortHours,
      heatingDemand: r.heatingDemand,
      estimated:     r.estimated,
      scenarioKey:   r.scenarioKey,
      runCount:      state.runCount + 1,
    })),

  setReplayTemperature: (temp) =>
    set({ replayTemperature: temp }),

  reset: () => set({ ...DEFAULTS }),
}))
