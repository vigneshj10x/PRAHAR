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
    <div>
      {/* View Mode & Filter Search Controls */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-base)',
            borderRadius: 2,
            padding: '2px 6px',
            gap: 4,
          }}
        >
          <Search size={10} color="var(--text-muted)" />
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
              fontSize: 8.5,
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'grid' ? 'select' : 'grid')}
          title={viewMode === 'grid' ? 'Switch to Compact Select List' : 'Switch to Visual Card Grid'}
          style={{
            padding: '4px 6px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            borderRadius: 2,
            color: 'var(--solar)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {viewMode === 'grid' ? <Sliders size={11} /> : <Grid size={11} />}
        </button>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
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
                padding: '2px 5px',
                fontFamily: 'var(--font-mono)',
                fontSize: 7.5,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--solar-glow)' : 'var(--bg-input)',
                color: isActive ? 'var(--solar)' : 'var(--text-muted)',
                border: `1px solid ${isActive ? 'var(--solar)' : 'var(--border-dim)'}`,
                borderRadius: 2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
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
            gap: 4,
            maxHeight: 180,
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
                  padding: '5px 7px',
                  background: isSelected ? 'var(--solar-glow)' : 'var(--bg-surface)',
                  border: `1px solid ${isSelected ? 'var(--solar)' : 'var(--border-dim)'}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms',
                  minHeight: 46,
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8.5,
                      fontWeight: isSelected ? 700 : 600,
                      color: isSelected ? 'var(--solar)' : 'var(--text-primary)',
                      lineHeight: 1.1,
                    }}
                  >
                    {s.label}
                  </span>
                  {isSelected && <Check size={10} color="var(--solar)" />}
                </div>

                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 6.5,
                      color: 'var(--text-muted)',
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
                      padding: '0 3px',
                      borderRadius: 1,
                      background: isSelected ? 'var(--solar)' : 'var(--bg-input)',
                      color: isSelected ? '#000' : 'var(--text-muted)',
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
              background: 'var(--bg-input)',
              border: '1px solid var(--border-base)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 9.5,
              borderRadius: 2,
              padding: '4px 6px',
              outline: 'none',
            }}
          >
            {SHAPE_CATEGORIES.flatMap((c) =>
              c.shapes.map((s) => (
                <option key={s.value} value={s.value} style={{ background: '#0d121c', color: '#f8fafc' }}>
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
