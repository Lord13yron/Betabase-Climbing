'use client'

import { useEffect, useState } from 'react'
import { XIcon } from './icons'
import type { AdminGym, GymStatus } from './types'

// Add / edit gym modal. New gyms always start as Draft (no status field); editing
// reveals the status select. No slug field (the uuid id is the identifier) and no
// discipline toggle (chips are derived from the gym's routes).
export function GymModal({
  open,
  gym,
  onClose,
  onSave,
}: {
  open: boolean
  gym: AdminGym | null
  onClose: () => void
  onSave: (
    values: { name: string; city: string; imageUrl: string | null; status: GymStatus },
    editingId: string | null
  ) => Promise<{ error?: string }>
}) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState<GymStatus>('draft')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  // Seed the form whenever the modal opens (or the target gym changes).
  useEffect(() => {
    if (!open) return
    setError('')
    setName(gym?.name ?? '')
    setCity(gym?.city ?? '')
    setImageUrl(gym?.imageUrl ?? '')
    setStatus(gym?.status ?? 'draft')
  }, [open, gym])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Gym name is required.')
    if (!city.trim()) return setError('City / location is required.')
    setError('')
    setPending(true)
    const res = await onSave(
      { name, city, imageUrl: imageUrl.trim() || null, status },
      gym?.id ?? null
    )
    setPending(false)
    if (res.error) setError(res.error)
    else onClose()
  }

  return (
    <div
      className="a-overlay is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="a-modal" onSubmit={submit} autoComplete="off">
        <div className="a-modal-head">
          <div>
            <div className="a-modal-title">{gym ? 'Edit gym' : 'Add gym'}</div>
            <div className="a-modal-sub">
              {gym ? gym.name : 'New gym · starts as a draft'}
            </div>
          </div>
          <button type="button" className="a-modal-x" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="a-modal-body">
          {error && <div className="a-error">{error}</div>}

          <div className="a-field">
            <label className="a-label" htmlFor="a-gf-name">Gym name</label>
            <input
              className="a-input"
              id="a-gf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summit Climbing"
              autoFocus
            />
          </div>

          <div className="a-field">
            <label className="a-label" htmlFor="a-gf-city">City / location</label>
            <input
              className="a-input"
              id="a-gf-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Portland, OR"
            />
          </div>

          <div className="a-field">
            <label className="a-label" htmlFor="a-gf-img">
              Cover image URL <span className="opt">· optional</span>
            </label>
            <input
              className="a-input"
              id="a-gf-img"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…  (the gym's directory / hero image)"
              spellCheck={false}
            />
          </div>

          {gym && (
            <div className="a-field">
              <label className="a-label" htmlFor="a-gf-status">Status</label>
              <select
                className="a-select"
                id="a-gf-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as GymStatus)}
              >
                <option value="draft">Draft — hidden from the public directory</option>
                <option value="live">Live — visible to climbers</option>
                <option value="archived">Archived — retired, data kept</option>
              </select>
            </div>
          )}
        </div>

        <div className="a-modal-foot">
          <button type="button" className="a-btn a-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="a-btn a-btn--primary" disabled={pending}>
            {pending ? 'Saving…' : gym ? 'Save changes' : 'Add gym'}
          </button>
        </div>
      </form>
    </div>
  )
}
