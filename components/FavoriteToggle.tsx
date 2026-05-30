'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFavoriteAction } from '@/app/actions/favorites'

// Star toggle for the signed-in user. `favorited` is computed server-side and
// passed in; after toggling we refresh so server-rendered state (filled star,
// profile lists) updates. Callers only render this when a user is logged in.
export function FavoriteToggle({
  kind,
  id,
  favorited,
}: {
  kind: 'gym' | 'route'
  id: string
  favorited: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = () =>
    startTransition(async () => {
      await toggleFavoriteAction(kind, id)
      router.refresh()
    })

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? `Remove ${kind} from favorites` : `Add ${kind} to favorites`}
      className={`shrink-0 text-xl leading-none disabled:opacity-50 ${
        favorited ? 'text-yellow-500' : 'text-foreground/30 hover:text-foreground/60'
      }`}
    >
      {favorited ? '★' : '☆'}
    </button>
  )
}
