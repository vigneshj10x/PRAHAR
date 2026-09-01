/**
 * src/store/uiModalStore.ts — state for modal/panel overlays (Zustand).
 * Manages visibility and data flow for AUTO-OPTIMIZE, COMPARE, WHAT-IF, REPORT.
 */
import { create } from 'zustand'
import type { SimulationResult, DesignParams, ModalType } from '@/domain'

export type { ModalType }

interface OptimizeState {
  isOptimizing: boolean
  candidatesEvaluated: number
}

interface CompareState {
  beforeResult: SimulationResult | null
  beforeParams: DesignParams | null
  afterResult: SimulationResult | null
  afterParams: DesignParams | null
}

interface WhatIfState {
  paramName: 'insulation' | 'orientation' | null
  paramValue: number | null
  liveResult: SimulationResult | null
}

interface UIModalState {
  activeModal: ModalType | null
  optimize: OptimizeState
  compare: CompareState
  whatif: WhatIfState
}

interface UIModalActions {
  setActiveModal: (modal: ModalType | null) => void
  startOptimize: () => void
  updateOptimizeProgress: (candidates: number) => void
  finishOptimize: () => void
  openCompare: (before: SimulationResult, beforeParams: DesignParams, after: SimulationResult, afterParams: DesignParams) => void
  closeCompare: () => void
  openWhatIf: () => void
  updateWhatIfParam: (name: 'insulation' | 'orientation', value: number, result: SimulationResult) => void
  closeWhatIf: () => void
  openReport: () => void
  closeReport: () => void
}

export type UIModalStore = UIModalState & UIModalActions

const DEFAULTS: UIModalState = {
  activeModal: null,
  optimize: { isOptimizing: false, candidatesEvaluated: 0 },
  compare: { beforeResult: null, beforeParams: null, afterResult: null, afterParams: null },
  whatif: { paramName: null, paramValue: null, liveResult: null },
}

export const useUIModalStore = create<UIModalStore>((set) => ({
  ...DEFAULTS,

  setActiveModal: (modal) => set({ activeModal: modal }),

  startOptimize: () =>
    set({
      activeModal: 'optimize',
      optimize: { isOptimizing: true, candidatesEvaluated: 0 },
    }),

  updateOptimizeProgress: (candidates) =>
    set((state) => ({
      optimize: { ...state.optimize, candidatesEvaluated: candidates },
    })),

  finishOptimize: () =>
    set((state) => ({
      optimize: { ...state.optimize, isOptimizing: false },
    })),

  openCompare: (before, beforeParams, after, afterParams) =>
    set({
      activeModal: 'compare',
      compare: { beforeResult: before, beforeParams, afterResult: after, afterParams },
    }),

  closeCompare: () => set({ activeModal: null, compare: DEFAULTS.compare }),

  openWhatIf: () => set({ activeModal: 'whatif', whatif: { paramName: null, paramValue: null, liveResult: null } }),

  updateWhatIfParam: (name, value, result) =>
    set({
      whatif: { paramName: name, paramValue: value, liveResult: result },
    }),

  closeWhatIf: () => set({ activeModal: null, whatif: DEFAULTS.whatif }),

  openReport: () => set({ activeModal: 'report' }),

  closeReport: () => set({ activeModal: null }),
}))
