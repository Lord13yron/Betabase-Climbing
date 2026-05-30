'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gradesForDiscipline } from '@/lib/grades'
import { cmToFtIn, ftInToCm, type HeightUnit } from '@/lib/height'
import { Avatar } from '@/components/Avatar'
import { updateProfileAction, updateAvatarAction } from './actions'

const FIELD_CLASS =
  'rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm'
const UNIT_KEY = 'betabase:heightUnit'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const BOULDER_GRADES = gradesForDiscipline('boulder')
const ROUTE_GRADES = gradesForDiscipline('lead')

type Profile = {
  username: string | null
  avatar_url: string | null
  height_cm: number | null
  max_boulder_grade: string | null
  max_route_grade: string | null
}

export function EditProfileForm({
  userId,
  profile,
}: {
  userId: string
  profile: Profile
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Avatar: upload straight to Storage, then persist the URL via a server action.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [avatarPending, setAvatarPending] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError('Use a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be under 5 MB.')
      return
    }

    setAvatarPending(true)
    const supabase = createClient()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) {
      setAvatarError(error.message)
      setAvatarPending(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${data.publicUrl}?t=${Date.now()}`
    await updateAvatarAction(url)
    setAvatarUrl(url)
    setAvatarPending(false)
    router.refresh()
  }

  // Controlled so React 19's post-action form reset doesn't revert them to a
  // stale defaultValue. (Height/avatar are already state-driven.)
  const [username, setUsername] = useState(profile.username ?? '')
  const [maxBoulder, setMaxBoulder] = useState(profile.max_boulder_grade ?? '')
  const [maxRoute, setMaxRoute] = useState(profile.max_route_grade ?? '')

  // Height: cm is canonical; ft/in are a view that writes back into cm.
  const [unit, setUnit] = useState<HeightUnit>('cm')
  const [cm, setCm] = useState<string>(
    profile.height_cm != null ? String(Math.round(profile.height_cm)) : ''
  )
  const [ft, setFt] = useState('')
  const [inch, setInch] = useState('')

  // Load the saved unit preference once on mount.
  useEffect(() => {
    const saved = localStorage.getItem(UNIT_KEY)
    if (saved === 'ftin' || saved === 'cm') setUnit(saved)
  }, [])

  // Keep ft/in seeded from cm whenever cm changes outside ft/in editing.
  useEffect(() => {
    if (cm) {
      const { ft: f, in: i } = cmToFtIn(Number(cm))
      setFt(String(f))
      setInch(String(i))
    } else {
      setFt('')
      setInch('')
    }
  }, [cm])

  function changeUnit(next: HeightUnit) {
    setUnit(next)
    localStorage.setItem(UNIT_KEY, next)
  }

  function onFtInChange(nextFt: string, nextIn: string) {
    setFt(nextFt)
    setInch(nextIn)
    if (nextFt === '' && nextIn === '') {
      setCm('')
      return
    }
    setCm(String(ftInToCm(Number(nextFt || 0), Number(nextIn || 0))))
  }

  // Submit from controlled state via a transition rather than <form action>, so
  // React 19 doesn't auto-reset the (uncontrolled-from-its-view) <select>s after
  // the action. router.refresh() re-renders the Header on success.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('username', username)
    formData.set('height_cm', cm)
    formData.set('max_boulder_grade', maxBoulder)
    formData.set('max_route_grade', maxRoute)
    startTransition(async () => {
      const result = await updateProfileAction({}, formData)
      if (result.error) {
        setError(result.error)
        setSaved(false)
      } else {
        setError(null)
        setSaved(true)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar src={avatarUrl} name={profile.username} size={64} />
        <div className="flex flex-col gap-1">
          <label className="cursor-pointer text-sm underline">
            {avatarPending ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={avatarPending}
              onChange={onAvatarChange}
            />
          </label>
          {avatarError && <p className="text-sm text-red-600">{avatarError}</p>}
        </div>
      </div>

      {/* Username */}
      <label className="flex flex-col gap-1">
        <span className="text-sm text-foreground/70">Username</span>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      {/* Height */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground/70">Height</span>
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => changeUnit('cm')}
              className={`rounded px-2 py-1 ${unit === 'cm' ? 'bg-foreground text-background' : 'border border-foreground/20'}`}
            >
              cm
            </button>
            <button
              type="button"
              onClick={() => changeUnit('ftin')}
              className={`rounded px-2 py-1 ${unit === 'ftin' ? 'bg-foreground text-background' : 'border border-foreground/20'}`}
            >
              ft / in
            </button>
          </div>
        </div>
        {unit === 'cm' ? (
          <input
            type="number"
            min="1"
            max="300"
            value={cm}
            onChange={(e) => setCm(e.target.value)}
            placeholder="cm"
            className={FIELD_CLASS}
          />
        ) : (
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={ft}
              onChange={(e) => onFtInChange(e.target.value, inch)}
              placeholder="ft"
              className={`${FIELD_CLASS} w-full`}
            />
            <input
              type="number"
              min="0"
              max="11"
              value={inch}
              onChange={(e) => onFtInChange(ft, e.target.value)}
              placeholder="in"
              className={`${FIELD_CLASS} w-full`}
            />
          </div>
        )}
      </div>

      {/* Max grades */}
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-foreground/70">Max boulder</span>
          <select
            value={maxBoulder}
            onChange={(e) => setMaxBoulder(e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not set</option>
            {BOULDER_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-foreground/70">Max route</span>
          <select
            value={maxRoute}
            onChange={(e) => setMaxRoute(e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not set</option>
            {ROUTE_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-foreground/70">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
