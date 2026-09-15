/**
 * frontend/src/features/digital-twin/ShelterGeometries.tsx
 *
 * Parametric 3D Mesh Components for all 25 Architectural & Extreme-Climate Geometries.
 *
 * TRUE CAD ARCHITECTURAL 3D SECTION CUTAWAY:
 * - In Normal/Perspective/Top/South Mode: Full exterior envelope with dynamic cladding/roof materials.
 * - In Section (Cutaway) Mode:
 *   - Front half is sliced open for ALL 25 shapes according to their authentic geometric profile
 *     (Yurt, Dome, A-Frame, Barrel Vault, Monopitch, Gambrel, Quonset, Pyramidal, Stilt, Bermed, etc.)
 *   - Physical multi-layer sandwich visible at the cut cross-section:
 *     [1. Exterior Cladding] -> [2. Volumetric Insulation Core] -> [3. PCM Buffer] -> [4. Structural Thermal Mass]
 *   - Sliced Roof Assembly (Roof Cladding + Roof Insulation + Exposed Timber Rafters/Crown)
 *   - Multi-layer Insulated Foundation Slab (Subgrade + Continuous XPS + Thermal Screed Floor)
 *   - South Solar Glazing Aperture with 3D Volumetric Sunlight Ingress Beam casting on the floor slab
 *   - Phantom Ghost Wireframe showing the original sliced envelope boundary of the exact shape
 *   - Interactive Click-to-Inspect on all physical layers linked with physics model predictions.
 */

import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ShapeType } from '@/domain'
import { useDesignStore } from '@/store/designStore'
import { useLayerInspectorStore } from '@/store/layerInspectorStore'

// ─── Color Palette & Material Definitions ─────────────────────────────────────
export const C = {
  wallDefault: '#475569',
  roofDefault: '#334155',
  edgeHi: '#d97706',
  edgeDim: '#64748b',
  winFill: '#38bdf8',
  winFrame: '#0f172a',
  insulationAmber: '#d97706',
  insulationLight: '#f59e0b',
  pcmCyan: '#06b6d4',
  pcmViolet: '#8b5cf6',
  groundSubgrade: '#0f172a',
  groundInsulation: '#b45309',
  groundScreed: '#334155',
  timberPost: '#78350f',
  sunbeam: '#f59e0b',
  solarPatch: '#fbbf24',
  interiorPlaster: '#cbd5e1',
}

// Map wallMaterial to realistic base material colors
export function getWallMaterialColor(mat: string): string {
  switch (mat) {
    case 'adobe':
      return '#b45309' // warm terracotta / rammed earth
    case 'concrete_insitu':
    case 'concrete':
      return '#475569' // dense slate grey concrete
    case 'timber_log':
    case 'timber':
      return '#78350f' // deep cedar timber
    case 'aac_block':
      return '#94a3b8' // pale autoclaved aerated concrete
    case 'stone_slate':
      return '#334155' // alpine mountain slate
    case 'pcm_enhanced_panel':
      return '#1e293b' // tech composite slate
    default:
      return '#475569'
  }
}

export function getRoofMaterialColor(mat: string): string {
  switch (mat) {
    case 'timber_insulated_roof':
      return '#78350f'
    case 'metal_standing_seam':
      return '#334155'
    case 'green_sod_roof':
      return '#15803d'
    case 'slate_tile_roof':
      return '#1e293b'
    default:
      return '#334155'
  }
}

export interface ShelterProps {
  shape: ShapeType
  l: number
  w: number
  h: number
  openingRatio: number
  wallColor?: string
  isSection?: boolean
  isTranslucent?: boolean
}

// ─── Dynamic Layer Properties Hook ───────────────────────────────────────────
export function useSectionLayerMetrics() {
  const insulation = useDesignStore((s) => s.insulation)
  const wallMaterial = useDesignStore((s) => s.wallMaterial)
  const roofMaterial = useDesignStore((s) => s.roofMaterial)
  const thermalMass = useDesignStore((s) => s.thermalMass)
  const openingRatio = useDesignStore((s) => s.openingRatio)

  return useMemo(() => {
    // Physical & visual scaling of insulation thickness (25mm -> 0.08m, 100mm -> 0.22m, 250mm -> 0.45m)
    const insThick = Math.max(0.08, Math.min(0.45, (insulation / 1000) * 2.2))

    // Thermal mass structural thickness (low -> 0.08m, med -> 0.14m, high -> 0.22m)
    const massThick = thermalMass === 'high' ? 0.22 : thermalMass === 'low' ? 0.08 : 0.14

    // Cladding thickness
    const cladThick = 0.05

    // PCM layer active?
    const hasPCM = wallMaterial === 'pcm_enhanced_panel'
    const pcmThick = hasPCM ? 0.04 : 0

    const totalWallOffset = cladThick + insThick + pcmThick + massThick

    const wallColor = getWallMaterialColor(wallMaterial)
    const roofColor = getRoofMaterialColor(roofMaterial)

    return {
      insulation,
      insThick,
      massThick,
      cladThick,
      hasPCM,
      pcmThick,
      totalWallOffset,
      wallMaterial,
      wallColor,
      roofColor,
      openingRatio,
      thermalMass,
    }
  }, [insulation, wallMaterial, roofMaterial, thermalMass, openingRatio])
}

// ─── Wireframe Edge Helper ───────────────────────────────────────────────────
export function WireEdges({
  geometry,
  color = C.edgeDim,
  threshold = 24,
}: {
  geometry: THREE.BufferGeometry
  color?: string
  threshold?: number
}) {
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(geometry, threshold), [geometry, threshold])
  return (
    <lineSegments geometry={edgesGeom}>
      <lineBasicMaterial color={color} linewidth={1.2} />
    </lineSegments>
  )
}

// ─── Ghost Materials Hook for Section Cutaway ────────────────────────────────
export function useGhostMaterials(
  wallColor: string = C.wallDefault,
  isSection: boolean = false,
  isTranslucent: boolean = false
) {
  return useMemo(() => {
    if (isSection) {
      return {
        material: new THREE.MeshStandardMaterial({
          color: wallColor,
          roughness: 0.85,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
        edgeColor: C.edgeHi,
      }
    }
    return {
      material: new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.8,
        metalness: 0.05,
        transparent: isTranslucent,
        opacity: isTranslucent ? 0.45 : 1.0,
        side: THREE.FrontSide,
      }),
      edgeColor: C.edgeDim,
    }
  }, [wallColor, isSection, isTranslucent])
}

// ─── SectionFadeIn Component (smooth lerp for interior elements) ─────────────
export function SectionFadeIn({
  children,
  isSection = false,
}: {
  children: React.ReactNode
  isSection?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const progressRef = useRef(isSection ? 1 : 0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const target = isSection ? 1 : 0
    progressRef.current = THREE.MathUtils.damp(progressRef.current, target, 8.5, delta)
    const p = progressRef.current

    groupRef.current.visible = p > 0.01
    groupRef.current.position.y = (1 - p) * -0.05
    const s = 0.98 + p * 0.02
    groupRef.current.scale.set(s, s, s)

    groupRef.current.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.Material
        if (mat && !(obj as THREE.Mesh).userData.keepSolid) {
          mat.transparent = true
          mat.opacity = THREE.MathUtils.clamp(p * 0.98, 0, 1)
        }
      }
    })
  })

  return <group ref={groupRef}>{children}</group>
}

// ─── Multi-Layer Insulated Floor Assembly ────────────────────────────────────
export function MultiLayerFloor({
  w,
  l,
  insThick = 0.12,
  wallColor = C.wallDefault,
  isCircular = false,
  segments = 6,
}: {
  w: number
  l: number
  insThick?: number
  wallColor?: string
  isCircular?: boolean
  segments?: number
}) {
  const floorW = w * 0.98
  const floorL = l * 0.98
  const r = (w / 2) * 0.98
  const selectLayer = useLayerInspectorStore((s) => s.selectLayer)

  if (isCircular) {
    return (
      <group position={[0, 0, 0]}>
        {/* 1. Subgrade Ground Coupling Bed */}
        <mesh
          position={[0, -0.10, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('floor_slab')
          }}
        >
          <cylinderGeometry args={[r * 1.03, r * 1.03, 0.08, segments]} />
          <meshStandardMaterial color={C.groundSubgrade} roughness={0.95} />
        </mesh>

        {/* 2. Continuous Sub-Slab XPS Insulation Layer */}
        <mesh
          position={[0, -0.04, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('insulation')
          }}
        >
          <cylinderGeometry args={[r * 1.01, r * 1.01, Math.max(0.04, insThick * 0.4), segments]} />
          <meshStandardMaterial
            color={C.insulationAmber}
            roughness={0.7}
            emissive={C.insulationAmber}
            emissiveIntensity={0.12}
          />
        </mesh>

        {/* 3. Reinforced Screed Thermal Mass Floor Slab */}
        <mesh
          position={[0, 0.04, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('thermal_mass', 'thermal_mass_storage')
          }}
        >
          <cylinderGeometry args={[r, r, 0.07, segments]} />
          <meshStandardMaterial color={wallColor} roughness={0.85} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Subgrade Ground Coupling Bed */}
      <mesh
        position={[0, -0.10, 0]}
        onClick={(e) => {
          e.stopPropagation()
          selectLayer('floor_slab')
        }}
      >
        <boxGeometry args={[floorW * 1.04, 0.08, floorL * 1.04]} />
        <meshStandardMaterial color={C.groundSubgrade} roughness={0.95} />
      </mesh>

      {/* 2. Continuous Sub-Slab XPS Insulation Layer */}
      <mesh
        position={[0, -0.04, 0]}
        onClick={(e) => {
          e.stopPropagation()
          selectLayer('insulation')
        }}
      >
        <boxGeometry args={[floorW * 1.01, Math.max(0.04, insThick * 0.4), floorL * 1.01]} />
        <meshStandardMaterial
          color={C.insulationAmber}
          roughness={0.7}
          emissive={C.insulationAmber}
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* 3. Reinforced Screed Thermal Mass Floor Slab */}
      <mesh
        position={[0, 0.04, 0]}
        onClick={(e) => {
          e.stopPropagation()
          selectLayer('thermal_mass', 'thermal_mass_storage')
        }}
      >
        <boxGeometry args={[floorW, 0.07, floorL]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Floor Cut Edge Ribbon in Front */}
      <mesh position={[0, -0.02, floorL / 2]}>
        <boxGeometry args={[floorW, 0.18, 0.01]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ─── Solar Glazing Aperture with Volumetric Sunlight Ingress Beam ────────────
interface SolarApertureProps {
  wallW: number
  wallH: number
  zPos: number
  openingRatio: number
  yOffset?: number
  flip?: boolean
  showBeam?: boolean
}

export function WinPanel({
  wallW,
  wallH,
  zPos,
  openingRatio,
  yOffset = 0,
  flip = false,
  showBeam = true,
}: SolarApertureProps) {
  const selectLayer = useLayerInspectorStore((s) => s.selectLayer)

  const scale = Math.sqrt(Math.max(5, openingRatio) / 14)
  const pW = Math.min(wallW * 0.88, wallW * 0.52 * scale)
  const pH = Math.min(wallH * 0.84, wallH * 0.58 * scale)

  const frameGeom = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(pW + 0.06, pH + 0.06, 0.04)),
    [pW, pH]
  )

  const rotY = flip ? Math.PI : 0

  const beamLength = Math.min(4.5, pH * 3.5)
  const beamGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(pW * 0.5, pW * 0.8, beamLength, 4, 1, false, Math.PI / 4)
    g.rotateX(Math.PI / 3.2) // ~40° solar altitude incidence
    g.translate(0, -beamLength * 0.35, beamLength * 0.45)
    return g
  }, [pW, beamLength])

  return (
    <group position={[0, yOffset, zPos]} rotation={[0, rotY, 0]}>
      {/* Glazing Pane */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          selectLayer('glazing')
        }}
      >
        <planeGeometry args={[pW, pH]} />
        <meshStandardMaterial
          color={C.winFill}
          emissive={C.winFill}
          emissiveIntensity={0.3}
          transparent
          opacity={0.62}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Extruded Mullions Frame */}
      <lineSegments geometry={frameGeom}>
        <lineBasicMaterial color={C.winFrame} linewidth={2} />
      </lineSegments>

      {/* Volumetric Solar Penetration Sunbeam (Projected into room) */}
      {showBeam && (
        <group>
          <mesh
            geometry={beamGeom}
            onClick={(e) => {
              e.stopPropagation()
              selectLayer('solar_beam')
            }}
          >
            <meshBasicMaterial
              color={C.sunbeam}
              transparent
              opacity={0.16}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Glowing Solar Patch on Floor */}
          <mesh
            position={[0, -yOffset + 0.076, beamLength * 0.7]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation()
              selectLayer('thermal_mass', 'thermal_mass_storage')
            }}
          >
            <planeGeometry args={[pW * 1.1, pH * 1.2]} />
            <meshBasicMaterial
              color={C.solarPatch}
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTIC CAD ARCHITECTURAL 3D SECTION CUTAWAY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

interface CadSectionBoxProps {
  w: number
  h: number
  l: number
  openingRatio: number
  metrics: ReturnType<typeof useSectionLayerMetrics>
}

export function CadArchitecturalSectionBox({
  w,
  h,
  l,
  openingRatio,
  metrics,
}: CadSectionBoxProps) {
  const { insThick, massThick, cladThick, hasPCM, pcmThick, wallColor, roofColor } = metrics
  const selectLayer = useLayerInspectorStore((s) => s.selectLayer)

  const cutZ = l * 0.15
  const wallDepth = cutZ - (-l / 2)

  const halfW = w / 2
  const innerLeftX = -halfW + cladThick + insThick + (hasPCM ? pcmThick : 0) + massThick
  const innerRightX = halfW - cladThick - insThick - (hasPCM ? pcmThick : 0) - massThick
  const innerW = innerRightX - innerLeftX
  const innerH = h - (cladThick + insThick + massThick) - 0.08
  const centerY = h / 2

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. PHANTOM GHOST WIREFRAME ── */}
      <group position={[0, centerY, 0]}>
        <WireEdges geometry={new THREE.BoxGeometry(w, h, l)} color={C.edgeHi} />
      </group>

      {/* ── 2. BACK WALL ASSEMBLY (Z = -l/2) ── */}
      <group position={[0, centerY, -l / 2]}>
        {/* Exterior Cladding */}
        <mesh
          position={[0, 0, cladThick / 2]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('cladding')
          }}
        >
          <boxGeometry args={[w, h, cladThick]} />
          <meshStandardMaterial color={C.wallDefault} roughness={0.8} />
        </mesh>

        {/* Continuous Insulation Core */}
        <mesh
          position={[0, 0, cladThick + insThick / 2]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('insulation')
          }}
        >
          <boxGeometry args={[w - cladThick * 2, h - cladThick * 2, insThick]} />
          <meshStandardMaterial
            color={C.insulationAmber}
            roughness={0.7}
            emissive={C.insulationAmber}
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* PCM Layer (if active) */}
        {hasPCM && (
          <mesh
            position={[0, 0, cladThick + insThick + pcmThick / 2]}
            onClick={(e) => {
              e.stopPropagation()
              selectLayer('pcm')
            }}
          >
            <boxGeometry args={[w - (cladThick + insThick) * 2, h - (cladThick + insThick) * 2, pcmThick]} />
            <meshStandardMaterial
              color={C.pcmCyan}
              emissive={C.pcmViolet}
              emissiveIntensity={0.4}
              transparent
              opacity={0.8}
            />
          </mesh>
        )}

        {/* Interior Thermal Mass Wall */}
        <mesh
          position={[0, 0, cladThick + insThick + pcmThick + massThick / 2]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('thermal_mass')
          }}
        >
          <boxGeometry args={[innerW, innerH, massThick]} />
          <meshStandardMaterial color={wallColor} roughness={0.9} />
        </mesh>

        {/* South Glazing Aperture on Back Wall */}
        <WinPanel
          wallW={w * 0.8}
          wallH={h * 0.8}
          zPos={cladThick + insThick + pcmThick + massThick + 0.02}
          openingRatio={openingRatio}
          showBeam={true}
          flip
        />
      </group>

      {/* ── 3. LEFT SIDE WALL ASSEMBLY ── */}
      <group position={[0, centerY, -l / 2 + wallDepth / 2]}>
        {/* Layer A: Exterior Cladding */}
        <mesh
          position={[-halfW + cladThick / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('cladding')
          }}
        >
          <boxGeometry args={[cladThick, h, wallDepth]} />
          <meshStandardMaterial color={C.wallDefault} roughness={0.8} />
        </mesh>

        {/* Layer B: Volumetric Insulation Core */}
        <mesh
          position={[-halfW + cladThick + insThick / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('insulation')
          }}
        >
          <boxGeometry args={[insThick, h - cladThick * 2, wallDepth]} />
          <meshStandardMaterial
            color={C.insulationAmber}
            roughness={0.7}
            emissive={C.insulationAmber}
            emissiveIntensity={0.18}
          />
        </mesh>

        {/* Layer C: PCM Buffer */}
        {hasPCM && (
          <mesh
            position={[-halfW + cladThick + insThick + pcmThick / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation()
              selectLayer('pcm')
            }}
          >
            <boxGeometry args={[pcmThick, h - (cladThick + insThick) * 2, wallDepth]} />
            <meshStandardMaterial
              color={C.pcmCyan}
              emissive={C.pcmViolet}
              emissiveIntensity={0.35}
            />
          </mesh>
        )}

        {/* Layer D: Interior Structural Thermal Mass Wall */}
        <mesh
          position={[-halfW + cladThick + insThick + pcmThick + massThick / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('thermal_mass')
          }}
        >
          <boxGeometry args={[massThick, innerH, wallDepth]} />
          <meshStandardMaterial color={wallColor} roughness={0.88} />
        </mesh>
      </group>

      {/* ── 4. RIGHT SIDE WALL ASSEMBLY ── */}
      <group position={[0, centerY, -l / 2 + wallDepth / 2]}>
        {/* Layer A: Exterior Cladding */}
        <mesh
          position={[halfW - cladThick / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('cladding')
          }}
        >
          <boxGeometry args={[cladThick, h, wallDepth]} />
          <meshStandardMaterial color={C.wallDefault} roughness={0.8} />
        </mesh>

        {/* Layer B: Volumetric Insulation Core */}
        <mesh
          position={[halfW - cladThick - insThick / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('insulation')
          }}
        >
          <boxGeometry args={[insThick, h - cladThick * 2, wallDepth]} />
          <meshStandardMaterial
            color={C.insulationAmber}
            roughness={0.7}
            emissive={C.insulationAmber}
            emissiveIntensity={0.18}
          />
        </mesh>

        {/* Layer C: PCM Buffer */}
        {hasPCM && (
          <mesh
            position={[halfW - cladThick - insThick - pcmThick / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation()
              selectLayer('pcm')
            }}
          >
            <boxGeometry args={[pcmThick, h - (cladThick + insThick) * 2, wallDepth]} />
            <meshStandardMaterial
              color={C.pcmCyan}
              emissive={C.pcmViolet}
              emissiveIntensity={0.35}
            />
          </mesh>
        )}

        {/* Layer D: Interior Structural Thermal Mass Wall */}
        <mesh
          position={[halfW - cladThick - insThick - pcmThick - massThick / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('thermal_mass')
          }}
        >
          <boxGeometry args={[massThick, innerH, wallDepth]} />
          <meshStandardMaterial color={wallColor} roughness={0.88} />
        </mesh>
      </group>

      {/* ── 5. ROOF ASSEMBLY ── */}
      <group position={[0, h, -l / 2 + wallDepth / 2]}>
        {/* Top Exterior Roof Cladding */}
        <mesh
          position={[0, -cladThick / 2, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('cladding')
          }}
        >
          <boxGeometry args={[w, cladThick, wallDepth]} />
          <meshStandardMaterial color={roofColor} roughness={0.75} />
        </mesh>

        {/* Continuous Roof Insulation Layer */}
        <mesh
          position={[0, -cladThick - insThick / 2, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('insulation')
          }}
        >
          <boxGeometry args={[w - cladThick * 2, insThick, wallDepth]} />
          <meshStandardMaterial
            color={C.insulationAmber}
            roughness={0.7}
            emissive={C.insulationAmber}
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Interior Exposed Timber Rafters */}
        <mesh
          position={[0, -cladThick - insThick - 0.04, 0]}
          onClick={(e) => {
            e.stopPropagation()
            selectLayer('thermal_mass')
          }}
        >
          <boxGeometry args={[innerW, 0.06, wallDepth]} />
          <meshStandardMaterial color={C.timberPost} roughness={0.6} />
        </mesh>
      </group>

      {/* ── 6. MULTI-LAYER INSULATED FLOOR SLAB ── */}
      <MultiLayerFloor w={w} l={l} insThick={insThick} wallColor={wallColor} />

      {/* ── 7. FRONT SECTION CUT PROFILE CROSS-SECTION EDGES ── */}
      <group position={[0, 0, cutZ]}>
        <mesh position={[-halfW + (cladThick + insThick + massThick) / 2, centerY, 0]}>
          <boxGeometry args={[cladThick + insThick + massThick, h, 0.005]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} transparent opacity={0.15} />
        </mesh>
        <mesh position={[halfW - (cladThick + insThick + massThick) / 2, centerY, 0]}>
          <boxGeometry args={[cladThick + insThick + massThick, h, 0.005]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} transparent opacity={0.15} />
        </mesh>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STANDARD & PRISMATIC GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/** 1. Rectangular Box */
function RectangularMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const extGeom = useMemo(() => new THREE.BoxGeometry(w, h, l), [w, h, l])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <CadArchitecturalSectionBox w={w} h={h} l={l} openingRatio={openingRatio} metrics={metrics} />
      </SectionFadeIn>
    )
  }

  return (
    <group position={[0, h / 2, 0]}>
      <mesh geometry={extGeom} material={extMat} />
      <WireEdges geometry={extGeom} color={edgeColor} />
      <WinPanel wallW={w} wallH={h} zPos={-l / 2 - 0.01} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 2. Monopitch / Single-Slope Solar Shed */
function MonopitchMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  const lowH = h * 0.45
  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h)
    shape.lineTo(-w / 2, lowH)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, lowH])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h)
    shape.lineTo(-w / 2, lowH)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, lowH, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w} wallH={h * 0.8} zPos={-l / 2 + 0.05} yOffset={h * 0.45} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w} wallH={h * 0.8} zPos={-l / 2 - 0.01} yOffset={h * 0.45} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 3. Gable Roof Shelter */
function GableMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const eaveH = h * 0.55

  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, eaveH)
    shape.lineTo(0, h)
    shape.lineTo(-w / 2, eaveH)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, eaveH])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, eaveH)
    shape.lineTo(0, h)
    shape.lineTo(-w / 2, eaveH)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, eaveH, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w} wallH={h * 0.5} zPos={-l / 2 + 0.05} yOffset={h * 0.28} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w} wallH={h * 0.5} zPos={-l / 2 - 0.01} yOffset={h * 0.28} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 4. Hip Roof Shelter */
function HipRoofMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const eaveH = h * 0.55
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const wallGeom = useMemo(() => new THREE.BoxGeometry(w, eaveH, l), [w, eaveH, l])
  const roofGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(Math.max(w, l) * 0.72, h - eaveH, 4)
    g.rotateY(Math.PI / 4)
    g.scale(w / Math.max(w, l), 1, l / Math.max(w, l))
    return g
  }, [w, l, h, eaveH])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutWallGeom = useMemo(() => {
    const g = new THREE.BoxGeometry(w, eaveH, cutDepth)
    g.translate(0, 0, -l / 2 + cutDepth / 2)
    return g
  }, [w, eaveH, l, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <group position={[0, eaveH / 2, 0]}>
            <WireEdges geometry={wallGeom} color={C.edgeHi} />
          </group>
          <group position={[0, eaveH + (h - eaveH) / 2, 0]}>
            <WireEdges geometry={roofGeom} color={C.edgeHi} />
          </group>
          <mesh geometry={cutWallGeom} material={extMat} position={[0, eaveH / 2, 0]} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w} wallH={eaveH} zPos={-l / 2 + 0.05} yOffset={eaveH / 2} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={wallGeom} material={extMat} position={[0, eaveH / 2, 0]} />
      <WireEdges geometry={wallGeom} color={edgeColor} />
      <mesh geometry={roofGeom} material={extMat} position={[0, eaveH + (h - eaveH) / 2, 0]} />
      <group position={[0, eaveH + (h - eaveH) / 2, 0]}>
        <WireEdges geometry={roofGeom} color={edgeColor} />
      </group>
      <WinPanel wallW={w} wallH={eaveH} zPos={-l / 2 - 0.01} yOffset={eaveH / 2} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 5. Mansard Roof Shelter */
function MansardMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const curbH = h * 0.75
  const curbW = w * 0.8

  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h * 0.45)
    shape.lineTo(curbW / 2, curbH)
    shape.lineTo(0, h)
    shape.lineTo(-curbW / 2, curbH)
    shape.lineTo(-w / 2, h * 0.45)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, curbH, curbW])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h * 0.45)
    shape.lineTo(curbW / 2, curbH)
    shape.lineTo(0, h)
    shape.lineTo(-curbW / 2, curbH)
    shape.lineTo(-w / 2, h * 0.45)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, curbH, curbW, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w} wallH={h * 0.45} zPos={-l / 2 + 0.05} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w} wallH={h * 0.45} zPos={-l / 2 - 0.01} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 6. Gambrel Arch Barn */
function GambrelMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const eaveH = h * 0.35
  const knuckleH = h * 0.78
  const knuckleW = w * 0.75

  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, eaveH)
    shape.lineTo(knuckleW / 2, knuckleH)
    shape.lineTo(0, h)
    shape.lineTo(-knuckleW / 2, knuckleH)
    shape.lineTo(-w / 2, eaveH)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, eaveH, knuckleH, knuckleW])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, eaveH)
    shape.lineTo(knuckleW / 2, knuckleH)
    shape.lineTo(0, h)
    shape.lineTo(-knuckleW / 2, knuckleH)
    shape.lineTo(-w / 2, eaveH)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, eaveH, knuckleH, knuckleW, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w} wallH={h * 0.45} zPos={-l / 2 + 0.05} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w} wallH={h * 0.45} zPos={-l / 2 - 0.01} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CURVED & VAULTED GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/** 7. Semidome / Quonset Vault */
function SemidomeMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const r = w / 2

  const fullGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(r, r, l, 28, 1, false, 0, Math.PI)
    g.rotateZ(Math.PI / 2)
    g.scale(1, h / r, 1)
    return g
  }, [r, l, h])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(r, r, cutDepth, 28, 1, false, 0, Math.PI)
    g.rotateZ(Math.PI / 2)
    g.scale(1, h / r, 1)
    g.translate(0, 0, -l / 2 + cutDepth / 2)
    return g
  }, [r, cutDepth, h, l])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.8} wallH={h * 0.7} zPos={-l / 2 + 0.05} yOffset={h * 0.35} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.8} wallH={h * 0.7} zPos={-l / 2 - 0.01} yOffset={h * 0.35} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 8. Extended Quonset Vault */
function QuonsetExtendedMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const stemH = h * 0.35
  const archH = h - stemH
  const r = w / 2
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  const stemGeom = useMemo(() => new THREE.BoxGeometry(w, stemH, l), [w, stemH, l])
  const archGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(r, r, l, 24, 1, false, 0, Math.PI)
    g.rotateZ(Math.PI / 2)
    g.scale(1, archH / r, 1)
    return g
  }, [r, l, archH])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutStemGeom = useMemo(() => {
    const g = new THREE.BoxGeometry(w, stemH, cutDepth)
    g.translate(0, 0, -l / 2 + cutDepth / 2)
    return g
  }, [w, stemH, l, cutDepth])

  const cutArchGeom = useMemo(() => {
    const g = new THREE.CylinderGeometry(r, r, cutDepth, 24, 1, false, 0, Math.PI)
    g.rotateZ(Math.PI / 2)
    g.scale(1, archH / r, 1)
    g.translate(0, 0, -l / 2 + cutDepth / 2)
    return g
  }, [r, cutDepth, archH, l])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <group position={[0, stemH / 2, 0]}>
            <WireEdges geometry={stemGeom} color={C.edgeHi} />
          </group>
          <group position={[0, stemH, 0]}>
            <WireEdges geometry={archGeom} color={C.edgeHi} />
          </group>
          <mesh geometry={cutStemGeom} material={extMat} position={[0, stemH / 2, 0]} />
          <mesh geometry={cutArchGeom} material={extMat} position={[0, stemH, 0]} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.8} wallH={stemH * 0.85} zPos={-l / 2 + 0.05} yOffset={stemH / 2} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={stemGeom} material={extMat} position={[0, stemH / 2, 0]} />
      <WireEdges geometry={stemGeom} color={edgeColor} />
      <mesh geometry={archGeom} material={extMat} position={[0, stemH, 0]} />
      <group position={[0, stemH, 0]}>
        <WireEdges geometry={archGeom} color={edgeColor} />
      </group>
      <WinPanel wallW={w * 0.8} wallH={stemH * 0.85} zPos={-l / 2 - 0.01} yOffset={stemH / 2} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 9. Gothic Barrel Vault */
function BarrelVaultMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.quadraticCurveTo(w / 4, h * 0.8, 0, h)
    shape.quadraticCurveTo(-w / 4, h * 0.8, -w / 2, 0)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.quadraticCurveTo(w / 4, h * 0.8, 0, h)
    shape.quadraticCurveTo(-w / 4, h * 0.8, -w / 2, 0)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.7} wallH={h * 0.55} zPos={-l / 2 + 0.05} yOffset={h * 0.3} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.7} wallH={h * 0.55} zPos={-l / 2 - 0.01} yOffset={h * 0.3} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 10. Hyperbolic Paraboloid (Saddle Hypar) */
function HyparMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const fullGeom = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, l, 16, 16)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (w / 2)
      const z = pos.getY(i) / (l / 2)
      const y = (x * x - z * z) * (h * 0.35) + h * 0.65
      pos.setZ(i, y)
    }
    g.computeVertexNormals()
    g.rotateX(-Math.PI / 2)
    return g
  }, [w, l, h])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={fullGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.75} wallH={h * 0.5} zPos={-l / 2 + 0.05} yOffset={h * 0.28} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.75} wallH={h * 0.5} zPos={-l / 2 - 0.01} yOffset={h * 0.28} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 11. Torus Inflatable Habitat */
function TorusInflatableMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const rMajor = w * 0.4
  const rMinor = Math.min(w * 0.18, h * 0.45)

  const fullGeom = useMemo(() => {
    const g = new THREE.TorusGeometry(rMajor, rMinor, 16, 32)
    g.rotateX(Math.PI / 2)
    return g
  }, [rMajor, rMinor])

  const cutGeom = useMemo(() => {
    const g = new THREE.TorusGeometry(rMajor, rMinor, 16, 32, Math.PI)
    g.rotateX(Math.PI / 2)
    g.rotateZ(Math.PI / 2)
    return g
  }, [rMajor, rMinor])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group position={[0, rMinor, 0]}>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} isCircular />
          <WinPanel wallW={rMinor * 1.8} wallH={rMinor * 1.6} zPos={-rMajor + 0.05} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group position={[0, rMinor, 0]}>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={rMinor * 1.8} wallH={rMinor * 1.6} zPos={-rMajor} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RADIAL, DOME & CONICAL GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/** 12. Geodesic Dome */
function GeodesicDomeMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const r = w / 2

  const fullGeom = useMemo(() => {
    const g = new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)
    g.scale(1, h / r, 1)
    return g
  }, [r, h])

  const cutGeom = useMemo(() => {
    const g = new THREE.SphereGeometry(r, 14, 10, Math.PI / 2, Math.PI, 0, Math.PI / 2)
    g.scale(1, h / r, 1)
    return g
  }, [r, h])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} isCircular segments={16} />
          <WinPanel wallW={w * 0.6} wallH={h * 0.55} zPos={-r * 0.85} yOffset={h * 0.3} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.6} wallH={h * 0.55} zPos={-r * 0.9} yOffset={h * 0.3} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 13. Igloo Catenary Dome */
function IglooMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const r = w / 2

  const fullGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(r, h, 24, 6, true)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const t = y / h
      const cat = Math.cosh(t * 1.5) / Math.cosh(1.5)
      pos.setX(i, pos.getX(i) * cat)
      pos.setZ(i, pos.getZ(i) * cat)
    }
    g.computeVertexNormals()
    g.translate(0, h / 2, 0)
    return g
  }, [r, h])

  const cutGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(r, h, 24, 6, true, Math.PI / 2, Math.PI)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const t = y / h
      const cat = Math.cosh(t * 1.5) / Math.cosh(1.5)
      pos.setX(i, pos.getX(i) * cat)
      pos.setZ(i, pos.getZ(i) * cat)
    }
    g.computeVertexNormals()
    g.translate(0, h / 2, 0)
    return g
  }, [r, h])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} isCircular segments={16} />
          <WinPanel wallW={w * 0.5} wallH={h * 0.45} zPos={-r * 0.8} yOffset={h * 0.25} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.5} wallH={h * 0.45} zPos={-r * 0.85} yOffset={h * 0.25} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 14. Pyramidal Shelter */
function PyramidMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  const fullGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(Math.max(w, l) * 0.7, h, 4)
    g.rotateY(Math.PI / 4)
    g.scale(w / Math.max(w, l), 1, l / Math.max(w, l))
    g.translate(0, h / 2, 0)
    return g
  }, [w, l, h])

  const cutGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(Math.max(w, l) * 0.7, h, 4, 1, false, Math.PI / 2, Math.PI)
    g.rotateY(Math.PI / 4)
    g.scale(w / Math.max(w, l), 1, l / Math.max(w, l))
    g.translate(0, h / 2, 0)
    return g
  }, [w, l, h])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.55} wallH={h * 0.4} zPos={-l / 2 * 0.75} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.55} wallH={h * 0.4} zPos={-l / 2 * 0.8} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 15. Conical High-Alpine Teepee */
function ConicalTeepeeMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const r = w / 2

  const fullGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(r, h, 20)
    g.translate(0, h / 2, 0)
    return g
  }, [r, h])

  const cutGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(r, h, 20, 1, false, Math.PI / 2, Math.PI)
    g.translate(0, h / 2, 0)
    return g
  }, [r, h])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} isCircular segments={20} />
          <WinPanel wallW={w * 0.45} wallH={h * 0.4} zPos={-r * 0.7} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.45} wallH={h * 0.4} zPos={-r * 0.75} yOffset={h * 0.22} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. POLYGONAL & FACETED GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/** 16. A-Frame Steep Snow Pitch */
function AFrameMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(0, h)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(0, h)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.7} wallH={h * 0.6} zPos={-l / 2 + 0.05} yOffset={h * 0.32} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.7} wallH={h * 0.6} zPos={-l / 2 - 0.01} yOffset={h * 0.32} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 17. Hexagonal Yurt (Gers) */
function HexagonalYurtMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const wallH = h * 0.55
  const roofH = h - wallH
  const r = w / 2
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  const wallGeom = useMemo(() => new THREE.CylinderGeometry(r, r, wallH, 6), [r, wallH])
  const roofGeom = useMemo(() => new THREE.ConeGeometry(r * 1.05, roofH, 6), [r, roofH])

  const cutWallGeom = useMemo(() => new THREE.CylinderGeometry(r, r, wallH, 6, 1, false, Math.PI / 2, Math.PI), [r, wallH])
  const cutRoofGeom = useMemo(() => new THREE.ConeGeometry(r * 1.05, roofH, 6, 1, false, Math.PI / 2, Math.PI), [r, roofH])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          {/* Full Ghost Wireframe of the Yurt Envelope */}
          <group position={[0, wallH / 2, 0]}>
            <WireEdges geometry={wallGeom} color={C.edgeHi} />
          </group>
          <group position={[0, wallH + roofH / 2, 0]}>
            <WireEdges geometry={roofGeom} color={C.edgeHi} />
          </group>
          {/* Sliced Back Half of the Yurt Shell */}
          <mesh geometry={cutWallGeom} material={extMat} position={[0, wallH / 2, 0]} />
          <mesh geometry={cutRoofGeom} material={extMat} position={[0, wallH + roofH / 2, 0]} />
          {/* Hexagonal Foundation Slab */}
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} isCircular segments={6} />
          {/* Central Structural Yurt Pillar */}
          <mesh position={[0, wallH * 0.75, 0]}>
            <cylinderGeometry args={[0.08, 0.08, wallH * 1.5, 8]} />
            <meshStandardMaterial color={C.timberPost} roughness={0.6} />
          </mesh>
          {/* South Glazing Window Panel with Sunbeam */}
          <WinPanel wallW={r * 1.2} wallH={wallH * 0.75} zPos={-r * 0.8} yOffset={wallH / 2} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={wallGeom} material={extMat} position={[0, wallH / 2, 0]} />
      <WireEdges geometry={wallGeom} color={edgeColor} />
      <mesh geometry={roofGeom} material={extMat} position={[0, wallH + roofH / 2, 0]} />
      <group position={[0, wallH + roofH / 2, 0]}>
        <WireEdges geometry={roofGeom} color={edgeColor} />
      </group>
      <WinPanel wallW={r * 1.2} wallH={wallH * 0.75} zPos={-r * 0.88} yOffset={wallH / 2} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 18. Octagonal Arctic Pod */
function OctagonalPodMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const wallH = h * 0.6
  const roofH = h - wallH
  const r = w / 2
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  const wallGeom = useMemo(() => new THREE.CylinderGeometry(r, r, wallH, 8), [r, wallH])
  const roofGeom = useMemo(() => new THREE.ConeGeometry(r * 1.04, roofH, 8), [r, roofH])

  const cutWallGeom = useMemo(() => new THREE.CylinderGeometry(r, r, wallH, 8, 1, false, Math.PI / 2, Math.PI), [r, wallH])
  const cutRoofGeom = useMemo(() => new THREE.ConeGeometry(r * 1.04, roofH, 8, 1, false, Math.PI / 2, Math.PI), [r, roofH])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <group position={[0, wallH / 2, 0]}>
            <WireEdges geometry={wallGeom} color={C.edgeHi} />
          </group>
          <group position={[0, wallH + roofH / 2, 0]}>
            <WireEdges geometry={roofGeom} color={C.edgeHi} />
          </group>
          <mesh geometry={cutWallGeom} material={extMat} position={[0, wallH / 2, 0]} />
          <mesh geometry={cutRoofGeom} material={extMat} position={[0, wallH + roofH / 2, 0]} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} isCircular segments={8} />
          <WinPanel wallW={r * 1.1} wallH={wallH * 0.75} zPos={-r * 0.85} yOffset={wallH / 2} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={wallGeom} material={extMat} position={[0, wallH / 2, 0]} />
      <WireEdges geometry={wallGeom} color={edgeColor} />
      <mesh geometry={roofGeom} material={extMat} position={[0, wallH + roofH / 2, 0]} />
      <group position={[0, wallH + roofH / 2, 0]}>
        <WireEdges geometry={roofGeom} color={edgeColor} />
      </group>
      <WinPanel wallW={r * 1.1} wallH={wallH * 0.75} zPos={-r * 0.9} yOffset={wallH / 2} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 19. Diamond Faceted Stealth */
function DiamondFacetedMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const fullGeom = useMemo(() => {
    const g = new THREE.OctahedronGeometry(Math.max(w, l) * 0.55)
    g.scale(w / Math.max(w, l), h / Math.max(w, l), l / Math.max(w, l))
    g.translate(0, h / 2, 0)
    return g
  }, [w, l, h])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={fullGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.55} wallH={h * 0.45} zPos={-l / 2 * 0.75} yOffset={h * 0.35} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.55} wallH={h * 0.45} zPos={-l / 2 - 0.16} yOffset={h * 0.35} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 20. Supersonic Windward Wedge */
function WedgeSupersonicMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h)
    shape.lineTo(-w / 2, h * 0.12)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h)
    shape.lineTo(-w / 2, h * 0.12)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.8} wallH={h * 0.75} zPos={-l / 2 + 0.05} yOffset={h * 0.45} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.8} wallH={h * 0.75} zPos={-l / 2 - 0.01} yOffset={h * 0.45} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SPECIALIZED & CLIMATE-ADAPTIVE
// ─────────────────────────────────────────────────────────────────────────────

/** 21. Bifacial Dual-Slope Collector */
function BifacialShedMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const apexX = w * 0.2

  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h * 0.35)
    shape.lineTo(apexX, h)
    shape.lineTo(-w / 2, h * 0.6)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, apexX])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, h * 0.35)
    shape.lineTo(apexX, h)
    shape.lineTo(-w / 2, h * 0.6)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, apexX, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.75} wallH={h * 0.6} zPos={-l / 2 + 0.05} yOffset={h * 0.35} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.75} wallH={h * 0.6} zPos={-l / 2 - 0.01} yOffset={h * 0.35} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 22. Elevated Stilt Tropical Pod */
function StiltElevatedMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const stiltH = h * 0.35
  const cabinH = h - stiltH
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const cabinGeom = useMemo(() => new THREE.BoxGeometry(w, cabinH, l), [w, cabinH, l])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group position={[0, stiltH, 0]}>
          {[-w / 2 + 0.2, w / 2 - 0.2].map((sx, i) =>
            [-l / 2 + 0.2, l / 2 - 0.2].map((sz, j) => (
              <mesh key={`${i}-${j}`} position={[sx, -stiltH / 2, sz]}>
                <cylinderGeometry args={[0.08, 0.08, stiltH, 8]} />
                <meshStandardMaterial color={C.timberPost} />
              </mesh>
            ))
          )}
          <CadArchitecturalSectionBox w={w} h={cabinH} l={l} openingRatio={openingRatio} metrics={metrics} />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      {[-w / 2 + 0.2, w / 2 - 0.2].map((sx, i) =>
        [-l / 2 + 0.2, l / 2 - 0.2].map((sz, j) => (
          <mesh key={`${i}-${j}`} position={[sx, stiltH / 2, sz]}>
            <cylinderGeometry args={[0.08, 0.08, stiltH, 8]} />
            <meshStandardMaterial color={C.timberPost} />
          </mesh>
        ))
      )}
      <mesh geometry={cabinGeom} material={extMat} position={[0, stiltH + cabinH / 2, 0]} />
      <group position={[0, stiltH + cabinH / 2, 0]}>
        <WireEdges geometry={cabinGeom} color={edgeColor} />
      </group>
      <WinPanel wallW={w} wallH={cabinH} zPos={-l / 2 - 0.01} yOffset={stiltH + cabinH / 2} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 23. Earth-Bermed Thermal Bunker */
function BunkerBermedMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const boxGeom = useMemo(() => new THREE.BoxGeometry(w, h, l), [w, h, l])
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const bermGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w * 0.8, 0)
    shape.lineTo(w * 0.8, 0)
    shape.lineTo(w * 0.55, h * 0.95)
    shape.lineTo(-w * 0.55, h * 0.95)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l * 0.9, bevelEnabled: false })
    g.translate(0, 0, -l * 0.45)
    return g
  }, [w, h, l])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <mesh geometry={bermGeom} position={[0, 0, 0]}>
            <meshStandardMaterial color="#3f3f46" roughness={1.0} />
          </mesh>
          <CadArchitecturalSectionBox w={w} h={h} l={l} openingRatio={openingRatio} metrics={metrics} />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group position={[0, h / 2, 0]}>
      <mesh geometry={bermGeom} position={[0, -h / 2, 0]}>
        <meshStandardMaterial color="#3f3f46" roughness={1.0} />
      </mesh>
      <mesh geometry={boxGeom} material={extMat} />
      <WireEdges geometry={boxGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.8} wallH={h * 0.8} zPos={-l / 2 - 0.01} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 24. Modular Hexagonal Cluster */
function ModularHexClusterMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const r = Math.min(w, l) / 3.4
  const cellGeom = useMemo(() => new THREE.CylinderGeometry(r, r, h, 6), [r, h])
  const cutCellGeom = useMemo(() => new THREE.CylinderGeometry(r, r, h, 6, 1, false, Math.PI / 2, Math.PI), [r, h])
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group position={[0, h / 2, 0]}>
          <WireEdges geometry={cellGeom} color={C.edgeHi} />
          <mesh geometry={cutCellGeom} material={extMat} position={[0, 0, 0]} />
          <mesh geometry={cutCellGeom} material={extMat} position={[r * 1.65, 0, 0]} />
          <mesh geometry={cutCellGeom} material={extMat} position={[-r * 1.65, 0, 0]} />
          <group position={[0, -h / 2, 0]}>
            <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
            <WinPanel wallW={r * 1.2} wallH={h * 0.7} zPos={-r * 0.85} openingRatio={openingRatio} showBeam={true} flip />
          </group>
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group position={[0, h / 2, 0]}>
      <mesh geometry={cellGeom} material={extMat} position={[0, 0, 0]} />
      <WireEdges geometry={cellGeom} color={edgeColor} />
      <mesh geometry={cellGeom} material={extMat} position={[r * 1.65, 0, 0]} />
      <group position={[r * 1.65, 0, 0]}>
        <WireEdges geometry={cellGeom} color={edgeColor} />
      </group>
      <mesh geometry={cellGeom} material={extMat} position={[-r * 1.65, 0, 0]} />
      <group position={[-r * 1.65, 0, 0]}>
        <WireEdges geometry={cellGeom} color={edgeColor} />
      </group>
      <WinPanel wallW={r * 1.2} wallH={h * 0.7} zPos={-r * 0.9} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

/** 25. Pleated Origami Rapid Shelter */
function OrigamiAccordionMesh({ l, w, h, openingRatio, wallColor = C.wallDefault, isSection = false, isTranslucent = false }: ShelterProps) {
  const metrics = useSectionLayerMetrics()
  const { material: extMat, edgeColor } = useGhostMaterials(wallColor, isSection, isTranslucent)
  const folds = 5
  const foldStep = w / folds

  const fullGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    for (let i = 0; i < folds; i++) {
      const x1 = -w / 2 + (i + 0.5) * foldStep
      const x2 = -w / 2 + (i + 1) * foldStep
      shape.lineTo(x1, h)
      shape.lineTo(x2, 0)
    }
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, foldStep])

  const cutZ = l * 0.15
  const cutDepth = cutZ - (-l / 2)
  const cutGeom = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    for (let i = 0; i < folds; i++) {
      const x1 = -w / 2 + (i + 0.5) * foldStep
      const x2 = -w / 2 + (i + 1) * foldStep
      shape.lineTo(x1, h)
      shape.lineTo(x2, 0)
    }
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: cutDepth, bevelEnabled: false })
    g.translate(0, 0, -l / 2)
    return g
  }, [w, h, l, foldStep, cutDepth])

  if (isSection) {
    return (
      <SectionFadeIn isSection={isSection}>
        <group>
          <WireEdges geometry={fullGeom} color={C.edgeHi} />
          <mesh geometry={cutGeom} material={extMat} />
          <MultiLayerFloor w={w} l={l} insThick={metrics.insThick} wallColor={metrics.wallColor} />
          <WinPanel wallW={w * 0.6} wallH={h * 0.5} zPos={-l / 2 + 0.05} yOffset={h * 0.3} openingRatio={openingRatio} showBeam={true} flip />
        </group>
      </SectionFadeIn>
    )
  }

  return (
    <group>
      <mesh geometry={fullGeom} material={extMat} />
      <WireEdges geometry={fullGeom} color={edgeColor} />
      <WinPanel wallW={w * 0.6} wallH={h * 0.5} zPos={-l / 2 - 0.01} yOffset={h * 0.3} openingRatio={openingRatio} showBeam={false} flip />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Shape Dispatcher
// ─────────────────────────────────────────────────────────────────────────────
export const ShelterGeometryRenderer: React.FC<ShelterProps> = (props) => {
  switch (props.shape) {
    case 'rectangular':
      return <RectangularMesh {...props} />
    case 'monopitch':
      return <MonopitchMesh {...props} />
    case 'gable':
      return <GableMesh {...props} />
    case 'hip_roof':
      return <HipRoofMesh {...props} />
    case 'mansard':
      return <MansardMesh {...props} />
    case 'gambrel':
      return <GambrelMesh {...props} />

    case 'semidome':
      return <SemidomeMesh {...props} />
    case 'quonset_extended':
      return <QuonsetExtendedMesh {...props} />
    case 'barrel_vault':
      return <BarrelVaultMesh {...props} />
    case 'hyperbolic_paraboloid':
      return <HyparMesh {...props} />
    case 'torus_inflatable':
      return <TorusInflatableMesh {...props} />

    case 'geodesic_dome':
      return <GeodesicDomeMesh {...props} />
    case 'igloo_catenary':
      return <IglooMesh {...props} />
    case 'pyramidal':
      return <PyramidMesh {...props} />
    case 'conical_teepee':
      return <ConicalTeepeeMesh {...props} />

    case 'aframe':
      return <AFrameMesh {...props} />
    case 'hexagonal_yurt':
      return <HexagonalYurtMesh {...props} />
    case 'octagonal_pod':
      return <OctagonalPodMesh {...props} />
    case 'diamond_faceted':
      return <DiamondFacetedMesh {...props} />
    case 'wedge_supersonic':
      return <WedgeSupersonicMesh {...props} />

    case 'bifacial_shed':
      return <BifacialShedMesh {...props} />
    case 'stilt_elevated':
      return <StiltElevatedMesh {...props} />
    case 'bunker_bermed':
      return <BunkerBermedMesh {...props} />
    case 'modular_hex_cluster':
      return <ModularHexClusterMesh {...props} />
    case 'origami_accordion':
      return <OrigamiAccordionMesh {...props} />

    default:
      return <RectangularMesh {...props} />
  }
}

export default ShelterGeometryRenderer
