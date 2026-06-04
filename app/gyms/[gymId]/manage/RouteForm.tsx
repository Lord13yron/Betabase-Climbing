'use client'

import { useActionState, useEffect, useState } from 'react'
import { type Discipline, gradesForDiscipline } from '@/lib/grades'
import { holdColor } from '@/lib/holds'
import { saveRouteAction, type FormState } from './actions'
import { XIcon } from './icons'

type Route = {
  id: string
  name: string
  discipline: Discipline
  color: string | null
  grade_label: string
  wall_id: string | null
  set_date: string | null
}

type Wall = { id: string; name: string }

const DISCIPLINES: { value: Discipline; label: string }[] = [
  { value: 'boulder', label: 'Boulder' },
  { value: 'top_rope', label: 'Top rope' },
  { value: 'lead', label: 'Lead' },
]

// Hold-color names in display order (hexes come from lib/holds.ts → holdColor).
const COLOR_ORDER = [
  'red', 'orange', 'yellow', 'green', 'teal',
  'blue', 'purple', 'pink', 'black', 'white',
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function RouteForm({
  gymId,
  walls,
  route,
  onSuccess,
  onCancel,
}: {
  gymId: string
  walls: Wall[]
  route?: Route
  onSuccess: () => void
  onCancel: () => void
}) {
  const action = saveRouteAction.bind(null, gymId, route?.id ?? null)
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {})

  const [discipline, setDiscipline] = useState<Discipline>(route?.discipline ?? 'boulder')
  const grades = gradesForDiscipline(discipline)
  const [grade, setGrade] = useState(route?.grade_label ?? grades[0])
  const [color, setColor] = useState<string | null>(route?.color ?? null)

  useEffect(() => {
    if (state.ok) onSuccess()
  }, [state, onSuccess])

  function onDisciplineChange(next: Discipline) {
    setDiscipline(next)
    const nextGrades = gradesForDiscipline(next)
    if (!nextGrades.includes(grade)) setGrade(nextGrades[0])
  }

  return (
    <>
      <div className="m-modal-head">
        <div>
          <div className="m-modal-title">{route ? 'Edit route' : 'Add route'}</div>
          <div className="m-modal-sub">{route ? route.name : 'New route'}</div>
        </div>
        <button type="button" className="m-modal-x" aria-label="Close" onClick={onCancel}>
          <XIcon />
        </button>
      </div>

      <form action={formAction} autoComplete="off">
        <div className="m-modal-body">
          {state.error && <div className="m-error">{state.error}</div>}

          <input type="hidden" name="discipline" value={discipline} />
          <input type="hidden" name="color" value={color ?? ''} />

          <div className="m-field">
            <label className="m-label" htmlFor="m-rf-name">
              Route name
            </label>
            <input
              id="m-rf-name"
              className="m-input"
              name="name"
              required
              autoFocus
              defaultValue={route?.name ?? ''}
              placeholder="e.g. Crimp Theory"
            />
          </div>

          <div className="m-field">
            <span className="m-label">Discipline</span>
            <div className="m-seg" role="group" aria-label="Discipline">
              {DISCIPLINES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={discipline === d.value ? 'on' : ''}
                  onClick={() => onDisciplineChange(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="m-field-row">
            <div className="m-field">
              <label className="m-label" htmlFor="m-rf-grade">
                Grade
              </label>
              <select
                id="m-rf-grade"
                className="m-select"
                name="grade_label"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="m-field">
              <label className="m-label" htmlFor="m-rf-wall">
                Wall
              </label>
              <select
                id="m-rf-wall"
                className="m-select"
                name="wall_id"
                defaultValue={route?.wall_id ?? ''}
              >
                <option value="">Unassigned</option>
                {walls.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="m-field">
            <span className="m-label">Set color</span>
            <div className="m-colors">
              <button
                type="button"
                className={`m-colorbtn m-colorbtn--none${color === null ? ' on' : ''}`}
                aria-label="No color"
                aria-pressed={color === null}
                onClick={() => setColor(null)}
              >
                <span className="sw">
                  <XIcon />
                </span>
              </button>
              {COLOR_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`m-colorbtn${color === c ? ' on' : ''}`}
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                >
                  <span className="sw" style={{ background: holdColor(c) }} />
                </button>
              ))}
            </div>
          </div>

          <div className="m-field">
            <label className="m-label" htmlFor="m-rf-date">
              Set date <span className="opt">(optional)</span>
            </label>
            <input
              id="m-rf-date"
              type="date"
              className="m-input"
              name="set_date"
              defaultValue={route?.set_date ?? (route ? '' : today())}
            />
          </div>
        </div>

        <div className="m-modal-foot">
          <button type="button" className="m-btn m-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className="m-btn m-btn--primary">
            {pending ? 'Saving…' : route ? 'Save changes' : 'Add route'}
          </button>
        </div>
      </form>
    </>
  )
}
