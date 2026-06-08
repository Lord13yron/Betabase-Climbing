'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, SearchIcon, XIcon } from './icons'
import { AdminAvatar } from './AdminAvatar'
import type { AdminGym, AdminUser } from './types'

// Search the Betabase user directory (by @username) and assign someone as a gym
// admin. Adding is immediate (no separate save). Users already admins of this gym
// show a "✓ Admin" tag and are dimmed.
export function AddAdminModal({
  open,
  gym,
  users,
  existingIds,
  onClose,
  onAdd,
}: {
  open: boolean
  gym: AdminGym | null
  users: AdminUser[]
  existingIds: Set<string>
  onClose: () => void
  onAdd: (userId: string) => void
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) setQuery('')
  }, [open, gym])

  if (!open || !gym) return null

  const q = query.trim().toLowerCase()
  const directory = users.filter((u) => u.username)
  const results = q
    ? directory.filter((u) => u.username!.toLowerCase().includes(q))
    : directory

  return (
    <div
      className="a-overlay is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="a-modal" role="dialog" aria-modal="true">
        <div className="a-modal-head">
          <div>
            <div className="a-modal-title">Add admin</div>
            <div className="a-modal-sub">{gym.name}</div>
          </div>
          <button type="button" className="a-modal-x" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="a-usearch">
          <label className="a-search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Betabase users by username"
              aria-label="Search users"
              autoFocus
            />
          </label>
        </div>

        <div className="a-uresults">
          {results.length === 0 ? (
            <div className="a-unoresults">No users match “{query}”.</div>
          ) : (
            results.map((u) => {
              const added = existingIds.has(u.id)
              return (
                <div key={u.id} className={`a-uitem${added ? ' is-added' : ''}`}>
                  <AdminAvatar
                    className="a-av"
                    seed={u.username ?? u.id}
                    label={u.username ?? '?'}
                    avatarUrl={u.avatarUrl}
                  />
                  <div className="a-uitem-main">
                    <div className="a-uitem-name">@{u.username}</div>
                  </div>
                  {added ? (
                    <span className="a-uitem-tag">
                      <CheckIcon />
                      Admin
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="a-btn a-btn--primary a-btn--sm a-uadd"
                      onClick={() => onAdd(u.id)}
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="a-modal-foot">
          <button type="button" className="a-btn a-btn--ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
