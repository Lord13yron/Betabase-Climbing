import { supabase } from '@/lib/supabase';
import {
  FEED_LIMIT,
  mergeFeed,
  type CommentFeedRow,
  type FeedEvent,
  type NewRouteRow,
  type SendFeedRow,
  type VideoCommentFeedRow,
  type VideoFeedRow,
} from '@/lib/feed';

// Community feed queries, ported from the web's app/community/page.tsx server
// component. Same select shapes, same personalized/global branches; the app is
// always signed in, so the web's logged-out branch does not exist here.

// `routes!inner` so `.in('routes.gym_id', …)` filters parent rows (and rows
// with a missing route are dropped either way). RLS hides draft/archived gyms.
const VIDEO_SELECT =
  'id, created_at, caption, mux_playback_id, profiles(username, avatar_url), routes!inner(id, name, color, grade_label, gym_id, gyms(name))';
const SEND_SELECT =
  'id, sent_at, profiles(username, avatar_url), routes!inner(id, name, color, grade_label, gym_id, gyms(name))';
const COMMENT_SELECT =
  'id, created_at, body, profiles(username, avatar_url), routes!inner(id, name, color, grade_label, gym_id, gyms(name))';
const NEW_ROUTE_SELECT =
  'id, name, color, grade_label, created_at, gym_id, gyms!inner(name, image_url)';
const VIDEO_COMMENT_SELECT =
  'id, created_at, body, profiles(username, avatar_url), videos!inner(mux_playback_id, uploader_id, route_id, routes!inner(id, name, color, grade_label, gym_id, gyms(name)))';

const NONE = Promise.resolve({ data: null, error: null });

export type FeedResult = {
  events: FeedEvent[];
  personalized: boolean;
};

export async function fetchFeed(userId: string): Promise<FeedResult> {
  const [g, r] = await Promise.all([
    supabase.from('favorite_gyms').select('gym_id').eq('user_id', userId),
    supabase.from('favorite_routes').select('route_id').eq('user_id', userId),
  ]);
  if (g.error) throw g.error;
  if (r.error) throw r.error;
  const favGymIds = (g.data ?? []).map((x) => x.gym_id as string);
  const favRouteIds = (r.data ?? []).map((x) => x.route_id as string);
  const personalized = favGymIds.length > 0 || favRouteIds.length > 0;

  const videoQ = () =>
    supabase.from('videos').select(VIDEO_SELECT).eq('status', 'ready')
      .order('created_at', { ascending: false }).limit(FEED_LIMIT);
  const sendQ = () =>
    supabase.from('sends').select(SEND_SELECT)
      .order('sent_at', { ascending: false }).limit(FEED_LIMIT);
  const videoCommentQ = () =>
    supabase.from('comments').select(VIDEO_COMMENT_SELECT)
      .order('created_at', { ascending: false }).limit(FEED_LIMIT);

  // Comments others leave on the viewer's videos: shown whichever feed branch
  // the user gets. Own replies excluded.
  const myVideoCommentsQ = videoCommentQ()
    .eq('videos.uploader_id', userId).neq('author_id', userId)
    .returns<VideoCommentFeedRow[]>();

  let videoRows: VideoFeedRow[] = [];
  let sendRows: SendFeedRow[] = [];
  let commentRows: CommentFeedRow[] = [];
  let newRouteRows: NewRouteRow[] = [];
  let videoCommentRows: VideoCommentFeedRow[] = [];

  if (personalized) {
    // Up to eight bounded queries: videos + sends + new routes at favorite
    // gyms, videos + sends + comments + video comments on favorite routes,
    // plus comments on the viewer's videos. Overlap is deduped in mergeFeed.
    const [gymVideos, gymSends, gymRoutes, routeVideos, routeSends, routeComments, routeVideoComments, myVideoComments] = await Promise.all([
      favGymIds.length > 0 ? videoQ().in('routes.gym_id', favGymIds).returns<VideoFeedRow[]>() : NONE,
      favGymIds.length > 0 ? sendQ().in('routes.gym_id', favGymIds).returns<SendFeedRow[]>() : NONE,
      favGymIds.length > 0
        ? supabase.from('routes').select(NEW_ROUTE_SELECT).in('gym_id', favGymIds)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT).returns<NewRouteRow[]>()
        : NONE,
      favRouteIds.length > 0 ? videoQ().in('route_id', favRouteIds).returns<VideoFeedRow[]>() : NONE,
      favRouteIds.length > 0 ? sendQ().in('route_id', favRouteIds).returns<SendFeedRow[]>() : NONE,
      favRouteIds.length > 0
        ? supabase.from('comments').select(COMMENT_SELECT).in('route_id', favRouteIds)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT).returns<CommentFeedRow[]>()
        : NONE,
      favRouteIds.length > 0
        ? videoCommentQ().in('videos.route_id', favRouteIds).returns<VideoCommentFeedRow[]>()
        : NONE,
      myVideoCommentsQ,
    ]);
    videoRows = [...(gymVideos.data ?? []), ...(routeVideos.data ?? [])];
    sendRows = [...(gymSends.data ?? []), ...(routeSends.data ?? [])];
    commentRows = routeComments.data ?? [];
    newRouteRows = gymRoutes.data ?? [];
    videoCommentRows = [...(myVideoComments.data ?? []), ...(routeVideoComments.data ?? [])];
  } else {
    // No favorites yet: global recent activity across live gyms.
    const [videos, sends, myVideoComments] = await Promise.all([
      videoQ().returns<VideoFeedRow[]>(),
      sendQ().returns<SendFeedRow[]>(),
      myVideoCommentsQ,
    ]);
    videoRows = videos.data ?? [];
    sendRows = sends.data ?? [];
    videoCommentRows = myVideoComments.data ?? [];
  }

  return {
    events: mergeFeed(videoRows, sendRows, commentRows, newRouteRows, videoCommentRows, userId),
    personalized,
  };
}

export type ProfileResult = { username: string; avatar_url: string | null };

// Debounced username lookup, same shape as the web's UserSearch.tsx. Strips
// ilike wildcards / PostgREST separators from user input.
export async function searchProfiles(query: string): Promise<ProfileResult[]> {
  const q = query.replace(/[%_,]/g, ' ').trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .ilike('username', `%${q}%`)
    .order('username')
    .limit(8);
  if (error) throw error;
  return (data as ProfileResult[]) ?? [];
}
