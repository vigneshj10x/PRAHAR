/**
 * frontend/src/store/climateStore.ts
 *
 * Zustand store managing real-time climate telemetry, location selection,
 * geocoding search, and Open-Meteo + NASA POWER merged data synchronization.
 */

import { create } from 'zustand'
import type { ClimateProfile } from '@/domain'
import { LOCATIONS } from '@/data/locations'
import { adaptBackendClimateToProfile } from '@/lib/climateAdapter'
import { useDesignStore } from './designStore'
import { useRiskStore } from './riskStore'

export interface LocationItem {
  id?: string
  name: string
  city?: string
  region?: string
  country?: string
  lat: number
  lon: number
  altitude: number
}

interface ClimateState {
  // Current active geographic coordinates & metadata
  selectedLocation: LocationItem

  // Dynamic climate profile (computed from real Open-Meteo + NASA POWER data)
  activeProfile: ClimateProfile

  // Telemetry status
  isLoading: boolean
  error: string | null
  dataSource: 'merged' | 'open-meteo' | 'nasa-power' | 'fallback' | 'preset'
  lastFetchedAt: string | null

  // Geocoding search state
  searchQuery: string
  searchResults: LocationItem[]
  isSearching: boolean
  searchError: string | null

  // Actions
  setSearchQuery: (q: string) => void
  searchPlaces: (q: string) => Promise<void>
  clearSearchResults: () => void
  setSelectedLocation: (loc: LocationItem) => void
  fetchClimateForLocation: (lat: number, lon: number, name?: string, altitude?: number) => Promise<ClimateProfile | null>
  selectPreset: (presetId: string) => Promise<void>
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

const INITIAL_LOCATION: LocationItem = {
  id: 'leh',
  name: 'Leh, Ladakh',
  region: 'Ladakh (High Altitude Cold Desert)',
  lat: 34.1526,
  lon: 77.5771,
  altitude: 3524,
}

export const useClimateStore = create<ClimateState>((set, get) => ({
  selectedLocation: INITIAL_LOCATION,
  activeProfile: LOCATIONS.leh,
  isLoading: false,
  error: null,
  dataSource: 'preset',
  lastFetchedAt: null,

  searchQuery: '',
  searchResults: [],
  isSearching: false,
  searchError: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  clearSearchResults: () => set({ searchResults: [], searchError: null }),

  setSelectedLocation: (loc) => {
    set({ selectedLocation: loc })
    // Also sync to designStore location tag
    const locId = loc.id || loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)
    useDesignStore.getState().setLocation(locId)
  },

  searchPlaces: async (query: string) => {
    const q = query.trim()
    if (q.length < 2) {
      set({ searchResults: [], isSearching: false })
      return
    }

    set({ isSearching: true, searchError: null })
    try {
      // 1. Try backend geocode endpoint
      let results: LocationItem[] = []
      try {
        const resp = await fetch(`${API_BASE_URL}/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: AbortSignal.timeout(5000),
        })
        if (resp.ok) {
          results = await resp.json()
        }
      } catch {
        // 2. Direct fallback to Open-Meteo Geocoding API if backend is offline
        const directResp = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
          { signal: AbortSignal.timeout(6000) }
        )
        if (directResp.ok) {
          const data = await directResp.json()
          results = (data.results || []).map((r: any) => ({
            id: String(r.id),
            name: `${r.name}, ${r.admin1 || r.country || ''}`.trim().replace(/,\s*$/, ''),
            city: r.name,
            region: r.admin1 || '',
            country: r.country || '',
            lat: Number(r.latitude),
            lon: Number(r.longitude),
            altitude: Number(r.elevation || 0),
          }))
        }
      }

      set({ searchResults: results, isSearching: false })
    } catch (err: any) {
      console.warn('[climateStore] Search error:', err)
      set({
        searchError: 'Geocoding service unavailable. Try entering coordinates or clicking the map.',
        isSearching: false,
      })
    }
  },

  fetchClimateForLocation: async (lat: number, lon: number, name?: string, altitude?: number) => {
    set({ isLoading: true, error: null })
    const locName = name || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`

    try {
      // Call backend GET /api/climate/:lat/:lon
      let data: any = null
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/climate/${lat.toFixed(4)}/${lon.toFixed(4)}?name=${encodeURIComponent(locName)}`,
          { signal: AbortSignal.timeout(12000) }
        )
        if (resp.ok) {
          data = await resp.json()
        } else {
          throw new Error(`Server returned HTTP ${resp.status}`)
        }
      } catch (backendErr) {
        console.warn('[climateStore] Backend climate call failed, attempting direct Open-Meteo fallback:', backendErr)
        // Client-side direct Open-Meteo fallback if backend is unreachable
        const omResp = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,direct_normal_irradiance,diffuse_radiation,wind_speed_10m,snowfall,snow_depth&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,snowfall_sum,wind_speed_10m_max,shortwave_radiation_sum&timezone=auto&forecast_days=1`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (omResp.ok) {
          const omData = await omResp.json()
          const daily = omData.daily || {}
          const hourly = omData.hourly || {}
          data = {
            location: {
              lat,
              lon,
              name: locName,
              altitude: Number(omData.elevation ?? altitude ?? 0),
            },
            ambientTempRange: {
              min: Number(daily.temperature_2m_min?.[0] ?? -10),
              max: Number(daily.temperature_2m_max?.[0] ?? 5),
              avg: Number(daily.temperature_2m_mean?.[0] ?? -2.5),
            },
            solarIrradiance: {
              dailyTotalKwh: Number(((daily.shortwave_radiation_sum?.[0] ?? 16) / 3.6).toFixed(2)),
              peakWm2: hourly.direct_normal_irradiance
                ? Math.max(...hourly.direct_normal_irradiance.map((v: number, i: number) => v + (hourly.diffuse_radiation?.[i] ?? 0)))
                : 500,
            },
            windSpeed: {
              avgMs: Number((hourly.wind_speed_10m ? hourly.wind_speed_10m.reduce((a: number, b: number) => a + b, 0) / hourly.wind_speed_10m.length : 3.2).toFixed(1)),
              maxMs: Number(daily.wind_speed_10m_max?.[0] ?? 7.0),
            },
            humidity: {
              avgPercent: Number((hourly.relative_humidity_2m ? hourly.relative_humidity_2m.reduce((a: number, b: number) => a + b, 0) / hourly.relative_humidity_2m.length : 40).toFixed(1)),
            },
            snowData: {
              annualSnowfallMm: Number(daily.snowfall_sum?.[0] ?? 0) * 10,
              maxSnowDepthCm: hourly.snow_depth ? Math.max(...hourly.snow_depth) : 0,
            },
            source: 'open-meteo',
            fetchedAt: new Date().toISOString(),
          }
        } else {
          throw new Error('All climate data sources unreachable.')
        }
      }

      if (!data) {
        throw new Error('No climate telemetry received.')
      }

      // Convert to full rich ClimateProfile
      const profile = adaptBackendClimateToProfile(data)
      const locItem: LocationItem = {
        id: profile.id,
        name: profile.name,
        region: profile.region,
        lat: profile.lat,
        lon: profile.lon,
        altitude: profile.altitudeNum,
      }

      set({
        selectedLocation: locItem,
        activeProfile: profile,
        isLoading: false,
        error: null,
        dataSource: (data.source as any) || 'merged',
        lastFetchedAt: data.fetchedAt || new Date().toISOString(),
      })

      // Sync with designStore
      useDesignStore.getState().setLocation(profile.id)

      // Parallel Location-Based Disaster Risk Assessment (informational, non-blocking)
      useRiskStore.getState().fetchRiskAssessment(lat, lon)

      return profile
    } catch (err: any) {
      console.error('[climateStore] Failed to analyze climate:', err)
      set({
        isLoading: false,
        error: `Climate telemetry analysis failed: ${err.message || 'Connection error'}. Please check coordinates or try again.`,
      })
      return null
    }
  },

  selectPreset: async (presetId: string) => {
    const preset = LOCATIONS[presetId] || LOCATIONS.leh
    const locItem: LocationItem = {
      id: preset.id,
      name: preset.name,
      region: preset.region,
      lat: preset.lat,
      lon: preset.lon,
      altitude: preset.altitudeNum,
    }

    set({
      selectedLocation: locItem,
      activeProfile: preset,
      dataSource: 'preset',
      error: null,
    })

    useDesignStore.getState().setLocation(preset.id)

    // Automatically trigger live analysis to get real-time climate data for preset
    get().fetchClimateForLocation(preset.lat, preset.lon, preset.name, preset.altitudeNum)
  },
}))
