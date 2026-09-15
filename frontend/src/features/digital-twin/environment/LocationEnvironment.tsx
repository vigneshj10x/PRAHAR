/**
 * LocationEnvironment.tsx
 *
 * Master environment orchestrator for the 3D Digital Twin scene.
 * Contextualizes the entire background to the selected location:
 * - Mountains & Hill Ranges (Ladakh snowcaps, Kashmir pine ridges, Thar sand dunes, Coastal hills)
 * - Climate-Specific Vegetation (Pine trees, desert acacia, palms, alpine boulders)
 * - Weather Effects (Animated snowfall & desert dust motes)
 * - Ground Terrain Disc blending smoothly under the grid
 */
import { useMemo } from 'react'
import { MountainRanges, type EnvironmentArchetype } from './MountainRanges'
import { ClimateVegetation } from './ClimateVegetation'
import { WeatherParticles } from './WeatherParticles'
import { useDesignStore } from '@/store/designStore'
import { useClimateStore } from '@/store/climateStore'

export const LocationEnvironment = () => {
  const locationId = useDesignStore((s) => s.location)
  const selectedLoc = useClimateStore((s) => s.selectedLocation)
  const activeProfile = useClimateStore((s) => s.activeProfile)

  // Derive environment archetype based on location ID, zone, coordinates & altitude
  const archetype: EnvironmentArchetype = useMemo(() => {
    const id = (locationId || '').toLowerCase()
    const name = (selectedLoc.name || '').toLowerCase()
    const zone = (activeProfile?.zone || '').toLowerCase()
    const alt = selectedLoc.altitude || activeProfile?.altitudeNum || 0

    // 1. High Altitude Cold Desert (Leh, Ladakh, Siachen, Spiti, etc.)
    if (
      id.includes('leh') ||
      name.includes('leh') ||
      name.includes('ladakh') ||
      name.includes('siachen') ||
      name.includes('kargil') ||
      zone.includes('cold & arid') ||
      alt >= 2600
    ) {
      return 'high_altitude_snow'
    }

    // 2. Cold Mountain Valley / Forested (Srinagar, Kashmir, Manali, Gulmarg, etc.)
    if (
      id.includes('srinagar') ||
      name.includes('srinagar') ||
      name.includes('kashmir') ||
      name.includes('himachal') ||
      name.includes('manali') ||
      name.includes('shimla') ||
      name.includes('uttarakhand') ||
      zone.includes('cold & cloudy') ||
      (alt >= 1200 && alt < 2600)
    ) {
      return 'valley_forested'
    }

    // 3. Hot & Dry Desert (Jaisalmer, Bikaner, Thar, Barmer, etc.)
    if (
      id.includes('jaisalmer') ||
      name.includes('jaisalmer') ||
      name.includes('rajasthan') ||
      name.includes('thar') ||
      name.includes('bikaner') ||
      name.includes('barmer') ||
      zone.includes('hot & dry')
    ) {
      return 'desert_dunes'
    }

    // 4. Warm & Humid Coastal (Kochi, Goa, Kerala, Mumbai, Chennai, etc.)
    if (
      id.includes('kochi') ||
      name.includes('kochi') ||
      name.includes('kerala') ||
      name.includes('goa') ||
      name.includes('mumbai') ||
      name.includes('chennai') ||
      zone.includes('warm & humid')
    ) {
      return 'coastal_tropical'
    }

    // 5. Composite Plains (New Delhi, NCR, Lucknow, Punjab, etc.)
    return 'plains'
  }, [locationId, selectedLoc.name, selectedLoc.altitude, activeProfile?.zone, activeProfile?.altitudeNum])

  // Ground base color based on archetype
  const groundColor = useMemo(() => {
    switch (archetype) {
      case 'high_altitude_snow':
        return '#dbe4ed'
      case 'valley_forested':
        return '#cbd5e1'
      case 'desert_dunes':
        return '#ebdcc4'
      case 'coastal_tropical':
        return '#b7c9ad'
      case 'plains':
      default:
        return '#dcdfdc'
    }
  }, [archetype])

  return (
    <group name="location-environment">
      {/* ── Ground Terrain Disc ── */}
      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[95, 48]} />
        <meshStandardMaterial color={groundColor} roughness={0.92} />
      </mesh>

      {/* ── Distant Mountains / Dunes ── */}
      <MountainRanges archetype={archetype} />

      {/* ── Climate Vegetation & Rocks ── */}
      <ClimateVegetation archetype={archetype} />

      {/* ── Weather Particle System (Snow / Dust) ── */}
      <WeatherParticles
        archetype={archetype}
        windSpeed={activeProfile?.windSpeed ?? 3.2}
        isFreezing={(activeProfile?.tOutMin ?? 0) <= 0}
      />
    </group>
  )
}

export default LocationEnvironment
