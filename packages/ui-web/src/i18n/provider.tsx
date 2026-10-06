'use client'

import { DirectionProvider } from '@radix-ui/react-direction'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { mergeMessages } from './merge'
import type {
  Locale,
  MbcMessageRegistry,
  MessageCatalog,
  MessageOverrides,
} from './types'

export type MbcMessageOverrides = {
  [K in keyof MbcMessageRegistry]?: MessageOverrides<MbcMessageRegistry[K]>
}

export type Direction = 'ltr' | 'rtl'

type MbcContextValue = {
  dir: Direction
  locale: Locale
  messages: MbcMessageOverrides
  portalContainer: HTMLElement | null | undefined
}

const MbcContext = createContext<MbcContextValue>({
  dir: 'ltr',
  locale: 'ja',
  messages: {},
  portalContainer: undefined,
})

export type MbcProviderProps = {
  /** Text direction for Radix parts (keyboard navigation, portals). */
  dir?: Direction
  locale?: Locale
  messages?: MbcMessageOverrides
  portalContainer?: HTMLElement | null
  children?: ReactNode
}

/** Runtime guard: a locale outside the union (e.g. from a URL) falls back to Japanese. */
function normalizeLocale(locale: Locale): Locale {
  return locale === 'en' || locale === 'ja' ? locale : 'ja'
}

export function MbcProvider({
  dir,
  locale,
  messages,
  portalContainer,
  children,
}: MbcProviderProps) {
  const parent = useContext(MbcContext)
  const value = useMemo<MbcContextValue>(
    () => ({
      dir: dir ?? parent.dir,
      locale: locale === undefined ? parent.locale : normalizeLocale(locale),
      messages: messages
        ? mergeMessages(parent.messages, messages)
        : parent.messages,
      portalContainer:
        portalContainer === undefined
          ? parent.portalContainer
          : portalContainer,
    }),
    [dir, locale, messages, portalContainer, parent]
  )
  return (
    <MbcContext.Provider value={value}>
      <DirectionProvider dir={value.dir}>{children}</DirectionProvider>
    </MbcContext.Provider>
  )
}

export function useLocale(): Locale {
  return useContext(MbcContext).locale
}

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(MbcContext).portalContainer ?? undefined
}

export function useMessages<T>(catalog: MessageCatalog<T>): T {
  const { locale, messages } = useContext(MbcContext)
  const override = (messages as Record<string, unknown>)[catalog.namespace]
  return useMemo(
    // An unknown runtime locale (an unchecked URL param) falls back to Japanese.
    () =>
      mergeMessages(catalog.locales[locale] ?? catalog.locales.ja, override),
    [catalog, locale, override]
  )
}
