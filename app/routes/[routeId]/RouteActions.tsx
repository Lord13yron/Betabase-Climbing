'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toggleSendAction } from '@/app/routes/[routeId]/actions'
import { toggleFavoriteAction } from '@/app/actions/favorites'
import { FlagIcon, CheckIcon, HeartIcon } from './icons'

// The redesigned route-header actions: a primary "Log a send" button (flips to
// a green "Sent" state) + a circular favorite heart. Reuses the SAME server
// actions as the original SendToggle / FavoriteToggle — only the presentation
// changes. Render only when a user is signed in (parent passes `userId`); for
// logged-out visitors the parent shows the "Log in to log your send" link.
export function RouteActions({
  routeId,
  sent,
  favorited,
}: {
  routeId: string
  sent: boolean
  favorited: boolean
}) {
  const router = useRouter()
  const [sendPending, startSend] = useTransition()
  const [favPending, startFav] = useTransition()

  const onSend = () =>
    startSend(async () => {
      await toggleSendAction(routeId)
      router.refresh()
    })

  const onFav = () =>
    startFav(async () => {
      await toggleFavoriteAction('route', routeId)
      router.refresh()
    })

  return (
    <div className="rd-head-actions">
      <button
        type="button"
        onClick={onSend}
        disabled={sendPending}
        className={`rd-send-btn${sent ? ' is-sent' : ''}`}
      >
        {sent ? (
          <>
            <CheckIcon />
            <span className="rd-send-label">Sent</span>
          </>
        ) : (
          <>
            <FlagIcon />
            <span className="rd-send-label">Log a send</span>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onFav}
        disabled={favPending}
        aria-pressed={favorited}
        aria-label={favorited ? 'Remove route from favorites' : 'Add route to favorites'}
        className={`rd-icon-btn${favorited ? ' is-fav' : ''}`}
      >
        <HeartIcon />
      </button>
    </div>
  )
}

// Logged-out fallback — keeps the original copy + link target.
export function RouteActionsSignedOut() {
  return (
    <div className="rd-head-actions">
      <Link href="/login" className="rd-send-btn">
        <FlagIcon />
        <span className="rd-send-label">Log in to send</span>
      </Link>
    </div>
  )
}
