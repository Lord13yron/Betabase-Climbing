// Inline Lucide-style icons used by the /upload flow. Stroke/fill come from the
// `.u-ico` rule in upload.css (fill:none; stroke:currentColor); sizing comes from
// CSS. Names match Lucide — swap for `lucide-react` 1:1 if preferred.

type IconProps = { className?: string }

const P = (d: string) => (props: IconProps) => (
  <svg viewBox="0 0 24 24" className={props.className} dangerouslySetInnerHTML={{ __html: d }} />
)

export const ArrowLeftIcon = P('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>')
export const ArrowRightIcon = P('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>')
export const SearchIcon = P('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')
export const MapPinIcon = P('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>')
export const ChevronDownIcon = P('<path d="m6 9 6 6 6-6"/>')
export const UploadIcon = P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>')
export const VideoIcon = P('<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>')
export const CheckIcon = P('<path d="M20 6 9 17l-5-5"/>')
export const CircleCheckIcon = P('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>')
export const XIcon = P('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>')
export const InfoIcon = P('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>')
