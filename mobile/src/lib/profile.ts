import AsyncStorage from '@react-native-async-storage/async-storage';

import { V_GRADES, YDS_GRADES } from '@/lib/grades';
import type { HeightUnit } from '@/lib/height';
import { supabase } from '@/lib/supabase';

// Profile data layer (S10), ported from the website's app/profile/page.tsx,
// app/profile/actions.ts, and app/u/[username]/page.tsx. All reads/writes go
// straight to Supabase under RLS; only video deletion goes through the
// website (the Mux asset lives server-side).

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  height_cm: number | null;
  max_boulder_grade: string | null;
  max_route_grade: string | null;
  created_at: string;
};

export type ProfileVideo = {
  id: string;
  status: 'pending' | 'ready' | 'errored';
  mux_playback_id: string | null;
  caption: string | null;
  view_count: number;
  created_at: string;
  routes: { id: string; name: string; grade_label: string; color: string | null } | null;
};

export type SendRow = {
  sent_at: string;
  routes: {
    id: string;
    name: string;
    grade_label: string;
    color: string | null;
    gym_id: string;
    gyms: { name: string } | null;
  } | null;
};

export type SendStats = { total: number; distinctGyms: number; topGym: string | null };

export async function fetchOwnProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, height_cm, max_boulder_grade, max_route_grade, created_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

// Exact-match, case-insensitive lookup (ilike without wildcards), same as the
// S9 stub — user search hands us the stored casing anyway.
export async function fetchPublicProfile(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, height_cm, max_boulder_grade, max_route_grade, created_at')
    .ilike('username', username)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

// Uploaded beta + per-video comment counts, tallied client-side like the web
// profile page. Own profile shows all statuses; public shows ready only.
export async function fetchProfileVideos(
  userId: string,
  readyOnly: boolean
): Promise<{ videos: ProfileVideo[]; commentCounts: Record<string, number> }> {
  let query = supabase
    .from('videos')
    .select('id, status, mux_playback_id, caption, view_count, created_at, routes(id, name, grade_label, color)')
    .eq('uploader_id', userId)
    .order('created_at', { ascending: false });
  if (readyOnly) query = query.eq('status', 'ready');
  const { data, error } = await query;
  if (error) throw error;
  const videos = (data ?? []) as unknown as ProfileVideo[];

  const commentCounts: Record<string, number> = {};
  if (videos.length > 0) {
    const { data: vc, error: vcError } = await supabase
      .from('comments')
      .select('video_id')
      .in('video_id', videos.map((v) => v.id));
    if (vcError) throw vcError;
    for (const c of (vc ?? []) as { video_id: string }[]) {
      commentCounts[c.video_id] = (commentCounts[c.video_id] ?? 0) + 1;
    }
  }
  return { videos, commentCounts };
}

// Send log, newest first (routes embed missing means the route was deleted).
export async function fetchSends(userId: string): Promise<SendRow[]> {
  const { data, error } = await supabase
    .from('sends')
    .select('sent_at, routes(id, name, grade_label, color, gym_id, gyms(name))')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as SendRow[]).filter((s) => s.routes !== null);
}

// Same tally as app/profile/page.tsx: total, distinct gyms, most-logged gym.
export function sendStats(sends: SendRow[]): SendStats {
  const tally = new Map<string, number>();
  for (const s of sends) {
    const g = s.routes!.gyms?.name;
    if (g) tally.set(g, (tally.get(g) ?? 0) + 1);
  }
  const topGym = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { total: sends.length, distinctGyms: tally.size, topGym };
}

export async function fetchFavoriteCount(userId: string): Promise<number> {
  const [gyms, routes] = await Promise.all([
    supabase.from('favorite_gyms').select('gym_id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('favorite_routes').select('route_id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (gyms.error) throw gyms.error;
  if (routes.error) throw routes.error;
  return (gyms.count ?? 0) + (routes.count ?? 0);
}

// Validation mirrors updateProfileAction (username stays display-only on
// mobile, so it is not part of the update).
export async function updateProfile(
  userId: string,
  input: { height_cm: number | null; max_boulder_grade: string | null; max_route_grade: string | null }
): Promise<void> {
  const { height_cm, max_boulder_grade, max_route_grade } = input;
  if (height_cm != null && (!Number.isFinite(height_cm) || height_cm <= 0 || height_cm > 300)) {
    throw new Error('Enter a valid height.');
  }
  if (max_boulder_grade && !V_GRADES.includes(max_boulder_grade)) {
    throw new Error('Invalid boulder grade.');
  }
  if (max_route_grade && !YDS_GRADES.includes(max_route_grade)) {
    throw new Error('Invalid route grade.');
  }
  const { error } = await supabase
    .from('profiles')
    .update({
      height_cm: height_cm != null ? Math.round(height_cm) : null,
      max_boulder_grade,
      max_route_grade,
    })
    .eq('id', userId);
  if (error) throw error;
}

// Same Storage flow as the web ProfileEdit: upload to avatars/{userId}/avatar.{ext}
// with upsert, then persist the public URL (cache-busted) on the profile row.
export async function uploadAvatar(
  userId: string,
  uri: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const body = await fetch(uri).then((r) => r.arrayBuffer());

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, body, { upsert: true, contentType: mimeType });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (updateError) throw updateError;
  return url;
}

// DELETE via the website so the Mux asset goes with the row (see the
// S10 endpoint app/api/videos/[videoId]/route.ts).
export async function deleteVideo(videoId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Failed to delete video.');
  }
}

// Viewer's preferred height unit, same semantics as the web's localStorage
// key — shared by the edit form and both profile screens.
const UNIT_KEY = 'betabase:heightUnit';

export async function getHeightUnit(): Promise<HeightUnit> {
  const saved = await AsyncStorage.getItem(UNIT_KEY);
  return saved === 'ftin' ? 'ftin' : 'cm';
}

export async function setHeightUnit(unit: HeightUnit): Promise<void> {
  await AsyncStorage.setItem(UNIT_KEY, unit);
}
