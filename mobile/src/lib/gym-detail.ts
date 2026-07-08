import { supabase } from '@/lib/supabase';
import type { Discipline } from '@/lib/grades';

// Gym detail + route browser data, ported from the website
// (app/gyms/[gymId]/page.tsx, RouteBrowser.tsx). Per-route counts come
// pre-computed from the S3 `gym_routes` view instead of the web's in-memory
// aggregation.

export type Gym = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image_url: string | null;
};

export type Wall = {
  id: string;
  name: string;
  sort_order: number;
};

export type GymRoute = {
  id: string;
  gym_id: string;
  name: string;
  discipline: Discipline;
  color: string | null;
  grade_label: string;
  grade_order: number;
  wall_id: string | null;
  set_date: string | null;
  beta_count: number;
  send_count: number;
};

// Compact "Set" label matching the web's route rows ("today", "3d ago",
// "2w ago", then "Mar 4"). The longer form in lib/gyms.ts stays on gym cards.
export function shortSetLabel(date: string | null): string | null {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00`).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days === 0) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 28) return `${Math.floor(days / 7)}w ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Same columns as the web gym page's gyms query; RLS (is_gym_visible) decides
// whether the row exists for this user, exactly like the web.
export async function fetchGym(gymId: string): Promise<Gym> {
  const { data, error } = await supabase
    .from('gyms')
    .select('id, name, city, address, image_url')
    .eq('id', gymId)
    .single();
  if (error) throw error;
  return data as Gym;
}

export async function fetchWalls(gymId: string): Promise<Wall[]> {
  const { data, error } = await supabase
    .from('walls')
    .select('id, name, sort_order')
    .eq('gym_id', gymId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as Wall[];
}

export async function fetchGymRoutes(gymId: string): Promise<GymRoute[]> {
  const { data, error } = await supabase
    .from('gym_routes')
    .select(
      'id, gym_id, name, discipline, color, grade_label, grade_order, wall_id, set_date, beta_count, send_count'
    )
    .eq('gym_id', gymId);
  if (error) throw error;
  return (data ?? []) as GymRoute[];
}

// Favorites are private; scope the lookup to this gym's routes like the web.
export async function fetchFavoriteRouteIds(
  userId: string,
  routeIds: string[]
): Promise<string[]> {
  if (routeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('favorite_routes')
    .select('route_id')
    .eq('user_id', userId)
    .in('route_id', routeIds);
  if (error) throw error;
  return (data ?? []).map((f) => f.route_id as string);
}

// Read current state, then flip — same shape as toggleFavoriteGym in gyms.ts.
export async function toggleFavoriteRoute(userId: string, routeId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('favorite_routes')
    .select('route_id')
    .eq('route_id', routeId)
    .eq('user_id', userId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from('favorite_routes')
        .delete()
        .eq('route_id', routeId)
        .eq('user_id', userId)
    : await supabase.from('favorite_routes').insert({ route_id: routeId, user_id: userId });
  if (error) throw error;
}
