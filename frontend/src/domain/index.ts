/**
 * src/domain/index.ts
 *
 * Centralized Domain Layer — TypeScript types and interfaces only.
 * No runtime logic, side-effects, or component code.
 *
 * Every other layer (services, store, features, app, lib) imports types from here.
 */

// ─── Geometry & Architectural Shapes ──────────────────────────────────────────

export type ShapeType = 'rectangular' | 'semidome' | 'aframe'

export type ThermalMassType = 'low' | 'medium' | 'high'

export interface Material {
  id:          string
  name:        string
  description: string
  rValuePerM?: number
  density?:    number
}

// ─── Design Parameters ────────────────────────────────────────────────────────

export interface DesignParams {
  shape:        string
  orientation:  number                      // degrees: 0 = North, 180 = South
  wallMaterial: string                      // e.g. adobe, stone, earthbag, timber
  insulation:   number                      // mm  — 25 | 50 | 100 | 150
  openingRatio: number                      // %   — 5  | 10 | 14  | 20
  thermalMass:  ThermalMassType
  location?:    string                      // 'leh' | 'jaisalmer' | 'delhi' | 'kochi' | 'srinagar'
  // Optional dimensions if customized
  length?:      number                      // meters
  width?:       number                      // meters
  height?:      number                      // meters
}

// ─── Simulation Results & Thermal Telemetry ───────────────────────────────────

export type ScenarioKey = 'A_baseline' | 'B_improved' | 'C_optimized'

export interface SimulationResult {
  indoorTemp:    number                     // °C   — 24 h average
  solarGain:     number                     // W/m² — 24 h average incident on south façade
  heatLoss:      number                     // W/m² — 24 h average (negative convention)
  comfortHours:  number                     // h/day above local comfort threshold (~5 °C for Leh)
  heatingDemand: number                     // kWh/day required to reach 18 °C setpoint
  estimated:     boolean                    // true → interpolated; false → exact scenario match
  scenarioKey?:  ScenarioKey | undefined
}

export interface HourlyReplayPoint {
  hour:        number                       // 0–23
  outdoorTemp: number                       // °C
  solarRad:    number                       // W/m²  — south-facing vertical surface
  indoorTemp:  number                       // °C
  heatFlux:    number                       // W/m²  — positive = net solar gain, negative = net fabric loss
}

/** Alias for backward compatibility */
export type HourlyPoint = HourlyReplayPoint

// ─── Scenario Data Definitions ────────────────────────────────────────────────

export interface Scenario {
  meta: {
    label:       string
    description: string
  }
  params: {
    shape:        string
    orientation:  number
    wallMaterial: string
    insulation:   number
    openingRatio: number
    thermalMass:  ThermalMassType
  }
  results: {
    indoorTemp:    number
    solarGain:     number
    heatLoss:      number
    comfortHours:  number
    heatingDemand: number
  }
  hourly: HourlyReplayPoint[]
}

export type ScenariosShape = {
  [K in ScenarioKey]: Scenario
}

// ─── Bioclimatic & Environmental Profiles ─────────────────────────────────────

export interface SceneTheme {
  groundColor:      string
  skyColor:         string
  ambientColor:     string
  ambientIntensity: number
  sunColor:         string
  sunElevation:     number                  // degrees
  sunAzimuth:       number                  // degrees
  gridColor:        string
  gridCenterColor:  string
}

export interface ClimateProfile {
  id:               string
  name:             string
  region:           string
  zone:             string
  season:           string
  altitude:         string
  altitudeNum:      number                  // meters
  coordinates:      string
  lat:              number
  lon:              number
  statusLine:       string
  tOut:             string
  tOutMin:          number                  // °C
  tOutMax:          number                  // °C
  tOutAvg:          number                  // °C
  wind:             string
  windSpeed:        number                  // m/s
  gSouth:           string
  gSouthValue:      number                  // W/m²
  ambientTempRange: string
  solarPotential:   string
  sunshine:         string
  nightHeatLoss:    string
  solarOpportunity: string
  designPriorities: string[]
  sceneTheme:       SceneTheme
}

export type Location = ClimateProfile

// ─── Optimization Data & UI States ────────────────────────────────────────────

export interface OptimizationTrace {
  candidatesEvaluated: number
  milestones:          number[]
  isOptimizing:        boolean
  isFinished:          boolean
}

export type VisualizationMode = 'normal' | 'temperature' | 'heatflow' | 'solargain'
export type CameraViewMode    = 'perspective' | 'top' | 'south' | 'section'
export type ResultStatus      = 'idle' | 'ready'
export type ModalType         = 'optimize' | 'compare' | 'whatif' | 'report'
