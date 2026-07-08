import { supabase } from '@/lib/supabase';
import type { Discipline } from '@/lib/grades';

// Gyms directory data + display helpers, ported from the website
// (app/gyms/page.tsx, GymCard.tsx, app/actions/favorites.ts). The per-gym
// aggregation the web page does in memory comes pre-computed from the S3
// `gym_directory` view instead.

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Bouldering',
  lead: 'Lead',
  top_rope: 'Top-rope',
};

// Stable display order so "Bouldering · Lead · Top-rope" never re-shuffles.
export const DISCIPLINE_SORT: Record<Discipline, number> = {
  boulder: 0,
  lead: 1,
  top_rope: 2,
};

// "Set 3 days ago" style label from a date-only column.
export function relativeSetLabel(date: string | null): string | null {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00`).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Stock fallbacks for gyms without an `image_url`, served from the deployed
// website (same files the web cards use) and cached on device by expo-image.
// Chosen deterministically by id so a gym always shows the same photo.
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const FALLBACK_IMAGES = [
  '/landing/gym-exterior.png',
  '/landing/climbing-wall-hero.png',
  '/landing/sending-climb.png',
  '/landing/filming-climb.png',
  '/landing/outside-gym.png',
];
export function fallbackImage(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `${API_BASE}${FALLBACK_IMAGES[h % FALLBACK_IMAGES.length]}`;
}

export type GymCardData = {
  id: string;
  name: string;
  city: string | null;
  image: string;
  routesCount: number;
  beta: number;
  disciplines: Discipline[];
  typesLabel: string;
  setLabel: string | null;
  setSort: number;
};

type GymDirectoryRow = {
  id: string;
  name: string;
  city: string | null;
  image_url: string | null;
  route_count: number;
  disciplines: Discipline[];
  latest_set_date: string | null;
  beta_count: number;
};

// The gym catalog with card-ready aggregates. Name/city search uses the same
// `.or(ilike)` shape as the web page; the view is already live-gyms-only.
export async function fetchGymDirectory(query: string): Promise<GymCardData[]> {
  let request = supabase
    .from('gym_directory')
    .select('id, name, city, image_url, route_count, disciplines, latest_set_date, beta_count')
    .order('name');
  const trimmed = query.trim();
  if (trimmed) {
    const safe = trimmed.replace(/[,()]/g, ' ');
    request = request.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`);
  }
  const { data, error } = await request;
  if (error) throw error;

  return ((data ?? []) as GymDirectoryRow[]).map((g) => {
    const disciplines = [...g.disciplines].sort(
      (x, y) => DISCIPLINE_SORT[x] - DISCIPLINE_SORT[y]
    );
    return {
      id: g.id,
      name: g.name,
      city: g.city,
      image: g.image_url ?? fallbackImage(g.id),
      routesCount: g.route_count,
      beta: g.beta_count,
      disciplines,
      typesLabel: disciplines.map((d) => DISCIPLINE_LABEL[d]).join(' · ') || '—',
      setLabel: relativeSetLabel(g.latest_set_date),
      setSort: g.latest_set_date ? new Date(`${g.latest_set_date}T00:00:00`).getTime() : 0,
    };
  });
}

export async function fetchFavoriteGymIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorite_gyms')
    .select('gym_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((f) => f.gym_id as string);
}

// Read current state, then flip — port of the web's toggleFavoriteAction.
// The composite PK backstops double-taps.
export async function toggleFavoriteGym(userId: string, gymId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('favorite_gyms')
    .select('gym_id')
    .eq('gym_id', gymId)
    .eq('user_id', userId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('favorite_gyms').delete().eq('gym_id', gymId).eq('user_id', userId)
    : await supabase.from('favorite_gyms').insert({ gym_id: gymId, user_id: userId });
  if (error) throw error;
}
