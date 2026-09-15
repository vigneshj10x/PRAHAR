/**
 * frontend/src/features/digital-twin/SectionLegend.tsx
 *
 * Floating interactive visual element legend shown in 'section' (cutaway) camera view.
 * Dynamically displays real-time layer thicknesses, percentages, thermal ratings,
 * and opens the deep Layer Inspector HUD on click.
 */

import React, { useState, useEffect } from 'react'
import { X, Layers, Info } from 'lucide-react'
import { useVisualizationStore } from '@/store/visualizationStore'
import { useDesignStore } from '@/store/designStore'
import { useLayerInspectorStore, type LayerId } from '@/store/layerInspectorStore'
import { useNavigationStore } from '@/store/navigationStore'

export const SectionLegend: React.FC = () => {
  const viewMode = useVisualizationStore((s) => s.viewMode)
  const { insulation, wallMaterial, thermalMass, openingRatio, width, height } = useDesignStore()
  const selectLayer = useLayerInspectorStore((s) => s.selectLayer)
  const selectedLayerId = useLayerInspectorStore((s) => s.selectedLayerId)
  const isInspectorOpen = useLayerInspectorStore((s) => s.isOpen)
  const [isDismissed, setIsDismissed] = useState(false)

  // Re-open legend whenever user enters section view mode
  useEffect(() => {
    if (viewMode === 'section') {
      setIsDismissed(false)
    }
  }, [viewMode])

  if (viewMode !== 'section' || isDismissed) {
    if (viewMode === 'section' && isDismissed) {
      return (
        <button
          onClick={() => setIsDismissed(false)}
          style={{
            position: 'absolute',
            bottom: 44,
            left: 10,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid var(--solar)',
            borderRadius: 4,
            padding: '4px 8px',
            color: 'var(--solar)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 30,
          }}
          title="Show Section Cutaway Legend"
        >
          <Info size={11} />
          <span>Layer Breakdown & Inspector</span>
        </button>
      )
    }
    return null
  }

  // Real-time calculations
  const claddingMm = 20
  const membraneMm = 2
  const insulationMm = insulation
  const hasPCM = wallMaterial === 'pcm_enhanced_panel'
  const pcmMm = hasPCM ? 18 : 0
  const massMm = thermalMass === 'high' ? 220 : thermalMass === 'low' ? 70 : 140
  const finishMm = 12
  const totalWallMm = claddingMm + membraneMm + insulationMm + pcmMm + massMm + finishMm

  const insPct = ((insulationMm / totalWallMm) * 100).toFixed(1)
  const massPct = ((massMm / totalWallMm) * 100).toFixed(1)
  const pcmPct = hasPCM ? ((pcmMm / totalWallMm) * 100).toFixed(1) : '0.0'
  const cladPct = ((claddingMm / totalWallMm) * 100).toFixed(1)

  const rValue = (insulation / 32).toFixed(2)
  const uValue = (1 / (0.13 + (insulation / 32 / 1000) * 1000 + 0.04)).toFixed(2)
  const glazingArea = (width * height * (openingRatio / 100) * 0.95).toFixed(2)

  const wallMatLabels: Record<string, string> = {
    adobe: 'Adobe / Rammed Earth',
    concrete_insitu: 'Reinforced Concrete',
    timber_log: 'Cedar Timber Log',
    aac_block: 'AAC Aerated Concrete',
    stone_slate: 'Alpine Slate Masonry',
    pcm_enhanced_panel: 'PCM Composite Panel',
  }

  const legendItems: Array<{
    id: LayerId
    color: string
    label: string
    desc: string
    badge: string
    pctBadge?: string
    badgeBg: string
    badgeColor: string
    isWire?: boolean
  }> = [
    {
      id: 'insulation',
      color: '#d97706',
      label: '1. Volumetric Insulation Core',
      desc: `${insulation}mm Core (R-${rValue} m²·K/W | U-${uValue})`,
      badge: `${insulation}mm`,
      pctBadge: `${insPct}%`,
      badgeBg: 'rgba(217, 119, 6, 0.25)',
      badgeColor: '#fbbf24',
    },
    ...(hasPCM
      ? [
          {
            id: 'pcm' as LayerId,
            color: '#06b6d4',
            label: '2. PCM Latent Heat Buffer',
            desc: 'Paraffin/Octadecane ~22°C phase shift buffer',
            badge: 'ACTIVE',
            pctBadge: `${pcmPct}%`,
            badgeBg: 'rgba(6, 182, 212, 0.25)',
            badgeColor: '#22d3ee',
          },
        ]
      : []),
    {
      id: 'thermal_mass',
      color: wallMaterial === 'adobe' ? '#b45309' : wallMaterial === 'timber_log' ? '#78350f' : '#475569',
      label: '3. Interior Thermal Mass Shell',
      desc: `${wallMatLabels[wallMaterial] || wallMaterial} (${thermalMass.toUpperCase()})`,
      badge: `${massMm}mm`,
      pctBadge: `${massPct}%`,
      badgeBg: 'rgba(100, 116, 139, 0.25)',
      badgeColor: '#cbd5e1',
    },
    {
      id: 'glazing',
      color: '#38bdf8',
      label: '4. Solar Glazing Aperture',
      desc: `${openingRatio}% WWR (${glazingArea} m² South Window)`,
      badge: `${glazingArea} m²`,
      pctBadge: `${openingRatio}%`,
      badgeBg: 'rgba(56, 189, 248, 0.25)',
      badgeColor: '#38bdf8',
    },
    {
      id: 'solar_beam',
      color: '#f59e0b',
      label: '5. Volumetric Solar Ingress Beam',
      desc: `Direct solar penetration shaft (~42° Sun altitude)`,
      badge: 'SUNBEAM',
      badgeBg: 'rgba(245, 158, 11, 0.25)',
      badgeColor: '#fbbf24',
    },
    {
      id: 'floor_slab',
      color: '#0f172a',
      label: '6. Insulated Foundation Slab',
      desc: 'Subgrade ballast + Sub-slab XPS + Thermal screed floor',
      badge: '3-LAYER',
      pctBadge: 'BASE',
      badgeBg: 'rgba(15, 23, 42, 0.6)',
      badgeColor: '#94a3b8',
    },
    {
      id: 'cladding',
      color: '#d97706',
      isWire: true,
      label: '7. Exterior Cladding Ghost Shell',
      desc: 'Weather-tight rainscreen & perimeter section cut line',
      badge: 'GHOST',
      pctBadge: `${cladPct}%`,
      badgeBg: 'transparent',
      badgeColor: '#d97706',
    },
  ]

  return (
    <div
      id="section-legend-overlay"
      style={{
        position: 'absolute',
        bottom: 44,
        left: 10,
        width: 305,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(217, 119, 6, 0.45)',
        borderRadius: 6,
        padding: '9px 12px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
        fontFamily: 'var(--font-mono)',
        zIndex: 30,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: 5,
          marginBottom: 7,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={13} color="#f59e0b" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.03em' }}>
            LAYER-BY-LAYER SECTION (CLICK TO INSPECT)
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Dismiss Legend"
        >
          <X size={13} />
        </button>
      </div>

      {/* Legend Items List with Click to Inspect */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {legendItems.map((item) => {
          const isSelected = isInspectorOpen && selectedLayerId === item.id
          return (
            <div
              key={item.id}
              onClick={() => {
                selectLayer(item.id)
                useNavigationStore.getState().openLayerPage(item.id)
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                background: isSelected ? 'rgba(217, 119, 6, 0.22)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid #d97706' : '1px solid transparent',
                padding: '4px 6px',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={`Click to inspect ${item.label} details, % thickness, & thermal analysis`}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 2,
                  marginTop: 2,
                  flexShrink: 0,
                  background: item.isWire ? 'transparent' : item.color,
                  border: item.isWire ? `1.5px dashed ${item.color}` : `1px solid rgba(255,255,255,0.3)`,
                }}
              />
              <div style={{ flex: 1, lineHeight: 1.25 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: isSelected ? '#fbbf24' : '#f1f5f9' }}>
                    {item.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {item.pctBadge && (
                      <span
                        style={{
                          fontSize: 7.5,
                          fontWeight: 700,
                          padding: '1px 3px',
                          borderRadius: 2,
                          background: 'rgba(56, 189, 248, 0.2)',
                          color: '#38bdf8',
                        }}
                      >
                        {item.pctBadge}
                      </span>
                    )}
                    {item.badge && (
                      <span
                        style={{
                          fontSize: 7.5,
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: 2,
                          background: item.badgeBg,
                          color: item.badgeColor,
                          border: `1px solid ${item.badgeColor}40`,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 7.8, color: '#94a3b8', marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div
        style={{
          marginTop: 6,
          paddingTop: 4,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 7.5,
          color: '#64748b',
        }}
      >
        <span>💡 Click any layer for Thermal Storage & Composite View</span>
        <button
          onClick={() => selectLayer('thermal_mass', 'thermal_mass_storage')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fbbf24',
            fontSize: 7.5,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          Thermal Mass View
        </button>
      </div>
    </div>
  )
}

export default SectionLegend
