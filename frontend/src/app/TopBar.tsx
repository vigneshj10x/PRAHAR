import type { FC } from 'react'
import { Wifi, Layers, Shield, ChevronRight, Check } from 'lucide-react'
import { useDesignStore } from '@/store/designStore'
import { useClimateStore } from '@/store/climateStore'
import { useNavigationStore } from '@/store/navigationStore'
import { useResultsStore } from '@/store/resultsStore'
import { useUIModalStore } from '@/store/uiModalStore'
import { getLocationProfile } from '@/data/locations'

export const TopBar: FC = () => {
  const locationId = useDesignStore((s) => s.location)
  const activeProfile = useClimateStore((s) => s.activeProfile)
  const loc = activeProfile || getLocationProfile(locationId)

  const activePage = useNavigationStore((s) => s.activePage)
  const openWorkbench = useNavigationStore((s) => s.openWorkbench)
  const openLayerPage = useNavigationStore((s) => s.openLayerPage)

  const status = useResultsStore((s) => s.status)
  const runCount = useResultsStore((s) => s.runCount)
  const lastSimulatedParams = useResultsStore((s) => s.lastSimulatedParams)
  const verifiedAgainstSurrogate = useResultsStore((s) => s.verifiedAgainstSurrogate)
  const openReport = useUIModalStore((s) => s.openReport)
  const setActiveModal = useUIModalStore((s) => s.setActiveModal)
  const activeModal = useUIModalStore((s) => s.activeModal)
  const candidatesEvaluated = useUIModalStore((s) => s.optimize.candidatesEvaluated)

  const designParams = useDesignStore()

  const isMockEngine = import.meta.env.VITE_USE_MOCK_ENGINE === 'true'

  // Stale design parameter check
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

  // Guided Workflow Stage & State derivation
  let currentStage = 'site'
  if (verifiedAgainstSurrogate || activeModal === 'report') {
    currentStage = 'report'
  } else if (candidatesEvaluated > 0) {
    currentStage = 'verify'
  } else if (status === 'ready' && !isStale) {
    currentStage = 'optimize'
  } else if (isStale || status === 'ready') {
    currentStage = 'simulate'
  } else if (loc) {
    currentStage = 'design'
  }

  const completedStages = new Set<string>()
  if (loc) completedStages.add('site')
  if (status === 'ready' || runCount > 0) completedStages.add('design')
  if (status === 'ready' && !isStale) completedStages.add('simulate')
  if (candidatesEvaluated > 0) completedStages.add('optimize')
  if (verifiedAgainstSurrogate) completedStages.add('verify')
  if (activeModal === 'report') completedStages.add('report')

  const handleStageClick = (stage: string) => {
    openWorkbench()
    if (stage === 'report') {
      openReport()
    } else if (stage === 'optimize' || stage === 'verify') {
      setActiveModal('optimize')
    } else if (stage === 'simulate') {
      const btn = document.getElementById('btn-simulate')
      if (btn) btn.click()
    } else {
      window.dispatchEvent(new CustomEvent('prahar:workflow-navigate', { detail: { stage } }))
    }
  }

  return (
    <header className="topbar" role="banner" id="topbar">
      {/* PRAHAR Defense Workstation Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: 'rgba(2, 132, 199, 0.15)',
          border: '1px solid var(--border-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Shield size={14} color="var(--cool)" strokeWidth={2} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              PRAHAR
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                padding: '1px 4px',
                borderRadius: 2,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)'
              }}
            >
              THERMO-SHIELD
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
              lineHeight: 1,
              marginTop: 2
            }}
          >
            Defense Shelter Digital Twin Workstation
          </span>
        </div>
      </div>

      <div className="topbar-div" />

      {/* Backend Transport Status Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 7px',
          borderRadius: 3,
          background: isMockEngine ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 163, 74, 0.12)',
          border: `1px solid ${isMockEngine ? 'rgba(217, 119, 6, 0.3)' : 'rgba(22, 163, 74, 0.3)'}`,
          flexShrink: 0
        }}
        title={isMockEngine ? "Running in standalone mock mode" : "Connected to live FastAPI Python backend"}
      >
        <div className={`status-dot ${isMockEngine ? 'solar' : 'ok'}`} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: isMockEngine ? 'var(--solar)' : 'var(--ok)',
            textTransform: 'uppercase'
          }}
        >
          {isMockEngine ? 'MOCK ENGINE' : 'LIVE FASTAPI'}
        </span>
      </div>

      <div className="topbar-div" />

      {/* Secondary Product View Switcher Tabs (Quieter Visual Weight) */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          background: 'var(--bg-panel)',
          padding: '2px',
          borderRadius: 3,
          border: '1px solid var(--border-dim)',
        }}
        aria-label="Secondary Product Views"
      >
        <button
          onClick={() => openLayerPage()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            height: 24,
            padding: '0 8px',
            borderRadius: 2,
            fontSize: 9.5,
            fontWeight: activePage === 'layer-analytics' ? 600 : 500,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            border: activePage === 'layer-analytics' ? '1px solid var(--cool)' : '1px solid transparent',
            background: activePage === 'layer-analytics' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
            color: activePage === 'layer-analytics' ? 'var(--cool)' : 'var(--text-muted)',
            transition: 'all 0.12s ease',
          }}
          title="Open Layer-by-Layer Energy Workstation"
        >
          <Layers size={11} color="currentColor" />
          <span>LAYERS</span>
        </button>
      </nav>

      <div className="topbar-div" />

      {/* ── Guided Engineering Workflow Indicator Strip ── */}
      <div
        id="workflow-indicator-strip"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          background: 'var(--bg-surface)',
          padding: '2px 5px',
          borderRadius: 4,
          border: '1px solid var(--border-base)',
          overflowX: 'auto',
        }}
        aria-label="Guided Engineering Workflow"
      >
        {[
          { id: 'site', num: '01', label: 'SITE' },
          { id: 'design', num: '02', label: 'DESIGN' },
          { id: 'simulate', num: '03', label: 'SIMULATE' },
          { id: 'optimize', num: '04', label: 'OPTIMIZE' },
          { id: 'verify', num: '05', label: 'VERIFY' },
          { id: 'report', num: '06', label: 'REPORT' },
        ].map((step, idx, arr) => {
          const isCurrent = currentStage === step.id
          const isCompleted = completedStages.has(step.id)

          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => handleStageClick(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  height: 24,
                  padding: '0 6px',
                  borderRadius: 3,
                  fontSize: 9.5,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: isCurrent ? 800 : 600,
                  cursor: 'pointer',
                  border: isCurrent
                    ? '1px solid var(--solar)'
                    : isCompleted
                    ? '1px solid rgba(22, 163, 74, 0.4)'
                    : '1px solid transparent',
                  background: isCurrent
                    ? 'rgba(217, 119, 6, 0.18)'
                    : isCompleted
                    ? 'rgba(22, 163, 74, 0.12)'
                    : 'transparent',
                  color: isCurrent
                    ? 'var(--solar)'
                    : isCompleted
                    ? 'var(--ok)'
                    : 'var(--text-muted)',
                  transition: 'all 0.12s ease',
                  whiteSpace: 'nowrap',
                }}
                title={`Stage ${step.num}: ${step.label} (${isCurrent ? 'Current Focus' : isCompleted ? 'Completed' : 'Available'})`}
              >
                <span style={{ fontSize: 8, opacity: 0.75 }}>{step.num}</span>
                <span>{step.label}</span>
                {isCompleted && <Check size={9} color="var(--ok)" strokeWidth={2.5} />}
              </button>
              {idx < arr.length - 1 && (
                <ChevronRight size={10} color="var(--text-faint)" />
              )}
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Right Telemetry Readouts (Calm Header Layout) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            padding: '3px 8px',
            borderRadius: 3,
          }}
          title="Current site microclimate location"
        >
          <div className="status-dot solar" />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              color: 'var(--solar)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {loc.name.split(',')[0]}
          </span>
        </div>

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--ok)',
            background: 'rgba(22, 163, 74, 0.12)',
            border: '1px solid rgba(22, 163, 74, 0.3)',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          LIVE
        </span>

        <div className="topbar-div" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Wifi size={11} color="var(--ok)" strokeWidth={1.5} />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--ok)', fontWeight: 600 }}>
            SOLVER READY
          </span>
        </div>
      </div>
    </header>
  )
}

export default TopBar

