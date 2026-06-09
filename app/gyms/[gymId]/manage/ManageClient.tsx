'use client'

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { type Discipline } from '@/lib/grades'
import { holdColor, holdInk } from '@/lib/holds'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RouteForm } from './RouteForm'
import { RouteVideosModal } from './RouteVideosModal'
import {
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  LayersIcon,
  EraserIcon,
  FilmIcon,
} from './icons'
import {
  createWallAction,
  clearWallRoutesAction,
  deleteRouteAction,
  deleteWallAction,
  renameWallAction,
  type FormState,
} from './actions'

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

type Wall = { id: string; name: string; sort_order: number }

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Boulder',
  top_rope: 'Top rope',
  lead: 'Lead',
}

const DISCIPLINE_ORDER: Record<Discipline, number> = {
  boulder: 0,
  top_rope: 1,
  lead: 2,
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtSetDate(iso: string | null): string | null {
  if (!iso) return null
  const [, m, d] = iso.split('-')
  if (!m || !d) return iso
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`
}

type RouteDialog =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; route: Route }

type Confirm = {
  title: string
  message: string
  success: string
  run: () => Promise<FormState>
}

export function ManageClient({
  gymId,
  walls,
  routes,
  videoCounts,
}: {
  gymId: string
  walls: Wall[]
  routes: Route[]
  videoCounts: Record<string, number>
}) {
  const [pending, startTransition] = useTransition()
  const [routeDialog, setRouteDialog] = useState<RouteDialog>({ mode: 'closed' })
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [addWallOpen, setAddWallOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // --- per-route video modal --------------------------------------------
  // Counts live in state so a delete inside the modal can decrement the row's
  // chip without a reload.
  const [counts, setCounts] = useState(videoCounts)
  const [videosFor, setVideosFor] = useState<Route | null>(null)
  const onVideoDeleted = useCallback((routeId: string) => {
    setCounts((c) => ({ ...c, [routeId]: Math.max((c[routeId] ?? 1) - 1, 0) }))
  }, [])

  // --- toast -------------------------------------------------------------
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const onWallAdded = useCallback(() => showToast('Wall added'), [showToast])
  const onWallRenamed = useCallback(() => showToast('Wall renamed'), [showToast])

  // --- route modal -------------------------------------------------------
  const closeRouteDialog = useCallback(() => setRouteDialog({ mode: 'closed' }), [])
  const routeDialogRef = useRef<HTMLDialogElement>(null)
  const routeOpen = routeDialog.mode !== 'closed'
  const routeModeRef = useRef(routeDialog.mode)
  routeModeRef.current = routeDialog.mode

  useEffect(() => {
    const dialog = routeDialogRef.current
    if (!dialog) return
    if (routeOpen && !dialog.open) dialog.showModal()
    if (!routeOpen && dialog.open) dialog.close()
  }, [routeOpen])

  const onRouteSuccess = useCallback(() => {
    showToast(routeModeRef.current === 'edit' ? 'Route saved' : 'Route added')
    closeRouteDialog()
  }, [showToast, closeRouteDialog])

  // Close the route modal when the backdrop (the <dialog> itself) is clicked.
  function onRouteBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === routeDialogRef.current) closeRouteDialog()
  }

  function handleConfirm() {
    if (!confirm) return
    const { run, success } = confirm
    startTransition(async () => {
      const res = await run()
      showToast(res?.error ?? success)
      setConfirm(null)
    })
  }

  function toggle(id: string) {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  }

  function routesForWall(wallId: string | null) {
    return routes
      .filter((r) => r.wall_id === wallId)
      .sort((a, b) => {
        const cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline]
        return cmp !== 0 ? cmp : a.grade_order - b.grade_order
      })
  }

  const unassigned = routesForWall(null)
  const isEmpty = walls.length === 0 && routes.length === 0

  return (
    <section className="m-routes">
      <div className="m-sec-head">
        <span className="m-sec-title">Walls &amp; routes</span>
        <span className="m-sec-count">{routes.length}</span>
        <span className="m-sec-spacer" />
        <button
          type="button"
          className="m-btn m-btn--ghost"
          onClick={() => setAddWallOpen((o) => !o)}
        >
          <PlusIcon />
          Add wall
        </button>
        <button
          type="button"
          className="m-btn m-btn--primary"
          onClick={() => setRouteDialog({ mode: 'create' })}
        >
          <PlusIcon />
          Add route
        </button>
      </div>

      {addWallOpen && (
        <AddWallForm
          gymId={gymId}
          onAdded={onWallAdded}
          onCancel={() => setAddWallOpen(false)}
        />
      )}

      {isEmpty ? (
        <div className="m-routes-empty">
          <div className="m-routes-empty-ic">
            <LayersIcon />
          </div>
          <h3>No walls or routes yet</h3>
          <p>
            Start by adding a wall, then set its routes — each one gets a grade, a set
            color, and a wall, so climbers can browse and film beta against them.
          </p>
          <button
            type="button"
            className="m-btn m-btn--primary"
            onClick={() => setRouteDialog({ mode: 'create' })}
          >
            <PlusIcon />
            Add the first route
          </button>
        </div>
      ) : (
        <div className="m-grouplist">
          {walls.map((wall) => (
            <WallSection
              key={wall.id}
              gymId={gymId}
              wall={wall}
              routes={routesForWall(wall.id)}
              videoCounts={counts}
              collapsed={!!collapsed[wall.id]}
              onToggle={() => toggle(wall.id)}
              onRenamed={onWallRenamed}
              onEditRoute={(route) => setRouteDialog({ mode: 'edit', route })}
              onOpenVideos={setVideosFor}
              onClearRoutes={() => {
                const count = routesForWall(wall.id).length
                setConfirm({
                  title: `Clear all routes on “${wall.name}”?`,
                  message: `This permanently deletes ${count} route${count === 1 ? '' : 's'} and their videos. The wall stays.`,
                  success: 'Routes cleared',
                  run: () => clearWallRoutesAction(gymId, wall.id),
                })
              }}
              onDeleteRoute={(route) =>
                setConfirm({
                  title: `Delete route “${route.name}”?`,
                  message: 'This can’t be undone.',
                  success: 'Route deleted',
                  run: () => deleteRouteAction(gymId, route.id),
                })
              }
              onDelete={() => {
                const count = routesForWall(wall.id).length
                setConfirm({
                  title: `Delete wall “${wall.name}”?`,
                  message:
                    count > 0
                      ? `This also permanently deletes its ${count} route${count === 1 ? '' : 's'}.`
                      : 'This can’t be undone.',
                  success: 'Wall deleted',
                  run: () => deleteWallAction(gymId, wall.id),
                })
              }}
            />
          ))}

          {unassigned.length > 0 && (
            <div className="m-group" data-collapsed={collapsed['un'] ? 'true' : 'false'}>
              <div className="m-group-head" onClick={() => toggle('un')}>
                <span className="m-chev">
                  <ChevronDownIcon />
                </span>
                <div className="m-group-id">
                  <span className="m-group-name is-unassigned" title="Unassigned">
                    Unassigned
                  </span>
                  <span className="m-group-count">
                    {unassigned.length} {unassigned.length === 1 ? 'route' : 'routes'}
                  </span>
                </div>
              </div>
              <div className="m-group-body">
                <div className="m-rowlist">
                  {unassigned.map((r) => (
                    <RouteRow
                      key={r.id}
                      route={r}
                      videoCount={counts[r.id] ?? 0}
                      onOpenVideos={() => setVideosFor(r)}
                      onEdit={() => setRouteDialog({ mode: 'edit', route: r })}
                      onDelete={() =>
                        setConfirm({
                          title: `Delete route “${r.name}”?`,
                          message: 'This can’t be undone.',
                          success: 'Route deleted',
                          run: () => deleteRouteAction(gymId, r.id),
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <dialog
        ref={routeDialogRef}
        onClose={closeRouteDialog}
        onClick={onRouteBackdrop}
        className="m-modal"
      >
        {routeDialog.mode !== 'closed' && (
          <RouteForm
            key={routeDialog.mode === 'edit' ? routeDialog.route.id : 'new'}
            gymId={gymId}
            walls={walls}
            route={routeDialog.mode === 'edit' ? routeDialog.route : undefined}
            onSuccess={onRouteSuccess}
            onCancel={closeRouteDialog}
          />
        )}
      </dialog>

      {videosFor && (
        <RouteVideosModal
          key={videosFor.id}
          gymId={gymId}
          route={videosFor}
          onClose={() => setVideosFor(null)}
          onDeleted={onVideoDeleted}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        pending={pending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />

      <div className={`m-toast${toast.show ? ' show' : ''}`} role="status" aria-live="polite">
        <CheckIcon />
        <span>{toast.msg}</span>
      </div>
    </section>
  )
}

function AddWallForm({
  gymId,
  onAdded,
  onCancel,
}: {
  gymId: string
  onAdded: () => void
  onCancel: () => void
}) {
  const action = createWallAction.bind(null, gymId)
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Re-run on every successful submit (new state object) so the composer can be
  // used for rapid entry: reset, refocus, toast — and stay open.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      inputRef.current?.focus()
      onAdded()
    }
  }, [state, onAdded])

  return (
    <form ref={formRef} action={formAction} className="m-addwall" autoComplete="off">
      <input
        ref={inputRef}
        name="name"
        required
        autoFocus
        placeholder="New wall name…"
        aria-label="New wall name"
      />
      <button type="submit" disabled={pending} className="m-btn m-btn--primary">
        Add
      </button>
      <button type="button" onClick={onCancel} className="m-btn m-btn--ghost">
        Cancel
      </button>
    </form>
  )
}

function WallSection({
  gymId,
  wall,
  routes,
  videoCounts,
  collapsed,
  onToggle,
  onRenamed,
  onEditRoute,
  onOpenVideos,
  onClearRoutes,
  onDeleteRoute,
  onDelete,
}: {
  gymId: string
  wall: Wall
  routes: Route[]
  videoCounts: Record<string, number>
  collapsed: boolean
  onToggle: () => void
  onRenamed: () => void
  onEditRoute: (route: Route) => void
  onOpenVideos: (route: Route) => void
  onClearRoutes: () => void
  onDeleteRoute: (route: Route) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const action = renameWallAction.bind(null, gymId, wall.id)
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {})

  useEffect(() => {
    if (state.ok) {
      setEditing(false)
      onRenamed()
    }
  }, [state, onRenamed])

  return (
    <div className="m-group" data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="m-group-head" onClick={onToggle}>
        <span className="m-chev">
          <ChevronDownIcon />
        </span>

        {editing ? (
          <form
            action={formAction}
            className="m-group-rename"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              name="name"
              required
              autoFocus
              defaultValue={wall.name}
              className="m-group-input"
            />
            <button type="submit" disabled={pending} className="m-iconbtn" aria-label="Save">
              <CheckIcon />
            </button>
            <button
              type="button"
              className="m-iconbtn"
              aria-label="Cancel"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(false)
              }}
            >
              <XIcon />
            </button>
          </form>
        ) : (
          <>
            <div className="m-group-id">
              <span className="m-group-name" title={wall.name}>
                {wall.name}
              </span>
              <span className="m-group-count">
                {routes.length} {routes.length === 1 ? 'route' : 'routes'}
              </span>
            </div>
            <div className="m-group-acts">
              <button
                type="button"
                className="m-iconbtn"
                aria-label="Rename wall"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(true)
                }}
              >
                <PencilIcon />
              </button>
              {routes.length > 0 && (
                <button
                  type="button"
                  className="m-iconbtn"
                  aria-label="Clear all routes"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClearRoutes()
                  }}
                >
                  <EraserIcon />
                </button>
              )}
              <button
                type="button"
                className="m-iconbtn is-danger"
                aria-label="Delete wall"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <TrashIcon />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="m-group-body">
        {routes.length === 0 ? (
          <p className="m-group-hint">No routes on this wall yet.</p>
        ) : (
          <div className="m-rowlist">
            {routes.map((r) => (
              <RouteRow
                key={r.id}
                route={r}
                videoCount={videoCounts[r.id] ?? 0}
                onOpenVideos={() => onOpenVideos(r)}
                onEdit={() => onEditRoute(r)}
                onDelete={() => onDeleteRoute(r)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RouteRow({
  route,
  videoCount,
  onOpenVideos,
  onEdit,
  onDelete,
}: {
  route: Route
  videoCount: number
  onOpenVideos: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const bg = holdColor(route.color)
  const setLabel = fmtSetDate(route.set_date)
  return (
    <div className="m-row">
      <span className="m-grade" style={{ background: bg }}>
        <span style={{ color: route.color ? holdInk(route.color) : 'var(--color-chalk-100)' }}>
          {route.grade_label}
        </span>
      </span>

      <div className="m-row-main">
        <div className="m-row-name">{route.name}</div>
        <div className="m-row-meta">
          <span className="m-tag">{DISCIPLINE_LABEL[route.discipline]}</span>
          {route.color && (
            <>
              <span className="dot" />
              <span className="m-color">
                <span className="m-swatch" style={{ background: bg }} />
                {route.color}
              </span>
            </>
          )}
          {setLabel && (
            <>
              <span className="dot" />
              <span>Set {setLabel}</span>
            </>
          )}
        </div>
      </div>

      <div className="m-row-acts">
        <button
          type="button"
          className={`m-vchip${videoCount === 0 ? ' is-empty' : ''}`}
          aria-label={`${videoCount} ${videoCount === 1 ? 'video' : 'videos'} — manage`}
          onClick={onOpenVideos}
        >
          <FilmIcon />
          {videoCount}
        </button>
        <button type="button" className="m-iconbtn" aria-label="Edit route" onClick={onEdit}>
          <PencilIcon />
        </button>
        <button
          type="button"
          className="m-iconbtn is-danger"
          aria-label="Delete route"
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}
