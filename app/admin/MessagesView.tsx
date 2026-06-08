'use client'

import { useState } from 'react'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  EyeIcon,
  InboxIcon,
  ReplyIcon,
  SearchIcon,
  TrashIcon,
  UnarchiveIcon,
} from './icons'
import { AdminAvatar } from './AdminAvatar'
import { fmtMsgFull, fmtMsgTime, hexA, topicColor } from './admin-utils'
import type { AdminMessage } from './types'

type Filter = 'all' | 'unread' | 'archived'
const FILTERS: Filter[] = ['all', 'unread', 'archived']
const FILTER_LABEL: Record<Filter, string> = { all: 'All', unread: 'Unread', archived: 'Archived' }

export function MessagesView({
  messages,
  today,
  onMarkRead,
  onArchive,
  onDeleteMessage,
}: {
  messages: AdminMessage[]
  today: string
  onMarkRead: (id: string, read: boolean) => void
  onArchive: (id: string, archived: boolean) => void
  onDeleteMessage: (msg: AdminMessage) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showRead, setShowRead] = useState(false)

  const q = query.trim().toLowerCase()
  const inbox = messages.filter((m) => !m.archived)
  const counts = {
    all: inbox.length,
    unread: inbox.filter((m) => !m.read).length,
    archived: messages.filter((m) => m.archived).length,
  }

  const visible = messages.filter((m) => {
    if (filter === 'all' && m.archived) return false
    if (filter === 'unread' && (m.read || m.archived)) return false
    if (filter === 'archived' && !m.archived) return false
    if (q && !`${m.name} ${m.email} ${m.message}`.toLowerCase().includes(q)) return false
    return true
  })

  const selected = messages.find((m) => m.id === selectedId) ?? null

  function select(m: AdminMessage) {
    setSelectedId(m.id)
    setShowRead(true)
    if (!m.read) onMarkRead(m.id, true)
  }
  function backToList() {
    setSelectedId(null)
    setShowRead(false)
  }
  function toggleArchive(m: AdminMessage) {
    const willArchive = !m.archived
    onArchive(m.id, willArchive)
    if (willArchive && filter !== 'archived') backToList()
  }

  return (
    <div className="a-wrap a-wrap--wide">
      <div className="a-head">
        <div className="a-head-l">
          <span className="a-eyebrow">Console</span>
          <h1 className="a-title">Messages</h1>
          <div className="a-sub">
            {counts.unread} unread · {inbox.length} in inbox
          </div>
        </div>
      </div>
      <div className="a-head-rule" />

      <div className={`a-inbox${showRead ? ' show-read' : ''}`}>
        <div className="a-inbox-list">
          <div className="a-inbox-tools">
            <div className="a-segfilter" role="group" aria-label="Filter messages">
              {FILTERS.map((f) => (
                <button key={f} className={f === filter ? 'on' : ''} onClick={() => setFilter(f)}>
                  {FILTER_LABEL[f]} <span className="cnt">{counts[f]}</span>
                </button>
              ))}
            </div>
            <label className="a-search">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages"
                aria-label="Search messages"
              />
            </label>
          </div>

          <div className="a-msglist">
            {visible.length === 0 ? (
              <div className="a-unoresults">Nothing here.</div>
            ) : (
              visible.map((m) => (
                <button
                  key={m.id}
                  className={`a-msg${m.read ? ' is-read' : ''}${
                    selectedId === m.id ? ' is-selected' : ''
                  }`}
                  onClick={() => select(m)}
                >
                  <span className="a-msg-dot" />
                  <div className="a-msg-body">
                    <div className="a-msg-top">
                      <span className="a-msg-from">{m.name}</span>
                      <span className="a-msg-time">{fmtMsgTime(m.createdAt, today)}</span>
                    </div>
                    <div className="a-msg-snip">{m.message.replace(/\n+/g, ' ')}</div>
                    <div className="a-msg-tags">
                      <TopicTag topic={m.topic} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="a-read">
          {!selected ? (
            <div className="a-read-empty">
              <div className="a-read-empty-ic">
                <InboxIcon />
              </div>
              <h3>No message selected</h3>
              <p>Pick a message from the list to read it, reply, archive, or delete.</p>
            </div>
          ) : (
            <>
              <div className="a-read-head">
                <button className="a-read-back" onClick={backToList}>
                  <ArrowLeftIcon />
                  Back to inbox
                </button>
                <h2 className="a-read-subj">{selected.topic} enquiry</h2>
                <div className="a-read-tags">
                  <TopicTag topic={selected.topic} />
                </div>
                <div className="a-read-from">
                  <AdminAvatar className="a-read-av" seed={selected.name} label={selected.name} />
                  <div className="a-read-who">
                    <div className="a-read-name">{selected.name}</div>
                    <a className="a-read-email" href={`mailto:${selected.email}`}>
                      {selected.email}
                    </a>
                  </div>
                  <div className="a-read-time">{fmtMsgFull(selected.createdAt)}</div>
                </div>
              </div>

              <div className="a-read-bodywrap">
                <div className="a-read-text">{selected.message}</div>
              </div>

              <div className="a-read-foot">
                <a
                  className="a-btn a-btn--primary"
                  href={`mailto:${selected.email}?subject=${encodeURIComponent(
                    'Re: your message to Betabase'
                  )}`}
                >
                  <ReplyIcon />
                  Reply
                </a>
                <button
                  className="a-btn a-btn--ghost"
                  onClick={() => onMarkRead(selected.id, !selected.read)}
                >
                  <EyeIcon />
                  {selected.read ? 'Mark unread' : 'Mark read'}
                </button>
                <span className="spacer" />
                <button className="a-btn a-btn--ghost" onClick={() => toggleArchive(selected)}>
                  {selected.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                  {selected.archived ? 'Unarchive' : 'Archive'}
                </button>
                <button
                  className="a-iconbtn is-danger"
                  title="Delete message"
                  aria-label="Delete message"
                  onClick={() => onDeleteMessage(selected)}
                >
                  <TrashIcon />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TopicTag({ topic }: { topic: string }) {
  const color = topicColor(topic)
  return (
    <span className="a-topic" style={{ color, background: hexA(color, 0.14) }}>
      {topic}
    </span>
  )
}
