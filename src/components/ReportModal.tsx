/**
 * ReportModal.tsx
 *
 * Engineering Simulation Assessment Report Modal.
 * Generates an executive technical summary of the shelter design,
 * bioclimatic context, envelope metrics, thermal performance, and design recommendations.
 *
 * Supports browser print-to-PDF via window.print() and clipboard export.
 */
import { useState, type FC } from 'react'
import { X, Printer, Copy, Check, FileText, Cpu, Compass, Thermometer, ShieldCheck } from 'lucide-react'
import { useDesignStore } from '../store/designStore'
import { useResultsStore } from '../store/resultsStore'
import { useUIModalStore } from '../store/uiModalStore'
import { getLocationProfile } from '../data/locations'

const ReportModal: FC = () => {
  const closeReport   = useUIModalStore((s) => s.closeReport)
  const activeModal   = useUIModalStore((s) => s.activeModal)
  const design        = useDesignStore()
  const results       = useResultsStore()
  const [copied, setCopied] = useState(false)

  if (activeModal !== 'report') return null

  const loc = getLocationProfile(design.location)
  const isSimulated = results.status === 'ready'

  // Derived metrics
  const floorArea = (design.length * design.width).toFixed(1)
  const volume    = (design.length * design.width * design.height * 0.75).toFixed(1)
  const avRatio   = ((2 * (design.length * design.height + design.width * design.height) + design.length * design.width) / (design.length * design.width * design.height * 0.75)).toFixed(2)
  const rVal      = (design.insulation / 1000 / 0.032).toFixed(2)

  const handlePrint = () => {
    window.print()
  }

  const handleCopySummary = () => {
    const summary = `
================================================================================
THERMO-SHIELD — PASSIVE SHELTER THERMAL ASSESSMENT REPORT
Smart India Hackathon Prototype (PS 26051, DRDO)
================================================================================

1. SITE & BIOCLIMATIC CONTEXT
• Location:          ${loc.name}
• Climate Zone:      ${loc.zone} (${loc.season})
• Altitude:          ${loc.altitude} | Coordinates: ${loc.coordinates}
• Ambient Temp:      ${loc.ambientTempRange}
• Solar Peak:        ${loc.solarPotential}
• Design Wind Speed: ${loc.wind}

2. SHELTER SPECIFICATION
• Geometry:          ${design.shape.toUpperCase()} (${design.length}m L × ${design.width}m W × ${design.height}m H)
• Floor Area:        ${floorArea} m² | Volume: ${volume} m³ | A/V Ratio: ${avRatio}
• Orientation:       ${design.orientation}° (South-relative)
• Wall Construction: ${design.wallMaterial.toUpperCase()}
• Insulation:        ${design.insulation} mm (R ≈ ${rVal} m²K/W)
• Aperture / Glaze:  ${design.openingRatio}%
• Thermal Mass:      ${design.thermalMass.toUpperCase()}

3. THERMAL PERFORMANCE EVALUATION (${isSimulated ? (results.estimated ? 'ESTIMATED / INTERPOLATED' : 'EXACT REFERENCE MATCH') : 'AWAITING SIMULATION'})
• 24h Mean Indoor Temp: ${isSimulated ? (results.indoorTemp >= 0 ? '+' : '') + results.indoorTemp.toFixed(1) + ' °C' : 'N/A'}
• Solar Thermal Gain:   ${isSimulated ? results.solarGain.toFixed(0) + ' W/m²' : 'N/A'}
• Fabric Heat Loss:     ${isSimulated ? results.heatLoss.toFixed(0) + ' W/m²' : 'N/A'}
• Daily Comfort Hours:  ${isSimulated ? results.comfortHours.toFixed(1) + ' h / day' : 'N/A'}
• Heating Demand:       ${isSimulated ? results.heatingDemand.toFixed(1) + ' kWh / day' : 'N/A'}

4. BIOCLIMATIC RECOMMENDATIONS
${loc.designPriorities.map((p, i) => `[${i + 1}] ${p}`).join('\n')}

--------------------------------------------------------------------------------
PROTOTYPE NOTICE: Values are controlled prototype datasets for demonstration.
Not yet validated against CFD/ANSYS or physical field sensors.
================================================================================
`.trim()

    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      id="report-modal-backdrop"
      style={{
        position:        'fixed',
        inset:           0,
        background:      'rgba(15, 23, 42, 0.55)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          9999,
        backdropFilter:  'blur(4px)',
        padding:         16,
      }}
      onClick={closeReport}
    >
      <div
        id="report-modal-content"
        style={{
          background:    'var(--bg-surface)',
          border:        '1px solid var(--border-base)',
          borderRadius:  6,
          width:         680,
          maxWidth:      '95vw',
          maxHeight:     '88vh',
          display:       'flex',
          flexDirection: 'column',
          boxShadow:     '0 24px 64px rgba(15, 23, 42, 0.22), 0 2px 8px rgba(0, 0, 0, 0.05)',
          overflow:      'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         '12px 18px',
          borderBottom:    '1px solid var(--border-base)',
          background:      'var(--bg-panel)',
          flexShrink:      0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--solar)" />
            <div>
              <div style={{
                fontFamily:     'var(--font-mono)',
                fontSize:       12,
                fontWeight:     700,
                letterSpacing:  '0.08em',
                textTransform:  'uppercase',
                color:          'var(--text-primary)',
                lineHeight:     1.1,
              }}>
                Thermal Design Assessment Report
              </div>
              <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      8.5,
                color:         'var(--text-muted)',
                letterSpacing: '0.04em',
                marginTop:     2,
              }}>
                THERMO-SHIELD Engineering Simulation Output • SIH Prototype
              </div>
            </div>
          </div>

          <button
            onClick={closeReport}
            style={{
              background: 'transparent',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--text-muted)',
              padding:    4,
              display:    'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Modal Body (Scrollable & Printable) ── */}
        <div
          id="printable-report-area"
          style={{
            padding:       '16px 20px',
            overflowY:     'auto',
            display:       'flex',
            flexDirection: 'column',
            gap:           14,
            background:    'var(--bg-surface)',
          }}
        >
          {/* Section 1: Executive Banner */}
          <div style={{
            background:   'var(--bg-panel)',
            border:       '1px solid var(--border-dim)',
            borderRadius: 4,
            padding:      '10px 14px',
            display:      'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap:          8,
          }}>
            <div>
              <span className="section-header">Location</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{loc.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)' }}>{loc.altitude} ({loc.coordinates})</div>
            </div>
            <div>
              <span className="section-header">Bioclimatic Zone</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cool)' }}>{loc.zone}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)' }}>{loc.season}</div>
            </div>
            <div>
              <span className="section-header">Evaluation State</span>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                color: isSimulated ? 'var(--ok)' : 'var(--warn)',
              }}>
                {isSimulated ? (results.estimated ? 'INTERPOLATED' : 'EXACT REFERENCE') : 'AWAITING SIM'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)' }}>
                {isSimulated ? (results.scenarioKey ?? 'Custom Config') : 'Press Simulate'}
              </div>
            </div>
          </div>

          {/* Section 2: Shelter Geometry & Envelope Breakdown */}
          <div>
            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'var(--text-muted)',
              marginBottom:  6,
              display:       'flex',
              alignItems:    'center',
              gap:           5,
            }}>
              <Cpu size={11} color="var(--solar)" />
              1. Envelope & Geometry Parameters
            </div>

            <div style={{
              background:          'var(--bg-panel)',
              border:              '1px solid var(--border-dim)',
              borderRadius:        4,
              padding:             '10px 12px',
              display:             'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap:                 '8px 12px',
            }}>
              {[
                { l: 'Shape', v: design.shape.toUpperCase() },
                { l: 'Dimensions', v: `${design.length} × ${design.width} × ${design.height}m` },
                { l: 'Floor Area', v: `${floorArea} m²` },
                { l: 'Volume', v: `${volume} m³` },
                { l: 'Orientation', v: `${design.orientation}° (S=180°)` },
                { l: 'Wall Material', v: design.wallMaterial.toUpperCase() },
                { l: 'Insulation', v: `${design.insulation}mm (R=${rVal})` },
                { l: 'Opening Ratio', v: `${design.openingRatio}%` },
              ].map((item, idx) => (
                <div key={idx}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.l}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', marginTop: 1 }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Thermal Performance Results Table */}
          <div>
            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'var(--text-muted)',
              marginBottom:  6,
              display:       'flex',
              alignItems:    'center',
              gap:           5,
            }}>
              <Thermometer size={11} color="var(--cool)" />
              2. 24-Hour Thermal Performance Assessment
            </div>

            <div style={{
              border:       '1px solid var(--border-base)',
              borderRadius: 4,
              overflow:     'hidden',
            }}>
              <div style={{
                display:             'grid',
                gridTemplateColumns: '2fr 1fr 1fr 2fr',
                padding:             '6px 10px',
                background:          'var(--bg-panel)',
                borderBottom:        '1px solid var(--border-base)',
                fontFamily:          'var(--font-mono)',
                fontSize:            8,
                fontWeight:          700,
                color:               'var(--text-muted)',
                letterSpacing:       '0.1em',
                textTransform:       'uppercase',
              }}>
                <div>Metric</div>
                <div>Result</div>
                <div>Units</div>
                <div>Status / Target</div>
              </div>

              {[
                {
                  label:  'Indoor Temperature (24h Mean)',
                  val:    isSimulated ? (results.indoorTemp >= 0 ? '+' : '') + results.indoorTemp.toFixed(1) : '—',
                  unit:   '°C',
                  status: isSimulated ? (results.indoorTemp >= 5 ? 'Meets Minimum Threshold' : 'Deficit vs 5°C Threshold') : 'Pending',
                  color:  isSimulated ? (results.indoorTemp >= 5 ? 'var(--ok)' : 'var(--warn)') : 'var(--text-muted)',
                },
                {
                  label:  'Solar Thermal Gain (Irradiance)',
                  val:    isSimulated ? results.solarGain.toFixed(0) : '—',
                  unit:   'W/m²',
                  status: isSimulated ? (results.solarGain >= 200 ? 'High Passive Harvest' : 'Moderate Harvest') : 'Pending',
                  color:  'var(--solar)',
                },
                {
                  label:  'Fabric Heat Loss (Conduction & Infil)',
                  val:    isSimulated ? results.heatLoss.toFixed(0) : '—',
                  unit:   'W/m²',
                  status: isSimulated ? (Math.abs(results.heatLoss) <= 25 ? 'Low Envelope Loss' : 'Significant Fabric Loss') : 'Pending',
                  color:  'var(--cool)',
                },
                {
                  label:  'Thermal Comfort Hours (>5°C)',
                  val:    isSimulated ? results.comfortHours.toFixed(1) : '—',
                  unit:   'h / day',
                  status: isSimulated ? (results.comfortHours >= 10 ? 'High Daily Occupancy Comfort' : 'Limited Passive Comfort Window') : 'Pending',
                  color:  'var(--ok)',
                },
                {
                  label:  'Auxiliary Heating Demand (18°C setpoint)',
                  val:    isSimulated ? results.heatingDemand.toFixed(1) : '—',
                  unit:   'kWh / day',
                  status: isSimulated ? (results.heatingDemand <= 4.0 ? 'Low Fuel Requirement' : 'High Heating Load') : 'Pending',
                  color:  'var(--warn)',
                },
              ].map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display:             'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 2fr',
                    padding:             '7px 10px',
                    borderBottom:        idx < 4 ? '1px solid var(--border-dim)' : 'none',
                    alignItems:          'center',
                    fontFamily:          'var(--font-mono)',
                    fontSize:            9,
                  }}
                >
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.label}</div>
                  <div style={{ color: row.color, fontWeight: 700, fontSize: 10.5 }}>{row.val}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 8.5 }}>{row.unit}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 8 }}>{row.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Bioclimatic Design Guidelines for the active site */}
          <div>
            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'var(--text-muted)',
              marginBottom:  6,
              display:       'flex',
              alignItems:    'center',
              gap:           5,
            }}>
              <Compass size={11} color="var(--ok)" />
              3. Site-Specific Bioclimatic Priorities ({loc.name})
            </div>

            <div style={{
              background:   'var(--bg-panel)',
              border:       '1px solid var(--border-dim)',
              borderRadius: 4,
              padding:      '8px 12px',
              display:      'flex',
              flexDirection:'column',
              gap:          4,
            }}>
              {loc.designPriorities.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--solar)', fontWeight: 700 }}>[{i + 1}]</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: DRDO / SIH Prototype Notice */}
          <div style={{
            background:   'var(--solar-glow)',
            border:       '1px solid var(--border-base)',
            borderRadius: 4,
            padding:      '8px 12px',
            display:      'flex',
            alignItems:   'flex-start',
            gap:          8,
          }}>
            <ShieldCheck size={14} color="var(--solar)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>PROTOTYPE NOTICE:</span> Simulation values are controlled prototype reference datasets for demonstration in PS 26051 (DRDO). This system is designed as an architectural front-end to interface with high-fidelity finite-difference or CFD/EnergyPlus physics solvers.
            </div>
          </div>
        </div>

        {/* ── Modal Footer (Action Buttons) ── */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         '10px 18px',
          borderTop:       '1px solid var(--border-base)',
          background:      'var(--bg-panel)',
          flexShrink:      0,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-faint)' }}>
            Report Generated: {new Date().toLocaleDateString()}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleCopySummary}
              className="action-btn"
              style={{ padding: '5px 10px', fontSize: 9 }}
              title="Copy formatted summary to clipboard"
            >
              {copied ? <Check size={11} color="var(--ok)" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy Summary'}
            </button>

            <button
              onClick={handlePrint}
              className="action-btn primary"
              style={{ padding: '5px 12px', fontSize: 9 }}
              title="Print report or save as PDF"
            >
              <Printer size={11} />
              Print / Save PDF
            </button>

            <button
              onClick={closeReport}
              className="action-btn"
              style={{ padding: '5px 10px', fontSize: 9 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-modal-backdrop,
          #report-modal-content,
          #printable-report-area,
          #printable-report-area * {
            visibility: visible;
          }
          #report-modal-backdrop {
            position: absolute;
            inset: 0;
            background: #ffffff !important;
            padding: 0;
          }
          #report-modal-content {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default ReportModal
