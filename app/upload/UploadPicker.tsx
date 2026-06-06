'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { holdColor } from '@/lib/holds'
import { BetaUploader } from '@/components/BetaUploader'

type Gym = { id: string; name: string; city: string | null }
type Wall = { id: string; name: string; sort_order: number }
type Route = {
  id: string
  name: string
  color: string | null
  grade_label: string
  grade_order: number
  wall_id: string | null
}

const selectClass =
  'w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm disabled:opacity-50'

export function UploadPicker({ gyms }: { gyms: Gym[] }) {
  const [gymId, setGymId] = useState('')
  const [wallId, setWallId] = useState<string>('all') // 'all' | 'unassigned' | <id>
  const [routeId, setRouteId] = useState('')

  const [walls, setWalls] = useState<Wall[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  // Searchable gym combobox (native <select> doesn't scale to hundreds of gyms).
  const [gymQuery, setGymQuery] = useState('')
  const [gymOpen, setGymOpen] = useState(false)
  const gymBoxRef = useRef<HTMLDivElement>(null)
  const selectedGym = gyms.find((g) => g.id === gymId)

  const filteredGyms = useMemo(() => {
    const q = gymQuery.trim().toLowerCase()
    if (!q) return gyms
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.city ?? '').toLowerCase().includes(q),
    )
  }, [gyms, gymQuery])

  // Close the gym list on outside-click / Escape, snapping the input text back
  // to the committed selection so the box always reflects the chosen gym.
  useEffect(() => {
    if (!gymOpen) return
    const close = () => {
      setGymOpen(false)
      setGymQuery(selectedGym?.name ?? '')
    }
    const onDown = (e: MouseEvent) => {
      if (gymBoxRef.current && !gymBoxRef.current.contains(e.target as Node))
        close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [gymOpen, selectedGym?.name])

  // Load the chosen gym's walls + routes on demand (browser client, public read).
  // The loading flag / clearing happens in onGymChange so this effect only sets
  // state from the async result.
  useEffect(() => {
    if (!gymId) return
    let cancelled = false
    const supabase = createClient()
    Promise.all([
      supabase
        .from('walls')
        .select('id, name, sort_order')
        .eq('gym_id', gymId)
        .order('sort_order'),
      supabase
        .from('routes')
        .select('id, name, color, grade_label, grade_order, wall_id')
        .eq('gym_id', gymId),
    ]).then(([wallsRes, routesRes]) => {
      if (cancelled) return
      setWalls(wallsRes.data ?? [])
      setRoutes(routesRes.data ?? [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [gymId])

  const visibleRoutes = useMemo(() => {
    const filtered = routes.filter((r) => {
      if (wallId === 'all') return true
      if (wallId === 'unassigned') return r.wall_id === null
      return r.wall_id === wallId
    })
    return filtered.sort((a, b) => a.grade_order - b.grade_order)
  }, [routes, wallId])

  function selectGym(gym: Gym) {
    setGymId(gym.id)
    setGymQuery(gym.name)
    setGymOpen(false)
    setWallId('all')
    setRouteId('')
    setUploaded(false)
    setWalls([])
    setRoutes([])
    setLoading(true)
  }

  function onWallChange(next: string) {
    setWallId(next)
    setRouteId('')
    setUploaded(false)
  }

  const selectedRoute = visibleRoutes.find((r) => r.id === routeId)

  if (uploaded && routeId) {
    return (
      <div className="rounded-lg border border-foreground/15 p-6 text-center">
        <p className="text-base font-medium">Beta uploaded — processing now.</p>
        <p className="mt-1 text-sm text-foreground/60">
          Your clip will appear on the route once it finishes transcoding.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href={`/routes/${routeId}`}
            className="rounded border border-foreground/20 px-4 py-2 text-sm"
          >
            View route
          </Link>
          <button
            type="button"
            onClick={() => {
              setUploaded(false)
              setRouteId('')
            }}
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Upload another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div ref={gymBoxRef} className="relative">
        <label className="block text-sm font-medium">Gym</label>
        <input
          type="text"
          className={`mt-1 ${selectClass}`}
          value={gymQuery}
          placeholder="Search gyms…"
          role="combobox"
          aria-expanded={gymOpen}
          aria-controls="gym-listbox"
          aria-autocomplete="list"
          onFocus={() => setGymOpen(true)}
          onChange={(e) => {
            setGymQuery(e.target.value)
            setGymOpen(true)
          }}
        />
        {gymOpen && (
          <ul
            id="gym-listbox"
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-foreground/20 bg-background shadow-lg"
          >
            {filteredGyms.length === 0 ? (
              <li className="px-3 py-2 text-sm text-foreground/60">
                No gyms match.
              </li>
            ) : (
              filteredGyms.map((g) => (
                <li key={g.id} role="option" aria-selected={g.id === gymId}>
                  <button
                    type="button"
                    onClick={() => selectGym(g)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-foreground/10${
                      g.id === gymId ? ' bg-foreground/5' : ''
                    }`}
                  >
                    {g.name}
                    {g.city ? (
                      <span className="text-foreground/50"> · {g.city}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Wall</label>
        <select
          className={`mt-1 ${selectClass}`}
          value={wallId}
          onChange={(e) => onWallChange(e.target.value)}
          disabled={!gymId || loading}
        >
          <option value="all">All walls</option>
          {walls.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Route</label>
        <select
          className={`mt-1 ${selectClass}`}
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          disabled={!gymId || loading}
        >
          <option value="">Select a route…</option>
          {visibleRoutes.map((r) => (
            <option key={r.id} value={r.id}>
              {`${r.name} · ${r.grade_label}`}
            </option>
          ))}
        </select>
        {gymId && !loading && visibleRoutes.length === 0 && (
          <p className="mt-1 text-sm text-foreground/60">
            No routes here yet.
          </p>
        )}
      </div>

      {selectedRoute && (
        <div className="flex items-center gap-2 text-sm text-foreground/70">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: holdColor(selectedRoute.color) }}
            aria-hidden
          />
          <span>
            {selectedRoute.name} · {selectedRoute.grade_label}
          </span>
        </div>
      )}

      {routeId && (
        <BetaUploader routeId={routeId} onUploaded={() => setUploaded(true)} />
      )}
    </div>
  )
}
