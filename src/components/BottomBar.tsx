import type { FC } from 'react'
import { Play, Zap, GitCompare, HelpCircle, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { useDesignStore }  from '../store/designStore'
import { useResultsStore } from '../store/resultsStore'
import { useUIModalStore } from '../store/uiModalStore'
import { getScenarioResults, getHourlyReplay } from '../lib/simulationEngine'
import type { DesignParams, SimulationResult } from '../lib/simulationEngine'
import ThermalReplayChart from './ThermalReplayChart'
import OptimizeOverlay from './OptimizeOverlay'
import CompareModal from './CompareModal'
import WhatIfPanel from './WhatIfPanel'
import ReportModal from './ReportModal'
import scenarios from '../data/scenarios.json'

/* ── Main component ─────────────────────────────────────────────────── */
const BottomBar: FC = () => {
  // Design params (source of truth for simulation)
  const designParams = useDesignStore()
  const {
    setShape, setOrientation, setWallMaterial, setInsulation, setOpeningRatio, setThermalMass,
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
  const startOptimize = useUIModalStore(s => s.startOptimize)
  const updateOptimizeProgress = useUIModalStore(s => s.updateOptimizeProgress)
  const finishOptimize = useUIModalStore(s => s.finishOptimize)
  const openCompare = useUIModalStore(s => s.openCompare)
  const openWhatIf = useUIModalStore(s => s.openWhatIf)
  const openReport = useUIModalStore(s => s.openReport)
  const activeModal = useUIModalStore(s => s.activeModal)
  const optimize = useUIModalStore(s => s.optimize)

  /* ── SIMULATE handler ────────────────────────────────────────── */
  function handleSimulate() {
    const params: DesignParams = {
      shape:        designParams.shape,
      orientation:  designParams.orientation,
      wallMaterial: designParams.wallMaterial,
      insulation:   designParams.insulation,
      openingRatio: designParams.openingRatio,
      thermalMass:  designParams.thermalMass,
      location:     designParams.location,
    }
    const result = getScenarioResults(params)
    setResults(result)
  }

  /* ── AUTO-OPTIMIZE handler ──────────────────────────────────── */
  function handleAutoOptimize() {
    startOptimize()

    const milestones = [100, 250, 500, 1000]
    let milestoneIndex = 0

    const interval = setInterval(() => {
      if (milestoneIndex < milestones.length) {
        updateOptimizeProgress(milestones[milestoneIndex])
        milestoneIndex++
      } else {
        clearInterval(interval)
        finishOptimize()

        // Apply Scenario C_optimized params
        const scenarioC = (scenarios as any).C_optimized
        const cParams   = scenarioC.params

        setShape(cParams.shape)
        setOrientation(cParams.orientation)
        setWallMaterial(cParams.wallMaterial)
        setInsulation(cParams.insulation)
        setOpeningRatio(cParams.openingRatio)
        setThermalMass(cParams.thermalMass)

        setTimeout(() => {
          const params: DesignParams = {
            shape:        cParams.shape,
            orientation:  cParams.orientation,
            wallMaterial: cParams.wallMaterial,
            insulation:   cParams.insulation,
            openingRatio: cParams.openingRatio,
            thermalMass:  cParams.thermalMass,
            location:     designParams.location,
          }
          const result = getScenarioResults(params)
          setResults(result)

          setTimeout(() => {
            useUIModalStore.setState({ activeModal: null })
          }, 1400)
        }, 400)
      }
    }, 500)
  }

  /* ── COMPARE handler ────────────────────────────────────────── */
  function handleCompare() {
    let beforeResult: SimulationResult
    let beforeParams: DesignParams

    if (status === 'ready') {
      beforeResult = { indoorTemp, solarGain, heatLoss, comfortHours, heatingDemand, estimated, scenarioKey }
      beforeParams = {
        shape:        designParams.shape,
        orientation:  designParams.orientation,
        wallMaterial: designParams.wallMaterial,
        insulation:   designParams.insulation,
        openingRatio: designParams.openingRatio,
        thermalMass:  designParams.thermalMass,
        location:     designParams.location,
      }
    } else {
      const A = (scenarios as any).A_baseline
      beforeResult = {
        indoorTemp:    A.results.indoorTemp,
        solarGain:     A.results.solarGain,
        heatLoss:      A.results.heatLoss,
        comfortHours:  A.results.comfortHours,
        heatingDemand: A.results.heatingDemand,
        estimated:     false,
        scenarioKey:   'A_baseline',
      }
      beforeParams = {
        shape:        A.params.shape,
        orientation:  A.params.orientation,
        wallMaterial: A.params.wallMaterial,
        insulation:   A.params.insulation,
        openingRatio: A.params.openingRatio,
        thermalMass:  A.params.thermalMass,
        location:     designParams.location,
      }
    }

    const C = (scenarios as any).C_optimized
    const afterResult: SimulationResult = {
      indoorTemp:    C.results.indoorTemp,
      solarGain:     C.results.solarGain,
      heatLoss:      C.results.heatLoss,
      comfortHours:  C.results.comfortHours,
      heatingDemand: C.results.heatingDemand,
      estimated:     false,
      scenarioKey:   'C_optimized',
    }
    const afterParams: DesignParams = {
      shape:        C.params.shape,
      orientation:  C.params.orientation,
      wallMaterial: C.params.wallMaterial,
      insulation:   C.params.insulation,
      openingRatio: C.params.openingRatio,
      thermalMass:  C.params.thermalMass,
      location:     designParams.location,
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

  /* ── Hourly replay data ──────────────────────────────────────── */
  const designParamsForReplay: DesignParams = {
    shape:        designParams.shape,
    orientation:  designParams.orientation,
    wallMaterial: designParams.wallMaterial,
    insulation:   designParams.insulation,
    openingRatio: designParams.openingRatio,
    thermalMass:  designParams.thermalMass,
    location:     designParams.location,
  }
  const hourlyData = getHourlyReplay(designParamsForReplay)

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

      {/* ── Row 1: thermal replay chart ────────────────────────────── */}
      <div className="bottombar-top" style={{ paddingRight: 12, paddingLeft: 12, paddingTop: 6 }}>
        <ThermalReplayChart
          hourlyData={hourlyData}
          onReplayTempChange={setReplayTemperature}
          height={125}
        />
      </div>

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
          { id: 'btn-optimize', label: 'Auto-Optimize', icon: <Zap size={10} />, handler: handleAutoOptimize },
          { id: 'btn-compare',  label: 'Compare',       icon: <GitCompare size={10} />, handler: handleCompare },
          { id: 'btn-whatif',   label: 'What-If',       icon: <HelpCircle size={10} />, handler: handleWhatIf },
          { id: 'btn-report',   label: 'Report',        icon: <FileText size={10} />, handler: handleReport },
        ].map(a => (
          <button key={a.id} id={a.id} className="action-btn" onClick={a.handler}>
            {a.icon}
            {a.label}
          </button>
        ))}

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
      />
      <CompareModal />
      {activeModal === 'whatif' && <WhatIfPanel />}
      <ReportModal />
    </footer>
  )
}

export default BottomBar
