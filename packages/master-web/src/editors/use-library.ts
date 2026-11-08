'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * A module loaded after mount: `undefined` on the server, until it arrives,
 * and if loading fails (the caller keeps showing its fallback).
 */
export function useLibrary<T>(load: () => Promise<T>): T | undefined {
  const [loaded, setLoaded] = useState<{ module: T }>()
  useEffect(() => {
    let live = true
    load().then(
      (module) => {
        if (live) setLoaded({ module })
      },
      () => {}
    )
    return () => {
      live = false
    }
  }, [load])
  return loaded?.module
}

/**
 * Keeps attributes on every element `selector` finds inside `container`. A
 * library may replace that element at any time (Quill rebuilds its editing
 * area, Ace its input on a mode change), so they are applied again whenever
 * the container's content changes. `undefined` removes an attribute.
 */
export function useAttributes(
  container: RefObject<HTMLElement | null>,
  selector: string,
  attributes: Readonly<Record<string, string | undefined>>
) {
  const key = JSON.stringify(
    Object.entries(attributes).map(([name, value]) => [name, value ?? null])
  )
  useEffect(() => {
    const root = container.current
    if (!root) return
    const wanted = JSON.parse(key) as [string, string | null][]
    const apply = () => {
      for (const element of root.querySelectorAll(selector))
        for (const [name, value] of wanted) {
          if (element.getAttribute(name) === value) continue
          if (value === null) element.removeAttribute(name)
          else element.setAttribute(name, value)
        }
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  })
}
