'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function GymSearch({ defaultQuery }: { defaultQuery: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultQuery)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function onChange(next: string) {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const trimmed = next.trim()
      const href = trimmed ? `/gyms?q=${encodeURIComponent(trimmed)}` : '/gyms'
      router.replace(href, { scroll: false })
    }, 300)
  }

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search gyms by name or city"
      className="w-full rounded border border-foreground/20 px-3 py-2"
    />
  )
}
