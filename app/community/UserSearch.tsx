'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'
import { SearchIcon } from './icons'

type Result = { username: string; avatar_url: string | null }

// Debounced username lookup against the public-read profiles table.
// Ephemeral UI only (no URL state), so the browser client is enough.
export function UserSearch() {
  const [value, setValue] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onSearch(next: string) {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    // Strip ilike wildcards / PostgREST separators from user input.
    const q = next.replace(/[%_,]/g, ' ').trim()
    if (!q) {
      setResults([])
      setOpen(false)
      return
    }
    timer.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .ilike('username', `%${q}%`)
        .order('username')
        .limit(8)
      setResults((data as Result[]) ?? [])
      setOpen(true)
    }, 300)
  }

  return (
    <div className="cm-search" ref={boxRef}>
      <SearchIcon />
      <input
        type="search"
        value={value}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => { if (value.trim()) setOpen(true) }}
        placeholder="Find climbers by username"
        aria-label="Find climbers by username"
      />
      {open && (
        <div className="cm-search-menu">
          {results.length === 0 ? (
            <span className="cm-search-none">No climbers found</span>
          ) : (
            results.map((r) => (
              <Link
                key={r.username}
                href={`/u/${r.username}`}
                className="cm-search-item"
                onClick={() => setOpen(false)}
              >
                <Avatar src={r.avatar_url} name={r.username} size={28} />
                <span>{r.username}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
