'use client'

import { useEffect, useState } from 'react'
import {
  ChevronDownIcon,
  MapPinIcon,
  MountainIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from './icons'
import { gymCover } from './admin-utils'
import type { AdminGym, GymStatus } from './types'

const STATUS_LABEL: Record<GymStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  archived: 'Archived',
}
const STATUS_DOT: Record<GymStatus, string> = {
  live: '#4E9D5B',
  draft: '#EDB23A',
  archived: '#5B6776',
}
const FILTERS: ('all' | GymStatus)[] = ['all', 'live', 'draft', 'archived']

export function GymsView({
  gyms,
  adminCount,
  onAddGym,
  onEditGym,
  onDeleteGym,
  onManageAdmins,
  onSetStatus,
}: {
  gyms: AdminGym[]
  adminCount: (gymId: string) => number
  onAddGym: () => void
  onEditGym: (gym: AdminGym) => void
  onDeleteGym: (gym: AdminGym) => void
  onManageAdmins: (gym: AdminGym) => void
  onSetStatus: (gym: AdminGym, status: GymStatus) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | GymStatus>('all')
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)

  // Click anywhere closes an open status menu (menu items stopPropagation).
  useEffect(() => {
    if (!openStatusId) return
    const close = () => setOpenStatusId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openStatusId])

  const q = query.trim().toLowerCase()
  const list = gyms.filter((g) => {
    if (filter !== 'all' && g.status !== filter) return false
    if (q && !`${g.name} ${g.city ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })

  const count = (f: 'all' | GymStatus) =>
    f === 'all' ? gyms.length : gyms.filter((g) => g.status === f).length
  const liveCount = gyms.filter((g) => g.status === 'live').length

  return (
    <div className="a-wrap">
      <div className="a-head">
        <div className="a-head-l">
          <span className="a-eyebrow">Console</span>
          <h1 className="a-title">Gyms</h1>
          <div className="a-sub">
            {gyms.length} {gyms.length === 1 ? 'gym' : 'gyms'} · {liveCount} live
          </div>
        </div>
        <div className="a-head-r">
          <button className="a-btn a-btn--primary" onClick={onAddGym}>
            <PlusIcon />
            Add gym
          </button>
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
            placeholder="Search gyms by name or city"
            aria-label="Search gyms"
          />
        </label>
        <div className="a-segfilter" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={f === filter ? 'on' : ''}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f]} <span className="cnt">{count(f)}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="a-empty">
          <div className="a-empty-ic">
            <MountainIcon />
          </div>
          <h3>No gyms here</h3>
          <p>
            {gyms.length === 0
              ? 'No gyms yet. Add the first one to seed the directory.'
              : 'No gyms match this filter. Try a different status or clear the search.'}
          </p>
          <button className="a-btn a-btn--primary" onClick={onAddGym}>
            <PlusIcon />
            Add a gym
          </button>
        </div>
      ) : (
        <div className="a-rows">
          {list.map((g) => (
            <div className="a-gym" key={g.id} data-id={g.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="a-gym-thumb" src={gymCover(g.id, g.imageUrl)} alt="" />
              <div className="a-gym-main">
                <div className="a-gym-name">{g.name}</div>
                <div className="a-gym-loc">
                  <MapPinIcon />
                  {g.city ?? '—'}
                </div>
              </div>
              <div className="a-gym-chipscell">
                <div className="a-chips">
                  {g.chips.map((c) => (
                    <span className="a-chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="a-gym-stats">
                <div className="a-stat">
                  <span className="n">{g.routeCount}</span>
                  <span className="l">Routes</span>
                </div>
                <div className="a-stat">
                  <span className="n">{adminCount(g.id)}</span>
                  <span className="l">Admins</span>
                </div>
              </div>
              <div className="a-gym-end">
                <div className="a-statuswrap">
                  <button
                    className="a-status"
                    data-status={g.status}
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenStatusId((id) => (id === g.id ? null : g.id))
                    }}
                  >
                    <span className="sdot" />
                    {STATUS_LABEL[g.status]}
                    <ChevronDownIcon className="scaret" />
                  </button>
                  <div className={`a-menu${openStatusId === g.id ? ' is-open' : ''}`}>
                    {(['live', 'draft', 'archived'] as GymStatus[]).map((s) => (
                      <button
                        key={s}
                        className={`a-menu-item${s === g.status ? ' is-current' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenStatusId(null)
                          if (s !== g.status) onSetStatus(g, s)
                        }}
                      >
                        <span className="sdot" style={{ background: STATUS_DOT[s] }} />
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="a-gym-acts">
                  <button
                    className="a-iconbtn"
                    title="Manage admins"
                    aria-label="Manage admins"
                    onClick={() => onManageAdmins(g)}
                  >
                    <UsersIcon />
                  </button>
                  <button
                    className="a-iconbtn"
                    title="Edit gym"
                    aria-label="Edit gym"
                    onClick={() => onEditGym(g)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="a-iconbtn is-danger"
                    title="Delete gym"
                    aria-label="Delete gym"
                    onClick={() => onDeleteGym(g)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
