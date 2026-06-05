import type { ReactNode } from 'react'

/**
 * The eyebrow + serif title + sub-copy block at the top of every auth view.
 * `accent` is the italic plywood-gold word inside the title (rendered via the
 * `.a-title em` style). Pass the title as `before` + `accent` + `after`.
 */
export function AuthHead({
  eyebrow,
  before,
  accent,
  after = '.',
  sub,
  titleId,
}: {
  eyebrow: string
  before: string
  accent: string
  after?: string
  sub?: ReactNode
  titleId?: string
}) {
  return (
    <header className="a-head">
      <p className="a-eyebrow">{eyebrow}</p>
      <h1 className="a-title" id={titleId}>
        {before} <em>{accent}</em>
        {after}
      </h1>
      {sub ? <p className="a-sub">{sub}</p> : null}
    </header>
  )
}
