import { avatarColor, initials } from './admin-utils'

// Colored monogram disc (hold-palette, deterministic by seed), or the user's
// uploaded image when present. `className` carries the size (.a-av / .a-read-av).
export function AdminAvatar({
  className,
  seed,
  label,
  avatarUrl,
}: {
  className: string
  seed: string
  label: string
  avatarUrl?: string | null
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={avatarUrl} alt="" />
  }
  return (
    <div className={className} style={{ background: avatarColor(seed) }}>
      {initials(label)}
    </div>
  )
}
