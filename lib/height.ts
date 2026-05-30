// Height is always stored as height_cm (numeric). These helpers convert to/from
// feet+inches for the cm/ft-in display toggle. Pure functions, no rounding
// surprises: cm is rounded to whole numbers, inches to whole numbers.

export type HeightUnit = 'cm' | 'ftin'

const CM_PER_INCH = 2.54
const INCHES_PER_FOOT = 12

export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalInches = Math.round(cm / CM_PER_INCH)
  return {
    ft: Math.floor(totalInches / INCHES_PER_FOOT),
    in: totalInches % INCHES_PER_FOOT,
  }
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * INCHES_PER_FOOT + inches) * CM_PER_INCH)
}

export function formatHeight(cm: number, unit: HeightUnit): string {
  if (unit === 'ftin') {
    const { ft, in: inches } = cmToFtIn(cm)
    return `${ft}′${inches}″`
  }
  return `${Math.round(cm)} cm`
}
