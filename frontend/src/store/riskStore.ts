/**
 * riskStore.ts
 *
 * Zustand store managing Location-Based Disaster Risk Assessment telemetry.
 * Automatically queried when a location is analyzed or selected.
 */
import { create } from 'zustand'

export interface RiskFactorItem {
  factor: 'avalanche' | 'glof' | 'landslide' | 'seismic' | 'extreme_cold' | 'snow_load' | 'flash_flood' | string
  title: string
  level: 'Low' | 'Moderate' | 'High' | 'Critical'
  justification: string
  dataSource: string
}

export interface RiskAssessmentData {
  location: {
    lat: number
    lon: number
    elevation: number
    slopeAngle: number
    aspect: string
  }
  risks: RiskFactorItem[]
  overallRiskSummary: string
  disclaimer: string
  evaluatedAt: string
}

interface RiskState {
  data: RiskAssessmentData | null
  isLoading: boolean
  error: string | null
  fetchRiskAssessment: (lat: number, lon: number) => Promise<void>
  clearRiskData: () => void
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useRiskStore = create<RiskState>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  fetchRiskAssessment: async (lat: number, lon: number) => {
    set({ isLoading: true, error: null })
    try {
      const resp = await fetch(`${API_BASE}/api/risk-assessment/${lat.toFixed(4)}/${lon.toFixed(4)}`)
      if (!resp.ok) {
        throw new Error(`Risk assessment API returned status ${resp.status}`)
      }
      const data: RiskAssessmentData = await resp.json()
      set({ data, isLoading: false, error: null })
    } catch (err: any) {
      console.error('[riskStore] Error fetching risk assessment:', err)
      set({
        isLoading: false,
        error: err?.message || 'Failed to retrieve disaster risk assessment',
      })
    }
  },

  clearRiskData: () => set({ data: null, isLoading: false, error: null }),
}))
