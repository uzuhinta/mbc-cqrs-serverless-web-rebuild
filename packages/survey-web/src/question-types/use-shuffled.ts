'use client'

import { useEffect, useState } from 'react'

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = result[i] as T
    result[i] = result[j] as T
    result[j] = swap
  }
  return result
}

/**
 * The first render keeps the original order, so server HTML and hydration
 * agree; the shuffle happens once after mount (and when the items change).
 */
export function useShuffled<T>(
  items: readonly T[],
  enabled: boolean,
  random: () => number = Math.random
): readonly T[] {
  const [order, setOrder] = useState<readonly T[]>(items)
  useEffect(() => {
    // The one re-render after mount is the point: server HTML and hydration
    // must see the original order, so the shuffle cannot happen during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(enabled ? shuffle(items, random) : items)
    // `random` is a test seam; reshuffling when it changes identity is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, enabled])
  return order
}
