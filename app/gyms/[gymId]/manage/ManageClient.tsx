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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RouteForm } from './RouteForm'
import {
  createWallAction,
  deleteRouteAction,
  deleteWallAction,
  moveWallAction,
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

const BTN = 'rounded border border-foreground/20 px-2 py-1 text-sm hover:bg-foreground/5 disabled:opacity-40'

type RouteDialog =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; route: Route }

type Confirm = {
  title: string
  message: string
  run: () => Promise<FormState>
}

export function ManageClient({
  gymId,
  walls,
  routes,
}: {
  gymId: string
  walls: Wall[]
  routes: Route[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [routeDialog, setRouteDialog] = useState<RouteDialog>({ mode: 'closed' })
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const closeRouteDialog = useCallback(() => setRouteDialog({ mode: 'closed' }), [])

  const routeDialogRef = useRef<HTMLDialogElement>(null)
  const routeOpen = routeDialog.mode !== 'closed'
  useEffect(() => {
    const dialog = routeDialogRef.current
    if (!dialog) return
    if (routeOpen && !dialog.open) dialog.showModal()
    if (!routeOpen && dialog.open) dialog.close()
  }, [routeOpen])

  function run(fn: () => Promise<FormState>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) setError(res.error)
    })
  }

  function handleConfirm() {
    if (!confirm) return
    setError(null)
    startTransition(async () => {
      const res = await confirm.run()
      if (res?.error) setError(res.error)
      setConfirm(null)
    })
  }

  const wallName = new Map(walls.map((w) => [w.id, w.name]))
  function routesForWall(wallId: string | null) {
    return routes
      .filter((r) => r.wall_id === wallId)
      .sort((a, b) => {
        const cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline]
        return cmp !== 0 ? cmp : a.grade_order - b.grade_order
      })
  }

  const groups = [
    ...walls.map((w) => ({ id: w.id, name: w.name, routes: routesForWall(w.id) })),
    { id: null, name: 'Unassigned', routes: routesForWall(null) },
  ].filter((g) => g.routes.length > 0)

  return (
    <div className="flex flex-col gap-10">
      {error && (
        <p className="rounded border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold">Walls</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {walls.map((wall, i) => (
            <WallRow
              key={wall.id}
              gymId={gymId}
              wall={wall}
              isFirst={i === 0}
              isLast={i === walls.length - 1}
              disabled={pending}
              onMove={(dir) => run(() => moveWallAction(gymId, wall.id, dir))}
              onDelete={() => {
                const count = routes.filter((r) => r.wall_id === wall.id).length
                setConfirm({
                  title: `Delete wall “${wall.name}”?`,
                  message:
                    count > 0
                      ? `This also permanently deletes its ${count} route${count === 1 ? '' : 's'}.`
                      : 'This can’t be undone.',
                  run: () => deleteWallAction(gymId, wall.id),
                })
              }}
            />
          ))}
          {walls.length === 0 && (
            <li className="text-sm text-foreground/70">No walls yet.</li>
          )}
        </ul>
        <AddWallForm gymId={gymId} />
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Routes</h2>
          <button
            type="button"
            onClick={() => setRouteDialog({ mode: 'create' })}
            className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background"
          >
            + Add route
          </button>
        </div>

        {groups.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/70">No routes yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.id ?? 'unassigned'}>
                <h3 className="text-sm font-medium text-foreground/70">
                  {group.name}
                </h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {group.routes.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded border border-foreground/20 px-3 py-2"
                    >
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-medium">{r.grade_label}</span>
                        <span>{r.name}</span>
                        <span className="text-foreground/70">
                          {DISCIPLINE_LABEL[r.discipline]}
                        </span>
                        {r.color && (
                          <span className="flex items-center gap-1.5 text-foreground/70">
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-foreground/20"
                              style={{ backgroundColor: r.color }}
                            />
                            {r.color}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          className={BTN}
                          onClick={() => setRouteDialog({ mode: 'edit', route: r })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={BTN}
                          onClick={() =>
                            setConfirm({
                              title: `Delete route “${r.name}”?`,
                              message: 'This can’t be undone.',
                              run: () => deleteRouteAction(gymId, r.id),
                            })
                          }
                        >
                          Delete
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <dialog
        ref={routeDialogRef}
        onClose={closeRouteDialog}
        className="m-auto w-full max-w-md rounded-lg border border-foreground/15 bg-background p-5 text-foreground backdrop:bg-black/50"
      >
        {routeDialog.mode !== 'closed' && (
          <RouteForm
            key={routeDialog.mode === 'edit' ? routeDialog.route.id : 'new'}
            gymId={gymId}
            walls={walls}
            route={routeDialog.mode === 'edit' ? routeDialog.route : undefined}
            onSuccess={closeRouteDialog}
            onCancel={closeRouteDialog}
          />
        )}
      </dialog>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        pending={pending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function AddWallForm({ gymId }: { gymId: string }) {
  const action = createWallAction.bind(null, gymId)
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {}
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-3 flex items-start gap-2"
    >
      <input
        name="name"
        required
        placeholder="New wall name"
        className="rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add wall'}
      </button>
      {state.error && <p className="self-center text-sm text-red-600">{state.error}</p>}
    </form>
  )
}

function WallRow({
  gymId,
  wall,
  isFirst,
  isLast,
  disabled,
  onMove,
  onDelete,
}: {
  gymId: string
  wall: { id: string; name: string }
  isFirst: boolean
  isLast: boolean
  disabled: boolean
  onMove: (dir: 'up' | 'down') => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const action = renameWallAction.bind(null, gymId, wall.id)
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {}
  )

  useEffect(() => {
    if (state.ok) setEditing(false)
  }, [state.ok])

  return (
    <li className="flex items-center justify-between gap-3 rounded border border-foreground/20 px-3 py-2">
      {editing ? (
        <form action={formAction} className="flex flex-1 items-center gap-2">
          <input
            name="name"
            required
            defaultValue={wall.name}
            autoFocus
            className="flex-1 rounded border border-foreground/20 bg-transparent px-2 py-1 text-sm"
          />
          <button type="submit" disabled={pending} className={BTN}>
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={BTN}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <span className="text-sm font-medium">{wall.name}</span>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="Move up"
              className={BTN}
              disabled={disabled || isFirst}
              onClick={() => onMove('up')}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Move down"
              className={BTN}
              disabled={disabled || isLast}
              onClick={() => onMove('down')}
            >
              ↓
            </button>
            <button type="button" className={BTN} onClick={() => setEditing(true)}>
              Rename
            </button>
            <button
              type="button"
              className={BTN}
              disabled={disabled}
              onClick={onDelete}
            >
              Delete
            </button>
          </span>
        </>
      )}
    </li>
  )
}
