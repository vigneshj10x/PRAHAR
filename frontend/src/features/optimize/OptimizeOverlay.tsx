/**
 * OptimizeOverlay.tsx
 *
 * Full-screen overlay shown during AUTO-OPTIMIZE process.
 * Displays a checklist of optimized parameters and a counter of
 * candidates evaluated. Finishes with "OPTIMAL DESIGN FOUND" banner.
 *
 * PROTOTYPE: animation driven by precomputed candidatesEvaluated milestones,
 * not a real optimisation loop.
 */
import { useEffect, useState, useRef } from 'react'
import type { FC } from 'react'
import { Check, Zap } from 'lucide-react'

const CHECKLIST_ITEMS = [
  'Geometry',
  'Orientation',
  'Materials',
  'Insulation',
  'Openings',
  'Thermal Mass',
]

const CANDIDATE_MILESTONES = [0, 100, 250, 500, 1000] as const

interface OptimizeOverlayProps {
  isVisible:           boolean
  candidatesEvaluated: number
  /** true once finishOptimize() has been called in the store */
  isFinished:          boolean
}

export const OptimizeOverlay: FC<OptimizeOverlayProps> = ({ isVisible, candidatesEvaluated, isFinished }) => {
  /**
   * completedItems: how many checklist boxes are ticked.
   * We drive this from candidatesEvaluated so items tick off progressively.
   */
  const [completedItems, setCompletedItems] = useState(0)

  /**
   * localFinished: starts false whenever the overlay opens.
   * Only goes true once isFinished flips true WHILE the overlay is visible
   * AND we have seen at least one progress update (candidatesEvaluated > 0).
   * This prevents the "OPTIMAL DESIGN FOUND" banner from flashing on open.
   */
  const [localFinished, setLocalFinished] = useState(false)
  const hasStartedRef = useRef(false)

  // Reset local state every time the overlay becomes visible
  useEffect(() => {
    if (isVisible) {
      setCompletedItems(0)
      setLocalFinished(false)
      hasStartedRef.current = false
    }
  }, [isVisible])

  // Drive checklist ticks from candidatesEvaluated.
  // Direct milestone → completedItems mapping so every 500 ms tick visibly checks items:
  //   100  → 1 item,  250  → 2 items,  500  → 4 items,  1000 → all 6
  useEffect(() => {
    if (!isVisible) return
    if (candidatesEvaluated > 0) hasStartedRef.current = true

    let n = 0
    if      (candidatesEvaluated >= 1000) n = 6
    else if (candidatesEvaluated >= 500)  n = 4
    else if (candidatesEvaluated >= 250)  n = 2
    else if (candidatesEvaluated >= 100)  n = 1

    setCompletedItems(n)
  }, [candidatesEvaluated, isVisible])

  // Transition to finished state only after we've been running
  useEffect(() => {
    if (isVisible && isFinished && hasStartedRef.current) {
      setLocalFinished(true)
    }
  }, [isFinished, isVisible])

  if (!isVisible) return null

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        background:      'rgba(15, 23, 42, 0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          9999,
        backdropFilter:  'blur(4px)',
      }}
    >
      <div
        style={{
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-base)',
          borderRadius: 6,
          padding:      '32px 36px',
          textAlign:    'center',
          minWidth:     360,
          maxWidth:     460,
          boxShadow:    '0 24px 64px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        {!localFinished ? (
          /* ── IN PROGRESS STATE ── */
          <>
            {/* Animated icon */}
            <div style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           44,
              height:          44,
              background:      'var(--solar-glow)',
              border:          '1px solid var(--solar)',
              borderRadius:    6,
              margin:          '0 auto 16px',
              animation:       'pulse-solar 1.4s ease-in-out infinite',
            }}>
              <Zap size={22} color="var(--solar)" strokeWidth={2} />
            </div>

            {/* Title */}
            <div style={{
              fontFamily:     'var(--font-mono)',
              fontSize:       13,
              fontWeight:     700,
              letterSpacing:  '0.12em',
              textTransform:  'uppercase',
              color:          'var(--solar)',
              marginBottom:   4,
            }}>
              OPTIMIZATION IN PROGRESS
            </div>

            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-muted)',
              letterSpacing: '0.06em',
              marginBottom:  24,
            }}>
              Evaluating parameter space — Leh winter scenario
            </div>

            {/* Checklist */}
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              gap:            9,
              marginBottom:   24,
              alignItems:     'flex-start',
            }}>
              {CHECKLIST_ITEMS.map((item, i) => {
                const done = i < completedItems
                return (
                  <div
                    key={item}
                    style={{
                      display:     'flex',
                      alignItems:  'center',
                      gap:         10,
                      opacity:     done ? 1 : 0.4,
                      transition:  'opacity 300ms ease',
                      width:       '100%',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width:           18,
                      height:          18,
                      border:          done ? '1px solid var(--solar)' : '1px solid var(--border-bright)',
                      borderRadius:    3,
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      background:      done ? 'var(--solar)' : 'var(--bg-panel)',
                      transition:      'all 200ms ease',
                      flexShrink:      0,
                    }}>
                      {done && <Check size={11} color="#ffffff" strokeWidth={3} />}
                    </div>
                    <span style={{
                      fontFamily:     'var(--font-mono)',
                      fontSize:       9.5,
                      color:          done ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight:     done ? 600 : 500,
                      letterSpacing:  '0.08em',
                      textTransform:  'uppercase',
                      transition:     'color 200ms',
                    }}>
                      {item}
                    </span>
                    {done && (
                      <span style={{
                        marginLeft:    'auto',
                        fontFamily:    'var(--font-mono)',
                        fontSize:      8.5,
                        color:         'var(--ok)',
                        fontWeight:    700,
                      }}>DONE</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Candidate counter */}
            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      22,
              fontWeight:    800,
              color:         'var(--solar)',
              marginBottom:  4,
              letterSpacing: '-0.01em',
            }}>
              {candidatesEvaluated.toLocaleString()}
            </div>
            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      8,
              fontWeight:    700,
              color:         'var(--text-muted)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom:  14,
            }}>
              Candidates Evaluated
            </div>

            {/* Progress bar */}
            <div style={{
              height:       4,
              background:   'var(--border-dim)',
              borderRadius: 2,
              overflow:     'hidden',
            }}>
              <div style={{
                height:     '100%',
                width:      `${(candidatesEvaluated / CANDIDATE_MILESTONES[CANDIDATE_MILESTONES.length - 1]) * 100}%`,
                background: 'var(--solar)',
                transition: 'width 300ms ease',
              }} />
            </div>
          </>
        ) : (
          /* ── FINISHED / OPTIMAL DESIGN FOUND STATE ── */
          <>
            <div style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:            56,
              height:           56,
              background:      'var(--solar-glow)',
              border:          '2px solid var(--solar)',
              borderRadius:     6,
              margin:          '0 auto 20px',
              boxShadow:       '0 4px 16px rgba(217,119,6,0.25)',
            }}>
              <Check size={30} color="var(--solar)" strokeWidth={2.5} />
            </div>

            <div style={{
              fontFamily:     'var(--font-mono)',
              fontSize:        13,
              fontWeight:      700,
              letterSpacing:  '0.12em',
              textTransform:  'uppercase',
              color:          'var(--solar)',
              marginBottom:   8,
            }}>
              OPTIMAL DESIGN FOUND
            </div>

            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-muted)',
              letterSpacing: '0.04em',
              lineHeight:    1.6,
            }}>
              Scenario C_optimized parameters applied.<br />
              Simulation results updated in performance panel.
            </div>
          </>
        )}
      </div>

      {/* CSS keyframe for the pulse icon */}
      <style>{`
        @keyframes pulse-solar {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
      `}</style>
    </div>
  )
}

export default OptimizeOverlay
