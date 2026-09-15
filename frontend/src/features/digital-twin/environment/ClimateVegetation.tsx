/**
 * ClimateVegetation.tsx
 *
 * High-fidelity procedural vegetation and foliage tailored to each climate zone:
 * - Kerala / Kochi: Authentic curved coconut palms with arching fronds & coconuts
 * - Delhi / Plains: Full-canopied leafy parkland shade trees with natural branch structure
 * - Kashmir / Srinagar: Multi-tiered evergreen Himalayan pine trees with snow dust
 * - Ladakh / Leh: Sparse low alpine scrub & weathered gravel rocks (at safe background distance)
 * - Jaisalmer / Desert: Slender flat-top desert acacia & dry thorny brush
 *
 * Positioned tastefully at radius 20m–38m to frame the 3D shelter without obstructing it.
 */
import { useMemo } from 'react'
import type { EnvironmentArchetype } from './MountainRanges'

interface ClimateVegetationProps {
  archetype: EnvironmentArchetype
}

// ─── 1. Authentic Kerala Coconut Palm (Kochi / Coastal) ─────────────────────
function CoconutPalm({ x, z, scale = 1, rotationY = 0 }: { x: number; z: number; scale?: number; rotationY?: number }) {
  // Frond angles: 8 radial fronds drooping naturally
  const frondAngles = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]} scale={[scale, scale, scale]}>
      {/* Curved Trunk: 3 continuous leaning segments */}
      {/* Base segment */}
      <mesh position={[0.1, 0.9, 0]} rotation={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.16, 0.22, 1.8, 7]} />
        <meshStandardMaterial color="#544133" roughness={0.92} />
      </mesh>
      {/* Mid segment */}
      <mesh position={[0.32, 2.6, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.13, 0.16, 1.7, 7]} />
        <meshStandardMaterial color="#5d4939" roughness={0.92} />
      </mesh>
      {/* Top segment (curves upwards to crown) */}
      <mesh position={[0.55, 4.2, 0]} rotation={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.11, 0.13, 1.6, 7]} />
        <meshStandardMaterial color="#665140" roughness={0.92} />
      </mesh>

      {/* Palm Crown at (x: 0.65, y: 5.0, z: 0) */}
      <group position={[0.65, 4.95, 0]}>
        {/* Cluster of Coconuts under the fronds */}
        <group position={[0, -0.15, 0]}>
          <mesh position={[0.1, 0, 0.1]}>
            <sphereGeometry args={[0.12, 6, 6]} />
            <meshStandardMaterial color="#4a5320" roughness={0.8} />
          </mesh>
          <mesh position={[-0.1, 0.05, 0.08]}>
            <sphereGeometry args={[0.11, 6, 6]} />
            <meshStandardMaterial color="#554422" roughness={0.8} />
          </mesh>
          <mesh position={[0.05, -0.05, -0.12]}>
            <sphereGeometry args={[0.13, 6, 6]} />
            <meshStandardMaterial color="#3e4a1a" roughness={0.8} />
          </mesh>
        </group>

        {/* 8 Arching Fronds */}
        {frondAngles.map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const frondColor = i % 2 === 0 ? '#2d6a4f' : '#387c5b'
          const tipColor = i % 2 === 0 ? '#40916c' : '#52b788'

          return (
            <group key={i} rotation={[0, rad, 0]}>
              {/* Inner stem arching outward and slightly up */}
              <group position={[0, 0, 0]} rotation={[0.42, 0, 0]}>
                <mesh position={[0, 0.15, 0.9]} rotation={[-0.2, 0, 0]}>
                  <coneGeometry args={[0.32, 1.8, 4]} />
                  <meshStandardMaterial color={frondColor} roughness={0.7} flatShading />
                </mesh>

                {/* Outer frond tip cascading downward */}
                <group position={[0, 0.35, 1.7]} rotation={[-0.6, 0, 0]}>
                  <mesh position={[0, 0, 0.8]}>
                    <coneGeometry args={[0.26, 1.7, 4]} />
                    <meshStandardMaterial color={tipColor} roughness={0.65} flatShading />
                  </mesh>
                </group>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

// ─── 2. Lush Delhi Parkland Shade Tree (Neem / Peepal / Banyan) ────────────
function LeafyParklandTree({ x, z, scale = 1, rotationY = 0 }: { x: number; z: number; scale?: number; rotationY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]} scale={[scale, scale, scale]}>
      {/* Sturdy Gnarled Trunk */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.22, 0.34, 2.2, 7]} />
        <meshStandardMaterial color="#423429" roughness={0.92} />
      </mesh>

      {/* Main Limbs / Branches spreading naturally */}
      <mesh position={[0.35, 2.4, 0.2]} rotation={[0.4, 0.3, -0.4]}>
        <cylinderGeometry args={[0.12, 0.18, 1.4, 5]} />
        <meshStandardMaterial color="#4a3b30" roughness={0.92} />
      </mesh>
      <mesh position={[-0.32, 2.3, -0.15]} rotation={[-0.3, 0.5, 0.5]}>
        <cylinderGeometry args={[0.11, 0.17, 1.3, 5]} />
        <meshStandardMaterial color="#4a3b30" roughness={0.92} />
      </mesh>
      <mesh position={[0.05, 2.5, -0.35]} rotation={[-0.5, -0.2, 0.1]}>
        <cylinderGeometry args={[0.11, 0.16, 1.3, 5]} />
        <meshStandardMaterial color="#4a3b30" roughness={0.92} />
      </mesh>

      {/* Lush Cloud Canopy: Clustered soft overlapping foliage masses */}
      {/* Central main dome */}
      <mesh position={[0, 3.4, 0]}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color="#3a5a40" roughness={0.85} flatShading />
      </mesh>
      {/* Top crown puff */}
      <mesh position={[0.1, 4.3, 0.05]}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color="#4f772d" roughness={0.82} flatShading />
      </mesh>
      {/* Right limb cluster */}
      <mesh position={[0.9, 3.1, 0.35]}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#31572c" roughness={0.85} flatShading />
      </mesh>
      {/* Left limb cluster */}
      <mesh position={[-0.85, 2.9, -0.25]}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#4f772d" roughness={0.82} flatShading />
      </mesh>
      {/* Rear cluster */}
      <mesh position={[0.15, 3.0, -0.85]}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color="#2d5016" roughness={0.88} flatShading />
      </mesh>
      {/* Forward sunlit cluster */}
      <mesh position={[0.2, 2.8, 0.75]}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial color="#588157" roughness={0.8} flatShading />
      </mesh>
    </group>
  )
}

// ─── 3. Himalayan Pine / Deodar Tree (Kashmir / Valley) ────────────────────
function HimalayanPine({ x, z, scale = 1, snowDusted = true }: { x: number; z: number; scale?: number; snowDusted?: boolean }) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.12, 0.2, 2.0, 6]} />
        <meshStandardMaterial color="#423428" roughness={0.92} />
      </mesh>

      {/* Layer 1 (Bottom) */}
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[1.35, 1.4, 7]} />
        <meshStandardMaterial color="#1b382b" roughness={0.82} flatShading />
      </mesh>
      {/* Layer 2 (Mid-low) */}
      <mesh position={[0, 3.1, 0]}>
        <coneGeometry args={[1.1, 1.3, 7]} />
        <meshStandardMaterial color="#214434" roughness={0.82} flatShading />
      </mesh>
      {/* Layer 3 (Mid-high) */}
      <mesh position={[0, 3.9, 0]}>
        <coneGeometry args={[0.82, 1.2, 7]} />
        <meshStandardMaterial color="#2a523f" roughness={0.8} flatShading />
      </mesh>
      {/* Layer 4 (Top apex) */}
      <mesh position={[0, 4.65, 0]}>
        <coneGeometry args={[0.55, 1.1, 7]} />
        <meshStandardMaterial color="#35614b" roughness={0.8} flatShading />
      </mesh>

      {/* Delicate snow frosting on tip */}
      {snowDusted && (
        <mesh position={[0, 4.9, 0]}>
          <coneGeometry args={[0.32, 0.65, 7]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} flatShading />
        </mesh>
      )}
    </group>
  )
}

// ─── 4. Desert Acacia Tree (Jaisalmer / Thar) ──────────────────────────────
function DesertAcacia({ x, z, scale = 1, rotationY = 0 }: { x: number; z: number; scale?: number; rotationY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]} scale={[scale, scale, scale]}>
      {/* Crooked desert trunk */}
      <mesh position={[0.1, 1.1, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.13, 0.19, 2.2, 6]} />
        <meshStandardMaterial color="#665440" roughness={0.92} />
      </mesh>
      <mesh position={[0.45, 2.2, 0.15]} rotation={[0.25, 0.3, -0.35]}>
        <cylinderGeometry args={[0.09, 0.13, 1.3, 5]} />
        <meshStandardMaterial color="#665440" roughness={0.92} />
      </mesh>

      {/* Flat umbrella-like canopies */}
      <mesh position={[0.65, 2.8, 0.2]}>
        <cylinderGeometry args={[1.4, 0.9, 0.45, 8]} />
        <meshStandardMaterial color="#6b7042" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[-0.2, 2.6, -0.1]}>
        <cylinderGeometry args={[1.1, 0.7, 0.4, 8]} />
        <meshStandardMaterial color="#7a8249" roughness={0.85} flatShading />
      </mesh>
    </group>
  )
}

// ─── 5. Low Shrub & Gravel (Subtle & properly scaled) ──────────────────────
function NaturalShrub({ x, z, color = '#4d5d53', scale = 1 }: { x: number; z: number; color?: string; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.22, 0]}>
        <icosahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial color={color} roughness={0.88} flatShading />
      </mesh>
    </group>
  )
}

// Subtle distant boulder (kept small and away from shelter)
function DistantGravel({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.18, 0]} rotation={[0.2, 0.4, 0.1]}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#64748b" roughness={0.92} flatShading />
      </mesh>
    </group>
  )
}

export const ClimateVegetation = ({ archetype }: ClimateVegetationProps) => {
  // Deterministic layout of vegetation around the perimeter (radius 20m–38m)
  const items = useMemo(() => {
    const list: Array<{ x: number; z: number; scale: number; rotY: number }> = []
    let seed = 256
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const count = 12
    for (let i = 0; i < count; i++) {
      // Position around perimeter: angle 0 to 2PI, radius 21m to 38m (well away from shelter)
      const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.3
      const dist = 21 + rnd() * 16
      const x = Math.sin(angle) * dist
      const z = Math.cos(angle) * dist
      const scale = 0.85 + rnd() * 0.35
      const rotY = rnd() * Math.PI * 2

      list.push({ x, z, scale, rotY })
    }

    return list
  }, [archetype])

  return (
    <group name="climate-vegetation">
      {items.map((item, idx) => {
        if (archetype === 'coastal_tropical') {
          // Kerala / Kochi: Authentic coconut palms & lush tropical bushes
          return idx % 3 === 0 ? (
            <NaturalShrub key={idx} x={item.x} z={item.z} color="#2d6a4f" scale={item.scale * 1.2} />
          ) : (
            <CoconutPalm key={idx} x={item.x} z={item.z} scale={item.scale * 1.05} rotationY={item.rotY} />
          )
        } else if (archetype === 'plains') {
          // Delhi: Leafy parkland shade trees
          return idx % 4 === 0 ? (
            <NaturalShrub key={idx} x={item.x} z={item.z} color="#4f772d" scale={item.scale} />
          ) : (
            <LeafyParklandTree key={idx} x={item.x} z={item.z} scale={item.scale * 1.0} rotationY={item.rotY} />
          )
        } else if (archetype === 'valley_forested') {
          // Kashmir: Himalayan pines
          return <HimalayanPine key={idx} x={item.x} z={item.z} scale={item.scale * 1.0} snowDusted={idx % 2 === 0} />
        } else if (archetype === 'desert_dunes') {
          // Jaisalmer: Desert acacia & dry shrubs
          return idx % 2 === 0 ? (
            <DesertAcacia key={idx} x={item.x} z={item.z} scale={item.scale} rotationY={item.rotY} />
          ) : (
            <NaturalShrub key={idx} x={item.x} z={item.z} color="#8a8050" scale={item.scale * 0.8} />
          )
        } else {
          // High Altitude (Leh): Sparse small gravel rocks & cold scrub at distance (no giant foreground boulders!)
          return idx % 2 === 0 ? (
            <DistantGravel key={idx} x={item.x} z={item.z} scale={item.scale * 0.85} />
          ) : (
            <NaturalShrub key={idx} x={item.x} z={item.z} color="#475550" scale={item.scale * 0.75} />
          )
        }
      })}
    </group>
  )
}

export default ClimateVegetation
