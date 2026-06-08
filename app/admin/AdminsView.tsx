'use client'

import { useState } from 'react'
import { ChevronDownIcon, SearchIcon, UserPlusIcon, UsersIcon, UserXIcon } from './icons'
import { AdminAvatar } from './AdminAvatar'
import { gymCover } from './admin-utils'
import type { AdminGym, AdminUser, Adminship, GymStatus } from './types'

const STATUS_LABEL: Record<GymStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  archived: 'Archived',
}

export function AdminsView({
  gyms,
  users,
  adminships,
  adminCount,
  collapsed,
  onToggle,
  onAddAdmin,
  onRemoveAdmin,
}: {
  gyms: AdminGym[]
  users: AdminUser[]
  adminships: Adminship[]
  adminCount: (gymId: string) => number
  collapsed: Record<string, boolean>
  onToggle: (gymId: string) => void
  onAddAdmin: (gym: AdminGym) => void
  onRemoveAdmin: (gym: AdminGym, user: AdminUser) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const userById = new Map(users.map((u) => [u.id, u]))
  const adminsFor = (gymId: string): AdminUser[] =>
    adminships
      .filter((a) => a.gymId === gymId)
      .map((a) => userById.get(a.userId))
      .filter((u): u is AdminUser => Boolean(u))

  const totalAdmins = adminships.length
  const gymsWith = gyms.filter((g) => adminCount(g.id) > 0).length

  // Build the visible groups (search matches a gym name → show all its admins;
  // otherwise show only the admins whose @username matches).
  const groups = gyms
    .map((g) => {
      let list = adminsFor(g.id)
      if (q) {
        const gymMatch = g.name.toLowerCase().includes(q)
        const matched = list.filter((u) => (u.username ?? '').toLowerCase().includes(q))
        if (!gymMatch && matched.length === 0) return null
        if (!gymMatch) list = matched
      }
      return { gym: g, admins: list }
    })
    .filter((x): x is { gym: AdminGym; admins: AdminUser[] } => x !== null)

  return (
    <div className="a-wrap">
      <div className="a-head">
        <div className="a-head-l">
          <span className="a-eyebrow">Console</span>
          <h1 className="a-title">Admins</h1>
          <div className="a-sub">
            {totalAdmins} {totalAdmins === 1 ? 'admin' : 'admins'} across {gymsWith} of{' '}
            {gyms.length} gyms
          </div>
        </div>
      </div>
      <div className="a-head-rule" />

      <div className="a-toolbar">
        <label className="a-search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by gym or username"
            aria-label="Search admins"
          />
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="a-empty">
          <div className="a-empty-ic">
            <UsersIcon />
          </div>
          <h3>No matches</h3>
          <p>No gyms or admins match your search.</p>
        </div>
      ) : (
        <div className="a-grouplist">
          {groups.map(({ gym, admins }) => (
            <div
              className="a-group"
              key={gym.id}
              data-id={gym.id}
              data-collapsed={collapsed[gym.id] ? 'true' : 'false'}
            >
              <div className="a-group-head" onClick={() => onToggle(gym.id)}>
                <span className="a-chev">
                  <ChevronDownIcon />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="a-group-thumb" src={gymCover(gym.id, gym.imageUrl)} alt="" />
                <div className="a-group-id">
                  <span className="a-group-name">{gym.name}</span>
                  <span className="a-group-count">
                    {adminCount(gym.id)} {adminCount(gym.id) === 1 ? 'admin' : 'admins'}
                  </span>
                </div>
                <div className="a-group-end">
                  <span className="a-group-status" data-status={gym.status}>
                    {STATUS_LABEL[gym.status]}
                  </span>
                </div>
              </div>

              <div className="a-group-body">
                {admins.length === 0 ? (
                  <div className="a-group-empty">
                    No admins yet — assign someone to manage this gym’s walls and routes.
                  </div>
                ) : (
                  <div className="a-admins">
                    {admins.map((u) => (
                      <div className="a-admin" key={u.id}>
                        <AdminAvatar
                          className="a-av"
                          seed={u.username ?? u.id}
                          label={u.username ?? '?'}
                          avatarUrl={u.avatarUrl}
                        />
                        <div className="a-admin-main">
                          <div className="a-admin-name">@{u.username}</div>
                        </div>
                        <button
                          className="a-iconbtn is-danger"
                          title="Remove from gym"
                          aria-label="Remove admin"
                          onClick={() => onRemoveAdmin(gym, u)}
                        >
                          <UserXIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="a-btn a-btn--ghost a-btn--sm"
                  onClick={() => onAddAdmin(gym)}
                >
                  <UserPlusIcon />
                  Add admin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
