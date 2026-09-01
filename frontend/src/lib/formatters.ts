/**
 * src/lib/formatters.ts
 *
 * Generic string and number formatting utilities.
 */

/**
 * Formats a temperature with a sign prefix (+/-) and given decimal places.
 */
export function formatSigned(val: number, decimals = 1): string {
  if (val > 0) return `+${val.toFixed(decimals)}`
  if (val < 0) return val.toFixed(decimals)
  return `0.${'0'.repeat(decimals)}`.replace(/\.0+$/, '0.0')
}

/**
 * Converts angle in degrees to 8-point compass label (N, NE, E, SE, S, SW, W, NW).
 */
export function degreesToCompass(deg: number): string {
  const dirs: Record<number, string> = {
    0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW',
  }
  const snapped = Math.round(deg / 45) * 45 % 360
  return dirs[snapped] ?? `${deg}°`
}
