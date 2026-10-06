'use client'

import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { creatorReducer, type CreatorAction } from './reducer'
import type { CreatorState } from './types'

export type CreatorStore = {
  getState(): CreatorState
  dispatch(action: CreatorAction): void
  subscribe(listener: () => void): () => void
}

export type CreatorStoreOptions = {
  /** Called after every action that changed the state. */
  onChange?: (
    next: CreatorState,
    previous: CreatorState,
    action: CreatorAction
  ) => void
}

export function createCreatorStore(
  initial: CreatorState,
  options: CreatorStoreOptions = {}
): CreatorStore {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    dispatch(action) {
      const previous = state
      const next = creatorReducer(previous, action)
      if (next === previous) return
      state = next
      listeners.forEach((listener) => listener())
      options.onChange?.(next, previous, action)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const CreatorStoreContext = createContext<CreatorStore | null>(null)

export function CreatorStoreProvider({
  store,
  children,
}: {
  store: CreatorStore
  children?: ReactNode
}) {
  return createElement(CreatorStoreContext.Provider, { value: store }, children)
}

export function useCreatorStore(): CreatorStore {
  const store = useContext(CreatorStoreContext)
  if (!store)
    throw new Error(
      'Creator components must be rendered inside CreatorStoreProvider.'
    )
  return store
}

/** `selector` must return stored objects or primitives, so unchanged cards skip rendering. */
export function useCreatorSelector<T>(selector: (state: CreatorState) => T): T {
  const store = useCreatorStore()
  const read = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, read, read)
}
