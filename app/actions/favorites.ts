'use server'

import { createClient } from '@/lib/supabase/server'

export type FormState = { error?: string; ok?: boolean }

type FavoriteKind = 'gym' | 'route'

// Per-kind table + column so one action covers both gyms and routes. Mirrors
// toggleSendAction: read current state, then flip. The composite PK backstops
// double-clicks.
const TARGET: Record<FavoriteKind, { table: string; column: string }> = {
  gym: { table: 'favorite_gyms', column: 'gym_id' },
  route: { table: 'favorite_routes', column: 'route_id' },
}

export async function toggleFavoriteAction(
  kind: FavoriteKind,
  id: string
): Promise<FormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { table, column } = TARGET[kind]

  const { data: existing } = await supabase
    .from(table)
    .select(column)
    .eq(column, id)
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = existing
    ? await supabase.from(table).delete().eq(column, id).eq('user_id', user.id)
    : await supabase.from(table).insert({ [column]: id, user_id: user.id })
  if (error) return { error: error.message }

  return { ok: true }
}
