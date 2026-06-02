// Inline Lucide-style icons used by the route detail page. Stroke icons inherit
// `currentColor`; sizing comes from CSS (width/height on the svg). Swap for
// `lucide-react` 1:1 if you prefer — names match Lucide.

type IconProps = { className?: string }

const P = (d: string) => (props: IconProps) => (
  <svg viewBox="0 0 24 24" className={props.className} dangerouslySetInnerHTML={{ __html: d }} />
)

export const ArrowLeftIcon = P('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>')
export const HeartIcon = P('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.49 4.04 3 5.5l7 7Z"/>')
export const CheckIcon = P('<path d="M20 6 9 17l-5-5"/>')
// Filled play (no stroke) — used inside the gold play button.
export const PlayIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" className={props.className} fill="currentColor" stroke="none">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
)
export const UploadIcon = P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>')
export const VideoIcon = P('<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>')
export const MessageIcon = P('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>')
export const EyeIcon = P('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>')
export const FlagIcon = P('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>')
