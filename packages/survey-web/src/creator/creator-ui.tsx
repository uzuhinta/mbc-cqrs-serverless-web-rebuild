'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { creatorMessages } from './i18n/creator-messages'
import type { CreatorIssueKey, DraftReport } from './state/validate'

export type ValueStore<T> = {
  get(): T
  set(next: T): void
  subscribe(listener: () => void): () => void
}

export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export type IssueState = { report: DraftReport; showErrors: boolean }

/** Shell services the cards use: DOM lookup for the floating bar, focus hand-off, issues, the reorder dialog. */
export type CreatorUi = {
  cardRef(id: string): (element: HTMLElement | null) => void
  getCard(id: string): HTMLElement | undefined
  requestFocus(id: string): void
  takeFocus(id: string): boolean
  issues: ValueStore<IssueState>
  openReorder(): void
}

export function createCreatorUi(
  issues: ValueStore<IssueState>,
  openReorder: () => void = () => {}
): CreatorUi {
  const cards = new Map<string, HTMLElement>()
  const refs = new Map<string, (element: HTMLElement | null) => void>()
  const focus = new Set<string>()
  return {
    cardRef(id) {
      let ref = refs.get(id)
      if (!ref) {
        ref = (element) => {
          if (element) cards.set(id, element)
          else cards.delete(id)
        }
        refs.set(id, ref)
      }
      return ref
    },
    getCard: (id) => cards.get(id),
    requestFocus: (id) => void focus.add(id),
    takeFocus: (id) => focus.delete(id),
    issues,
    openReorder,
  }
}

const CreatorUiContext = createContext<CreatorUi | null>(null)

export function CreatorUiProvider({
  value,
  children,
}: {
  value: CreatorUi
  children?: ReactNode
}) {
  return (
    <CreatorUiContext.Provider value={value}>
      {children}
    </CreatorUiContext.Provider>
  )
}

export function useCreatorUi(): CreatorUi {
  const ui = useContext(CreatorUiContext)
  if (!ui)
    throw new Error(
      'Creator components must be rendered inside CreatorUiProvider.'
    )
  return ui
}

/** Primitive snapshot (a joined string) so a card re-renders only when its own issues change. */
export function useItemIssues(id: string) {
  const { issues } = useCreatorUi()
  const read = () => {
    const { report, showErrors } = issues.get()
    const errors = showErrors ? (report.errors[id] ?? []) : []
    return `${errors.join(',')}|${(report.warnings[id] ?? []).join(',')}`
  }
  const key = useSyncExternalStore(issues.subscribe, read, read)
  return useMemo(() => {
    const [errors = '', warnings = ''] = key.split('|')
    return {
      errors: (errors ? errors.split(',') : []) as CreatorIssueKey[],
      warnings: (warnings ? warnings.split(',') : []) as 'missingTarget'[],
    }
  }, [key])
}

export function IssueList({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  const t = useMessages(creatorMessages)
  const { errors, warnings } = useItemIssues(id)
  if (errors.length === 0 && warnings.length === 0) return null
  return (
    <div
      data-issues=""
      className={
        className ?? 'mbc:flex mbc:flex-col mbc:gap-1 mbc:px-6 mbc:pb-4'
      }
    >
      {errors.map((key) => (
        <p key={key} className="mbc:text-destructive mbc:text-sm">
          {t.errors[key]}
        </p>
      ))}
      {warnings.map((key) => (
        <p
          key={key}
          className="mbc:text-sm mbc:text-amber-700 mbc:dark:text-amber-400"
        >
          {t.errors[key]}
        </p>
      ))}
    </div>
  )
}
