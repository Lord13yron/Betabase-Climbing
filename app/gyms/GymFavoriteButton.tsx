'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFavoriteAction } from '@/app/actions/favorites'
import { HeartIcon } from './icons'

// Heart toggle for the redesigned gym card — same server action + refresh
// pattern as the shared <FavoriteToggle>, restyled to sit over the card photo.
// Stops propagation so tapping it never follows the card's link.
export function GymFavoriteButton({
  id,
  favorited,
}: {
  id: string
  favorited: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await toggleFavoriteAction('gym', id)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove gym from favorites' : 'Add gym to favorites'}
      className={'g-fav' + (favorited ? ' is-fav' : '')}
    >
      <HeartIcon filled={favorited} />
    </button>
  )
}
