'use client'

import { useState } from 'react'

/**
 * Search inputs typed but not yet applied. They follow the applied filters
 * when those change from outside (a cleared search, the browser's back
 * button driving a URL-backed state).
 */
export function useFilters<F extends Record<string, string | boolean>>(
  applied: F
): [F, (next: F) => void] {
  const [draft, setDraft] = useState(applied)
  const [source, setSource] = useState(applied)
  const changed = (Object.keys(applied) as (keyof F)[]).some(
    (key) => applied[key] !== source[key]
  )
  if (changed) {
    setSource(applied)
    setDraft(applied)
  }
  return [changed ? applied : draft, setDraft]
}
