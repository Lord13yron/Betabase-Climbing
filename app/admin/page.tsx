import './admin.css'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperuser } from '@/lib/auth/is-superuser'
import { AdminConsole } from './AdminConsole'
import type { AdminGym, AdminMessage, AdminUser, Adminship, GymStatus } from './types'

// Superuser console. Gated server-side: anonymous → /login, non-superuser → /.
// One route, three views (gyms / admins / messages) switched client-side; the
// active view + a focused gym come in as ?view= / ?gym= query params so the
// Gyms → Admins "manage admins" jump is shareable.

const DISCIPLINE_LABEL: Record<string, string> = {
  boulder: 'Boulder',
  lead: 'Lead',
  top_rope: 'Top-rope',
}
// Stable display order so chips never reshuffle.
const DISCIPLINE_ORDER = ['Boulder', 'Lead', 'Top-rope']

const VIEWS = new Set(['gyms', 'admins', 'messages'])

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; gym?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isSuperuser())) redirect('/')

  const { view, gym } = await searchParams
  const initialView = (view && VIEWS.has(view) ? view : 'gyms') as
    | 'gyms'
    | 'admins'
    | 'messages'

  const [gymsRes, routesRes, managersRes, profilesRes, messagesRes] = await Promise.all([
    supabase.from('gyms').select('id, name, city, image_url, status').order('name'),
    supabase.from('routes').select('gym_id, discipline'),
    supabase.from('gym_managers').select('gym_id, user_id'),
    supabase.from('profiles').select('id, username, avatar_url').order('username'),
    supabase
      .from('contact_messages')
      .select('id, name, email, topic, message, created_at, read, archived')
      .order('created_at', { ascending: false }),
  ])

  // Per-gym aggregates: route count + the distinct disciplines, mapped to chips.
  const routeRows = (routesRes.data ?? []) as { gym_id: string; discipline: string }[]
  const routeCount = new Map<string, number>()
  const disciplineSet = new Map<string, Set<string>>()
  for (const r of routeRows) {
    routeCount.set(r.gym_id, (routeCount.get(r.gym_id) ?? 0) + 1)
    const label = DISCIPLINE_LABEL[r.discipline]
    if (label) {
      if (!disciplineSet.has(r.gym_id)) disciplineSet.set(r.gym_id, new Set())
      disciplineSet.get(r.gym_id)!.add(label)
    }
  }

  const gyms: AdminGym[] = ((gymsRes.data ?? []) as {
    id: string
    name: string
    city: string | null
    image_url: string | null
    status: GymStatus
  }[]).map((g) => ({
    id: g.id,
    name: g.name,
    city: g.city,
    imageUrl: g.image_url,
    status: g.status,
    routeCount: routeCount.get(g.id) ?? 0,
    chips: DISCIPLINE_ORDER.filter((d) => disciplineSet.get(g.id)?.has(d)),
  }))

  const users: AdminUser[] = ((profilesRes.data ?? []) as {
    id: string
    username: string | null
    avatar_url: string | null
  }[]).map((p) => ({ id: p.id, username: p.username, avatarUrl: p.avatar_url }))

  const adminships: Adminship[] = ((managersRes.data ?? []) as {
    gym_id: string
    user_id: string
  }[]).map((a) => ({ gymId: a.gym_id, userId: a.user_id }))

  const messages: AdminMessage[] = ((messagesRes.data ?? []) as {
    id: string
    name: string
    email: string
    topic: string
    message: string
    created_at: string
    read: boolean
    archived: boolean
  }[]).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    topic: m.topic,
    message: m.message,
    createdAt: m.created_at,
    read: m.read,
    archived: m.archived,
  }))

  const operator = users.find((u) => u.id === user.id)?.username ?? user.email ?? 'operator'

  return (
    <AdminConsole
      initialView={initialView}
      focusGymId={gym ?? null}
      operator={operator}
      today={new Date().toISOString().slice(0, 10)}
      gyms={gyms}
      users={users}
      adminships={adminships}
      messages={messages}
    />
  )
}
