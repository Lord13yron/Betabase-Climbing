// Grade systems for routes. Source of truth for valid grade labels and their
// sortable order. `routes.grade_order` stores the index of a label within its
// system; routes are always filtered by discipline before sorting, so the
// V-scale and YDS reusing the same low integer range is fine.

export type Discipline = 'boulder' | 'top_rope' | 'lead'
export type GradeSystem = 'V' | 'YDS'

export function systemForDiscipline(d: Discipline): GradeSystem {
  return d === 'boulder' ? 'V' : 'YDS'
}

// V0–V17.
export const V_GRADES: string[] = Array.from(
  { length: 18 },
  (_, i) => `V${i}`
)

// 5.0–5.9, then for each of 5.10–5.15 the seven labels ordered by difficulty:
// 5.N-  <  5.Na  <  5.Nb  <  5.N  <  5.Nc  <  5.N+  <  5.Nd.
export const YDS_GRADES: string[] = [
  ...Array.from({ length: 10 }, (_, i) => `5.${i}`),
  ...Array.from({ length: 6 }, (_, i) => {
    const n = 10 + i
    return [`5.${n}-`, `5.${n}a`, `5.${n}b`, `5.${n}`, `5.${n}c`, `5.${n}+`, `5.${n}d`]
  }).flat(),
]

export function gradesForDiscipline(d: Discipline): string[] {
  return systemForDiscipline(d) === 'V' ? V_GRADES : YDS_GRADES
}

// Index of `label` within its system, i.e. the value to store in
// routes.grade_order. Returns null for any label not valid for the discipline.
export function gradeOrder(d: Discipline, label: string): number | null {
  const order = gradesForDiscipline(d).indexOf(label)
  return order === -1 ? null : order
}
