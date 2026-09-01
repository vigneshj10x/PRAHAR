/**
 * src/store/designStore.ts — shared design-parameter state (Zustand).
 * All panels read/write here; the simulation engine and 3D scene derive from this.
 */
import { create } from 'zustand'
import type { ShapeType, ThermalMassType } from '@/domain'

export type { ShapeType, ThermalMassType }

interface DesignState {
  // Geometry
  shape:        ShapeType
  length:       number          // m
  width:        number          // m
  height:       number          // m
  orientation:  number          // degrees, 0 = North, 180 = South
  // Envelope
  wallMaterial: string
  insulation:   number          // mm  — 25 | 50 | 100 | 150
  openingRatio: number          // %   — 5  | 10 | 14  | 20
  thermalMass:  ThermalMassType
  // Location
  location:     string
}

interface DesignActions {
  setShape:        (v: ShapeType)       => void
  setLength:       (v: number)          => void
  setWidth:        (v: number)          => void
  setHeight:       (v: number)          => void
  setOrientation:  (v: number)          => void
  setWallMaterial: (v: string)          => void
  setInsulation:   (v: number)          => void
  setOpeningRatio: (v: number)          => void
  setThermalMass:  (v: ThermalMassType) => void
  setLocation:     (v: string)          => void
}

export type DesignStore = DesignState & DesignActions

export const useDesignStore = create<DesignStore>((set) => ({
  // ── initial state ──────────────────────────────────────────────
  shape:        'rectangular',
  length:       6,
  width:        4,
  height:       2.5,
  orientation:  180,
  wallMaterial: 'adobe',
  insulation:   50,
  openingRatio: 14,
  thermalMass:  'medium',
  location:     'leh',

  // ── actions ────────────────────────────────────────────────────
  setShape:        (shape)        => set({ shape }),
  setLength:       (length)       => set({ length }),
  setWidth:        (width)        => set({ width }),
  setHeight:       (height)       => set({ height }),
  setOrientation:  (orientation)  => set({ orientation }),
  setWallMaterial: (wallMaterial) => set({ wallMaterial }),
  setInsulation:   (insulation)   => set({ insulation }),
  setOpeningRatio: (openingRatio) => set({ openingRatio }),
  setThermalMass:  (thermalMass)  => set({ thermalMass }),
  setLocation:     (location)     => set({ location }),
}))
