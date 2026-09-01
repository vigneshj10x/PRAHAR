import { useState, useEffect, type FC } from 'react'
import { Play, Zap, GitCompare, HelpCircle, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { useDesignStore }  from '@/store/designStore'
import { useResultsStore } from '@/store/resultsStore'
import { useUIModalStore } from '@/store/uiModalStore'
import { getSimulationService } from '@/services/index'
import type { DesignParams, SimulationResult, HourlyReplayPoint } from '@/domain'
import ThermalReplayChart from '@/features/replay/ThermalReplayChart'
import OptimizeOverlay from '@/features/optimize/OptimizeOverlay'
import CompareModal from '@/features/compare/CompareModal'
import WhatIfPanel from '@/features/what-if/WhatIfPanel'
import ReportModal from '@/features/report/ReportModal'

/* ── Main component ─────────────────────────────────────────────────── */
export const BottomBar: FC = () => {
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

  const [hourlyData, setHourlyData] = useState<HourlyReplayPoint[]>([])

  /* ── Fetch Hourly Replay Data asynchronously ── */
  useEffect(() => {
    let isCancelled = false
    const service = getSimulationService()
    const params: DesignParams = {
      shape:        designParams.shape,
      orientation:  designParams.orientation,
      wallMaterial: designParams.wallMaterial,
      insulation:   designParams.insulation,
      openingRatio: designParams.openingRatio,
      thermalMass:  designParams.thermalMass,
      location:     designParams.location,
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
    designParams.insulation,
    designParams.openingRatio,
    designParams.thermalMass,
    designParams.location,
  ])

  /* ── SIMULATE handler ────────────────────────────────────────── */
  async function handleSimulate() {
    const service = getSimulationService()
    const params: DesignParams = {
      shape:        designParams.shape,
      orientation:  designParams.orientation,
      wallMaterial: designParams.wallMaterial,
      insulation:   designParams.insulation,
      openingRatio: designParams.openingRatio,
      thermalMass:  designParams.thermalMass,
      location:     designParams.location,
    }
    const result = await service.getResults(params)
    setResults(result)
  }

  /* ── AUTO-OPTIMIZE handler ──────────────────────────────────── */
  async function handleAutoOptimize() {
    startOptimize()
    const service = getSimulationService()

    const milestones = [100, 250, 500, 1000]
    let milestoneIndex = 0

    const interval = setInterval(async () => {
      if (milestoneIndex < milestones.length) {
        updateOptimizeProgress(milestones[milestoneIndex])
        milestoneIndex++
      } else {
        clearInterval(interval)
        finishOptimize()

        // Apply Optimized params from service
        const opt = await service.autoOptimize(designParams)
        const cParams = opt.optimizedParams

        setShape(cParams.shape as any)
        setOrientation(cParams.orientation)
        setWallMaterial(cParams.wallMaterial)
        setInsulation(cParams.insulation)
        setOpeningRatio(cParams.openingRatio)
        setThermalMass(cParams.thermalMass)

        setTimeout(() => {
          setResults(opt.results)

          setTimeout(() => {
            useUIModalStore.setState({ activeModal: null })
          }, 1400)
        }, 400)
      }
    }, 500)
  }

  /* ── COMPARE handler ────────────────────────────────────────── */
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
        insulation:   designParams.insulation,
        openingRatio: designParams.openingRatio,
        thermalMass:  designParams.thermalMass,
        location:     designParams.location,
      }
    } else {
      const scenarioA = await service.getScenario('A_baseline')
      beforeResult = scenarioA.results
      beforeParams = {
        ...scenarioA.params,
        location: designParams.location,
      }
    }

    const scenarioC = await service.getScenario('C_optimized')
    const afterResult: SimulationResult = scenarioC.results
    const afterParams: DesignParams = {
      ...scenarioC.params,
      location: designParams.location,
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
