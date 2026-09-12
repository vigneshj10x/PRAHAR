/**
 * WeatherParticles.tsx
 *
 * Dynamic 3D weather particle system driven by live climate telemetry:
 * - Snowfall: Glistening snowflakes drifting downwards and swirling with wind speed (for cold zones like Leh/Srinagar)
 * - Desert Dust / Thermal Shimmer: Warm floating particles for arid desert zones (Jaisalmer)
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EnvironmentArchetype } from './MountainRanges'

interface WeatherParticlesProps {
  archetype: EnvironmentArchetype
  windSpeed?: number
  isFreezing?: boolean
}

export const WeatherParticles = ({
  archetype,
  windSpeed = 3.0,
  isFreezing = false,
}: WeatherParticlesProps) => {
  const pointsRef = useRef<THREE.Points>(null)

  const isSnowing = archetype === 'high_altitude_snow' || archetype === 'valley_forested' || isFreezing
  const isDusty = archetype === 'desert_dunes'

  const particleCount = isSnowing ? 500 : isDusty ? 150 : 0

  // Generate initial particle positions and randomized velocities
  const [positions, velocities] = useMemo(() => {
    if (particleCount === 0) return [new Float32Array(0), new Float32Array(0)]

    const pos = new Float32Array(particleCount * 3)
    const vel = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      // Bounding box: X: -26 to 26, Y: 0 to 18, Z: -26 to 26
      pos[i * 3 + 0] = (Math.random() - 0.5) * 52
      pos[i * 3 + 1] = Math.random() * 18
      pos[i * 3 + 2] = (Math.random() - 0.5) * 52

      if (isSnowing) {
        // Fall speed: 1.2 to 2.8 m/s
        vel[i * 3 + 0] = (Math.random() - 0.5) * 0.4
        vel[i * 3 + 1] = 1.4 + Math.random() * 1.5
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      } else {
        // Dust float: slow upward or sideways drift
        vel[i * 3 + 0] = 0.5 + Math.random() * 0.8
        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.3
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      }
    }

    return [pos, vel]
  }, [particleCount, isSnowing, isDusty])

  // Animate particles along time & wind
  useFrame((state, delta) => {
    if (!pointsRef.current || particleCount === 0) return

    const geo = pointsRef.current.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    if (!posAttr) return

    const posArray = posAttr.array as Float32Array
    const windEffect = Math.min(6, Math.max(1, windSpeed)) * 0.25
    const time = state.clock.getElapsedTime()

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3

      if (isSnowing) {
        // Snow falls down
        posArray[idx + 1] -= velocities[idx + 1] * delta

        // Wind drift along X + subtle sinusoidal sway
        posArray[idx + 0] += (windEffect + Math.sin(time * 2 + i) * 0.3) * delta
        posArray[idx + 2] += Math.cos(time * 1.5 + i) * 0.2 * delta

        // Reset if hitting ground
        if (posArray[idx + 1] < 0.1) {
          posArray[idx + 1] = 17 + Math.random() * 2
          posArray[idx + 0] = (Math.random() - 0.5) * 52
          posArray[idx + 2] = (Math.random() - 0.5) * 52
        }
      } else if (isDusty) {
        // Dust drifts with desert wind
        posArray[idx + 0] += (windEffect * 1.2) * delta
        posArray[idx + 1] += Math.sin(time + i) * 0.2 * delta
        posArray[idx + 2] += Math.cos(time * 0.8 + i) * 0.2 * delta

        // Wrap around boundary
        if (posArray[idx + 0] > 26) {
          posArray[idx + 0] = -26
          posArray[idx + 1] = Math.random() * 8
          posArray[idx + 2] = (Math.random() - 0.5) * 52
        }
      }
    }

    posAttr.needsUpdate = true
  })

  if (particleCount === 0) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isSnowing ? 0.18 : 0.12}
        color={isSnowing ? '#ffffff' : '#e0a96d'}
        transparent
        opacity={isSnowing ? 0.85 : 0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

export default WeatherParticles
