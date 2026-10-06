'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * `false` on the server and during hydration, `true` afterwards (and on a
 * client-only render). For output that depends on the browser, such as a
 * date shown in the browser's time zone.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
