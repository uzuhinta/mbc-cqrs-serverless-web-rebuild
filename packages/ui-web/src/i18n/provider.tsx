'use client'

import { DirectionProvider } from '@radix-ui/react-direction'
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
      locale: locale ?? parent.locale,
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
