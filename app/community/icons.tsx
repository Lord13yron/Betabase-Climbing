// Inline Lucide-style icons for the community page (same convention as
// app/u/[username]/icons.tsx). Stroke inherits `currentColor`; CSS sets size.

type P = { className?: string }
const S = (d: React.ReactNode) => {
  function Icon(props: P) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={props.className}
      >
        {d}
      </svg>
    )
  }
  return Icon
}

export const SearchIcon = S(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>
)
export const FlagIcon = S(
  <>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </>
)
export const VideoIcon = S(
  <>
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </>
)
export const MessageIcon = S(<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />)
// Lucide "route": new routes added at a gym.
export const RouteIcon = S(
  <>
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </>
)
export const PlayIcon = (props: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className}>
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
)
