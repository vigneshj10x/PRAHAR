/**
 * ShelterScene.tsx — React Three Fiber scene for the 3-D digital twin.
 *
 * Fully supports:
 * - Dynamic location-driven environmental tones & lighting (Leh, Jaisalmer, Delhi, Kochi, Srinagar)
 * - 4 interactive camera perspectives: PERSPECTIVE / TOP / SOUTH / SECTION (cutaway)
 * - 4 rendering modes: NORMAL / TEMPERATURE (heat-map) / HEAT FLOW (animated outward flux) / SOLAR GAIN
 * - Interactive OrbitControls with reset & fit support
 */
import { useMemo, useRef, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useDesignStore } from '@/store/designStore'
import { useResultsStore } from '@/store/resultsStore'
import { useVisualizationStore } from '@/store/visualizationStore'
import { getLocationProfile } from '@/data/locations'
import LocationEnvironment from './environment/LocationEnvironment'
import { ShelterGeometryRenderer } from './ShelterGeometries'


// ─── Theme colors ────────────────────────────────────────────────────────────
const C = {
  wall:    '#475569',
  roof:    '#334155',
  edgeHi:  '#d97706',   // amber — solar accent
  edgeDim: '#b45309',
  winFill: '#0284c7',   // cyan/sky — cool accent
  winEdge: '#0369a1',
  sun:     '#f59e0b',
  ray:     '#ea580c',
  northTx: '#0f172a',
  compass: '#94a3b8',
  ground:  '#e2e8f0',
}

// ─── Temperature-based color tinting ────────────────────────────────────────
function getTintedWallColor(temp: number): string {
  const minTemp = -20
  const maxTemp = 15
  const t = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)))

  const coolColor = new THREE.Color(0x0284c7)  // cool cyan/blue
  const warmColor = new THREE.Color(0xd97706)  // warm amber

  const result = new THREE.Color()
  result.lerpColors(coolColor, warmColor, t)
  return '#' + result.getHexString()
}

function getHeatMapColor(temp: number): THREE.Color {
  const minTemp = -20
  const maxTemp = 15
  const t = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)))

  const coolColor = new THREE.Color(0x0047ab)  // deep blue
  const warmColor = new THREE.Color(0xff5500)  // deep orange-red
  const result = new THREE.Color()
  result.lerpColors(coolColor, warmColor, t)
  return result
}

// ─── Heat flow animated outward visualization ──────────────────────────────
interface HeatFlowProps {
  shelterW:   number
  shelterH:   number
  shelterL:   number
  insulation: number
}

function HeatFlowVisualization({ shelterW, shelterH, shelterL, insulation }: HeatFlowProps) {
  // Lower insulation (25mm) = 36 particles, high insulation (150mm) = 8 particles
  const count = Math.round(36 - ((insulation - 25) / (150 - 25)) * 28)
  const speed = 0.04 + (1 - (insulation - 25) / 125) * 0.06

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Pick a face (0: +X, 1: -X, 2: +Z, 3: -Z, 4: +Y roof)
      const face = i % 5
      let ox = 0, oy = shelterH / 2, oz = 0
      let dx = 0, dy = 0, dz = 0

      if (face === 0) { ox =  shelterW / 2; oy = Math.random() * shelterH; oz = (Math.random() - 0.5) * shelterL; dx = 1; }
      else if (face === 1) { ox = -shelterW / 2; oy = Math.random() * shelterH; oz = (Math.random() - 0.5) * shelterL; dx = -1; }
      else if (face === 2) { ox = (Math.random() - 0.5) * shelterW; oy = Math.random() * shelterH; oz =  shelterL / 2; dz = 1; }
      else if (face === 3) { ox = (Math.random() - 0.5) * shelterW; oy = Math.random() * shelterH; oz = -shelterL / 2; dz = -1; }
      else { ox = (Math.random() - 0.5) * shelterW; oy = shelterH; oz = (Math.random() - 0.5) * shelterL; dy = 1; }

      return {
        origin: [ox, oy, oz] as [number, number, number],
        dir:    [dx, dy + 0.15, dz] as [number, number, number],
        offset: Math.random() * 2.5,
        scale:  0.08 + Math.random() * 0.06,
      }
    })
  }, [count, shelterW, shelterH, shelterL])

  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i]
      if (!p) return
      p.offset += delta * (speed * 18)
      if (p.offset > 3.2) p.offset = 0

      const curX = p.origin[0] + p.dir[0] * p.offset
      const curY = p.origin[1] + p.dir[1] * p.offset
      const curZ = p.origin[2] + p.dir[2] * p.offset

      child.position.set(curX, curY, curZ)
      const fade = Math.max(0.1, 1 - p.offset / 3.2)
      child.scale.setScalar(p.scale * fade)
    })
  })

  return (
    <group ref={groupRef}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ea580c"
            emissiveIntensity={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─── Temperature heat-map overlay ────────────────────────────────────────────
function TemperatureHeatmapOverlay({ indoorTemp, shelterW, shelterH, shelterL }: { indoorTemp: number; shelterW: number; shelterH: number; shelterL: number }) {
  const heatmapColor = getHeatMapColor(indoorTemp)
  const hexColor = '#' + heatmapColor.getHexString()

  return (
    <mesh position={[0, shelterH / 2, 0]}>
      <boxGeometry args={[shelterW + 0.12, shelterH + 0.12, shelterL + 0.12]} />
      <meshStandardMaterial
        color={hexColor}
        emissive={hexColor}
        emissiveIntensity={0.4}
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Arrow (shaft + cone head) ───────────────────────────────────────────────
interface ArrowProps {
  from:      [number, number, number]
  to:        [number, number, number]
  color?:    string
  thickness?: number
}

function Arrow({ from, to, color = C.ray, thickness = 0.035 }: ArrowProps) {
  const [fx, fy, fz] = from
  const [tx, ty, tz] = to

  const { len, quaternion } = useMemo(() => {
    const f   = new THREE.Vector3(fx, fy, fz)
    const t   = new THREE.Vector3(tx, ty, tz)
    const dir = t.clone().sub(f).normalize()
    const len = t.distanceTo(f)
    const q   = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return { len, quaternion: q }
  }, [fx, fy, fz, tx, ty, tz])

  const headLen  = Math.min(0.28, len * 0.16)
  const shaftLen = len - headLen

  return (
    <group position={from} quaternion={quaternion}>
      {/* Shaft */}
      <mesh position={[0, shaftLen / 2, 0]}>
        <cylinderGeometry args={[thickness, thickness, shaftLen, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.5} />
      </mesh>
      {/* Head (cone) */}
      <mesh position={[0, shaftLen + headLen / 2, 0]}>
        <coneGeometry args={[thickness * 3, headLen, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Compass Ring ────────────────────────────────────────────────────────────
function CompassRing({ radius }: { radius: number }) {
  const geom = useMemo(() => new THREE.TorusGeometry(radius, 0.02, 6, 48), [radius])

  return (
    <group position={[0, 0.01, 0]}>
      <mesh geometry={geom} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={C.compass} />
      </mesh>
      {/* North arrow */}
      <Arrow from={[0, 0.02, radius - 0.1]} to={[0, 0.02, radius + 1.2]} color="#ef4444" thickness={0.03} />
      {/* South marker */}
      <Arrow from={[0, 0.02, -(radius - 0.1)]} to={[0, 0.02, -(radius + 1.0)]} color="#f59e0b" thickness={0.03} />
    </group>
  )
}

// ─── Sun + Radiation Rays ────────────────────────────────────────────────────
interface SunProps {
  shelterH:    number
  shelterW:    number
  orientation: number
  solarGain:   number
  emphasized?: boolean
  sunElevation?: number
  sunAzimuth?:   number
}

function SunAndRays({
  shelterH,
  shelterW,
  orientation: _orientation,
  solarGain: _solarGain,
  emphasized = false,
  sunElevation = 42.3,
  sunAzimuth = 185.0,
}: SunProps) {
  const elevRad = (sunElevation * Math.PI) / 180
  const azimRad = ((sunAzimuth - 180) * Math.PI) / 180
  const dist    = 14

  const sunX = Math.sin(azimRad) * Math.cos(elevRad) * dist
  const sunY = Math.sin(elevRad) * dist + 2
  const sunZ = -Math.cos(azimRad) * Math.cos(elevRad) * dist

  const startPos: [number, number, number] = [sunX, sunY, sunZ]
  const targetPos: [number, number, number] = [0, shelterH * 0.6, 0]

  return (
    <group>
      {/* Sun sphere */}
      <mesh position={startPos}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={C.sun} />
      </mesh>
      {/* Sun glow ring */}
      <mesh position={startPos} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <ringGeometry args={[0.65, 0.85, 24]} />
        <meshBasicMaterial color={C.sun} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Primary Solar Ray arrow */}
      <Arrow from={startPos} to={targetPos} color={C.ray} thickness={emphasized ? 0.06 : 0.035} />
      {/* Extra fan rays when emphasized */}
      {emphasized && (
        <>
          {[-shelterW * 0.35, shelterW * 0.35].map((off, i) => (
            <Arrow
              key={i}
              from={[startPos[0] + off * 0.5, startPos[1], startPos[2]]}
              to={[off, shelterH * 0.5, 0]}
              color={C.ray}
              thickness={0.028}
            />
          ))}
        </>
      )}
    </group>
  )
}

// ─── Camera Controller for 4 view perspectives ───────────────────────────────
function CameraController({
  height,
  length,
  width: _width,
  controlsRef,
}: {
  height: number
  length: number
  width: number
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()
  const viewMode = useVisualizationStore((s) => s.viewMode)
  const cameraResetKey = useVisualizationStore((s) => s.cameraResetKey)

  const targetLook = useMemo(() => new THREE.Vector3(0, height / 2, 0), [height])

  useEffect(() => {
    const controls = controlsRef.current

    if (viewMode === 'perspective') {
      camera.position.set(8, height + 3.5, 10)
      camera.lookAt(targetLook)
      if (controls) {
        controls.target.copy(targetLook)
        controls.enabled = true
        controls.update()
      }
    } else if (viewMode === 'top') {
      // Top plan view looking straight down
      camera.position.set(0, Math.max(16, length * 2.6), 0.001)
      camera.lookAt(0, 0, 0)
      if (controls) {
        controls.target.set(0, 0, 0)
        controls.enabled = true
        controls.update()
      }
    } else if (viewMode === 'south') {
      // South elevation view looking directly north at south facade
      camera.position.set(0, height / 2, -(Math.max(length, 6) * 2.0))
      camera.lookAt(targetLook)
      if (controls) {
        controls.target.copy(targetLook)
        controls.enabled = true
        controls.update()
      }
    } else if (viewMode === 'section') {
      // Section cutaway view (closer side/perspective view)
      camera.position.set(5.5, height / 2 + 1.2, 5.5)
      camera.lookAt(targetLook)
      if (controls) {
        controls.target.copy(targetLook)
        controls.enabled = true
        controls.update()
      }
    }
  }, [viewMode, cameraResetKey, camera, targetLook, height, length, controlsRef])

  return null
}

// ─── Scene Assembler ─────────────────────────────────────────────────────────
function Scene({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { shape, orientation, openingRatio, length, width, height, insulation, location } = useDesignStore()
  const replayTemperature = useResultsStore((s) => s.replayTemperature)
  const indoorTemp        = useResultsStore((s) => s.indoorTemp)
  const solarGain         = useResultsStore((s) => s.solarGain)
  const mode              = useVisualizationStore((s) => s.mode)
  const viewMode          = useVisualizationStore((s) => s.viewMode)
  const showEnvironment   = useVisualizationStore((s) => s.showEnvironment)

  const loc = getLocationProfile(location)

  // Shelter rotates around Y: 180° = south-facing
  const rotY      = ((180 - orientation) * Math.PI) / 180
  const wallColor = getTintedWallColor(replayTemperature)
  const isSection = viewMode === 'section'
  const isTranslucent = mode === 'heatflow'

  const sProps = { l: length, w: width, h: height, openingRatio, wallColor, isSection, isTranslucent }

  const grid = useMemo(() => {
    const g = new THREE.GridHelper(32, 32, loc.sceneTheme.gridCenterColor, loc.sceneTheme.gridColor)
    ;(g.material as THREE.Material).transparent = true
    ;(g.material as THREE.Material).opacity     = 0.8
    return g
  }, [loc.sceneTheme.gridCenterColor, loc.sceneTheme.gridColor])

  return (
    <>
      <CameraController
        height={height}
        length={length}
        width={width}
        controlsRef={controlsRef}
      />

      {/* ── Dynamic Location-Driven Lighting ── */}
      <ambientLight intensity={loc.sceneTheme.ambientIntensity} color={loc.sceneTheme.ambientColor} />
      <directionalLight position={[2.2, height + 6, -11]} intensity={1.35} color={loc.sceneTheme.sunColor} />
      <directionalLight position={[-3, 5, 8]} intensity={0.3} color="#e0f2fe" />

      {/* ── Dynamic Location Environment (Mountains, Trees, Snow/Dust, Terrain) ── */}
      {showEnvironment && viewMode !== 'top' && (
        <LocationEnvironment />
      )}

      {/* ── Ground Grid ── */}
      <primitive object={grid} />

      {/* ── Shelter Geometry (25 Distinct Shapes) ── */}
      <group rotation={[0, rotY, 0]}>
        <ShelterGeometryRenderer shape={shape} {...sProps} />
      </group>

      {/* ── Visualization Modes ── */}
      {mode === 'temperature' && (
        <group rotation={[0, rotY, 0]}>
          <TemperatureHeatmapOverlay indoorTemp={indoorTemp} shelterW={width} shelterH={height} shelterL={length} />
        </group>
      )}

      {mode === 'heatflow' && (
        <group rotation={[0, rotY, 0]}>
          <HeatFlowVisualization shelterW={width} shelterH={height} shelterL={length} insulation={insulation} />
        </group>
      )}

      {/* ── Fixed Compass Ring ── */}
      <CompassRing radius={Math.max(width, length) / 2 + 3.2} />

      {/* ── Sun & Radiation Rays ── */}
      <SunAndRays
        shelterH={height}
        shelterW={Math.max(width, length)}
        orientation={orientation}
        solarGain={solarGain}
        emphasized={mode === 'solargain'}
        sunElevation={loc.sceneTheme.sunElevation}
        sunAzimuth={loc.sceneTheme.sunAzimuth}
      />

      {/* ── Orbit Controls ── */}
      <OrbitControls
        ref={controlsRef}
        target={[0, height / 2, 0]}
        minDistance={2}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 + 0.06}
        enablePan={true}
        makeDefault
      />
    </>
  )
}

// ─── Default Export: Canvas Wrapper ──────────────────────────────────────────
export default function ShelterScene() {
  const height    = useDesignStore((s) => s.height)
  const location  = useDesignStore((s) => s.location)
  const loc       = getLocationProfile(location)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  return (
    <Canvas
      camera={{ position: [8, height + 3.5, 10], fov: 46, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <color attach="background" args={[loc.sceneTheme.skyColor]} />
      <Scene controlsRef={controlsRef} />
    </Canvas>
  )
}
