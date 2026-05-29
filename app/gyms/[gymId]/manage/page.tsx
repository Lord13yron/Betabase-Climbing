import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageGym } from '@/lib/auth/can-manage-gym'
import { ManageClient } from './ManageClient'

export default async function ManageGymPage({
  params,
}: {
  params: Promise<{ gymId: string }>
}) {
  const { gymId } = await params

  if (!(await canManageGym(gymId))) redirect(`/gyms/${gymId}`)

  const supabase = await createClient()
  const [gymResult, wallsResult, routesResult] = await Promise.all([
    supabase.from('gyms').select('id, name').eq('id', gymId).single(),
    supabase
      .from('walls')
      .select('id, name, sort_order')
      .eq('gym_id', gymId)
      .order('sort_order'),
    supabase
      .from('routes')
      .select('id, name, discipline, color, grade_label, grade_order, wall_id, set_date')
      .eq('gym_id', gymId),
  ])

  const gym = gymResult.data
  if (gymResult.error || !gym) notFound()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href={`/gyms/${gymId}`} className="text-sm underline">
        ← Back to {gym.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Manage {gym.name}</h1>

      <div className="mt-6">
        <ManageClient
          gymId={gymId}
          walls={wallsResult.data ?? []}
          routes={routesResult.data ?? []}
        />
      </div>
    </main>
  )
}
