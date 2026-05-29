import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Discipline } from '@/lib/grades'

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Boulder',
  top_rope: 'Top rope',
  lead: 'Lead',
}

type RouteDetail = {
  id: string
  name: string
  discipline: Discipline
  color: string | null
  grade_label: string
  set_date: string | null
  gym_id: string
  wall_id: string | null
  gyms: { id: string; name: string } | null
  walls: { name: string } | null
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ routeId: string }>
}) {
  const { routeId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('routes')
    .select(
      'id, name, discipline, color, grade_label, set_date, gym_id, wall_id, gyms(id, name), walls(name)'
    )
    .eq('id', routeId)
    .single<RouteDetail>()

  if (error || !data) notFound()
  const route = data

  const wallName = route.walls?.name ?? 'Unassigned'
  const setDate = route.set_date
    ? new Date(route.set_date).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      {route.gyms && (
        <Link
          href={`/gyms/${route.gym_id}`}
          className="text-sm text-foreground/70 hover:underline"
        >
          ← {route.gyms.name}
        </Link>
      )}

      <h1 className="mt-2 text-2xl font-semibold">{route.name}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/70">
        <span className="font-medium text-foreground">{route.grade_label}</span>
        <span>{DISCIPLINE_LABEL[route.discipline]}</span>
        {route.color && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border border-foreground/20"
              style={{ backgroundColor: route.color }}
            />
            {route.color}
          </span>
        )}
        <span>{wallName}</span>
        {setDate && <span>Set {setDate}</span>}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Beta videos</h2>
        <p className="mt-2 text-sm text-foreground/70">No beta videos yet.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Comments</h2>
        <p className="mt-2 text-sm text-foreground/70">No comments yet.</p>
      </section>
    </main>
  )
}
