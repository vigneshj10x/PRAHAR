/**
 * src/store/visualizationStore.ts — visualization & camera view mode state (Zustand).
 * Manages rendering mode (normal/temperature/heatflow/solargain) and
 * camera perspective (perspective/top/south/section).
 */
import { create } from 'zustand'
import type { VisualizationMode, CameraViewMode } from '@/domain'

export type { VisualizationMode, CameraViewMode }

interface VisualizationState {
  mode:           VisualizationMode
  viewMode:       CameraViewMode
  cameraResetKey: number
}

interface VisualizationActions {
  setMode:     (mode: VisualizationMode) => void
  setViewMode: (viewMode: CameraViewMode) => void
  resetCamera: () => void
}

export type VisualizationStore = VisualizationState & VisualizationActions

export const useVisualizationStore = create<VisualizationStore>((set) => ({
  mode:           'normal',
  viewMode:       'perspective',
  cameraResetKey: 0,

  setMode:        (mode) => set({ mode }),
  setViewMode:    (viewMode) => set({ viewMode }),
  resetCamera:    () => set((s) => ({ cameraResetKey: s.cameraResetKey + 1 })),
}))
