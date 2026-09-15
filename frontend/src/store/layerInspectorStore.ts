/**
 * frontend/src/store/layerInspectorStore.ts
 *
 * Store for the Layer-by-Layer Architectural Inspector & Physics HUD.
 * Manages layer selection, inspection modals, and multi-material composite views.
 */

import { create } from 'zustand'

export type LayerId =
  | 'insulation'
  | 'thermal_mass'
  | 'pcm'
  | 'glazing'
  | 'solar_beam'
  | 'floor_slab'
  | 'cladding'

export type InspectorTab =
  | 'specs'
  | 'thermal_mass_storage'
  | 'composite_assembly'
  | 'constraints'

interface LayerInspectorState {
  selectedLayerId: LayerId | null
  activeTab: InspectorTab
  isOpen: boolean
}

interface LayerInspectorActions {
  selectLayer: (layerId: LayerId, tab?: InspectorTab) => void
  closeInspector: () => void
  setActiveTab: (tab: InspectorTab) => void
}

export type LayerInspectorStore = LayerInspectorState & LayerInspectorActions

export const useLayerInspectorStore = create<LayerInspectorStore>((set) => ({
  selectedLayerId: null,
  activeTab: 'specs',
  isOpen: false,

  selectLayer: (layerId, tab = 'specs') =>
    set({
      selectedLayerId: layerId,
      activeTab: tab,
      isOpen: true,
    }),

  closeInspector: () =>
    set({
      isOpen: false,
    }),

  setActiveTab: (activeTab) =>
    set({
      activeTab,
    }),
}))
