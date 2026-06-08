// Shared types for the /admin superuser console. The page server-component folds
// the real Supabase rows into these shapes before handing them to the client.

export type GymStatus = 'live' | 'draft' | 'archived'

export type AdminGym = {
  id: string
  name: string
  city: string | null
  imageUrl: string | null
  status: GymStatus
  routeCount: number
  // Disciplines are derived (read-only) from the gym's routes, mapped to display
  // labels: 'Boulder' | 'Lead' | 'Top-rope'.
  chips: string[]
}

export type AdminUser = {
  id: string
  username: string | null
  avatarUrl: string | null
}

export type Adminship = { gymId: string; userId: string }

export type AdminMessage = {
  id: string
  name: string
  email: string
  topic: string
  message: string
  createdAt: string
  read: boolean
  archived: boolean
}
