'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CheckIcon, MailIcon, MountainIcon, UsersIcon } from './icons'
import { GymsView } from './GymsView'
import { AdminsView } from './AdminsView'
import { MessagesView } from './MessagesView'
import { GymModal } from './GymModal'
import { AddAdminModal } from './AddAdminModal'
import {
  addAdminAction,
  archiveMessageAction,
  createGymAction,
  deleteGymAction,
  deleteMessageAction,
  markMessageReadAction,
  removeAdminAction,
  setGymStatusAction,
  updateGymAction,
} from './actions'
import type { AdminGym, AdminMessage, AdminUser, Adminship, GymStatus } from './types'

type View = 'gyms' | 'admins' | 'messages'

const STATUS_LABEL: Record<GymStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  archived: 'Archived',
}

type ConfirmState = {
  title: string
  message: string
  confirmLabel: string
  busyLabel?: string
  tone: 'danger' | 'default'
  onConfirm: () => Promise<void>
}

export function AdminConsole({
  initialView,
  focusGymId,
  today,
  gyms,
  users,
  adminships,
  messages,
}: {
  initialView: View
  focusGymId: string | null
  today: string
  gyms: AdminGym[]
  users: AdminUser[]
  adminships: Adminship[]
  messages: AdminMessage[]
}) {
  const router = useRouter()

  const [view, setViewState] = useState<View>(initialView)
  const [localGyms, setLocalGyms] = useState(gyms)
  const [localAdminships, setLocalAdminships] = useState(adminships)
  const [localMessages, setLocalMessages] = useState(messages)

  // Re-seed from the server whenever fresh props arrive (after router.refresh()).
  useEffect(() => setLocalGyms(gyms), [gyms])
  useEffect(() => setLocalAdminships(adminships), [adminships])
  useEffect(() => setLocalMessages(messages), [messages])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    initialView === 'admins' && focusGymId
      ? Object.fromEntries(gyms.map((g) => [g.id, g.id !== focusGymId]))
      : {}
  )

  const [gymModal, setGymModal] = useState<{ open: boolean; gym: AdminGym | null }>({
    open: false,
    gym: null,
  })
  const [addAdmin, setAddAdmin] = useState<{ open: boolean; gym: AdminGym | null }>({
    open: false,
    gym: null,
  })
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  // toast
  const [toast, setToast] = useState({ msg: '', show: false })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2400)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // Focus a gym's admins on first load when deep-linked.
  useEffect(() => {
    if (initialView === 'admins' && focusGymId) {
      const t = setTimeout(() => {
        document
          .querySelector(`.a-group[data-id="${focusGymId}"]`)
          ?.scrollIntoView({ block: 'center' })
      }, 80)
      return () => clearTimeout(t)
    }
  }, [initialView, focusGymId])

  function syncUrl(v: View, gym?: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('view', v)
    if (gym) url.searchParams.set('gym', gym)
    else url.searchParams.delete('gym')
    window.history.replaceState(null, '', url)
  }
  function setView(v: View) {
    setViewState(v)
    window.scrollTo(0, 0)
    syncUrl(v)
  }

  const unread = localMessages.filter((m) => !m.read && !m.archived).length
  const adminCount = (gymId: string) =>
    localAdminships.filter((a) => a.gymId === gymId).length

  // Optimistic mutation: apply locally, persist; on error toast + resync.
  async function run(
    optimistic: () => void,
    action: () => Promise<{ error?: string; ok?: boolean }>,
    successMsg?: string
  ) {
    optimistic()
    const res = await action()
    if (res.error) {
      showToast(res.error)
      router.refresh()
    } else if (successMsg) {
      showToast(successMsg)
    }
  }

  function openConfirm(c: ConfirmState) {
    setConfirm(c)
  }
  async function handleConfirm() {
    if (!confirm) return
    setConfirmPending(true)
    await confirm.onConfirm()
    setConfirmPending(false)
    setConfirm(null)
  }

  // Esc closes the topmost overlay (confirm → add-admin → gym modal).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (confirm) setConfirm(null)
      else if (addAdmin.open) setAddAdmin({ open: false, gym: null })
      else if (gymModal.open) setGymModal({ open: false, gym: null })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirm, addAdmin.open, gymModal.open])

  // ---- gym handlers ----
  async function saveGym(
    values: { name: string; city: string; imageUrl: string | null; status: GymStatus },
    editingId: string | null
  ): Promise<{ error?: string }> {
    if (editingId) {
      const res = await updateGymAction(editingId, values)
      if (res.error) return { error: res.error }
      setLocalGyms((gs) =>
        gs.map((g) =>
          g.id === editingId
            ? { ...g, name: values.name, city: values.city, imageUrl: values.imageUrl, status: values.status }
            : g
        )
      )
      showToast('Gym updated')
      return {}
    }
    const res = await createGymAction(values)
    if (res.error || !res.gym) return { error: res.error ?? 'Could not create the gym.' }
    const created = res.gym
    setLocalGyms((gs) => [...gs, created].sort((a, b) => a.name.localeCompare(b.name)))
    showToast(`“${values.name}” added as a draft`)
    return {}
  }

  function handleDeleteGym(gym: AdminGym) {
    const n = adminCount(gym.id)
    openConfirm({
      title: `Delete “${gym.name}”?`,
      message:
        'This permanently removes the gym and all its walls, routes, and beta videos.' +
        (n > 0 ? ` Its ${n} admin${n === 1 ? '' : 's'} will lose access.` : '') +
        ' This can’t be undone.',
      confirmLabel: 'Delete gym',
      tone: 'danger',
      onConfirm: () =>
        run(
          () => {
            setLocalGyms((gs) => gs.filter((g) => g.id !== gym.id))
            setLocalAdminships((a) => a.filter((x) => x.gymId !== gym.id))
          },
          () => deleteGymAction(gym.id),
          'Gym deleted'
        ),
    })
  }

  function applyStatus(gymId: string, status: GymStatus) {
    setLocalGyms((gs) => gs.map((g) => (g.id === gymId ? { ...g, status } : g)))
  }
  function handleSetStatus(gym: AdminGym, status: GymStatus) {
    if (status === 'archived' && adminCount(gym.id) > 0) {
      const n = adminCount(gym.id)
      openConfirm({
        title: `Archive “${gym.name}”?`,
        message:
          `It will be hidden from the public directory but its data is kept. Its ${n} admin${
            n === 1 ? '' : 's'
          } keep access. You can set it back to Live anytime.`,
        confirmLabel: 'Archive gym',
        busyLabel: 'Archiving…',
        tone: 'default',
        onConfirm: () =>
          run(
            () => applyStatus(gym.id, 'archived'),
            () => setGymStatusAction(gym.id, 'archived'),
            `“${gym.name}” archived`
          ),
      })
      return
    }
    run(
      () => applyStatus(gym.id, status),
      () => setGymStatusAction(gym.id, status),
      `“${gym.name}” set to ${STATUS_LABEL[status]}`
    )
  }

  function goToGymAdmins(gymId: string) {
    setCollapsed(Object.fromEntries(localGyms.map((g) => [g.id, g.id !== gymId])))
    setViewState('admins')
    window.scrollTo(0, 0)
    syncUrl('admins', gymId)
    setTimeout(() => {
      document.querySelector(`.a-group[data-id="${gymId}"]`)?.scrollIntoView({ block: 'center' })
    }, 60)
  }

  // ---- admin handlers ----
  function handleAddAdmin(userId: string) {
    const gym = addAdmin.gym
    if (!gym) return
    const username = users.find((u) => u.id === userId)?.username ?? 'user'
    run(
      () => setLocalAdminships((a) => [...a, { gymId: gym.id, userId }]),
      () => addAdminAction(gym.id, userId),
      `@${username} added as admin`
    )
  }
  function handleRemoveAdmin(gym: AdminGym, user: AdminUser) {
    openConfirm({
      title: `Remove @${user.username} as an admin?`,
      message: `They’ll lose access to manage ${gym.name}’s walls and routes. You can re-add them anytime.`,
      confirmLabel: 'Remove admin',
      busyLabel: 'Removing…',
      tone: 'danger',
      onConfirm: () =>
        run(
          () =>
            setLocalAdminships((a) =>
              a.filter((x) => !(x.gymId === gym.id && x.userId === user.id))
            ),
          () => removeAdminAction(gym.id, user.id),
          `@${user.username} removed from ${gym.name}`
        ),
    })
  }

  // ---- message handlers ----
  function handleMarkRead(id: string, read: boolean) {
    run(
      () => setLocalMessages((ms) => ms.map((m) => (m.id === id ? { ...m, read } : m))),
      () => markMessageReadAction(id, read)
    )
  }
  function handleArchive(id: string, archived: boolean) {
    run(
      () => setLocalMessages((ms) => ms.map((m) => (m.id === id ? { ...m, archived } : m))),
      () => archiveMessageAction(id, archived),
      archived ? 'Message archived' : 'Message restored'
    )
  }
  function handleDeleteMessage(msg: AdminMessage) {
    openConfirm({
      title: 'Delete this message?',
      message: 'It will be permanently removed from the inbox. This can’t be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: () =>
        run(
          () => setLocalMessages((ms) => ms.filter((m) => m.id !== msg.id)),
          () => deleteMessageAction(msg.id),
          'Message deleted'
        ),
    })
  }

  const existingIds = new Set(
    addAdmin.gym
      ? localAdminships.filter((a) => a.gymId === addAdmin.gym!.id).map((a) => a.userId)
      : []
  )

  const navItems: { key: View; label: string; Icon: typeof MountainIcon; badge?: number }[] = [
    { key: 'gyms', label: 'Gyms', Icon: MountainIcon },
    { key: 'admins', label: 'Admins', Icon: UsersIcon },
    { key: 'messages', label: 'Messages', Icon: MailIcon, badge: unread },
  ]

  return (
    <div className="a-app">
      <div className="a-body">
        <aside className="a-side">
          <div className="a-side-label">Console</div>
          {navItems.map(({ key, label, Icon, badge }) => (
            <button
              key={key}
              className={`a-navitem${view === key ? ' is-active' : ''}`}
              onClick={() => setView(key)}
            >
              <Icon />
              <span className="lab">{label}</span>
              {badge !== undefined && (
                <span className="a-badge" data-count={badge}>
                  {badge}
                </span>
              )}
            </button>
          ))}
          <div className="a-side-foot">
            Betabase v2
            <br />
            Superuser console
          </div>
        </aside>

        <main className="a-content">
          {view === 'gyms' && (
            <GymsView
              gyms={localGyms}
              adminCount={adminCount}
              onAddGym={() => setGymModal({ open: true, gym: null })}
              onEditGym={(g) => setGymModal({ open: true, gym: g })}
              onDeleteGym={handleDeleteGym}
              onManageAdmins={(g) => goToGymAdmins(g.id)}
              onSetStatus={handleSetStatus}
            />
          )}
          {view === 'admins' && (
            <AdminsView
              gyms={localGyms}
              users={users}
              adminships={localAdminships}
              adminCount={adminCount}
              collapsed={collapsed}
              onToggle={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
              onAddAdmin={(g) => setAddAdmin({ open: true, gym: g })}
              onRemoveAdmin={handleRemoveAdmin}
            />
          )}
          {view === 'messages' && (
            <MessagesView
              messages={localMessages}
              today={today}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onDeleteMessage={handleDeleteMessage}
            />
          )}
        </main>
      </div>

      <nav className="a-tabbar">
        {navItems.map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            className={`a-tab${view === key ? ' is-active' : ''}`}
            onClick={() => setView(key)}
          >
            <Icon />
            <span className="tl">{label}</span>
            {badge !== undefined && (
              <span className="a-badge" data-count={badge}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <GymModal
        open={gymModal.open}
        gym={gymModal.gym}
        onClose={() => setGymModal({ open: false, gym: null })}
        onSave={saveGym}
      />
      <AddAdminModal
        open={addAdmin.open}
        gym={addAdmin.gym}
        users={users}
        existingIds={existingIds}
        onClose={() => setAddAdmin({ open: false, gym: null })}
        onAdd={handleAddAdmin}
      />
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        busyLabel={confirm?.busyLabel ?? 'Working…'}
        tone={confirm?.tone ?? 'danger'}
        pending={confirmPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />

      <div className={`a-toast${toast.show ? ' show' : ''}`}>
        <CheckIcon />
        <span>{toast.msg}</span>
      </div>
    </div>
  )
}
