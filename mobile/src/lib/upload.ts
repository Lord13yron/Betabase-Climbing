import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

// Beta upload pipeline (S8): mint a Mux direct-upload URL from the deployed
// website (the app's only backend call), PUT the file straight to Mux, then
// poll the pending videos row until the webhook flips it to ready/errored.

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// Same cap the web uploader advertises; direct uploads have no server-side
// size limit, so the client enforces it before spending bandwidth.
export const MAX_UPLOAD_BYTES = 500 * 1_000_000;

const ALLOWED_MIME = new Set(['video/mp4', 'video/quicktime']);

export function isSupportedVideo(mimeType: string | undefined, uri: string): boolean {
  if (mimeType) return ALLOWED_MIME.has(mimeType.toLowerCase());
  return /\.(mp4|mov)$/i.test(uri);
}

// POST /api/mux/upload with the session's access token (mobile has no
// cookies). Mirrors the web ClipUploader's endpoint contract; the API creates
// the pending videos row and returns the direct-upload URL.
export async function createUploadUrl(
  routeId: string,
  caption: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/mux/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ routeId, caption }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start upload.');
  return data.url;
}

// Single binary PUT per the Mux direct-upload contract, with byte-level
// progress from the expo-file-system upload task.
export async function uploadToMux(
  fileUri: string,
  uploadUrl: string,
  mimeType: string | undefined,
  onProgress: (fraction: number) => void
): Promise<void> {
  const file = new File(fileUri);
  const result = await file.upload(uploadUrl, {
    httpMethod: 'PUT',
    mimeType,
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress(bytesSent / totalBytes);
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error('Upload failed. Try again.');
  }
}

// The mint endpoint returns only the upload URL, so after the PUT we look up
// the row it created: this user's newest video on the route.
export async function fetchMyLatestVideoId(
  userId: string,
  routeId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('videos')
    .select('id')
    .eq('uploader_id', userId)
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export type VideoStatus = 'pending' | 'ready' | 'errored';

// Polled every ~4s while pending, mirroring the web route page's refresh loop.
export async function fetchVideoStatus(videoId: string): Promise<VideoStatus> {
  const { data, error } = await supabase
    .from('videos')
    .select('status')
    .eq('id', videoId)
    .single();
  if (error) throw error;
  return data.status as VideoStatus;
}
