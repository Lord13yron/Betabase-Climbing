import { supabase } from '@/lib/supabase';

// Comments data, ported from the website (lib/comments.ts + the queries in
// app/routes/[routeId]/page.tsx and the actions in its actions.ts). Flat
// threads on a route or a video, newest first. Author-only delete in the app;
// manager/admin deletion stays web-only.

// A flat comment on a route or video, with its author's public profile.
export type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

// `target` carries exactly one id, same shape as the web actions.
export type CommentTarget = { routeId: string } | { videoId: string };

const COMMENT_SELECT = 'id, body, created_at, author_id, profiles(username, avatar_url)';

const COMMENT_MAX = 1000;

export async function fetchRouteComments(routeId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('route_id', routeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

// Per-clip comments grouped by video, mirroring the web page's commentsByVideo.
export async function fetchVideoComments(videoIds: string[]): Promise<Record<string, Comment[]>> {
  const byVideo: Record<string, Comment[]> = {};
  if (videoIds.length === 0) return byVideo;

  const { data, error } = await supabase
    .from('comments')
    .select(`${COMMENT_SELECT}, video_id`)
    .in('video_id', videoIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  for (const c of (data ?? []) as unknown as (Comment & { video_id: string })[]) {
    (byVideo[c.video_id] ??= []).push(c);
  }
  return byVideo;
}

// Same validation and messages as the web createCommentAction.
export async function createComment(
  userId: string,
  target: CommentTarget,
  body: string
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Comment is empty.');
  if (trimmed.length > COMMENT_MAX) throw new Error('Comment is too long.');

  const targetColumn =
    'routeId' in target ? { route_id: target.routeId } : { video_id: target.videoId };

  const { error } = await supabase
    .from('comments')
    .insert({ author_id: userId, ...targetColumn, body: trimmed });
  if (error) throw error;
}

// The app only offers delete on the user's own comments; RLS is the backstop.
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}
