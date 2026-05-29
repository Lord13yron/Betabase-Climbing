import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GymSearch } from './GymSearch'

export default async function GymsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createClient()
  let request = supabase.from('gyms').select('id, name, city').order('name')

  if (query) {
    // Strip PostgREST filter delimiters so user input can't break the .or() expression.
    const safe = query.replace(/[,()]/g, ' ')
    request = request.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
  }

  const { data: gyms } = await request

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Gyms</h1>
      <div className="mt-4">
        <GymSearch defaultQuery={query} />
      </div>

      {gyms && gyms.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {gyms.map((gym) => (
            <li key={gym.id}>
              <Link
                href={`/gyms/${gym.id}`}
                className="block rounded border border-foreground/20 px-4 py-3 hover:bg-foreground/5"
              >
                <span className="font-medium">{gym.name}</span>
                {gym.city && (
                  <span className="block text-sm text-foreground/70">
                    {gym.city}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-foreground/70">No gyms found.</p>
      )}
    </main>
  )
}
