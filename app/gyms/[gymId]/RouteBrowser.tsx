'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { type Discipline, gradesForDiscipline } from '@/lib/grades'

type Route = {
  id: string
  name: string
  discipline: Discipline
  color: string | null
  grade_label: string
  grade_order: number
  wall_id: string | null
  set_date: string | null
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

const SELECT_CLASS =
  'rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm'

export function RouteBrowser({
  routes,
  walls,
}: {
  routes: Route[]
  walls: Wall[]
}) {
  const [discipline, setDiscipline] = useState<'all' | Discipline>('all')
  const [gradeMin, setGradeMin] = useState(0)
  const [gradeMax, setGradeMax] = useState(0)
  const [color, setColor] = useState<'all' | string>('all')
  const [wall, setWall] = useState<'all' | 'unassigned' | string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('grade')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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

  const visible = useMemo(() => {
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
  }, [routes, discipline, gradeMin, gradeMax, color, wall, sortKey, sortDir])

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground/70">Discipline</span>
          <select
            className={SELECT_CLASS}
            value={discipline}
            onChange={(e) =>
              onDisciplineChange(e.target.value as 'all' | Discipline)
            }
          >
            <option value="all">All</option>
            <option value="boulder">Boulder</option>
            <option value="top_rope">Top rope</option>
            <option value="lead">Lead</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground/70">Grade min</span>
          <select
            className={SELECT_CLASS}
            value={gradeMin}
            disabled={discipline === 'all'}
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
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground/70">Grade max</span>
          <select
            className={SELECT_CLASS}
            value={gradeMax}
            disabled={discipline === 'all'}
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
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground/70">Color</span>
          <select
            className={SELECT_CLASS}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          >
            <option value="all">All</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground/70">Wall</span>
          <select
            className={SELECT_CLASS}
            value={wall}
            onChange={(e) => setWall(e.target.value)}
          >
            <option value="all">All walls</option>
            {walls.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground/70">Sort by</span>
          <select
            className={SELECT_CLASS}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="grade">Grade</option>
            <option value="color">Color</option>
            <option value="discipline">Discipline</option>
            <option value="wall">Wall</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="rounded border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/5"
          aria-label="Toggle sort direction"
        >
          {sortDir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
        </button>
      </div>

      {routes.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/70">No routes yet.</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/70">
          No routes match these filters.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routes/${r.id}`}
                className="block rounded border border-foreground/20 px-4 py-3 hover:bg-foreground/5"
              >
                <span className="font-medium">{r.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/70">
                  <span className="font-medium text-foreground">
                    {r.grade_label}
                  </span>
                  <span>{DISCIPLINE_LABEL[r.discipline]}</span>
                  {r.color && (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-foreground/20"
                        style={{ backgroundColor: r.color }}
                      />
                      {r.color}
                    </span>
                  )}
                  <span>{wallName(r.wall_id)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
