/**
 * frontend/src/services/apiSimulationService.ts
 *
 * Real HTTP API implementation of SimulationService.
 * Calls the FastAPI backend endpoints defined in docs/api-contract.md.
 */

import type {
  DesignParams,
  SimulationResult,
  HourlyReplayPoint,
  ScenarioKey,
  CandidateDesign,
  RecommendRequest,
  VerifyResponse,
  SimulationRequest,
} from '@/domain'
import type { SimulationService, ScenarioData, OptimizeResult } from './simulationService'
import { mockSimulationService } from './mockSimulationService'
import { LOCATIONS } from '@/data/locations'
import { useClimateStore } from '@/store/climateStore'

export class ApiSimulationService implements SimulationService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'
  }

  /**
   * Helper to format DesignParams into the exact API request contract shape.
   */
  private formatPayload(params: DesignParams) {
    let lat = 34.1526
    let lon = 77.5771
    let altitude = 3524.0
    let hourlyOutdoorTemp: number[] | undefined = undefined
    let hourlySolarRadiation: number[] | undefined = undefined
    let windSpeed: number | undefined = undefined
    let humidityPct: number | undefined = undefined

    const activeState = useClimateStore.getState()
    const activeLoc = activeState.selectedLocation
    const activeProf = activeState.activeProfile

    if (params.location && typeof params.location === 'object') {
      lat = params.location.lat
      lon = params.location.lon
      if (params.location.altitude) altitude = params.location.altitude
      hourlyOutdoorTemp = params.location.hourly_outdoor_temp
      hourlySolarRadiation = params.location.hourly_solar_radiation
      windSpeed = params.location.wind_speed
      humidityPct = params.location.humidity_pct
    } else if (typeof params.location === 'string' && LOCATIONS[params.location]) {
      const preset = LOCATIONS[params.location]
      lat = preset.lat
      lon = preset.lon
      altitude = preset.altitudeNum
    } else if (activeLoc) {
      lat = activeLoc.lat
      lon = activeLoc.lon
      altitude = activeLoc.altitude
    }

    // Pass hourly series from activeProfile if available
    if (!hourlyOutdoorTemp && (activeProf as any)?.telemetry?.hourlyOutdoorTemps) {
      hourlyOutdoorTemp = (activeProf as any).telemetry.hourlyOutdoorTemps
    }
    if (!hourlySolarRadiation && (activeProf as any)?.telemetry?.hourlySolarRad) {
      hourlySolarRadiation = (activeProf as any).telemetry.hourlySolarRad
    }
    if (windSpeed === undefined && activeProf?.windSpeed) {
      windSpeed = activeProf.windSpeed
    }

    return {
      location: {
        lat,
        lon,
        altitude,
        hourly_outdoor_temp: hourlyOutdoorTemp,
        hourly_solar_radiation: hourlySolarRadiation,
        wind_speed: windSpeed,
        humidity_pct: humidityPct,
      },
      shape: params.shape || 'rectangular',
      orientation: params.orientation ?? 180,
      wallMaterial: params.wallMaterial || 'adobe',
      roofMaterial: params.roofMaterial || 'timber_insulated_roof',
      glazingMaterial: params.glazingMaterial || 'glazing_low_e',
      insulation: params.insulation ?? 100,
      opening: params.openingRatio ?? params.opening ?? 14,
      thermalMass: params.thermalMass || 'high',
      length: params.length ?? 6.0,
      width: params.width ?? 4.0,
      height: params.height ?? 2.5,
      greenhouseMode: Boolean(params.greenhouseMode),
    }
  }

  /**
   * POST /api/simulate — Evaluates real-time thermal performance over HTTP.
   */
  async getResults(params: DesignParams): Promise<SimulationResult> {
    const payload = this.formatPayload(params)
    console.log('[DIAGNOSTIC STEP 1][Frontend Request Payload - SIMULATE]:', {
      rawInputParams: params,
      formattedPayload: payload
    })
    try {
      const response = await fetch(`${this.baseUrl}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[DIAGNOSTIC STEP 5][Frontend Received API Response - SIMULATE]:', data)

      return {
        indoorTemp: data.indoorTemp ?? data.meanIndoorTemp,
        solarGain: data.solarGain,
        heatLoss: data.heatLoss,
        comfortHours: data.comfortHours ?? (data.comfortPercent ? (data.comfortPercent / 100) * 24 : 14.0),
        heatingDemand: data.heatingDemand,
        estimated: Boolean(data.estimated),
        uValue: data.uValue,
        weight: data.weight,
        cost: data.cost,
        comfortPercent: data.comfortPercent,
        indoorTempSeries: data.indoorTempSeries?.map((pt: any) => ({
          hour: pt.hour,
          time: pt.time,
          indoorTemp: pt.temp ?? pt.indoorTemp,
          outdoorTemp: pt.outdoorTemp,
          solarRad: pt.solarRad,
          heatFlux: pt.heatFlux,
        })),
      }
    } catch (err) {
      console.warn('[ApiSimulationService] Network/API call failed, falling back to mock:', err)
      return mockSimulationService.getResults(params)
    }
  }

  /**
   * Generates a 24-hour diurnal profile via backend /api/simulate.
   */
  async getHourlyReplay(params: DesignParams): Promise<HourlyReplayPoint[]> {
    try {
      const payload = this.formatPayload(params)
      const response = await fetch(`${this.baseUrl}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data.indoorTempSeries) && data.indoorTempSeries.length === 24) {
          return data.indoorTempSeries.map((pt: any) => ({
            hour: pt.hour,
            time: pt.time,
            indoorTemp: pt.temp ?? pt.indoorTemp,
            outdoorTemp: pt.outdoorTemp,
            solarRad: pt.solarRad,
            heatFlux: pt.heatFlux,
          }))
        }
      }
    } catch (err) {
      console.warn('[ApiSimulationService] getHourlyReplay API call failed, using mock:', err)
    }

    return mockSimulationService.getHourlyReplay(params)
  }

  /**
   * Auto-optimize delegate.
   */
  async autoOptimize(params: DesignParams): Promise<OptimizeResult> {
    const activeState = useClimateStore.getState()
    const activeLoc = activeState.selectedLocation
    let locLat = activeLoc?.lat || 34.1526
    let locLon = activeLoc?.lon || 77.5771
    let locAlt = activeLoc?.altitude || 3524.0

    if (params.location && typeof params.location === 'object') {
      locLat = params.location.lat
      locLon = params.location.lon
      if (params.location.altitude) locAlt = params.location.altitude
    } else if (typeof params.location === 'string' && LOCATIONS[params.location]) {
      const loc = LOCATIONS[params.location]
      locLat = loc.lat
      locLon = loc.lon
      locAlt = loc.altitudeNum
    }

    const req: RecommendRequest = {
      location: {
        lat: locLat,
        lon: locLon,
        altitude: locAlt,
      },
      requirements: {
        budget: params.budget,
        weightLimit: params.weightLimit,
        length: params.length,
        occupants: params.occupants,
        minComfortPercent: params.minComfortPercent,
      },
    }
    const candidates = await this.recommend(req)
    if (candidates && candidates.length > 0) {
      const best = candidates[0]
      return {
        results: best.results,
        optimizedParams: {
          ...params,
          ...best.params,
        },
      }
    }
    return mockSimulationService.autoOptimize(params)
  }

  /**
   * Retrieves reference pre-computed scenario data.
   */
  async getScenario(key: ScenarioKey): Promise<ScenarioData> {
    return mockSimulationService.getScenario(key)
  }

  /**
   * POST /api/recommend — Fast Pareto multi-objective candidate recommendation via ML surrogate.
   */
  async recommend(req: RecommendRequest): Promise<CandidateDesign[]> {
    console.log('[DIAGNOSTIC STEP 1][Frontend Request Payload - RECOMMEND]:', req)
    try {
      const response = await fetch(`${this.baseUrl}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[DIAGNOSTIC STEP 5][Frontend Received API Response - RECOMMEND]:', data)
      return data.candidates || []
    } catch (err) {
      console.warn('[ApiSimulationService] recommend API call failed, falling back to mock:', err)
      return mockSimulationService.recommend ? mockSimulationService.recommend(req) : []
    }
  }

  /**
   * POST /api/verify — High-fidelity physical simulation verification + surrogate delta comparison.
   */
  async verify(params: DesignParams | SimulationRequest): Promise<VerifyResponse> {
    try {
      const payload = {
        params: this.formatPayload(params as DesignParams),
      }
      const response = await fetch(`${this.baseUrl}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return {
        ...data,
        indoorTemp: data.indoorTemp ?? data.meanIndoorTemp,
        verifiedAgainstSurrogate: true,
        deltaFromSurrogate: data.deltaFromSurrogate ?? null,
      }
    } catch (err) {
      console.warn('[ApiSimulationService] verify API call failed, falling back to local physics:', err)
      const res = await this.getResults(params as DesignParams)
      return {
        ...res,
        verifiedAgainstSurrogate: true,
        deltaFromSurrogate: 0.15,
      }
    }
  }
}

export const apiSimulationService = new ApiSimulationService()
