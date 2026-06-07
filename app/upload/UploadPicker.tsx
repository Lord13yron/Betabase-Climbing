'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { holdColor, holdInk } from '@/lib/holds'
import { Avatar } from '@/components/Avatar'
import { ClipUploader, type ClipStatus } from './ClipUploader'
import {
  SearchIcon,
  MapPinIcon,
  ChevronDownIcon,
  UploadIcon,
  CheckIcon,
  CircleCheckIcon,
  InfoIcon,
  ArrowRightIcon,
} from './icons'

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
type Poster = { username: string | null; avatarUrl: string | null }

export function UploadPicker({ gyms, poster }: { gyms: Gym[]; poster: Poster }) {
  const [gymId, setGymId] = useState('')
  const [wallId, setWallId] = useState<string>('all') // 'all' | 'unassigned' | <id>
  const [routeId, setRouteId] = useState('')

  const [walls, setWalls] = useState<Wall[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [clipStatus, setClipStatus] = useState<ClipStatus>('idle')

  // Searchable gym combobox (native <select> doesn't scale to hundreds of gyms).
  const [gymQuery, setGymQuery] = useState('')
  const [gymOpen, setGymOpen] = useState(false)
  const [cursor, setCursor] = useState(-1) // keyboard-highlighted option
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
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [gymOpen, selectedGym?.name])

  // Load the chosen gym's walls + routes on demand (browser client, public read).
  // The loading flag / clearing happens in selectGym so this effect only sets
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

  // Keep the keyboard-highlighted option scrolled into view.
  useEffect(() => {
    if (cursor < 0) return
    gymBoxRef.current
      ?.querySelector('.u-opt.is-cursor')
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

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
    setCursor(-1)
    setWallId('all')
    setRouteId('')
    setUploaded(false)
    setClipStatus('idle')
    setWalls([])
    setRoutes([])
    setLoading(true)
  }

  function onWallChange(next: string) {
    setWallId(next)
    setRouteId('')
    setUploaded(false)
    setClipStatus('idle')
  }

  function onRouteChange(next: string) {
    setRouteId(next)
    setUploaded(false)
    setClipStatus('idle')
  }

  function onGymKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!gymOpen) {
        setGymOpen(true)
        return
      }
      const n = filteredGyms.length
      if (!n) return
      setCursor((c) => {
        const next = e.key === 'ArrowDown' ? c + 1 : c - 1
        return ((next % n) + n) % n // wrap
      })
    } else if (e.key === 'Enter') {
      if (gymOpen && cursor >= 0 && filteredGyms[cursor]) {
        e.preventDefault()
        selectGym(filteredGyms[cursor])
      }
    } else if (e.key === 'Escape') {
      setGymOpen(false)
      setGymQuery(selectedGym?.name ?? '')
      e.currentTarget.blur()
    }
  }

  const selectedRoute = visibleRoutes.find((r) => r.id === routeId)
  const selectedWall = walls.find((w) => w.id === selectedRoute?.wall_id)
  const wallLabel = selectedRoute
    ? selectedRoute.wall_id
      ? (selectedWall?.name ?? 'Wall')
      : 'Unassigned'
    : ''

  const hasRoute = !!selectedRoute
  const clipReady = clipStatus === 'ready'
  const showColorName =
    selectedRoute?.color && !selectedRoute.color.startsWith('#')

  // ---- success screen ----
  if (uploaded && selectedRoute) {
    return (
      <div className="u-success u-anim">
        <div className="u-success-ic">
          <CircleCheckIcon className="u-ico" />
        </div>
        <h2>
          Beta’s <em>in</em>.
        </h2>
        <p>
          Your clip is processing now — it’ll appear on the route once it finishes transcoding.
        </p>
        <div className="u-success-route">
          <span
            className="pip"
            style={{ background: holdColor(selectedRoute.color) }}
            aria-hidden
          />
          <span>
            {selectedRoute.name} · {selectedRoute.grade_label}
            {selectedGym ? ` · ${selectedGym.name}` : ''}
          </span>
        </div>
        <div className="u-success-actions">
          <Link href={`/routes/${routeId}`} className="u-btn-gold">
            <ArrowRightIcon className="u-ico" />
            View route
          </Link>
          <button
            type="button"
            className="u-btn-ghost"
            onClick={() => {
              setUploaded(false)
              setRouteId('')
              setClipStatus('idle')
            }}
          >
            <UploadIcon className="u-ico" />
            Upload another
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="u-head u-anim">
        <p className="u-eyebrow">Give back to the community</p>
        <h1 className="u-title">
          Upload <em>beta</em>.
        </h1>
        <p className="u-sub">
          Filmed a clean run? Pick the route, drop your clip, and show the next climber how it’s done.
        </p>
      </header>

      <div className="u-grid u-anim">
        {/* ---------- form column ---------- */}
        <form className="u-form" onSubmit={(e) => e.preventDefault()}>
          {/* STEP 01 — find the route */}
          <section className={`u-step${hasRoute ? ' is-done' : ''}`}>
            <div className="u-step-head">
              <span className="u-num">01</span>
              <div className="u-step-titles">
                <h2 className="u-step-title">Find the route</h2>
                <p className="u-step-hint">Search your gym, then pick the wall and route.</p>
              </div>
              <span className="u-check">
                <CheckIcon className="u-ico" />
              </span>
            </div>
            <div className="u-step-body">
              {/* gym combobox */}
              <div className="u-field">
                <label className="u-label" htmlFor="u-gym">
                  Gym
                </label>
                <div
                  ref={gymBoxRef}
                  className={`u-combo${gymOpen ? ' is-open' : ''}`}
                >
                  <SearchIcon className="u-ico u-search-ic" />
                  <input
                    id="u-gym"
                    type="text"
                    className="u-input"
                    value={gymQuery}
                    placeholder="Search gyms…"
                    role="combobox"
                    aria-expanded={gymOpen}
                    aria-controls="u-listbox"
                    aria-autocomplete="list"
                    autoComplete="off"
                    spellCheck={false}
                    onFocus={() => {
                      setGymOpen(true)
                      setCursor(-1)
                    }}
                    onChange={(e) => {
                      setGymQuery(e.target.value)
                      setGymOpen(true)
                      setCursor(-1)
                    }}
                    onKeyDown={onGymKeyDown}
                  />
                  <ChevronDownIcon className="u-ico u-chev" />
                  {gymOpen && (
                    <ul id="u-listbox" role="listbox" className="u-listbox">
                      {filteredGyms.length === 0 ? (
                        <li className="u-noresult">
                          No gyms match “{gymQuery.trim()}”.
                        </li>
                      ) : (
                        filteredGyms.map((g, i) => (
                          <li key={g.id} role="option" aria-selected={g.id === gymId}>
                            <button
                              type="button"
                              className={`u-opt${i === cursor ? ' is-cursor' : ''}${
                                g.id === gymId ? ' is-selected' : ''
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                selectGym(g)
                              }}
                              onMouseEnter={() => setCursor(i)}
                            >
                              <MapPinIcon className="u-ico u-opt-pin" />
                              <span className="u-opt-main">
                                <span className="u-opt-name">{g.name}</span>
                                {g.city && <span className="u-opt-city">{g.city}</span>}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {/* wall + route */}
              <div className="u-fields-2">
                <div className="u-field">
                  <label className="u-label" htmlFor="u-wall">
                    Wall
                  </label>
                  <div className="u-select-wrap">
                    <select
                      id="u-wall"
                      className="u-select-native"
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
                    <ChevronDownIcon className="u-ico u-chev" />
                  </div>
                </div>
                <div className="u-field">
                  <label className="u-label" htmlFor="u-route">
                    Route
                  </label>
                  <div className="u-select-wrap">
                    <select
                      id="u-route"
                      className="u-select-native"
                      value={routeId}
                      onChange={(e) => onRouteChange(e.target.value)}
                      disabled={!gymId || loading}
                    >
                      <option value="">Select a route…</option>
                      {visibleRoutes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {`${r.name} · ${r.grade_label}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="u-ico u-chev" />
                  </div>
                </div>
              </div>
              {gymId && !loading && visibleRoutes.length === 0 && (
                <p className="u-emptyroutes">No routes on this wall yet.</p>
              )}
            </div>
          </section>

          {/* STEP 02 — your clip */}
          <section
            className={`u-step${!hasRoute ? ' is-locked' : ''}${clipReady ? ' is-done' : ''}`}
          >
            <div className="u-step-head">
              <span className="u-num">02</span>
              <div className="u-step-titles">
                <h2 className="u-step-title">Add your clip</h2>
                <p className="u-step-hint">A short video of the send — under 60 seconds is ideal.</p>
              </div>
              <span className="u-check">
                <CheckIcon className="u-ico" />
              </span>
            </div>
            <div className="u-step-body">
              {hasRoute && (
                <ClipUploader
                  key={routeId}
                  routeId={routeId}
                  onStatusChange={setClipStatus}
                  onUploaded={() => setUploaded(true)}
                />
              )}
            </div>
          </section>
        </form>

        {/* ---------- summary rail ---------- */}
        <aside className="u-rail">
          <div className="u-card">
            <div className="u-card-head">Uploading to</div>
            <div className="u-card-body">
              {selectedRoute ? (
                <div className="u-route">
                  <span
                    className="u-grade"
                    style={{ background: holdColor(selectedRoute.color) }}
                  >
                    <span className="g" style={{ color: holdInk(selectedRoute.color) }}>
                      {selectedRoute.grade_label}
                    </span>
                    {showColorName && (
                      <span className="c" style={{ color: holdInk(selectedRoute.color) }}>
                        {selectedRoute.color}
                      </span>
                    )}
                  </span>
                  <div className="u-route-main">
                    <div className="u-route-name">{selectedRoute.name}</div>
                    <div className="u-route-meta">
                      {selectedGym && <span>{selectedGym.name}</span>}
                      <span className="dot" />
                      <span>{wallLabel}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="u-route-empty">
                  <div className="u-grade-empty">
                    <SearchIcon className="u-ico" />
                  </div>
                  <p>Pick a route on the left and it’ll show up here.</p>
                </div>
              )}

              <div className="u-asrow">
                <Avatar src={poster.avatarUrl} name={poster.username} size={28} />
                <span className="u-asrow-txt">
                  Posting as <b>@{poster.username ?? 'you'}</b>
                </span>
              </div>

              <div className="u-checklist">
                <div className={`u-ck${hasRoute ? ' is-done' : ''}`}>
                  <span className="u-ck-box">
                    <CheckIcon className="u-ico" />
                  </span>
                  Route selected
                </div>
                <div className={`u-ck${clipReady ? ' is-done' : ''}`}>
                  <span className="u-ck-box">
                    <CheckIcon className="u-ico" />
                  </span>
                  Clip added
                </div>
              </div>

              <button
                type="button"
                className={`u-publish${clipStatus === 'uploading' ? ' is-pending' : ''}`}
                disabled={!(hasRoute && clipReady)}
              >
                {clipStatus === 'uploading' ? (
                  <span className="u-publish-spin" aria-hidden />
                ) : (
                  <UploadIcon className="u-ico" />
                )}
                {clipStatus === 'uploading' ? 'Uploading…' : 'Upload beta'}
              </button>

              <p className="u-foot">
                <InfoIcon className="u-ico" />
                <span>
                  Your clip transcodes after upload and appears on the route once it’s ready.
                </span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
