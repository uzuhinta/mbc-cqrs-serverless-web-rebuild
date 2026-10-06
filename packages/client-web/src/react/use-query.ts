'use client'

import { useEffect, useRef, useState } from 'react'

export type QueryState<T> = {
  data: T | undefined
  loading: boolean
  error: unknown
  refetch(): void
}

type Settled<T> = { key: string; data?: T; error?: unknown }

/**
 * Fetch keyed by `key`; `load === null` means idle. Loading is derived (the
 * latest request has not settled), so no state is set synchronously in effects.
 */
export function useQuery<T>(
  key: string,
  load: ((signal: AbortSignal) => Promise<T>) | null
): QueryState<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  const active = load !== null
  const requestKey = `${nonce}\u0000${key}`

  useEffect(() => {
    const run = loadRef.current
    if (!run) return
    const controller = new AbortController()
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, error })
      }
    )
    return () => controller.abort()
  }, [requestKey, active])

  const current = active && settled?.key === requestKey ? settled : null
  return {
    data: current?.data,
    loading: active && current === null,
    error: current?.error,
    refetch: () => setNonce((n) => n + 1),
  }
}
