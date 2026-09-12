/**
 * frontend/src/store/navigationStore.ts
 *
 * Zustand store for high-level page and view routing in THERMO-SHIELD.
 * Supports switching between:
 * - 'workbench': Main 3D Digital Twin Simulation Workbench
 * - 'map': Full-Screen Geospatial Climate Map & Exact Coordinate Workstation
 * - 'layer-analytics': Dedicated Full-Page Layer-by-Layer EnergyPlus & Physics Workstation
 */

import { create } from 'zustand'
import type { LayerId } from './layerInspectorStore'

export type AppPage = 'workbench' | 'map' | 'layer-analytics'

interface NavigationState {
  activePage: AppPage
  selectedLayer: LayerId
}

interface NavigationActions {
  setActivePage: (page: AppPage) => void
  setSelectedLayer: (layer: LayerId) => void
  openWorkbench: () => void
  openMap: () => void
  openLayerPage: (layer?: LayerId) => void
}

export type NavigationStore = NavigationState & NavigationActions

export const useNavigationStore = create<NavigationStore>((set) => ({
  activePage: 'workbench',
  selectedLayer: 'insulation',

  setActivePage: (page) => set({ activePage: page }),
  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
  openWorkbench: () => set({ activePage: 'workbench' }),
  openMap: () => set({ activePage: 'map' }),
  openLayerPage: (layer) =>
    set((state) => ({
      activePage: 'layer-analytics',
      selectedLayer: layer || state.selectedLayer || 'insulation',
    })),
}))
