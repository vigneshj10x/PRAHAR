/**
 * frontend/src/domain/index.ts
 *
 * Centralized Domain Layer — TypeScript types and interfaces.
 * Canonical TypeScript counterpart to docs/api-contract.md.
 *
 * All layers (services, store, features, app, lib) import types from here.
 */

// ─── Location & Geographic Coordinates ────────────────────────────────────────

export interface LocationCoordinates {
  lat:       number                         // decimal degrees (-90.0 to 90.0)
  lon:       number                         // decimal degrees (-180.0 to 180.0)
  altitude?: number                         // meters above sea level
  hourly_outdoor_temp?: number[]            // 24-hour hourly temperatures (°C)
  hourly_solar_radiation?: number[]         // 24-hour solar radiation (W/m²)
  wind_speed?: number                       // m/s
  humidity_pct?: number                     // %
}

export type ShapeType =
  | 'rectangular'
  | 'monopitch'
  | 'gable'
  | 'hip_roof'
  | 'mansard'
  | 'gambrel'
  | 'semidome'
  | 'quonset_extended'
  | 'barrel_vault'
  | 'hyperbolic_paraboloid'
  | 'torus_inflatable'
  | 'geodesic_dome'
  | 'igloo_catenary'
  | 'pyramidal'
  | 'conical_teepee'
  | 'aframe'
  | 'hexagonal_yurt'
  | 'octagonal_pod'
  | 'diamond_faceted'
  | 'wedge_supersonic'
  | 'bifacial_shed'
  | 'stilt_elevated'
  | 'bunker_bermed'
  | 'modular_hex_cluster'
  | 'origami_accordion'

export type ThermalMassType = 'low' | 'medium' | 'high'

export type MaterialCategory = 'wall' | 'roof' | 'insulation' | 'glazing' | 'pcm'

export interface Material {
  id:                  string
  name:                string
  category:            MaterialCategory
  thermalConductivity: number               // W/(m·K)
  density:             number               // kg/m³
  specificHeat:        number               // J/(kg·K)
  thickness:           number               // meters
  emissivity:          number               // 0.0 to 1.0
  solarAbsorptivity:   number               // 0.0 to 1.0
  pcmMeltingPoint:     number | null        // °C (if PCM, else null)
  pcmLatentHeat:       number | null        // kJ/kg (if PCM, else null)
  cost:                number               // ₹ / m² or ₹ / unit
  weight:              number               // kg / m²
  carbonFactor:        number | null        // kgCO2e / kg
  description?:        string
  rValuePerM?:         number
}

// ─── Design & Simulation Parameters ───────────────────────────────────────────

export interface DesignParams {
  location?:     string | LocationCoordinates // 'leh' | 'jaisalmer' | ... or { lat, lon, altitude }
  shape:         string                       // 'rectangular' | 'semidome' | 'aframe'
  orientation:   number                       // degrees: 0 = North, 180 = South
  wallMaterial:  string                       // e.g. adobe, stone, rammed_earth, timber
  roofMaterial?: string                       // e.g. timber_insulated, puff_panel
  glazingMaterial?: string                    // e.g. glazing_low_e, polyethylene_sheet
  insulation:    number                       // mm  — 25 | 50 | 100 | 150 | 200
  openingRatio:  number                       // %   — 5 | 10 | 14 | 20 | 30 (alias of opening)
  opening?:      number                       // %   — API contract standard
  thermalMass:   ThermalMassType              // 'low' | 'medium' | 'high'
  length?:       number                       // meters (default 6.0)
  width?:        number                       // meters (default 4.0)
  height?:       number                       // meters (default 2.5)
  greenhouseMode?:    boolean                 // DIHAR passive solar greenhouse mode
  budget?:            number                  // ₹
  weightLimit?:       number                  // kg
  occupants?:         number                  // persons
  minComfortPercent?: number                  // %
}

/** Standard request payload for POST /api/simulate and POST /api/verify */
export interface SimulationRequest {
  location:     LocationCoordinates
  shape:        string
  orientation:  number
  wallMaterial: string
  roofMaterial: string
  glazingMaterial?: string
  insulation:   number
  opening:      number
  thermalMass:  ThermalMassType
  length:       number
  width:        number
  height:       number
  greenhouseMode?: boolean
}

// ─── Simulation Results & Thermal Telemetry ───────────────────────────────────

export type ScenarioKey = 'A_baseline' | 'B_improved' | 'C_optimized'

export interface HourlyReplayPoint {
  hour:         number                      // 0–23
  time?:        string                      // "00:00" - "23:00"
  outdoorTemp:  number                      // °C
  solarRad:     number                      // W/m² — south-facing vertical surface
  indoorTemp:   number                      // °C
  temp?:        number                      // °C (alias for API contract)
  heatFlux:     number                      // W/m² — positive = net solar gain, negative = net loss
}

/** Alias for backward compatibility */
export type HourlyPoint = HourlyReplayPoint
export type IndoorTempPoint = HourlyReplayPoint

export interface SimulationResult {
  uValue?:                  number          // W/(m²·K)
  indoorTempSeries?:        HourlyReplayPoint[]
  indoorTemp:               number          // °C — 24 h mean indoor temperature
  meanIndoorTemp?:          number          // °C — API contract standard
  solarGain:                number          // W/m² — 24 h average incident on south façade
  heatLoss:                 number          // W/m² — 24 h average (negative convention)
  comfortHours:             number          // h/day above local comfort threshold (~5 °C)
  comfortPercent?:          number          // % of day within thermal comfort band
  heatingDemand:            number          // kWh/day required to reach 18 °C setpoint
  weight?:                  number          // Total envelope mass in kg
  cost?:                    number          // Estimated construction cost in ₹
  estimated:                boolean         // true → surrogate/interpolated; false → verified physics
  scenarioKey?:             ScenarioKey | undefined
  verifiedAgainstSurrogate?: boolean        // Populated on /api/verify
  deltaFromSurrogate?:       number | null   // Populated on /api/verify
}

/** Standard response payload for POST /api/simulate */
export type SimulationResponse = SimulationResult

/** Standard response payload for POST /api/verify */
export interface VerifyResponse extends SimulationResult {
  verifiedAgainstSurrogate: boolean
  deltaFromSurrogate:       number | null
}

// ─── Recommendation & Multi-Objective Optimization ───────────────────────────

export interface RecommendRequirements {
  length?:            number                // target shelter length in meters
  occupants?:         number                // number of personnel accommodated
  budget?:            number                // budget ceiling in ₹
  weightLimit?:       number                // transportation weight limit in kg
  minComfortPercent?: number                // minimum acceptable comfort %
}

export interface RecommendRequest {
  location:     LocationCoordinates
  requirements: RecommendRequirements
}

export interface CandidateDesign {
  id:            string
  params:        DesignParams | SimulationRequest
  results:       SimulationResult
  tradeoffNotes: string
  paretoRank?:   number
}

export interface RecommendResponse {
  candidates:  CandidateDesign[]
  generatedAt: string
}

// ─── Climate & Weather API Contracts ──────────────────────────────────────────

export interface AmbientTempRange {
  min: number                               // °C
  max: number                               // °C
  avg: number                               // °C
}

export interface SolarIrradianceData {
  dailyTotalKwh: number                     // kWh/m²/day
  peakWm2:       number                     // W/m²
}

export interface WindSpeedData {
  avgMs: number                             // m/s
  maxMs: number                             // m/s
}

export interface HumidityData {
  avgPercent: number                        // %
}

export interface SnowData {
  annualSnowfallMm: number                  // mm water equivalent
  maxSnowDepthCm:   number                  // cm
}

export interface ClimateResponse {
  location:         LocationCoordinates & { name?: string }
  ambientTempRange: AmbientTempRange
  solarIrradiance:  SolarIrradianceData
  windSpeed:        WindSpeedData
  humidity:         HumidityData
  snowData:         SnowData
  source:           'open-meteo' | 'nasa-power' | 'merged'
  fetchedAt:        string
}

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
  humidity?:        number
  snowfallMm?:      number
  snowDepthCm?:     number
  source?:          string
  fetchedAt?:       string
  hourlyOutdoorTemp?: number[]
  hourlySolarRadiation?: number[]
}

export type Location = ClimateProfile

export interface LocationPreset {
  id:       string
  name:     string
  region:   string
  zone:     string
  season:   string
  lat:      number
  lon:      number
  altitude: number
}

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
export type ModalType         = 'optimize' | 'compare' | 'whatif' | 'report' | 'fullmap' | 'validation'
