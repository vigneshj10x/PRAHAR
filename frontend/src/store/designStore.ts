/**
 * src/store/designStore.ts — shared design-parameter state (Zustand).
 * All panels read/write here; the simulation engine and 3D scene derive from this.
 */
import { create } from 'zustand'
import type {
  ShapeType,
  ThermalMassType,
  ShelterPurpose,
  ShelterPermanence,
  DeploymentMethod,
  HardeningLevel,
} from '@/domain'

export type {
  ShapeType,
  ThermalMassType,
  ShelterPurpose,
  ShelterPermanence,
  DeploymentMethod,
  HardeningLevel,
}

interface DesignState {
  // Geometry
  shape:        ShapeType
  length:       number          // m
  width:        number          // m
  height:       number          // m
  orientation:  number          // degrees, 0 = North, 180 = South
  // Envelope
  wallMaterial: string
  roofMaterial: string
  insulation:   number          // mm  — 25 | 50 | 100 | 150
  openingRatio: number          // %   — 5  | 10 | 14  | 20
  thermalMass:  ThermalMassType
  // Location
  location:     string
  // Optimization Requirements
  occupants:         number
  budget:            number
  weightLimit:       number
  minComfortPercent: number

  // DRDO Operational Profile
  shelterPurpose:      ShelterPurpose
  shelterType:         string
  shelterPermanence:   ShelterPermanence
  deploymentMethod:    DeploymentMethod
  hardening:           HardeningLevel
  buildStartDate:      string
  buildDurationYears:  number
  availableMaterials:  string[]
}

interface DesignActions {
  setShape:             (v: ShapeType)          => void
  setLength:            (v: number)             => void
  setWidth:             (v: number)             => void
  setHeight:            (v: number)             => void
  setOrientation:       (v: number)             => void
  setWallMaterial:      (v: string)             => void
  setRoofMaterial:      (v: string)             => void
  setInsulation:        (v: number)             => void
  setOpeningRatio:      (v: number)             => void
  setThermalMass:       (v: ThermalMassType)    => void
  setLocation:          (v: string)             => void
  setOccupants:         (v: number)             => void
  setBudget:            (v: number)             => void
  setWeightLimit:       (v: number)             => void
  setMinComfortPercent: (v: number)             => void

  // Operational Profile Actions
  setShelterPurpose:      (v: ShelterPurpose)     => void
  setShelterType:         (v: string)             => void
  setShelterPermanence:   (v: ShelterPermanence)  => void
  setDeploymentMethod:    (v: DeploymentMethod)   => void
  setHardening:           (v: HardeningLevel)     => void
  setBuildStartDate:      (v: string)             => void
  setBuildDurationYears:  (v: number)             => void
  setAvailableMaterials:  (v: string[])           => void
}

export type DesignStore = DesignState & DesignActions

export const useDesignStore = create<DesignStore>((set) => ({
  // ── initial state ──────────────────────────────────────────────
  shape:        'rectangular',
  length:       6,
  width:        4,
  height:       2.5,
  orientation:  180,
  wallMaterial: 'puf_sandwich_panel',
  roofMaterial: 'timber_insulated_roof',
  insulation:   50,
  openingRatio: 14,
  thermalMass:  'medium',
  location:     'leh',
  occupants:         4,
  budget:            200000,
  weightLimit:       6000,
  minComfortPercent: 50,

  // DRDO Operational Profile initial state
  shelterPurpose:      'troop_habitation',
  shelterType:         'puf_barracks',
  shelterPermanence:   'semi_permanent',
  deploymentMethod:    'road_bound',
  hardening:           'non_ballistic',
  buildStartDate:      new Date().toISOString().split('T')[0],
  buildDurationYears:  5,
  availableMaterials:  [],

  // ── actions ────────────────────────────────────────────────────
  setShape:             (shape)             => set({ shape }),
  setLength:            (length)            => set({ length }),
  setWidth:             (width)             => set({ width }),
  setHeight:            (height)            => set({ height }),
  setOrientation:       (orientation)       => set({ orientation }),
  setWallMaterial:      (wallMaterial)      => set({ wallMaterial }),
  setRoofMaterial:      (roofMaterial)      => set({ roofMaterial }),
  setInsulation:        (insulation)        => set({ insulation }),
  setOpeningRatio:      (openingRatio)      => set({ openingRatio }),
  setThermalMass:       (thermalMass)       => set({ thermalMass }),
  setLocation:          (location)          => set({ location }),
  setOccupants:         (occupants)         => set({ occupants }),
  setBudget:            (budget)            => set({ budget }),
  setWeightLimit:       (weightLimit)       => set({ weightLimit }),
  setMinComfortPercent: (minComfortPercent) => set({ minComfortPercent }),

  // Operational Profile Setters
  setShelterPurpose:      (shelterPurpose)      => set({ shelterPurpose }),
  setShelterType:         (shelterType)         => set({ shelterType }),
  setShelterPermanence:   (shelterPermanence)   => set({ shelterPermanence }),
  setDeploymentMethod:    (deploymentMethod)    => set({ deploymentMethod }),
  setHardening:           (hardening)           => set({ hardening }),
  setBuildStartDate:      (buildStartDate)      => set({ buildStartDate }),
  setBuildDurationYears:  (buildDurationYears)  => set({ buildDurationYears }),
  setAvailableMaterials:  (availableMaterials)  => set({ availableMaterials }),
}))
