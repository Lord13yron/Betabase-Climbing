import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type ProfileSendRow = {
  sent_at: string
  routes: {
    id: string
    name: string
    grade_label: string
    color: string | null
    gym_id: string
    gyms: { name: string } | null
  } | null
}

type GymGroup = {
  gymId: string
  gymName: string
  routes: { id: string; name: string; grade_label: string; color: string | null }[]
}

// Renders a user's sends grouped by gym. Shared by the public profile
// (/u/[username]) and the owner's edit page (/profile).
export async function UserSends({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: sends } = await supabase
    .from('sends')
    .select('sent_at, routes(id, name, grade_label, color, gym_id, gyms(name))')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .returns<ProfileSendRow[]>()

  // Rows arrive most-recent-first, so inserting into an ordered Map gives groups
  // ordered by most-recent send and routes most-recent-first within each group.
  const groups: GymGroup[] = []
  const byGym = new Map<string, GymGroup>()
  for (const s of sends ?? []) {
    const r = s.routes
    if (!r) continue
    let group = byGym.get(r.gym_id)
    if (!group) {
      group = { gymId: r.gym_id, gymName: r.gyms?.name ?? 'Unknown gym', routes: [] }
      byGym.set(r.gym_id, group)
      groups.push(group)
    }
    group.routes.push({ id: r.id, name: r.name, grade_label: r.grade_label, color: r.color })
  }
  const sendCount = sends?.length ?? 0

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Sends ({sendCount})</h2>
      {sendCount === 0 ? (
        <p className="mt-2 text-sm text-foreground/70">No sends yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.gymId}>
              <h3 className="text-sm font-medium text-foreground/70">{g.gymName}</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {g.routes.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/routes/${r.id}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      {r.color && (
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-foreground/20"
                          style={{ backgroundColor: r.color }}
                        />
                      )}
                      <span>{r.name}</span>
                      <span className="text-foreground/70">{r.grade_label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
