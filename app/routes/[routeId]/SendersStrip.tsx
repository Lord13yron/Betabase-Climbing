'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/Avatar'

type SenderRow = {
  user_id: string
  sent_at: string
  profiles: { username: string; avatar_url: string | null } | null
}

// The route header's send strip, made interactive: the whole strip is a button
// that opens a themed popover listing everyone who sent the route, each linking
// to their profile. Open/close mechanics mirror the gyms SelectChip dropdown
// (outside-click + Escape close).
export function SendersStrip({
  senders,
  totalSends,
}: {
  senders: SenderRow[]
  totalSends: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shown = senders.slice(0, 6)
  const extra = totalSends - shown.length

  return (
    <div className="rd-senders" ref={ref}>
      <button
        type="button"
        className={`rd-sends${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Show climbers who have sent this route"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="rd-ava-row">
          {shown.map((s) => (
            <span className="rd-ava" key={s.user_id} style={{ padding: 0, overflow: 'hidden' }}>
              <Avatar src={s.profiles?.avatar_url ?? null} name={s.profiles?.username ?? null} size={34} />
            </span>
          ))}
          {extra > 0 && <span className="rd-ava more">+{extra}</span>}
        </div>
        <span className="rd-sends-txt">
          <b>{totalSends} {totalSends === 1 ? 'climber' : 'climbers'}</b>{' '}
          {totalSends === 1 ? 'has' : 'have'} sent this
        </span>
        <span className="rd-sends-chev" aria-hidden="true" />
      </button>

      <div className={`rd-senders-menu${open ? ' is-open' : ''}`} role="menu">
        {senders.map((s) =>
          s.profiles?.username ? (
            <Link
              key={s.user_id}
              href={`/u/${s.profiles.username}`}
              className="rd-sender-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Avatar src={s.profiles.avatar_url} name={s.profiles.username} size={26} />
              <span>{s.profiles.username}</span>
            </Link>
          ) : (
            <span key={s.user_id} className="rd-sender-item is-unknown">
              <Avatar src={null} name={null} size={26} />
              <span>Unknown</span>
            </span>
          )
        )}
      </div>
    </div>
  )
}
