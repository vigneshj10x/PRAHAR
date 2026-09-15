import { useState, useEffect, type FC } from 'react'
import { Play, Zap, GitCompare, HelpCircle, FileText, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, Cpu, Box, Eye } from 'lucide-react'
import { useDesignStore }  from '@/store/designStore'
import { useResultsStore } from '@/store/resultsStore'
import { useClimateStore } from '@/store/climateStore'
import { useUIModalStore } from '@/store/uiModalStore'
import { useNavigationStore } from '@/store/navigationStore'
import { useVisualizationStore } from '@/store/visualizationStore'
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

  const openWorkbench          = useNavigationStore(s => s.openWorkbench)
  const vizMode                = useVisualizationStore(s => s.mode)
  const setVizMode             = useVisualizationStore(s => s.setMode)

  const cyclePerceptionMode = () => {
    const modes = ['normal', 'temperature', 'solargain', 'heatflow'] as const
    const nextIdx = (modes.indexOf(vizMode) + 1) % modes.length
    setVizMode(modes[nextIdx])
  }

  const [hourlyData, setHourlyData] = useState<HourlyReplayPoint[]>([])

  // 24-Hour Replay collapsible state (Defaults to CLOSED on initial load for maximum 3D Viewport height)
  const [isReplayOpen, setIsReplayOpen] = useState<boolean>(false)

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
    setResults(result, {
      shape: params.shape ?? designParams.shape,
      length: params.length ?? designParams.length,
      width: params.width ?? designParams.width,
      height: params.height ?? designParams.height,
      orientation: params.orientation ?? designParams.orientation,
      wallMaterial: params.wallMaterial ?? designParams.wallMaterial,
      roofMaterial: params.roofMaterial ?? designParams.roofMaterial,
      insulation: params.insulation ?? designParams.insulation,
      openingRatio: params.openingRatio ?? designParams.openingRatio,
      thermalMass: params.thermalMass ?? designParams.thermalMass,
      location: typeof params.location === 'string' ? params.location : designParams.location,
    })
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

  /* ── Dynamic Primary CTA Emphasis Derivation ── */
  const lastSimulatedParams = useResultsStore((s) => s.lastSimulatedParams)
  const runCount = useResultsStore((s) => s.runCount)
  const verifiedAgainstSurrogate = useResultsStore((s) => s.verifiedAgainstSurrogate)

  const isStale = status === 'ready' && !!lastSimulatedParams && (
    designParams.shape !== lastSimulatedParams.shape ||
    designParams.length !== lastSimulatedParams.length ||
    designParams.width !== lastSimulatedParams.width ||
    designParams.height !== lastSimulatedParams.height ||
    designParams.orientation !== lastSimulatedParams.orientation ||
    designParams.wallMaterial !== lastSimulatedParams.wallMaterial ||
    designParams.roofMaterial !== lastSimulatedParams.roofMaterial ||
    designParams.insulation !== lastSimulatedParams.insulation ||
    designParams.openingRatio !== lastSimulatedParams.openingRatio ||
    designParams.thermalMass !== lastSimulatedParams.thermalMass
  )

  const isSimulatePrimary = status === 'idle' || isStale || runCount === 0
  const isOptimizePrimary = status === 'ready' && !isStale && !optimize.candidatesEvaluated
  const isReportPrimary = verifiedAgainstSurrogate && !isStale

  /* ── Status strip content ─────────────────────────────────────── */
  const statusText =
    status === 'idle'
      ? 'IDLE — PRESS SIMULATE TO RUN'
      : isStale
        ? 'SIMULATION OUTDATED'
        : estimated
        ? `ESTIMATED · ${designParams.location.toUpperCase()}`
        : `EXACT MATCH · ${scenarioKey ?? '—'}`

  const StatusIcon =
    status === 'idle' ? null :
    isStale           ? AlertCircle :
    estimated         ? AlertCircle :
                        CheckCircle2

  const statusColor =
    status === 'idle' ? 'var(--text-muted)' :
    isStale           ? 'var(--solar)'       :
    estimated         ? 'var(--solar)'       :
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
      <div className="bottombar-btns" style={{ height: 44, minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--bg-panel)', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
        {/* GROUP 1 — CORE */}
        <button
          id="btn-simulate"
          className={`action-btn ${isSimulatePrimary ? 'primary' : ''}`}
          onClick={handleSimulate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 36,
            padding: '0 14px',
            background: isSimulatePrimary ? 'var(--cool)' : 'var(--bg-surface)',
            color: isSimulatePrimary ? '#ffffff' : 'var(--text-secondary)',
            border: isSimulatePrimary ? 'none' : '1px solid var(--border-base)',
            borderRadius: 4,
            fontSize: 10.5,
            fontFamily: 'var(--font-mono)',
            fontWeight: isSimulatePrimary ? 700 : 600,
            cursor: 'pointer',
            boxShadow: isSimulatePrimary ? '0 2px 6px rgba(2, 132, 199, 0.35)' : 'none',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title={isStale ? "Design changed — Click to re-run simulation" : "Run transient thermal physics simulation"}
        >
          <Play size={12} fill={isSimulatePrimary ? "#ffffff" : "currentColor"} />
          <span>SIMULATE</span>
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--border-dim)', margin: '0 2px', flexShrink: 0 }} />

        {/* GROUP 2 — DECISION SUPPORT */}
        <button
          id="btn-optimize"
          onClick={handleAutoOptimize}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            padding: '0 11px',
            background: isOptimizePrimary ? 'var(--solar)' : 'var(--bg-surface)',
            color: isOptimizePrimary ? '#000000' : 'var(--text-secondary)',
            border: isOptimizePrimary ? 'none' : '1px solid var(--border-base)',
            borderRadius: 4,
            fontSize: 10.5,
            fontFamily: 'var(--font-mono)',
            fontWeight: isOptimizePrimary ? 700 : 600,
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: isOptimizePrimary ? '0 2px 6px rgba(217, 119, 6, 0.35)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Run fast ML surrogate Pareto search across 3,000 design permutations"
        >
          <Zap size={12} color={isOptimizePrimary ? "#000000" : "var(--solar)"} />
          <span>AUTO-OPTIMIZE</span>
        </button>

        <button
          id="btn-compare"
          onClick={handleCompare}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            padding: '0 10px',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-base)',
            borderRadius: 4,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          title="Compare baseline vs optimized candidate design side-by-side"
        >
          <GitCompare size={12} />
          <span>COMPARE</span>
        </button>

        <button
          id="btn-whatif"
          onClick={handleWhatIf}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            padding: '0 10px',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-base)',
            borderRadius: 4,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          title="Live parameter sensitivity analysis"
        >
          <HelpCircle size={12} />
          <span>WHAT-IF</span>
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--border-dim)', margin: '0 2px', flexShrink: 0 }} />

        {/* GROUP 3 — OUTPUT */}
        <button
          id="btn-report"
          onClick={handleReport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            padding: '0 11px',
            background: isReportPrimary ? 'var(--ok)' : 'var(--bg-surface)',
            color: isReportPrimary ? '#000000' : 'var(--text-secondary)',
            border: isReportPrimary ? 'none' : '1px solid var(--border-base)',
            borderRadius: 4,
            fontSize: 10.5,
            fontFamily: 'var(--font-mono)',
            fontWeight: isReportPrimary ? 700 : 600,
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: isReportPrimary ? '0 2px 6px rgba(22, 163, 74, 0.35)' : 'none',
            transition: 'all 0.15s ease'
          }}
          title="Generate comprehensive technical defense engineering report"
        >
          <FileText size={12} color={isReportPrimary ? "#000000" : "currentColor"} />
          <span>REPORT</span>
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--border-dim)', margin: '0 2px', flexShrink: 0 }} />

        {/* GROUP 4 — ADVANCED & VIEW CONTROLS */}
        <button
          id="btn-bottom-3d-view"
          onClick={openWorkbench}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            padding: '0 9px',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-base)',
            borderRadius: 4,
            fontSize: 9.5,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title="Switch to 3D Digital Twin View"
        >
          <Box size={11} color="var(--solar)" />
          <span>3D VIEW</span>
        </button>

        <button
          id="btn-bottom-perception"
          onClick={cyclePerceptionMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            padding: '0 9px',
            background: vizMode !== 'normal' ? 'rgba(2, 132, 199, 0.14)' : 'var(--bg-surface)',
            color: vizMode !== 'normal' ? 'var(--cool)' : 'var(--text-secondary)',
            border: `1px solid ${vizMode !== 'normal' ? 'var(--cool)' : 'var(--border-base)'}`,
            borderRadius: 4,
            fontSize: 9.5,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title={`Perception mode: ${vizMode.toUpperCase()} (Click to cycle thermal/sensor perception filters)`}
        >
          <Eye size={11} color={vizMode !== 'normal' ? 'var(--cool)' : 'var(--solar)'} />
          <span>PERCEPTION ({vizMode.toUpperCase()})</span>
        </button>

        <button
          id="btn-validation"
          onClick={openValidation}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minHeight: 36,
            padding: '0 9px',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-dim)',
            borderRadius: 4,
            fontSize: 9.5,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          title="View ANSYS APDL offline validation & benchmark specification"
        >
          <Cpu size={11} color="var(--text-muted)" />
          <span>FEA BENCHMARK</span>
        </button>

        {/* 24-Hour Replay Toggle Drawer Button */}
        <button
          id="btn-toggle-replay"
          onClick={() => setIsReplayOpen(prev => !prev)}
          title={isReplayOpen ? "Collapse 24h Replay analysis drawer" : "Expand 24h Replay analysis drawer"}
          style={{
            minHeight: 36,
            border: `1px solid ${isReplayOpen ? 'var(--solar)' : 'var(--border-dim)'}`,
            color: isReplayOpen ? 'var(--solar)' : 'var(--text-secondary)',
            background: isReplayOpen ? 'rgba(217, 119, 6, 0.14)' : 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 9px',
            borderRadius: 4,
            fontSize: 9.5,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {isReplayOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          <span>
            {status === 'ready'
              ? `▶ 24H REPLAY · 12:00 · ${indoorTemp >= 0 ? `+${indoorTemp.toFixed(1)}` : indoorTemp.toFixed(1)}°C`
              : '▶ 24H REPLAY'}
          </span>
        </button>

        <div style={{ flex: 1 }} />

        {/* Dynamic status strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {StatusIcon
            ? <StatusIcon size={10} color={statusColor} />
            : <div className="status-dot idle" />
          }
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: statusColor,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>
            {statusText}
          </span>
          <div style={{ width: 1, height: 12, background: 'var(--border-dim)', margin: '0 4px' }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}>
            VER 1.0.0
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
