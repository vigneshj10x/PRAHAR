/**
 * src/lib/math.ts
 *
 * Generic, domain-agnostic mathematical and interpolation utilities.
 * Has zero knowledge of shelters, buildings, or domains.
 */

/**
 * Linearly interpolates between two numbers.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Clamps a number within the inclusive bounds [min, max].
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/**
 * Computes inverse distance weighted (IDW) interpolation from an array of distances and values.
 */
export function inverseDistanceWeightedBlend(
  distances: number[],
  values: number[],
  power = 2
): number {
  if (distances.length !== values.length) {
    throw new Error('Distances and values length mismatch')
  }

  // Exact match guard
  for (let i = 0; i < distances.length; i++) {
    if (distances[i] < 1e-9) {
      return values[i]
    }
  }

  const weights = distances.map((d) => 1 / Math.pow(d, power))
  const totalWeight = weights.reduce((acc, w) => acc + w, 0)

  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += (weights[i] / totalWeight) * values[i]
  }

  return sum
}

/**
 * Returns true if two numbers are within a tolerance.
 */
export function isNear(a: number, b: number, tolerance = 0.001): boolean {
  return Math.abs(a - b) <= tolerance
}
