// Inline SVG icon set for the auth screens (lucide-style strokes).
// Stroke + sizing come from the `.a-ico` class in auth.css. If the app
// already depends on `lucide-react`, swap these for the matching icons
// (mail, lock, eye, eye-off, alert-circle, check, arrow-left) — the
// shapes are 1:1.
type IconProps = { className?: string }

export function MailIcon({ className = 'a-ico' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

export function LockIcon({ className = 'a-ico' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

export function EyeIcon({ className = 'a-ico' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon({ className = 'a-ico' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1" />
      <path d="M6.2 6.3A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

export function AlertIcon({ className = 'a-ico' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </svg>
  )
}

export function MailCheckIcon({ className = 'a-ico' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
      <path d="m15.5 14.5 2 2 4-4.5" />
    </svg>
  )
}

export function ArrowLeftIcon({ className = 'a-ico' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

export function GoogleMark({ className = 'a-gmark' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.27c0-.79-.07-1.54-.2-2.27H12v4.5h6.17a5.27 5.27 0 0 1-2.29 3.46v2.88h3.7C21.69 18.96 23 15.92 23 12.27Z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1.03 7.59-2.79l-3.7-2.88c-1.03.69-2.34 1.1-3.89 1.1-2.99 0-5.52-2.02-6.43-4.74H1.74v2.97A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.57 14.69A7.2 7.2 0 0 1 5.18 12c0-.93.16-1.84.39-2.69V6.34H1.74A12 12 0 0 0 .47 12c0 1.94.46 3.77 1.27 5.66l3.83-2.97Z" />
      <path fill="#EA4335" d="M12 4.75c1.69 0 3.2.58 4.39 1.72l3.29-3.29C17.69 1.2 15.1 0 12 0 7.31 0 3.26 2.69 1.74 6.34l3.83 2.97C6.48 6.77 9.01 4.75 12 4.75Z" />
    </svg>
  )
}
