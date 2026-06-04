// Presentational helpers shared between the profile server page and the
// client-side video grid (MyVideosGrid). Pure functions only — no server deps.

// Named climbing-hold colors → hex (mirrors the brand palette). A route.color
// that's already a hex is used directly; unknown/empty falls back to neutral.
const HOLD: Record<string, string> = {
  red: '#d6453b', orange: '#e5743a', yellow: '#edb23a', green: '#4e9d5b',
  teal: '#2e93ae', blue: '#3e6fb3', purple: '#7e5ca8', pink: '#d85b9a',
  black: '#2a2521', white: '#f2eee6',
}
const LIGHT_HOLDS = new Set(['yellow', 'white', 'orange'])

export function holdHex(color: string | null): string {
  if (!color) return '#27303a'
  if (color.startsWith('#')) return color
  return HOLD[color.toLowerCase()] ?? '#27303a'
}
export function holdInk(color: string | null): string {
  return color && LIGHT_HOLDS.has(color.toLowerCase()) ? '#2a2521' : '#f6f2ea'
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  const w = Math.floor(d / 7); if (w < 5) return `${w}w`
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo`
  return `${Math.floor(d / 365)}y`
}
export function fmtCount(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n)
}
export function muxThumb(playbackId: string | null): string | null {
  return playbackId ? `https://image.mux.com/${playbackId}/thumbnail.webp?width=640&height=360&fit_mode=smartcrop` : null
}
