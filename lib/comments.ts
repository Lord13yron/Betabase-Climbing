// A flat comment on a route or video, with its author's public profile.
export type Comment = {
  id: string
  body: string
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
}
