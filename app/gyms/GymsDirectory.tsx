'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Discipline } from '@/lib/grades'
import { GymCard } from './GymCard'
import { SearchIcon, SlidersIcon } from './icons'

export type GymCardData = {
  id: string
  name: string
  city: string | null
  image: string | null
  routesCount: number
  beta: number
  disciplines: Discipline[]
  typesLabel: string
  setLabel: string | null
  setSort: number
}

type DisciplineFilter = 'all' | Discipline
type SortKey = 'name' | 'routes' | 'beta' | 'recent'

const FILTERS: { key: DisciplineFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'boulder', label: 'Bouldering' },
  { key: 'lead', label: 'Lead' },
  { key: 'top_rope', label: 'Top-rope' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'routes', label: 'Most routes' },
  { key: 'beta', label: 'Most beta' },
  { key: 'recent', label: 'Recently set' },
]

// Client surface for the directory: debounced URL search (mirrors the original
// GymSearch), client-side discipline filtering + sort over the already-fetched
// list, the "Your gyms" / "All gyms" split, and a no-results state.
export function GymsDirectory({
  gyms,
  favoritedGymIds,
  canFavorite,
  query,
}: {
  gyms: GymCardData[]
  favoritedGymIds: string[]
  canFavorite: boolean
  query: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(query)
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all')
  const [sort, setSort] = useState<SortKey>('name')
  const [sortOpen, setSortOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (!sortOpen) return
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [sortOpen])

  function onSearch(next: string) {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const trimmed = next.trim()
      router.replace(trimmed ? `/gyms?q=${encodeURIComponent(trimmed)}` : '/gyms', {
        scroll: false,
      })
    }, 300)
  }

  const favSet = useMemo(() => new Set(favoritedGymIds), [favoritedGymIds])

  const filtered = useMemo(() => {
    const list = gyms.filter(
      (g) => discipline === 'all' || g.disciplines.includes(discipline)
    )
    const cmp: Record<SortKey, (a: GymCardData, b: GymCardData) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      routes: (a, b) => b.routesCount - a.routesCount,
      beta: (a, b) => b.beta - a.beta,
      recent: (a, b) => b.setSort - a.setSort,
    }
    return [...list].sort(cmp[sort])
  }, [gyms, discipline, sort])

  const favorites = filtered.filter((g) => favSet.has(g.id))
  const others = filtered.filter((g) => !favSet.has(g.id))

  return (
    <div className="g-directory">
      <div className="g-wrap">
        <header className="g-head">
          <div className="g-eyebrow">Browse gyms</div>
          <h1 className="g-title">
            Find your <em>gym</em>
          </h1>
          <p className="g-sub">
            Search the directory, favorite your home wall, and dive into every
            route — with community beta on each one.
          </p>
        </header>

        <div className="g-toolbar">
          <div className="g-search">
            <SearchIcon />
            <input
              type="search"
              value={value}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search gyms by name or city"
            />
          </div>
          <div className="g-filters">
            <div className="g-pills">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={'g-pill' + (discipline === f.key ? ' is-active' : '')}
                  onClick={() => setDiscipline(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="g-tools-right">
              <span className="g-count">{filtered.length} gyms</span>
              <div className="g-sort" ref={sortRef}>
                <button
                  type="button"
                  className={'g-sort-btn' + (sortOpen ? ' is-open' : '')}
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  aria-label="Sort gyms"
                  onClick={() => setSortOpen((o) => !o)}
                >
                  <SlidersIcon />
                  <span className="g-sort-label">Sort</span>
                  <span className="g-sort-value">
                    {SORTS.find((s) => s.key === sort)?.label}
                  </span>
                  <span className="g-sort-chev" aria-hidden="true" />
                </button>
                <div
                  className={'g-menu' + (sortOpen ? ' is-open' : '')}
                  role="listbox"
                  aria-label="Sort gyms"
                >
                  {SORTS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      role="option"
                      aria-selected={s.key === sort}
                      className={'g-menu-item' + (s.key === sort ? ' is-sel' : '')}
                      onClick={() => {
                        setSort(s.key)
                        setSortOpen(false)
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="g-empty">
            <div className="g-empty-ic">
              <SearchIcon />
            </div>
            <h3>No gyms found</h3>
            <p>
              {query ? (
                <>
                  We couldn&apos;t find a gym matching <b>&ldquo;{query}&rdquo;</b>.
                  Try a different name or city.
                </>
              ) : (
                <>No gyms match this filter. Try a different discipline.</>
              )}
            </p>
            {query && (
              <button
                type="button"
                className="g-clear"
                onClick={() => onSearch('')}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {favorites.length > 0 && (
              <section className="g-section">
                <div className="g-section-head">
                  <span className="g-section-label">Your gyms</span>
                  <span className="g-section-count">{favorites.length}</span>
                  <span className="g-section-rule" />
                </div>
                <div className="g-grid-2">
                  {favorites.map((g) => (
                    <GymCard key={g.id} gym={g} favorited canFavorite={canFavorite} />
                  ))}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section className="g-section">
                <div className="g-section-head">
                  <span className="g-section-label">
                    {favorites.length > 0 ? 'All gyms' : 'Gyms'}
                  </span>
                  <span className="g-section-count">{others.length}</span>
                  <span className="g-section-rule" />
                </div>
                <div className="g-grid-2">
                  {others.map((g) => (
                    <GymCard
                      key={g.id}
                      gym={g}
                      favorited={favSet.has(g.id)}
                      canFavorite={canFavorite}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
