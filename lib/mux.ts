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
