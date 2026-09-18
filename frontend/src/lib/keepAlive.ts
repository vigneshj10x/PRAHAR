/**
 * keepAlive.ts
 *
 * Pings the Render backend every 10 minutes to prevent the free tier
 * instance from entering idle sleep mode during live presentations.
 */

export function startKeepAlive(): void {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

  // Only run if targeting a remote URL (e.g. Render)
  if (!apiBase || apiBase.includes('localhost') || apiBase.includes('127.0.0.1')) {
    return
  }

  const ping = async () => {
    try {
      await fetch(`${apiBase}/api/ping`, { method: 'GET' })
    } catch {
      // Silent fail on background keep-alive ping
    }
  }

  // Immediate ping on initial load
  ping()

  // Recurring ping every 10 minutes (600,000 ms)
  setInterval(ping, 10 * 60 * 1000)
}
