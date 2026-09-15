import { useState, type FC } from 'react'
import { Search, Grid, Sliders, Check } from 'lucide-react'
import type { ShapeType } from '@/domain'

interface GeometrySelectorProps {
  shape: ShapeType
  onChange: (s: ShapeType) => void
}

export const SHAPE_CATEGORIES = [
  {
    id: 'prismatic',
    name: 'Standard & Prismatic',
    shapes: [
      { value: 'rectangular', label: 'Rectangular Box', badge: 'Balanced', desc: 'Flat/Low Slope' },
      { value: 'monopitch', label: 'Single-Slope Shed', badge: 'Solar Max', desc: 'Solar Shed' },
      { value: 'gable', label: 'Pitched Gable Roof', badge: 'Rain/Snow', desc: 'Dual-Slope' },
      { value: 'hip_roof', label: 'Pyramidal Hip', badge: '4-Way Wind', desc: 'High Wind' },
      { value: 'mansard', label: 'Mansard Curb Roof', badge: 'Clearance', desc: 'Dual-Pitch' },
      { value: 'gambrel', label: 'Gambrel Arch Barn', badge: 'Loft Vol', desc: 'Max Volume' },
    ],
  },
  {
    id: 'curved',
    name: 'Curved & Vaulted',
    shapes: [
      { value: 'semidome', label: 'Quonset Vault', badge: 'Low S/V', desc: 'Semi-Cylinder' },
      { value: 'quonset_extended', label: 'Extended Quonset', badge: 'High Arch', desc: 'Vault' },
      { value: 'barrel_vault', label: 'Gothic Barrel', badge: 'Arch Struct', desc: 'Pointed Vault' },
      { value: 'hyperbolic_paraboloid', label: 'Hypar Paraboloid', badge: 'Tensile Flow', desc: 'Saddle' },
      { value: 'torus_inflatable', label: 'Toroidal Pod', badge: 'Extreme Alt', desc: 'Pressurized' },
    ],
  },
  {
    id: 'domes',
    name: 'Domes & Geodesics',
    shapes: [
      { value: 'geodesic_dome', label: '3V Geodesic Dome', badge: 'Min Loss', desc: 'Sphere Poly' },
      { value: 'igloo_catenary', label: 'Catenary Igloo', badge: 'Hyper-Ins', desc: 'Self-Support' },
      { value: 'pyramidal', label: '4-Side Pyramid', badge: 'Snow Shed', desc: 'High Snow' },
      { value: 'conical_teepee', label: 'Conical Bivouac', badge: 'Steep Pitch', desc: 'Alpine' },
    ],
  },
  {
    id: 'highwind',
    name: 'Polygonal & High-Wind',
    shapes: [
      { value: 'aframe', label: 'A-Frame Prism', badge: 'Avalanche', desc: 'Steep Shed' },
      { value: 'hexagonal_yurt', label: 'Nomadic Yurt', badge: 'Radial Wind', desc: 'Hexagonal' },
      { value: 'octagonal_pod', label: 'Defense Bunker', badge: 'Wind Buffer', desc: 'Octagonal' },
      { value: 'diamond_faceted', label: 'Stealth Pod', badge: 'Deflection', desc: 'Faceted' },
      { value: 'wedge_supersonic', label: 'Windward Wedge', badge: 'Scoured', desc: 'Supersonic' },
    ],
  },
  {
    id: 'adaptive',
    name: 'Specialized & Adaptive',
    shapes: [
      { value: 'bifacial_shed', label: 'Bifacial Collector', badge: 'Solar Thermal+', desc: 'Dual-Slope' },
      { value: 'stilt_elevated', label: 'Elevated Stilt Pod', badge: 'Flood Def', desc: 'Tropical' },
      { value: 'bunker_bermed', label: 'Earth Bunker', badge: 'Earth Coupled', desc: 'Bermed' },
      { value: 'modular_hex_cluster', label: 'Modular Hex Cluster', badge: 'Scalable', desc: 'Cluster' },
      { value: 'origami_accordion', label: 'Pleated Origami Deployable', badge: 'Rapid Deploy', desc: 'Pleated' },
    ],
  },
]

export const GeometrySelector: FC<GeometrySelectorProps> = ({ shape, onChange }) => {
  const [shapeSearch, setShapeSearch] = useState('')
  const [shapeCategoryFilter, setShapeCategoryFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'select'>('grid')

  const allShapes = SHAPE_CATEGORIES.flatMap((c) => c.shapes)
  const filteredShapes = allShapes.filter((s) => {
    const matchesSearch =
      s.label.toLowerCase().includes(shapeSearch.toLowerCase()) ||
      s.badge.toLowerCase().includes(shapeSearch.toLowerCase()) ||
      s.value.toLowerCase().includes(shapeSearch.toLowerCase())

    if (shapeCategoryFilter === 'all') return matchesSearch
    const cat = SHAPE_CATEGORIES.find((c) => c.id === shapeCategoryFilter)
    return matchesSearch && cat?.shapes.some((cs) => cs.value === s.value)
  })

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 4,
        padding: 8,
        color: '#0f172a',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* View Mode & Filter Search Controls */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 3,
            padding: '3px 8px',
            gap: 6,
          }}
        >
          <Search size={11} color="#64748b" />
          <input
            id="param-shape-search"
            aria-label="Filter 25 shelter geometries"
            type="text"
            placeholder="Filter 25 geometries..."
            value={shapeSearch}
            onChange={(e) => setShapeSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#0f172a',
              fontWeight: 500,
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'grid' ? 'select' : 'grid')}
          title={viewMode === 'grid' ? 'Switch to Compact Select List' : 'Switch to Visual Card Grid'}
          style={{
            padding: '4px 7px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 3,
            color: '#0284c7',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {viewMode === 'grid' ? <Sliders size={11} /> : <Grid size={11} />}
        </button>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
        {[
          { id: 'all', label: 'All (25)' },
          { id: 'prismatic', label: 'Prismatic' },
          { id: 'curved', label: 'Curved' },
          { id: 'domes', label: 'Domes' },
          { id: 'highwind', label: 'High-Wind' },
          { id: 'adaptive', label: 'Adaptive' },
        ].map((cat) => {
          const isActive = shapeCategoryFilter === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              id={`geom-cat-${cat.id}`}
              onClick={() => setShapeCategoryFilter(cat.id)}
              style={{
                padding: '2px 7px',
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                fontWeight: isActive ? 700 : 600,
                background: isActive ? '#0284c7' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#475569',
                border: `1px solid ${isActive ? '#0284c7' : '#e2e8f0'}`,
                borderRadius: 3,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 120ms',
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Render Mode: Visual Grid or Fallback Select */}
      {viewMode === 'grid' ? (
        <div
          role="radiogroup"
          aria-label="Shelter geometry archetypes"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 5,
            maxHeight: 200,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {filteredShapes.map((s) => {
            const isSelected = shape === s.value
            return (
              <button
                key={s.value}
                type="button"
                id={`shape-card-${s.value}`}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(s.value as ShapeType)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onChange(s.value as ShapeType)
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '6px 8px',
                  background: isSelected ? '#f0f9ff' : '#ffffff',
                  border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                  borderRadius: 3,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms',
                  minHeight: 48,
                  outline: 'none',
                  boxShadow: isSelected ? '0 1px 4px rgba(2, 132, 199, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8.5,
                      fontWeight: isSelected ? 700 : 600,
                      color: isSelected ? '#0369a1' : '#0f172a',
                      lineHeight: 1.1,
                    }}
                  >
                    {s.label}
                  </span>
                  {isSelected && <Check size={11} color="#0284c7" strokeWidth={2.5} />}
                </div>

                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 7,
                      color: '#64748b',
                      textTransform: 'uppercase',
                    }}
                  >
                    {s.desc}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 6.5,
                      fontWeight: 700,
                      padding: '1px 4px',
                      borderRadius: 2,
                      background: isSelected ? '#0284c7' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#475569',
                    }}
                  >
                    {s.badge}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="form-select-wrap">
          <select
            id="param-shape-select"
            className="form-select"
            value={shape}
            onChange={(e) => onChange(e.target.value as ShapeType)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontFamily: 'var(--font-ui)',
              fontSize: 9.5,
              borderRadius: 3,
              padding: '4px 6px',
              outline: 'none',
            }}
          >
            {SHAPE_CATEGORIES.flatMap((c) =>
              c.shapes.map((s) => (
                <option key={s.value} value={s.value} style={{ background: '#ffffff', color: '#0f172a' }}>
                  {s.label} [{s.badge}]
                </option>
              ))
            )}
          </select>
        </div>
      )}
    </div>
  )
}

export default GeometrySelector
