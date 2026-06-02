'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/Avatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Comment } from '@/lib/comments'
import {
  createCommentAction,
  deleteCommentAction,
} from '@/app/routes/[routeId]/actions'

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Dark-themed comment thread. Same data and the SAME createCommentAction /
// deleteCommentAction as the original CommentThread — only the markup/classes
// are new. `target` carries exactly one id, so this renders both the route-level
// "Discussion" (variant="section") and a clip's inline thread (variant="inline").
export function RouteComments({
  comments,
  currentUserId,
  canManage,
  routeId,
  target,
  variant = 'section',
}: {
  comments: Comment[]
  currentUserId: string | null
  canManage: boolean
  routeId: string
  target: { routeId: string } | { videoId: string }
  variant?: 'section' | 'inline'
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPosting, startPost] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const onPost = () => {
    if (!body.trim()) return
    setError(null)
    startPost(async () => {
      const res = await createCommentAction(target, body, routeId)
      if (res.error) return setError(res.error)
      setBody('')
      router.refresh()
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

  const inner = (
    <>
      <div className="rd-comments">
        {comments.length === 0 ? (
          <p className="rd-comment-txt">No comments yet. Start the conversation.</p>
        ) : (
          comments.map((c) => {
            const canDelete = canManage || c.author_id === currentUserId
            return (
              <div className="rd-comment" key={c.id}>
                <Avatar
                  src={c.profiles?.avatar_url ?? null}
                  name={c.profiles?.username ?? null}
                  size={36}
                />
                <div className="rd-comment-body">
                  <div className="rd-comment-head">
                    {c.profiles ? (
                      <Link href={`/u/${c.profiles.username}`} className="rd-comment-name">
                        {c.profiles.username}
                      </Link>
                    ) : (
                      <span className="rd-comment-name">Unknown</span>
                    )}
                    <span className="rd-comment-time">{relativeTime(c.created_at)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        className="rd-comment-del"
                        onClick={() => setConfirmId(c.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="rd-comment-txt">{c.body}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && (
        <p className="rd-comment-txt" style={{ color: 'var(--color-hold-red)' }}>
          {error}
        </p>
      )}

      {currentUserId ? (
        <div className="rd-composer">
          <Avatar src={null} name={null} size={36} />
          <div className="rd-composer-input">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPosting) onPost()
              }}
              placeholder="Add a comment…"
              maxLength={1000}
            />
            <button
              type="button"
              className="rd-post-btn"
              onClick={onPost}
              disabled={isPosting || !body.trim()}
            >
              Post
            </button>
          </div>
        </div>
      ) : (
        <Link href="/login" className="rd-comment-name" style={{ marginTop: 18, display: 'inline-block' }}>
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
    </>
  )

  if (variant === 'inline') {
    return <div className="rd-thread">{inner}</div>
  }

  return (
    <section className="rd-sec">
      <div className="rd-sec-head">
        <span className="rd-sec-title">Discussion</span>
        <span className="rd-sec-count">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>
      {inner}
    </section>
  )
}
