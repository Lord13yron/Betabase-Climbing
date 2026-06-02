'use client'

import { useEffect, useState, useTransition } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gradesForDiscipline } from '@/lib/grades'
import { cmToFtIn, ftInToCm, type HeightUnit } from '@/lib/height'
import { updateProfileAction, updateAvatarAction } from './actions'
import { PencilIcon, CameraIcon, CheckIcon, XIcon } from './icons'

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

// The "Edit profile" trigger (in the hero) + the modal it opens. Reuses the
// existing server actions (updateProfileAction / updateAvatarAction) and the
// same avatar-straight-to-Storage flow as the old EditProfileForm — only the
// presentation changes (dark modal in the brand system).
export function ProfileEdit({
  userId,
  profile,
  initial,
}: {
  userId: string
  profile: Profile
  initial: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="pf-btn" onClick={() => setOpen(true)}>
        <PencilIcon />
        Edit profile
      </button>
      {open && (
        <EditModal
          userId={userId}
          profile={profile}
          initial={initial}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function EditModal({
  userId,
  profile,
  initial,
  onClose,
}: {
  userId: string
  profile: Profile
  initial: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Avatar — uploaded straight to Storage, URL persisted via a server action.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [avatarPending, setAvatarPending] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Controlled fields (so React 19's post-action reset can't revert them).
  const [username, setUsername] = useState(profile.username ?? '')
  const [maxBoulder, setMaxBoulder] = useState(profile.max_boulder_grade ?? '')
  const [maxRoute, setMaxRoute] = useState(profile.max_route_grade ?? '')

  // Height: cm is canonical; ft/in is a view that writes back into cm.
  const [unit, setUnit] = useState<HeightUnit>('cm')
  const [cm, setCm] = useState<string>(profile.height_cm != null ? String(Math.round(profile.height_cm)) : '')
  const [ft, setFt] = useState('')
  const [inch, setInch] = useState('')

  useEffect(() => {
    const u = localStorage.getItem(UNIT_KEY)
    if (u === 'ftin' || u === 'cm') setUnit(u)
  }, [])
  useEffect(() => {
    if (cm) {
      const { ft: f, in: i } = cmToFtIn(Number(cm))
      setFt(String(f)); setInch(String(i))
    } else { setFt(''); setInch('') }
  }, [cm])

  // Esc closes; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  function changeUnit(next: HeightUnit) {
    setUnit(next)
    localStorage.setItem(UNIT_KEY, next)
  }
  function onFtInChange(nextFt: string, nextIn: string) {
    setFt(nextFt); setInch(nextIn)
    if (nextFt === '' && nextIn === '') { setCm(''); return }
    setCm(String(ftInToCm(Number(nextFt || 0), Number(nextIn || 0))))
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    if (!ALLOWED_TYPES.includes(file.type)) { setAvatarError('Use a JPEG, PNG, or WebP image.'); return }
    if (file.size > MAX_AVATAR_BYTES) { setAvatarError('Image must be under 5 MB.'); return }

    setAvatarPending(true)
    const supabase = createClient()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setAvatarError(error.message); setAvatarPending(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${data.publicUrl}?t=${Date.now()}`
    await updateAvatarAction(url)
    setAvatarUrl(url)
    setAvatarPending(false)
    router.refresh()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('username', username)
    formData.set('height_cm', cm)
    formData.set('max_boulder_grade', maxBoulder)
    formData.set('max_route_grade', maxRoute)
    startTransition(async () => {
      const result = await updateProfileAction({}, formData)
      if (result.error) { setError(result.error); setSaved(false) }
      else {
        setError(null); setSaved(true); router.refresh()
        // brief confirmation, then close
        setTimeout(onClose, 650)
      }
    })
  }

  return (
    <div className="pf-scrim" onClick={onClose}>
      <form className="pf-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="pf-modal-head">
          <div>
            <span className="eb">Account</span>
            <h2>Edit profile</h2>
          </div>
          <button type="button" className="pf-modal-x" onClick={onClose} aria-label="Close"><XIcon /></button>
        </div>

        <div className="pf-modal-body">
          {/* avatar */}
          <div className="pf-edit-av">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="pf-photo" src={avatarUrl} alt="" style={{ ['--sz']: '72px' } as CSSProperties} />
            ) : (
              <span className="pf-mono" style={{ ['--sz']: '72px' } as CSSProperties}><span>{initial}</span></span>
            )}
            <div className="pf-edit-av-actions">
              <label className="pf-change-photo">
                <CameraIcon />
                {avatarPending ? 'Uploading…' : 'Change photo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={avatarPending} onChange={onAvatarChange} />
              </label>
              {avatarError ? <span className="pf-error">{avatarError}</span> : <span className="pf-edit-av-hint">JPEG, PNG or WebP · under 5 MB</span>}
            </div>
          </div>

          {/* username */}
          <div className="pf-field">
            <label htmlFor="pf-username">Username</label>
            <div className="pf-input-at">
              <span className="sigil">@</span>
              <input id="pf-username" className="pf-input" required value={username}
                onChange={(e) => setUsername(e.target.value)} />
            </div>
          </div>

          {/* height */}
          <div className="pf-field">
            <div className="pf-field-row">
              <label htmlFor="pf-height">Height</label>
              <div className="pf-unit">
                <button type="button" className={unit === 'cm' ? 'on' : ''} onClick={() => changeUnit('cm')}>cm</button>
                <button type="button" className={unit === 'ftin' ? 'on' : ''} onClick={() => changeUnit('ftin')}>ft / in</button>
              </div>
            </div>
            {unit === 'cm' ? (
              <input id="pf-height" className="pf-input" type="number" min="1" max="300" placeholder="cm"
                value={cm} onChange={(e) => setCm(e.target.value)} />
            ) : (
              <div className="pf-two">
                <input className="pf-input" type="number" min="0" placeholder="ft" value={ft}
                  onChange={(e) => onFtInChange(e.target.value, inch)} />
                <input className="pf-input" type="number" min="0" max="11" placeholder="in" value={inch}
                  onChange={(e) => onFtInChange(ft, e.target.value)} />
              </div>
            )}
          </div>

          {/* max grades */}
          <div className="pf-two">
            <div className="pf-field">
              <label htmlFor="pf-boulder">Max boulder</label>
              <div className="pf-select-wrap">
                <select id="pf-boulder" className="pf-select" value={maxBoulder} onChange={(e) => setMaxBoulder(e.target.value)}>
                  <option value="">Not set</option>
                  {BOULDER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="pf-field">
              <label htmlFor="pf-route">Max route</label>
              <div className="pf-select-wrap">
                <select id="pf-route" className="pf-select" value={maxRoute} onChange={(e) => setMaxRoute(e.target.value)}>
                  <option value="">Not set</option>
                  {ROUTE_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pf-modal-foot">
            <span className="pf-foot-msg">
              {error && <span className="pf-error">{error}</span>}
              {saved && !error && <span className="pf-saved">Saved</span>}
            </span>
            <button type="button" className="pf-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="pf-btn" disabled={pending}>
              <CheckIcon />
              {pending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
