'use client'

import { useActionState, useEffect, useState } from 'react'
import { type Discipline, gradesForDiscipline } from '@/lib/grades'
import { saveRouteAction, type FormState } from './actions'

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

const FIELD_CLASS =
  'rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm'

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
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {}
  )

  const [discipline, setDiscipline] = useState<Discipline>(
    route?.discipline ?? 'boulder'
  )
  const grades = gradesForDiscipline(discipline)
  const [grade, setGrade] = useState(route?.grade_label ?? grades[0])

  useEffect(() => {
    if (state.ok) onSuccess()
  }, [state.ok, onSuccess])

  function onDisciplineChange(next: Discipline) {
    setDiscipline(next)
    const nextGrades = gradesForDiscipline(next)
    if (!nextGrades.includes(grade)) setGrade(nextGrades[0])
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {route ? 'Edit route' : 'Add route'}
      </h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/70">Name</span>
        <input
          name="name"
          required
          defaultValue={route?.name ?? ''}
          className={FIELD_CLASS}
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-foreground/70">Discipline</span>
          <select
            name="discipline"
            value={discipline}
            onChange={(e) => onDisciplineChange(e.target.value as Discipline)}
            className={FIELD_CLASS}
          >
            <option value="boulder">Boulder</option>
            <option value="top_rope">Top rope</option>
            <option value="lead">Lead</option>
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-foreground/70">Grade</span>
          <select
            name="grade_label"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className={FIELD_CLASS}
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-foreground/70">Color (optional)</span>
          <input
            name="color"
            defaultValue={route?.color ?? ''}
            placeholder="e.g. red"
            className={FIELD_CLASS}
          />
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-foreground/70">Wall</span>
          <select
            name="wall_id"
            defaultValue={route?.wall_id ?? ''}
            className={FIELD_CLASS}
          >
            <option value="">Unassigned</option>
            {walls.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/70">Set date (optional)</span>
        <input
          type="date"
          name="set_date"
          defaultValue={route?.set_date ?? (route ? '' : today())}
          className={FIELD_CLASS}
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Saving…' : route ? 'Save changes' : 'Add route'}
        </button>
      </div>
    </form>
  )
}
