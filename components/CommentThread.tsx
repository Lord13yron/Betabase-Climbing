'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/Avatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  createCommentAction,
  deleteCommentAction,
} from '@/app/routes/[routeId]/actions'

export type Comment = {
  id: string
  body: string
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

// Compact "3h" / "2d" relative label, falling back to a date past a week.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// Flat comment thread, reused for a route and for each video. `target` carries
// exactly one id; `routeId` is the route page to revalidate after a mutation.
export function CommentThread({
  comments,
  currentUserId,
  canManage,
  target,
  routeId,
}: {
  comments: Comment[]
  currentUserId: string | null
  canManage: boolean
  target: { routeId: string } | { videoId: string }
  routeId: string
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPosting, startPost] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const onPost = () => {
    if (!body.trim()) return
    startPost(async () => {
      const res = await createCommentAction(target, body, routeId)
      if (!res.error) {
        setBody('')
        router.refresh()
      }
    })
  }

  const onConfirmDelete = () => {
    if (!confirmId) return
    const id = confirmId
    startDelete(async () => {
      await deleteCommentAction(id, routeId)
      setConfirmId(null)
      router.refresh()
    })
  }

  return (
    <div className="mt-2">
      {comments.length === 0 ? (
        <p className="text-sm text-foreground/70">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => {
            const canDelete = canManage || c.author_id === currentUserId
            return (
              <li key={c.id} className="flex items-start gap-2">
                <Avatar
                  src={c.profiles?.avatar_url ?? null}
                  name={c.profiles?.username ?? null}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-sm">
                    {c.profiles ? (
                      <Link
                        href={`/u/${c.profiles.username}`}
                        className="font-medium hover:underline"
                      >
                        {c.profiles.username}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground/70">
                        Unknown
                      </span>
                    )}
                    <span className="text-foreground/50">
                      {formatRelativeTime(c.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmId(c.id)}
                        className="ml-auto shrink-0 text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground/80">
                    {c.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {currentUserId ? (
        <div className="mt-3 flex items-start gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isPosting) onPost()
            }}
            placeholder="Add a comment…"
            maxLength={1000}
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onPost}
            disabled={isPosting || !body.trim()}
            className="shrink-0 rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            Post
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="mt-3 inline-block text-sm text-foreground/70 hover:underline"
        >
          Log in to comment
        </Link>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete comment"
        message="This removes the comment for everyone. This can't be undone."
        pending={isDeleting}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
