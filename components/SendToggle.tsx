'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleSendAction } from '@/app/routes/[routeId]/actions'

// Personal tick/untick for the signed-in user. `sent` is computed server-side
// and passed in; after toggling we refresh so the count and avatar row update.
export function SendToggle({
  routeId,
  sent,
}: {
  routeId: string
  sent: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = () =>
    startTransition(async () => {
      await toggleSendAction(routeId)
      router.refresh()
    })

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        sent
          ? 'bg-foreground text-background'
          : 'border border-foreground/20 hover:bg-foreground/5'
      }`}
    >
      {sent ? 'Sent ✓' : 'Mark sent'}
    </button>
  )
}
