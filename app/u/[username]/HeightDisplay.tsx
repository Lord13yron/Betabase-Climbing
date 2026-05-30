'use client'

import { useEffect, useState } from 'react'
import { formatHeight, type HeightUnit } from '@/lib/height'

const UNIT_KEY = 'betabase:heightUnit'

// Renders a stored height in the viewer's preferred unit (localStorage),
// defaulting to cm until mount so SSR output is stable.
export function HeightDisplay({ cm }: { cm: number }) {
  const [unit, setUnit] = useState<HeightUnit>('cm')

  useEffect(() => {
    const saved = localStorage.getItem(UNIT_KEY)
    if (saved === 'ftin' || saved === 'cm') setUnit(saved)
  }, [])

  return <>{formatHeight(cm, unit)}</>
}
