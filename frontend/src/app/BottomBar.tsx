import { useState, useEffect, type FC } from 'react'
import { Play, Zap, GitCompare, HelpCircle, FileText, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, Cpu } from 'lucide-react'
import { useDesignStore }  from '@/store/designStore'
import { useResultsStore } from '@/store/resultsStore'
import { useClimateStore } from '@/store/climateStore'
import { useUIModalStore } from '@/store/uiModalStore'
import { getSimulationService } from '@/services/index'
import type { DesignParams, SimulationResult, HourlyReplayPoint, CandidateDesign, RecommendRequest } from '@/domain'
import { LOCATIONS } from '@/data/locations'
import ThermalReplayChart from '@/features/replay/ThermalReplayChart'
import OptimizeOverlay from '@/features/optimize/OptimizeOverlay'
import CompareModal from '@/features/compare/CompareModal'
import WhatIfPanel from '@/features/what-if/WhatIfPanel'
import ReportModal from '@/features/report/ReportModal'
import FullMapViewModal from '@/features/location/FullMapViewModal'
import AnsysValidationModal from '@/features/validation/AnsysValidationModal'


/* ── Main component ─────────────────────────────────────────────────── */
export const BottomBar: FC = () => {
  // Design params (source of truth for simulation)
  const designParams = useDesignStore()
  const {
    setShape, setOrientation, setWallMaterial, setRoofMaterial, setInsulation,
    setOpeningRatio, setThermalMass, setLength, setWidth, setHeight,
  } = useDesignStore()

  // Simulation results store
  const setResults  = useResultsStore(s => s.setResults)
  const setReplayTemperature = useResultsStore(s => s.setReplayTemperature)
  const status      = useResultsStore(s => s.status)
  const estimated   = useResultsStore(s => s.estimated)
  const scenarioKey = useResultsStore(s => s.scenarioKey)
  const indoorTemp  = useResultsStore(s => s.indoorTemp)
  const solarGain   = useResultsStore(s => s.solarGain)
  const heatLoss    = useResultsStore(s => s.heatLoss)
  const comfortHours = useResultsStore(s => s.comfortHours)
  const heatingDemand = useResultsStore(s => s.heatingDemand)

  // Modal store
  const startOptimize          = useUIModalStore(s => s.startOptimize)
  const updateOptimizeProgress = useUIModalStore(s => s.updateOptimizeProgress)
  const setOptimizeCandidates  = useUIModalStore(s => s.setOptimizeCandidates)
  const startVerifying         = useUIModalStore(s => s.startVerifying)
  const finishVerifying        = useUIModalStore(s => s.finishVerifying)
  const closeOptimize          = useUIModalStore(s => s.closeOptimize)
  const openCompare            = useUIModalStore(s => s.openCompare)
  const openWhatIf             = useUIModalStore(s => s.openWhatIf)
  const openReport             = useUIModalStore(s => s.openReport)
  const openValidation         = useUIModalStore(s => s.openValidation)
  const activeModal            = useUIModalStore(s => s.activeModal)
  const optimize               = useUIModalStore(s => s.optimize)

  const [hourlyData, setHourlyData] = useState<HourlyReplayPoint[]>([])

  // 24-Hour Replay collapsible state (saved to localStorage for preference)
  const [isReplayOpen, setIsReplayOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('thermo_replay_open')
      return saved !== null ? saved === 'true' : false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('thermo_replay_open', String(isReplayOpen))
    } catch {
      // ignore
    }
  }, [isReplayOpen])

  // Arrow key hotkeys: ArrowUp to expand replay, ArrowDown to collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      if (e.key === 'ArrowUp') {
        setIsReplayOpen(true)
      } else if (e.key === 'ArrowDown') {
        setIsReplayOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /* ── Fetch Hourly Replay Data asynchronously ── */
  const selectedLocation = useClimateStore(s => s.selectedLocation)
  const activeProfile = useClimateStore(s => s.activeProfile)

  useEffect(() => {
    let isCancelled = false
    const service = getSimulationService()
    const selectedLoc = useClimateStore.getState().selectedLocation
    const activeProf = useClimateStore.getState().activeProfile

    const params: DesignParams = {
      shape:        designParams.shape,
      orientation:  designParams.orientation,
      wallMaterial: designParams.wallMaterial,
      roofMaterial: designParams.roofMaterial,
      insulation:   designParams.insulation,
      openingRatio: designParams.openingRatio,
      thermalMass:  designParams.thermalMass,
      length:       designParams.length,
      width:        designParams.width,
      height:       designParams.height,
      location:     selectedLoc ? {
        lat: selectedLoc.lat,
        lon: selectedLoc.lon,
        altitude: selectedLoc.altitude,
        hourly_outdoor_temp: (activeProf as any)?.telemetry?.hourlyOutdoorTemps,
        hourly_solar_radiation: (activeProf as any)?.telemetry?.hourlySolarRad,
        wind_speed: activeProf?.windSpeed,
      } : designParams.location,
    }

    service.getHourlyReplay(params).then((data) => {
      if (!isCancelled) {
        setHourlyData(data)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [
    designParams.shape,
    designParams.orientation,
    designParams.wallMaterial,
    designParams.roofMaterial,
    designParams.insulation,
    designParams.openingRatio,
    designParams.thermalMass,
    designParams.length,
    designParams.width,
    designParams.height,
    designParams.location,
    selectedLocation?.lat,
    selectedLocation?.lon,
    activeProfile?.id,
  ])

  /* ── SIMULATE handler ────────────────────────────────────────── */
  async function handleSimulate() {
    const service = getSimulationService()
    const selectedLoc = useClimateStore.getState().selectedLocation
    const activeProf = useClimateStore.getState().activeProfile

    const params: DesignParams = {
      shape:        designParams.shape,
      orientation:  designParams.orientation,
      wallMaterial: designParams.wallMaterial,
      roofMaterial: designParams.roofMaterial,
      insulation:   designParams.insulation,
      openingRatio: designParams.openingRatio,
      thermalMass:  designParams.thermalMass,
      length:       designParams.length,
      width:        designParams.width,
      height:       designParams.height,
      location:     selectedLoc ? {
        lat: selectedLoc.lat,
        lon: selectedLoc.lon,
        altitude: selectedLoc.altitude,
        hourly_outdoor_temp: (activeProf as any)?.telemetry?.hourlyOutdoorTemps,
        hourly_solar_radiation: (activeProf as any)?.telemetry?.hourlySolarRad,
        wind_speed: activeProf?.windSpeed,
      } : designParams.location,
    }
    const result = await service.getResults(params)
    setResults(result)
  }

  /* ── AUTO-OPTIMIZE handler (Fast ML Surrogate Pareto Recommendation) ── */
  async function handleAutoOptimize() {
    startOptimize()
    const service = getSimulationService()

    const milestones = [100, 500, 1500, 2500, 3000]
    let milestoneIndex = 0

    const interval = setInterval(() => {
      if (milestoneIndex < milestones.length) {
        updateOptimizeProgress(milestones[milestoneIndex])
        milestoneIndex++
      }
    }, 120)

    try {
      const selectedLoc = useClimateStore.getState().selectedLocation || LOCATIONS.leh
      const activeProf = useClimateStore.getState().activeProfile
      const req: RecommendRequest = {
        location: {
          lat: selectedLoc.lat,
          lon: selectedLoc.lon,
          altitude: (selectedLoc as any).altitudeNum || selectedLoc.altitude || 3524,
          hourly_outdoor_temp: (activeProf as any)?.telemetry?.hourlyOutdoorTemps,
          hourly_solar_radiation: (activeProf as any)?.telemetry?.hourlySolarRad,
          wind_speed: activeProf?.windSpeed,
        },
        requirements: {
          budget: designParams.budget,
          weightLimit: designParams.weightLimit,
          length: designParams.length,
          occupants: designParams.occupants,
          minComfortPercent: designParams.minComfortPercent,
        },
      }

      const candidates = await service.recommend(req)
      clearInterval(interval)
      updateOptimizeProgress(3000)

      setTimeout(() => {
        setOptimizeCandidates(candidates)
      }, 300)
    } catch (err) {
      clearInterval(interval)
      console.error('[BottomBar] autoOptimize failed:', err)
      closeOptimize()
    }
  }

  /* ── CANDIDATE SELECTION & HIGH-FIDELITY VERIFY handler ─────── */
  async function handleSelectCandidate(cand: CandidateDesign) {
    startVerifying(cand)
    const service = getSimulationService()

    try {
      // 1. Solve ISO 13790 / ISO 6946 transient RC network via backend /api/verify
      const verified = await service.verify(cand.params)

      // 2. Apply Candidate parameters to the global design store
      const p = cand.params as any
      if (p.shape) setShape(p.shape)
      if (p.orientation !== undefined) setOrientation(p.orientation)
      if (p.wallMaterial) setWallMaterial(p.wallMaterial)
      if (p.roofMaterial) setRoofMaterial(p.roofMaterial)
      if (p.insulation !== undefined) setInsulation(p.insulation)
      if (p.opening !== undefined || p.openingRatio !== undefined) {
        setOpeningRatio(p.opening ?? p.openingRatio)
      }
      if (p.thermalMass) setThermalMass(p.thermalMass)
      if (p.length) setLength(p.length)
      if (p.width) setWidth(p.width)
      if (p.height) setHeight(p.height)

      // 3. Display the verified physical truth in the right panel readouts
      setTimeout(() => {
        setResults({
          ...verified,
          estimated: false,
          scenarioKey: undefined,
        })

        // 4. Save verified design for the COMPARE feature
        finishVerifying(verified, {
          shape: p.shape || designParams.shape,
          orientation: p.orientation ?? designParams.orientation,
          wallMaterial: p.wallMaterial || designParams.wallMaterial,
          roofMaterial: p.roofMaterial || designParams.roofMaterial,
          insulation: p.insulation ?? designParams.insulation,
          openingRatio: p.opening ?? p.openingRatio ?? designParams.openingRatio,
          thermalMass: p.thermalMass || designParams.thermalMass,
          location: designParams.location,
          length: p.length ?? designParams.length,
          width: p.width ?? designParams.width,
          height: p.height ?? designParams.height,
        })
      }, 400)
    } catch (err) {
      console.error('[BottomBar] Candidate verification failed:', err)
      closeOptimize()
    }
  }

  /* ── COMPARE handler (Compares current vs verified recommendation) ── */
  async function handleCompare() {
    const service = getSimulationService()
    let beforeResult: SimulationResult
    let beforeParams: DesignParams

    if (status === 'ready') {
      beforeResult = { indoorTemp, solarGain, heatLoss, comfortHours, heatingDemand, estimated, scenarioKey }
      beforeParams = {
        shape:        designParams.shape,
        orientation:  designParams.orientation,
        wallMaterial: designParams.wallMaterial,
        roofMaterial: designParams.roofMaterial,
        insulation:   designParams.insulation,
        openingRatio: designParams.openingRatio,
        thermalMass:  designParams.thermalMass,
        location:     designParams.location,
        length:       designParams.length,
        width:        designParams.width,
        height:       designParams.height,
      }
    } else {
      const scenarioA = await service.getScenario('A_baseline')
      beforeResult = scenarioA.results
      beforeParams = {
        ...scenarioA.params,
        location: designParams.location,
      }
    }

    // Compare against the verified recommendation if available, otherwise Scenario C
    const lastVerified = useUIModalStore.getState().optimize.lastVerifiedRecommendation

    let afterResult: SimulationResult
    let afterParams: DesignParams

    if (lastVerified) {
      afterResult = lastVerified.results
      afterParams = lastVerified.params
    } else {
      const scenarioC = await service.getScenario('C_optimized')
      afterResult = scenarioC.results
      afterParams = {
        ...scenarioC.params,
        location: designParams.location,
      }
    }

    openCompare(beforeResult, beforeParams, afterResult, afterParams)
  }

  /* ── WHAT-IF handler ────────────────────────────────────────── */
  function handleWhatIf() {
    openWhatIf()
  }

  /* ── REPORT handler ─────────────────────────────────────────── */
  function handleReport() {
    openReport()
  }

  /* ── Status strip content ─────────────────────────────────────── */
  const statusText =
    status === 'idle'
      ? 'IDLE — press SIMULATE to run'
      : estimated
        ? `ESTIMATED · ${designParams.location.toUpperCase()}`
        : `EXACT MATCH · ${scenarioKey ?? '—'}`

  const StatusIcon =
    status === 'idle'    ? null :
    estimated            ? AlertCircle :
                           CheckCircle2

  const statusColor =
    status === 'idle' ? 'var(--text-muted)'  :
    estimated         ? 'var(--solar)'        :
                        'var(--ok)'

  return (
    <footer className="bottombar" id="bottom-bar" role="contentinfo">

      {/* ── Row 1: thermal replay chart (collapsible drawer) ──────── */}
      {isReplayOpen && (
        <div className="bottombar-top" style={{ paddingRight: 12, paddingLeft: 12, paddingTop: 5, paddingBottom: 6 }}>
          <ThermalReplayChart
            hourlyData={hourlyData}
            onReplayTempChange={setReplayTemperature}
            height={68}
            onCollapse={() => setIsReplayOpen(false)}
          />
        </div>
      )}

      {/* ── Row 2: action buttons + status ──────────────────────────── */}
      <div className="bottombar-btns">
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginRight: 6,
          flexShrink: 0,
        }}>
          Actions
        </span>

        {/* SIMULATE — primary, wired */}
        <button
          id="btn-simulate"
          className="action-btn primary"
          onClick={handleSimulate}
        >
          <Play size={10} />
          Simulate
        </button>

        {/* Action buttons */}
        {[
          { id: 'btn-optimize',   label: 'Auto-Optimize', icon: <Zap size={10} />, handler: handleAutoOptimize },
          { id: 'btn-compare',    label: 'Compare',       icon: <GitCompare size={10} />, handler: handleCompare },
          { id: 'btn-whatif',     label: 'What-If',       icon: <HelpCircle size={10} />, handler: handleWhatIf },
          { id: 'btn-report',     label: 'Report',        icon: <FileText size={10} />, handler: handleReport },
          { id: 'btn-validation', label: 'FEA Validation', icon: <Cpu size={10} />, handler: openValidation },
        ].map(a => (
          <button key={a.id} id={a.id} className="action-btn" onClick={a.handler}>
            {a.icon}
            {a.label}
          </button>
        ))}

        {/* Vertical divider */}
        <div style={{ width: 1, height: 16, background: 'var(--border-dim)', margin: '0 3px' }} />

        {/* 24-Hour Replay Dropdown / Toggle Button with Up/Down Arrow */}
        <button
          id="btn-toggle-replay"
          className={`action-btn ${isReplayOpen ? 'active' : ''}`}
          onClick={() => setIsReplayOpen(prev => !prev)}
          title={isReplayOpen ? "Collapse 24h Replay (Press ↓ Arrow)" : "Expand 24h Replay (Press ↑ Arrow)"}
          style={{
            borderColor: isReplayOpen ? 'var(--solar)' : 'var(--border-base)',
            color: isReplayOpen ? 'var(--solar)' : 'var(--text-secondary)',
            background: isReplayOpen ? 'rgba(217, 119, 6, 0.09)' : 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isReplayOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          <span>24h Replay</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7.5,
            color: isReplayOpen ? 'var(--solar)' : 'var(--text-muted)',
            padding: '1px 3px',
            border: `1px solid ${isReplayOpen ? 'rgba(217,119,6,0.3)' : 'var(--border-dim)'}`,
            borderRadius: 2,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}>
            {isReplayOpen ? '↓' : '↑'}
          </span>
        </button>

        <div style={{ flex: 1 }} />

        {/* Prototype disclaimer */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
          marginRight: 10,
          opacity: 0.85,
        }}>
          * Prototype simulation data (pre-computed/interpolated). Not yet CFD/ANSYS validated.
        </span>

        {/* Dynamic status strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {StatusIcon
            ? <StatusIcon size={9} color={statusColor} />
            : <div className="status-dot idle" />
          }
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: statusColor,
            letterSpacing: '0.08em',
            transition: 'color 250ms',
          }}>
            {statusText}
          </span>
          <div style={{ width: 1, height: 10, background: 'var(--border-dim)', margin: '0 4px' }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: 'var(--text-faint)',
            letterSpacing: '0.06em',
          }}>
            BUILD 2026.08.31
          </span>
        </div>
      </div>

      {/* ── Modals and panels ──────────────────────────────────────── */}
      <OptimizeOverlay
        isVisible={activeModal === 'optimize'}
        candidatesEvaluated={optimize.candidatesEvaluated}
        isFinished={!optimize.isOptimizing}
        onSelectCandidate={handleSelectCandidate}
      />
      <CompareModal />
      {activeModal === 'whatif' && <WhatIfPanel />}
      <ReportModal />
      <FullMapViewModal />
      <AnsysValidationModal />
    </footer>
  )
}

export default BottomBar
