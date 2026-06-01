'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { type Discipline, gradesForDiscipline } from '@/lib/grades'
import { FavoriteHeart } from './FavoriteHeart'
import { PlayCircleIcon, SearchIcon, SlidersIcon, MountainIcon, PlusIcon } from './icons'

// A route enriched on the server with community counts + a display-ready
// "set" label (computed server-side so there's no hydration mismatch).
type Route = {
  id: string
  name: string
  discipline: Discipline
  color: string | null
  grade_label: string
  grade_order: number
  wall_id: string | null
  set_date: string | null
  beta: number // ready beta-video count
  sends: number // total sends
  setLabel: string | null // e.g. "today", "3d ago", "2w ago"
}

type Wall = {
  id: string
  name: string
  sort_order: number
}

type SortKey = 'grade' | 'color' | 'discipline' | 'wall'

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Boulder',
  top_rope: 'Top rope',
  lead: 'Lead',
}

// Fixed order so the V-scale and YDS blocks don't interleave when sorting by
// grade across all disciplines (their grade_order index spaces overlap).
const DISCIPLINE_ORDER: Record<Discipline, number> = {
  boulder: 0,
  top_rope: 1,
  lead: 2,
}

// Named climbing-hold colors → hex (mirrors app/globals.css --color-hold-*).
// routes.color may already be a hex string; if so we use it directly. Unknown
// / empty colors fall back to a neutral slate band.
const HOLD: Record<string, string> = {
  red: '#d6453b',
  orange: '#e5743a',
  yellow: '#edb23a',
  green: '#4e9d5b',
  teal: '#2e93ae',
  blue: '#3e6fb3',
  purple: '#7e5ca8',
  pink: '#d85b9a',
  black: '#2a2521',
  white: '#f2eee6',
}
// Dark ink on light holds; light ink on everything else.
const LIGHT_INK_FOR = new Set(['yellow', 'white', 'orange'])

function holdColor(color: string | null): string {
  if (!color) return 'var(--color-slate-600)'
  const key = color.trim().toLowerCase()
  if (key.startsWith('#')) return key
  return HOLD[key] ?? 'var(--color-slate-600)'
}
function holdInk(color: string | null): string {
  const key = (color ?? '').trim().toLowerCase()
  return LIGHT_INK_FOR.has(key) ? '#2a2521' : '#f6f2ea'
}

export function RouteBrowser({
  routes,
  walls,
  favoritedRouteIds,
  canFavorite,
  canManage,
  gymId,
}: {
  routes: Route[]
  walls: Wall[]
  favoritedRouteIds: string[]
  canFavorite: boolean
  canManage: boolean
  gymId: string
}) {
  const favorited = useMemo(() => new Set(favoritedRouteIds), [favoritedRouteIds])
  const [discipline, setDiscipline] = useState<'all' | Discipline>('all')
  const [gradeMin, setGradeMin] = useState(0)
  const [gradeMax, setGradeMax] = useState(0)
  const [color, setColor] = useState<'all' | string>('all')
  const [wall, setWall] = useState<'all' | 'unassigned' | string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('grade')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [query, setQuery] = useState('')

  const colors = useMemo(
    () =>
      Array.from(
        new Set(routes.map((r) => r.color).filter((c): c is string => !!c))
      ).sort((a, b) => a.localeCompare(b)),
    [routes]
  )

  const activeGrades = useMemo(
    () => (discipline === 'all' ? [] : gradesForDiscipline(discipline)),
    [discipline]
  )

  // Per-discipline counts for the filter pills.
  const disciplineCounts = useMemo(() => {
    const c = { all: routes.length, boulder: 0, top_rope: 0, lead: 0 } as Record<
      'all' | Discipline,
      number
    >
    for (const r of routes) c[r.discipline] += 1
    return c
  }, [routes])

  const wallName = useMemo(() => {
    const map = new Map(walls.map((w) => [w.id, w.name]))
    return (id: string | null) => (id && map.get(id)) || 'Unassigned'
  }, [walls])

  const wallSortValue = useMemo(() => {
    const map = new Map(walls.map((w) => [w.id, w.sort_order]))
    return (id: string | null) =>
      id && map.has(id) ? (map.get(id) as number) : Number.MAX_SAFE_INTEGER
  }, [walls])

  function onDisciplineChange(next: 'all' | Discipline) {
    setDiscipline(next)
    if (next !== 'all') {
      setGradeMin(0)
      setGradeMax(gradesForDiscipline(next).length - 1)
    }
  }

  function clearFilters() {
    setDiscipline('all')
    setGradeMin(0)
    setGradeMax(0)
    setColor('all')
    setWall('all')
    setQuery('')
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = routes.filter((r) => {
      if (discipline !== 'all') {
        if (r.discipline !== discipline) return false
        if (r.grade_order < gradeMin || r.grade_order > gradeMax) return false
      }
      if (color !== 'all' && r.color !== color) return false
      if (wall === 'unassigned') {
        if (r.wall_id !== null) return false
      } else if (wall !== 'all') {
        if (r.wall_id !== wall) return false
      }
      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    })

    filtered.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'grade':
          cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline]
          if (cmp === 0) cmp = a.grade_order - b.grade_order
          break
        case 'color':
          cmp = (a.color ?? '').localeCompare(b.color ?? '')
          break
        case 'discipline':
          cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline]
          break
        case 'wall':
          cmp = wallSortValue(a.wall_id) - wallSortValue(b.wall_id)
          break
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return filtered
  }, [routes, discipline, gradeMin, gradeMax, color, wall, sortKey, sortDir, query])

  // Brand-new gym with no routes at all → full empty-state card.
  if (routes.length === 0) {
    return (
      <div className="gd-empty">
        <div className="gd-empty-ic">
          <MountainIcon />
        </div>
        <h3>No routes set yet</h3>
        <p>
          This gym hasn&apos;t published any routes. Once the setters log their first
          problems, they&apos;ll show up here with grades, beta, and sends.
        </p>
        {canManage ? (
          <Link className="gd-empty-cta" href={`/gyms/${gymId}/manage`}>
            <PlusIcon />
            Add the first route
          </Link>
        ) : (
          <span className="gd-empty-soon">Check back soon</span>
        )}
      </div>
    )
  }

  const DISCIPLINE_PILLS: ['all' | Discipline, string][] = [
    ['all', 'All'],
    ['boulder', 'Boulder'],
    ['lead', 'Lead'],
    ['top_rope', 'Top-rope'],
  ]

  return (
    <div>
      <div className="gd-toolbar">
        <div className="gd-tb-left">
          {DISCIPLINE_PILLS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={'gd-pill' + (discipline === value ? ' is-active' : '')}
              onClick={() => onDisciplineChange(value)}
            >
              {label}
              <span className="ct">{disciplineCounts[value]}</span>
            </button>
          ))}

          <span className={'gd-select' + (discipline === 'all' ? ' is-disabled' : '')}>
            <span className="lbl">Min</span>
            <select
              value={gradeMin}
              disabled={discipline === 'all'}
              aria-label="Minimum grade"
              onChange={(e) => {
                const next = Number(e.target.value)
                setGradeMin(next)
                if (next > gradeMax) setGradeMax(next)
              }}
            >
              {discipline === 'all' ? (
                <option value={0}>Any</option>
              ) : (
                activeGrades.map((g, i) => (
                  <option key={g} value={i}>
                    {g}
                  </option>
                ))
              )}
            </select>
          </span>

          <span className={'gd-select' + (discipline === 'all' ? ' is-disabled' : '')}>
            <span className="lbl">Max</span>
            <select
              value={gradeMax}
              disabled={discipline === 'all'}
              aria-label="Maximum grade"
              onChange={(e) => {
                const next = Number(e.target.value)
                setGradeMax(next)
                if (next < gradeMin) setGradeMin(next)
              }}
            >
              {discipline === 'all' ? (
                <option value={0}>Any</option>
              ) : (
                activeGrades.map((g, i) => (
                  <option key={g} value={i}>
                    {g}
                  </option>
                ))
              )}
            </select>
          </span>

          <span className="gd-select">
            <span className="lbl">Color</span>
            <select value={color} aria-label="Color" onChange={(e) => setColor(e.target.value)}>
              <option value="all">Any</option>
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </span>

          <span className="gd-select">
            <span className="lbl">Wall</span>
            <select value={wall} aria-label="Wall" onChange={(e) => setWall(e.target.value)}>
              <option value="all">All walls</option>
              {walls.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </span>
        </div>

        <div className="gd-tb-right">
          <div className="gd-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter routes"
              aria-label="Filter routes by name"
            />
          </div>
          <span className="gd-select">
            <SlidersIcon />
            <select
              value={`${sortKey}:${sortDir}`}
              aria-label="Sort routes"
              onChange={(e) => {
                const [k, d] = e.target.value.split(':') as [SortKey, 'asc' | 'desc']
                setSortKey(k)
                setSortDir(d)
              }}
            >
              <option value="grade:desc">Grade · hardest</option>
              <option value="grade:asc">Grade · easiest</option>
              <option value="discipline:asc">Discipline</option>
              <option value="color:asc">Color</option>
              <option value="wall:asc">Wall</option>
            </select>
          </span>
        </div>
      </div>

      <div className="gd-list">
        {visible.length === 0 ? (
          <p className="gd-noresults">
            No routes match these filters.
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </p>
        ) : (
          <div className="gd-clist">
            {visible.map((r) => {
              const band = holdColor(r.color)
              const ink = holdInk(r.color)
              return (
                <Link key={r.id} href={`/routes/${r.id}`} className="gd-crow">
                  <div className="gd-cband" style={{ background: band }}>
                    <span className="g" style={{ color: ink }}>
                      {r.grade_label}
                    </span>
                    {r.color && (
                      <span className="col" style={{ color: ink }}>
                        {r.color}
                      </span>
                    )}
                  </div>
                  <div className="gd-crow-body">
                    <div className="gd-crow-l">
                      <div className="gd-crow-name">{r.name}</div>
                      <div className="gd-crow-meta">
                        <span>{DISCIPLINE_LABEL[r.discipline]}</span>
                        <span className="dot" />
                        <span>{wallName(r.wall_id)}</span>
                        {r.setLabel && (
                          <>
                            <span className="dot" />
                            <span>Set {r.setLabel}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="gd-crow-r">
                      <div className={'gd-stat-mini' + (r.beta === 0 ? ' muted' : '')}>
                        <span className="n">
                          <PlayCircleIcon />
                          {r.beta}
                        </span>
                        <span className="l">Beta</span>
                      </div>
                      <div className="gd-stat-mini sends muted">
                        <span className="n">{r.sends}</span>
                        <span className="l">Sends</span>
                      </div>
                      {canFavorite && (
                        <FavoriteHeart kind="route" id={r.id} favorited={favorited.has(r.id)} />
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
