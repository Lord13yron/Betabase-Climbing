// Presentational avatar: shows the uploaded image, or an initials circle when
// there's no avatar_url. Plain <img> by design (avoids next.config remotePatterns).

export function Avatar({
  src,
  name,
  size = 40,
}: {
  src: string | null
  name: string | null
  size?: number
}) {
  const initial = (name ?? '?').charAt(0).toUpperCase()

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name}'s avatar` : 'avatar'}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-foreground/10 font-medium text-foreground/70"
    >
      {initial}
    </span>
  )
}
