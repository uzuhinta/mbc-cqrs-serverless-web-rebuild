'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { mergeMessages } from './merge'
import type {
  Locale,
  MbcMessageRegistry,
  MessageCatalog,
  MessageOverrides,
  MessageTree,
} from './types'

export type MbcMessageOverrides = {
  [K in keyof MbcMessageRegistry]?: MessageOverrides<MbcMessageRegistry[K]>
}

type MbcContextValue = {
  locale: Locale
  messages: MbcMessageOverrides
  portalContainer: HTMLElement | null | undefined
}

const MbcContext = createContext<MbcContextValue>({
  locale: 'ja',
  messages: {},
  portalContainer: undefined,
})

export type MbcProviderProps = {
  locale?: Locale
  messages?: MbcMessageOverrides
  portalContainer?: HTMLElement | null
  children?: ReactNode
}

export function MbcProvider({
  locale,
  messages,
  portalContainer,
  children,
}: MbcProviderProps) {
  const parent = useContext(MbcContext)
  const value = useMemo<MbcContextValue>(
    () => ({
      locale: locale ?? parent.locale,
      messages: messages
        ? mergeMessages(parent.messages, messages)
        : parent.messages,
      portalContainer:
        portalContainer === undefined
          ? parent.portalContainer
          : portalContainer,
    }),
    [locale, messages, portalContainer, parent]
  )
  return <MbcContext.Provider value={value}>{children}</MbcContext.Provider>
}

export function useLocale(): Locale {
  return useContext(MbcContext).locale
}

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(MbcContext).portalContainer ?? undefined
}

export function useMessages<T extends MessageTree>(
  catalog: MessageCatalog<T>
): T {
  const { locale, messages } = useContext(MbcContext)
  const override = (messages as Record<string, unknown>)[catalog.namespace]
  return useMemo(
    () => mergeMessages(catalog.locales[locale], override),
    [catalog, locale, override]
  )
}
