'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFavoriteAction } from '@/app/actions/favorites'
import { HeartIcon } from './icons'

// Heart toggle for the gym-detail redesign — same server action + refresh
// pattern as the shared <FavoriteToggle>, restyled as the circular heart used
// both on the photo hero (variant="hero", 44px glass button) and on each
// color-led route row (variant="row", 40px outline button). On rows it stops
// propagation so tapping it never follows the row's link to /routes/[id].
// Callers only render this when a user is signed in.
export function FavoriteHeart({
  kind,
  id,
  favorited,
  variant = 'row',
}: {
  kind: 'gym' | 'route'
  id: string
  favorited: boolean
  variant?: 'hero' | 'row'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await toggleFavoriteAction(kind, id)
      router.refresh()
    })
  }

  const className =
    (variant === 'hero' ? 'gd-icon-btn' : 'gd-heart') + (favorited ? ' is-fav' : '')

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? `Remove ${kind} from favorites` : `Add ${kind} to favorites`}
      className={className}
    >
      <HeartIcon filled={favorited} />
    </button>
  )
}
