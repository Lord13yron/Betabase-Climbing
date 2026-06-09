import Mux from '@mux/mux-node'

// Lazily constructed so importing this module (e.g. during `next build`) doesn't
// throw when MUX_* env vars aren't set yet — credentials are only needed at
// request time. Reads MUX_TOKEN_ID / MUX_TOKEN_SECRET / MUX_WEBHOOK_SECRET.
let client: Mux | null = null

export function getMux(): Mux {
  if (!client) {
    client = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
      webhookSecret: process.env.MUX_WEBHOOK_SECRET,
    })
  }
  return client
}

// Delete the hosted Mux assets backing a set of videos. Best-effort: an asset
// may already be gone on Mux's side, and deleting the DB rows is what matters.
// Video rows cascade-delete at the DB level, but Mux assets don't — so call
// this before deleting anything that cascades to videos (route, wall, or gym).
// Server-only: do not re-export from a 'use server' file, where it would
// become an unauthenticated endpoint that deletes arbitrary assets.
export async function deleteMuxAssets(assetIds: (string | null)[]) {
  await Promise.allSettled(
    assetIds
      .filter((id): id is string => !!id)
      .map((id) => getMux().video.assets.delete(id))
  )
}
