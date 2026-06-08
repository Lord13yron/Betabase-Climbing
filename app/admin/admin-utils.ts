// Small shared helpers for the /admin client components: avatars, topic colors,
// and hydration-safe message timestamps (parsed from the ISO string, not `now`,
// so server + client render identically).

// Stock cover fallbacks (bundled in /public/landing), chosen deterministically
// by gym id — mirrors app/gyms/GymCard.tsx so console + public thumbs match.
const FALLBACK_IMAGES = [
  '/landing/gym-exterior.png',
  '/landing/climbing-wall-hero.png',
  '/landing/sending-climb.png',
  '/landing/filming-climb.png',
  '/landing/outside-gym.png',
]
export function gymCover(id: string, imageUrl: string | null): string {
  if (imageUrl) return imageUrl
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_IMAGES[h % FALLBACK_IMAGES.length]
}

// Avatar palette = the climbing-hold colors (matches the prototype).
const AVATAR_PALETTE = [
  '#C79F65', '#4E9D5B', '#3E6FB3', '#7E5CA8',
  '#D85B9A', '#2E93AE', '#E5743A', '#D6453B',
]

export function avatarColor(seed: string): string {
  let sum = 0
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i)
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length]
}

// Initials: first letters of the first two words, or the first two characters of
// a single token (e.g. a username).
export function initials(value: string): string {
  const parts = value.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
  }
  return value.trim().slice(0, 2).toUpperCase()
}

// Contact-form topics → tag color (keyed on the labels the live form stores).
const TOPIC_COLOR: Record<string, string> = {
  General: '#2E93AE',
  'Gym partnership': '#7E5CA8',
  'Bug report': '#D6453B',
  Feedback: '#4E9D5B',
}
const TOPIC_FALLBACK = '#8593A2'

export function topicColor(topic: string): string {
  return TOPIC_COLOR[topic] ?? TOPIC_FALLBACK
}

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse "YYYY-MM-DDTHH:MM..." into its calendar parts (ignores tz offset — good
// enough for an inbox timestamp and avoids Date()/locale hydration drift).
function parts(iso: string) {
  const [datePart, timePart = '00:00'] = iso.split('T')
  const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10))
  const [hh, mm] = timePart.split(':')
  let h = parseInt(hh, 10)
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return { y, m, d, time: `${h}:${mm} ${ap}` }
}

// List timestamp: today → time only, else "Mon D".
export function fmtMsgTime(iso: string, todayDate: string): string {
  const datePart = iso.split('T')[0]
  const p = parts(iso)
  if (datePart === todayDate) return p.time
  return `${MONTHS[p.m - 1]} ${p.d}`
}

// Reading-pane timestamp: "Mon D, YYYY · h:mm AM".
export function fmtMsgFull(iso: string): string {
  const p = parts(iso)
  return `${MONTHS[p.m - 1]} ${p.d}, ${p.y} · ${p.time}`
}
