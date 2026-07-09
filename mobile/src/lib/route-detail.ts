import { supabase } from '@/lib/supabase';
import type { Discipline } from '@/lib/grades';

// Route detail data, ported from the website (app/routes/[routeId]/page.tsx).
// S6 scope: playback, sends, favorites. Ready clips only; own-pending clips
// and polling arrive with the upload flow in S8.

export type RouteDetail = {
  id: string;
  name: string;
  discipline: Discipline;
  color: string | null;
  grade_label: string;
  set_date: string | null;
  gym_id: string;
  wall_id: string | null;
  gyms: { id: string; name: string } | null;
  walls: { name: string } | null;
};

export type BetaVideo = {
  id: string;
  mux_playback_id: string | null;
  caption: string | null;
  uploader_id: string;
  created_at: string;
  view_count: number;
  profiles: { username: string; avatar_url: string | null; height_cm: number | null } | null;
};

export type Sender = {
  user_id: string;
  sent_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export async function fetchRouteDetail(routeId: string): Promise<RouteDetail> {
  const { data, error } = await supabase
    .from('routes')
    .select(
      'id, name, discipline, color, grade_label, set_date, gym_id, wall_id, gyms(id, name), walls(name)'
    )
    .eq('id', routeId)
    .single();
  if (error) throw error;
  return data as unknown as RouteDetail;
}

// Ready clips, newest first. Uploader profiles are fetched separately and
// merged in, like the web page — avoids a fragile embed FK hint on
// videos.uploader_id.
export async function fetchRouteVideos(routeId: string): Promise<BetaVideo[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, mux_playback_id, caption, uploader_id, created_at, view_count')
    .eq('route_id', routeId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const videos = (data ?? []) as Omit<BetaVideo, 'profiles'>[];

  const uploaderIds = [...new Set(videos.map((v) => v.uploader_id))];
  const profileById = new Map<string, BetaVideo['profiles']>();
  if (uploaderIds.length > 0) {
    const { data: profs, error: profError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, height_cm')
      .in('id', uploaderIds);
    if (profError) throw profError;
    for (const p of profs ?? []) profileById.set(p.id, p);
  }

  return videos.map((v) => ({ ...v, profiles: profileById.get(v.uploader_id) ?? null }));
}

export async function fetchSenders(
  routeId: string
): Promise<{ senders: Sender[]; totalSends: number }> {
  const [{ count, error: countError }, { data, error }] = await Promise.all([
    supabase.from('sends').select('id', { count: 'exact', head: true }).eq('route_id', routeId),
    supabase
      .from('sends')
      .select('user_id, sent_at, profiles(username, avatar_url)')
      .eq('route_id', routeId)
      .order('sent_at', { ascending: false }),
  ]);
  if (countError) throw countError;
  if (error) throw error;
  return { senders: (data ?? []) as unknown as Sender[], totalSends: count ?? 0 };
}

export async function fetchMyRouteState(
  userId: string,
  routeId: string
): Promise<{ sent: boolean; favorited: boolean }> {
  const [{ data: mySend, error: sendError }, { data: myFav, error: favError }] =
    await Promise.all([
      supabase
        .from('sends')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('favorite_routes')
        .select('route_id')
        .eq('route_id', routeId)
        .eq('user_id', userId)
        .maybeSingle(),
    ]);
  if (sendError) throw sendError;
  if (favError) throw favError;
  return { sent: !!mySend, favorited: !!myFav };
}

// Read current state, then flip — same shape as the web's toggleSendAction;
// the unique(route_id, user_id) constraint backstops double-taps.
export async function toggleSend(userId: string, routeId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('sends')
    .select('id')
    .eq('route_id', routeId)
    .eq('user_id', userId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('sends').delete().eq('route_id', routeId).eq('user_id', userId)
    : await supabase.from('sends').insert({ route_id: routeId, user_id: userId });
  if (error) throw error;
}

// Views are public; the RPC lets viewers bump the counter without UPDATE
// rights on videos. Callers dedupe to one call per clip per screen visit.
export async function incrementVideoView(videoId: string): Promise<void> {
  await supabase.rpc('increment_video_view', { vid: videoId });
}
