/**
 * MountainRanges.tsx
 *
 * Panoramic background mountains, hill ranges, and dunes.
 * Features realistic proportions:
 * - Broad, massive bases (radius 35-55m) pushed back to the horizon (distance 70-105m)
 * - Single continuous mountain massifs: rock base frustum seamlessly connected
 *   to the snowcap cone (no "mountain over mountain" or floating stacked cones)
 * - Layered foothill ridges that ground the mountains naturally into the terrain
 * - Location-specific archetypes:
 *   • High Altitude (Leh): Majestic Himalayan snow-capped granite massifs
 *   • Valley (Srinagar): Forested pine mountain ridges with snowy backdrop
 *   • Desert (Jaisalmer): Sweeping warm golden sand dunes & mesas
 *   • Coastal (Kochi): Lush rolling tropical green coastal hills
 *   • Plains (Delhi): Gentle distant horizon ridges
 */
import { useMemo } from 'react'

export type EnvironmentArchetype = 'high_altitude_snow' | 'valley_forested' | 'desert_dunes' | 'coastal_tropical' | 'plains'

interface MountainRangesProps {
  archetype: EnvironmentArchetype
}

interface MountainPeakData {
  x: number
  z: number
  totalHeight: number
  radius: number
  rotationY: number
  segments: number
  rockColor: string
  snowRatio?: number // fraction of height covered in snow (0 to 0.45)
  snowColor?: string
  isMesa?: boolean
}

export const MountainRanges = ({ archetype }: MountainRangesProps) => {
  const { mainPeaks, foothills } = useMemo(() => {
    const peaks: MountainPeakData[] = []
    const hills: MountainPeakData[] = []

    let seed = 77
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    if (archetype === 'high_altitude_snow') {
      // ─── Himalayan Amphitheater (Leh / Ladakh) ──────────────────────────────
      // 10 broad, majestic mountain massifs in a sweeping horizon ring (dist 72–102m)
      const count = 11
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.22
        const dist = 76 + rnd() * 26
        const totalH = 22 + rnd() * 12   // 22m to 34m tall
        const r = 36 + rnd() * 16        // 36m to 52m wide base (broad, realistic)
        const x = Math.sin(angle) * dist
        const z = Math.cos(angle) * dist
        const rockPalette = ['#334155', '#3e4c59', '#2c394b', '#475569', '#384451']
        const rockColor = rockPalette[Math.floor(rnd() * rockPalette.length)]

        peaks.push({
          x,
          z,
          totalHeight: totalH,
          radius: r,
          rotationY: rnd() * Math.PI,
          segments: 7, // clean low-poly facets
          rockColor,
          snowRatio: 0.32 + rnd() * 0.12, // upper 32-44% is glacial snow
          snowColor: '#f8fafc',
        })
      }

      // Layered foothill scree ridges closer to ground (dist 52–68m)
      const hillCount = 8
      for (let i = 0; i < hillCount; i++) {
        const angle = (i / hillCount) * Math.PI * 2 + (rnd() - 0.5) * 0.35
        const dist = 54 + rnd() * 14
        const h = 8 + rnd() * 6
        const r = 24 + rnd() * 10
        const x = Math.sin(angle) * dist
        const z = Math.cos(angle) * dist
        const rockPalette = ['#475569', '#526071', '#3f4e5e']

        hills.push({
          x,
          z,
          totalHeight: h,
          radius: r,
          rotationY: rnd() * Math.PI,
          segments: 6,
          rockColor: rockPalette[Math.floor(rnd() * rockPalette.length)],
        })
      }
    } else if (archetype === 'valley_forested') {
      // ─── Kashmir Valley Mountain Ridges ─────────────────────────────────────
      const count = 10
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.25
        const dist = 74 + rnd() * 24
        const totalH = 18 + rnd() * 10
        const r = 38 + rnd() * 14
        const x = Math.sin(angle) * dist
        const z = Math.cos(angle) * dist
        const ridgePalette = ['#1e2d24', '#263a2e', '#1c2833', '#243b35']
        const rockColor = ridgePalette[Math.floor(rnd() * ridgePalette.length)]
        const hasSnow = rnd() > 0.45

        peaks.push({
          x,
          z,
          totalHeight: totalH,
          radius: r,
          rotationY: rnd() * Math.PI,
          segments: 7,
          rockColor,
          snowRatio: hasSnow ? 0.25 : undefined,
          snowColor: '#e2e8f0',
        })
      }

      // Closer forested ridges (dist 52–66m)
      const hillCount = 7
      for (let i = 0; i < hillCount; i++) {
        const angle = (i / hillCount) * Math.PI * 2 + (rnd() - 0.5) * 0.3
        const dist = 54 + rnd() * 12
        const h = 7 + rnd() * 5
        const r = 26 + rnd() * 8
        const x = Math.sin(angle) * dist
        const z = Math.cos(angle) * dist

        hills.push({
          x,
          z,
          totalHeight: h,
          radius: r,
          rotationY: rnd() * Math.PI,
          segments: 6,
          rockColor: '#1e382b',
        })
      }
    } else if (archetype === 'desert_dunes') {
      // ─── Thar Desert Dunes & Sandstone Mesas ────────────────────────────────
      const count = 9
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.3
        const dist = 70 + rnd() * 26
        const isMesa = rnd() > 0.6
        const totalH = isMesa ? 10 + rnd() * 6 : 9 + rnd() * 6
        const r = 42 + rnd() * 18
        const x = Math.sin(angle) * dist
        const z = Math.cos(angle) * dist
        const dunePalette = ['#d4a373', '#c89565', '#ddb892', '#e29578', '#b08968']

        peaks.push({
          x,
          z,
          totalHeight: totalH,
          radius: r,
          rotationY: rnd() * Math.PI,
          segments: 8,
          rockColor: dunePalette[Math.floor(rnd() * dunePalette.length)],
          isMesa,
        })
      }
    } else if (archetype === 'coastal_tropical') {
      // ─── Coastal Western Ghats Foothills ───────────────────────────────────
      const count = 8
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.3
        const dist = 72 + rnd() * 24
        const totalH = 11 + rnd() * 7
        const r = 45 + rnd() * 18
        const x = Math.sin(angle) * dist
        const z = Math.cos(angle) * dist
        const greenPalette = ['#2d6a4f', '#40916c', '#1b4332', '#31572c']

        peaks.push({
          x,
          z,
          totalHeight: totalH,
          radius: r,
          rotationY: rnd() * Math.PI,
          segments: 8,
          rockColor: greenPalette[Math.floor(rnd() * greenPalette.length)],
        })
      }
    } else {
      // ─── Plains Hazy Horizon Ridges ─────────────────────────────────────────
      const count = 7
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const dist = 76 + rnd() * 22
        const totalH = 7 + rnd() * 4
        const r = 50 + rnd() * 16
        const x = Math.sin(angle) * dist
        const z = Math.cos(angle) * dist

        peaks.push({
          x,
          z,
          totalHeight: totalH,
          radius: r,
          rotationY: rnd() * Math.PI,
          segments: 8,
          rockColor: '#64748b',
        })
      }
    }

    return { mainPeaks: peaks, foothills: hills }
  }, [archetype])

  return (
    <group name="mountain-ranges">
      {/* ── Background Mountain Peaks ── */}
      {mainPeaks.map((peak, idx) => {
        // Calculate continuous, seamless slope:
        // totalHeight H, base radius R
        // If snowRatio s, snow height = H * s, base height = H * (1 - s)
        // At junction, radius = R * s
        const hasSnow = peak.snowRatio && peak.snowRatio > 0 && !peak.isMesa
        const sRatio = peak.snowRatio || 0
        const snowH = peak.totalHeight * sRatio
        const baseH = peak.totalHeight - snowH
        const junctionR = peak.radius * sRatio

        return (
          <group key={`peak-${idx}`} position={[peak.x, 0, peak.z]} rotation={[0, peak.rotationY, 0]}>
            {peak.isMesa ? (
              // Sandstone Mesa / Butte
              <mesh position={[0, peak.totalHeight / 2, 0]}>
                <cylinderGeometry args={[peak.radius * 0.48, peak.radius, peak.totalHeight, peak.segments]} />
                <meshStandardMaterial color={peak.rockColor} roughness={0.9} flatShading />
              </mesh>
            ) : hasSnow ? (
              // Continuous Single Mountain: Rock Base Frustum + Snow Cap Cone (100% seamless alignment)
              <group>
                {/* Rock Base Frustum */}
                <mesh position={[0, baseH / 2, 0]}>
                  <cylinderGeometry args={[junctionR, peak.radius, baseH, peak.segments]} />
                  <meshStandardMaterial color={peak.rockColor} roughness={0.88} flatShading />
                </mesh>

                {/* Snow Cap Cone — perfectly continues the slope upward to apex */}
                <mesh position={[0, baseH + snowH / 2, 0]}>
                  <coneGeometry args={[junctionR, snowH, peak.segments]} />
                  <meshStandardMaterial
                    color={peak.snowColor || '#ffffff'}
                    roughness={0.42}
                    metalness={0.04}
                    flatShading
                  />
                </mesh>
              </group>
            ) : (
              // Regular Mountain Cone
              <mesh position={[0, peak.totalHeight / 2, 0]}>
                <coneGeometry args={[peak.radius, peak.totalHeight, peak.segments]} />
                <meshStandardMaterial color={peak.rockColor} roughness={0.88} flatShading />
              </mesh>
            )}
          </group>
        )
      })}

      {/* ── Gentle Foothills (Grounding the horizon) ── */}
      {foothills.map((hill, idx) => (
        <group key={`hill-${idx}`} position={[hill.x, 0, hill.z]} rotation={[0, hill.rotationY, 0]}>
          <mesh position={[0, hill.totalHeight / 2, 0]}>
            <coneGeometry args={[hill.radius, hill.totalHeight, hill.segments]} />
            <meshStandardMaterial color={hill.rockColor} roughness={0.92} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default MountainRanges
