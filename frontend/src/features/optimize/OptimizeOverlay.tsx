/**
 * OptimizeOverlay.tsx
 *
 * Full-screen modal & overlay coordinating the AUTO-OPTIMIZE workflow:
 *  1. Evaluating state: Checklist + progress counter (evaluating 3,000 parameter combinations via ML surrogate).
 *  2. Pareto Explorer state: Interactive Pareto candidate selection with Recharts trade-off scatter plot.
 *  3. Verifying state: Physics engine verification spinner (solving ISO 13790 RC network).
 */

import { useEffect, useState, type FC } from 'react'
import { Check, Zap, ShieldCheck, Activity } from 'lucide-react'
import { useUIModalStore } from '@/store/uiModalStore'
import { useDesignStore } from '@/store/designStore'
import { getLocationProfile } from '@/data/locations'
import type { CandidateDesign } from '@/domain'
import ParetoCandidateExplorer from './ParetoCandidateExplorer'

const CHECKLIST_ITEMS = [
  'Geometry & Volumetric Form',
  'Solar Azimuth Orientation',
  'Vernacular & Advanced Materials',
  'Thermal Insulation Thickness',
  'South Solar Glazing Aperture',
  'Thermal Mass Buffering',
]

interface OptimizeOverlayProps {
  isVisible:           boolean
  candidatesEvaluated: number
  isFinished:          boolean
  onSelectCandidate?:  (candidate: CandidateDesign) => void
}

export const OptimizeOverlay: FC<OptimizeOverlayProps> = ({
  isVisible,
  candidatesEvaluated,
  onSelectCandidate,
}) => {
  const optimizeState = useUIModalStore((s) => s.optimize)
  const closeOptimize = useUIModalStore((s) => s.closeOptimize)
  const designParams  = useDesignStore()

  const [completedItems, setCompletedItems] = useState(0)

  // Drive checklist ticks from candidatesEvaluated
  useEffect(() => {
    if (!isVisible) return

    let n = 0
    if      (candidatesEvaluated >= 3000) n = 6
    else if (candidatesEvaluated >= 2500) n = 5
    else if (candidatesEvaluated >= 1500) n = 4
    else if (candidatesEvaluated >= 500)  n = 2
    else if (candidatesEvaluated >= 100)  n = 1

    setCompletedItems(n)
  }, [candidatesEvaluated, isVisible])

  if (!isVisible) return null

  const loc = getLocationProfile(designParams.location)

  // ── State 1: Verifying with Real Physics Solver ──
  if (optimizeState.isVerifying) {
    return (
      <div
        style={{
          position:       'fixed',
          inset:          0,
          background:     'rgba(15, 23, 42, 0.65)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          zIndex:         9999,
          backdropFilter: 'blur(5px)',
        }}
      >
        <div
          style={{
            background:   'var(--bg-surface)',
            border:       '1px solid var(--border-base)',
            borderRadius: 8,
            padding:      '32px 36px',
            textAlign:    'center',
            minWidth:     380,
            maxWidth:     460,
            boxShadow:    '0 24px 64px rgba(15, 23, 42, 0.25)',
          }}
        >
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          48,
              height:         48,
              background:     'var(--ok-glow)',
              border:         '1px solid var(--ok)',
              borderRadius:   8,
              margin:         '0 auto 16px',
              animation:      'pulse-solar 1.4s ease-in-out infinite',
            }}
          >
            <ShieldCheck size={26} color="var(--ok)" strokeWidth={2} />
          </div>

          <div
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      13,
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'var(--ok)',
              marginBottom:  6,
            }}
          >
            VERIFYING WITH PHYSICS MODEL
          </div>

          <div
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9.5,
              color:         'var(--text-secondary)',
              letterSpacing: '0.04em',
              marginBottom:  16,
              lineHeight:    1.4,
            }}
          >
            Executing 1D/2D transient Lumped-Parameter RC Solver (ISO 13790 / ISO 6946) to verify thermal ground truth...
          </div>

          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            8,
              fontFamily:     'var(--font-mono)',
              fontSize:       9,
              color:          'var(--text-muted)',
              background:     'var(--bg-base)',
              padding:        '8px 12px',
              borderRadius:   4,
              border:         '1px solid var(--border-dim)',
            }}
          >
            <Activity size={13} className="animate-spin" color="var(--ok)" />
            Computing solar flux, fabric transmission & delta comparison
          </div>
        </div>
      </div>
    )
  }

  // ── State 2: Candidates Ready — Show Pareto Explorer Modal ──
  if (optimizeState.candidates.length > 0 && !optimizeState.isOptimizing) {
    return (
      <ParetoCandidateExplorer
        candidates={optimizeState.candidates}
        locationName={loc.name}
        budget={designParams.budget}
        weightLimit={designParams.weightLimit}
        occupants={designParams.occupants}
        onSelectCandidate={(cand) => {
          if (onSelectCandidate) {
            onSelectCandidate(cand)
          }
        }}
        onClose={closeOptimize}
      />
    )
  }

  // ── State 3: Evaluating Multi-Objective Parameter Space via ML Surrogate ──
  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        background:      'rgba(15, 23, 42, 0.55)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          9999,
        backdropFilter:  'blur(5px)',
      }}
    >
      <div
        style={{
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-base)',
          borderRadius: 8,
          padding:      '32px 36px',
          textAlign:    'center',
          minWidth:     380,
          maxWidth:     460,
          boxShadow:    '0 24px 64px rgba(15, 23, 42, 0.25)',
        }}
      >
        {/* Animated icon */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          46,
            height:         46,
            background:     'var(--solar-glow)',
            border:         '1px solid var(--solar)',
            borderRadius:   8,
            margin:         '0 auto 16px',
            animation:      'pulse-solar 1.2s ease-in-out infinite',
          }}
        >
          <Zap size={24} color="var(--solar)" strokeWidth={2} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      13,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         'var(--solar)',
            marginBottom:  4,
          }}
        >
          SURROGATE PARETO EXPLORATION
        </div>

        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9,
            color:         'var(--text-muted)',
            letterSpacing: '0.06em',
            marginBottom:  20,
          }}
        >
          Simulating 3,000 permutations for {loc.name} climate
        </div>

        {/* Checklist */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           9,
            marginBottom:  22,
            alignItems:    'flex-start',
          }}
        >
          {CHECKLIST_ITEMS.map((item, i) => {
            const done = i < completedItems
            return (
              <div
                key={item}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        10,
                  opacity:    done ? 1 : 0.4,
                  transition: 'opacity 250ms ease',
                  width:      '100%',
                }}
              >
                <div
                  style={{
                    width:          18,
                    height:         18,
                    border:         done ? '1px solid var(--solar)' : '1px solid var(--border-bright)',
                    borderRadius:   3,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    background:     done ? 'var(--solar)' : 'var(--bg-panel)',
                    transition:     'all 200ms ease',
                    flexShrink:     0,
                  }}
                >
                  {done && <Check size={11} color="#ffffff" strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      9.5,
                    color:         done ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight:    done ? 600 : 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item}
                </span>
                {done && (
                  <span
                    style={{
                      marginLeft:  'auto',
                      fontFamily:  'var(--font-mono)',
                      fontSize:    8.5,
                      color:       'var(--ok)',
                      fontWeight:  700,
                    }}
                  >
                    EVALUATED
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Candidate counter */}
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      22,
            fontWeight:    800,
            color:         'var(--solar)',
            marginBottom:  2,
            letterSpacing: '-0.01em',
          }}
        >
          {candidatesEvaluated > 0 ? `${candidatesEvaluated.toLocaleString()} / 3,000` : 'Initializing evaluation...'}
        </div>
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            fontWeight:    700,
            color:         'var(--text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom:  14,
          }}
        >
          Permutations Evaluated across 6 Objectives
        </div>

        {/* Progress bar */}
        <div
          style={{
            height:       5,
            background:   'var(--border-dim)',
            borderRadius: 3,
            overflow:     'hidden',
          }}
        >
          <div
            style={{
              height:     '100%',
              width:      candidatesEvaluated > 0 ? `${Math.min(100, Math.max(5, (candidatesEvaluated / 3000) * 100))}%` : '5%',
              background: 'var(--solar)',
              transition: 'width 200ms ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default OptimizeOverlay
