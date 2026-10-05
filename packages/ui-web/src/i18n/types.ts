import type { UiMessages } from './ui-messages'

export type Locale = 'ja' | 'en'

/** A message is a string, or a function of named parameters returning a string. */
export type Message = string | ((params: never) => string)

export type MessageTree = { readonly [key: string]: Message | MessageTree }

export type MessageOverrides<T> = {
  [K in keyof T]?: T[K] extends string
    ? string
    : T[K] extends (params: infer P) => string
      ? (params: P) => string
      : MessageOverrides<T[K]>
}

export interface MessageCatalog<T> {
  readonly namespace: string
  readonly locales: Readonly<Record<Locale, T>>
}

/**
 * Message namespaces known to `MbcProvider`. Feature packages add theirs:
 *
 *   declare module '@mbc-cqrs-serverless/ui-web' {
 *     interface MbcMessageRegistry { survey: SurveyMessages }
 *   }
 */
export interface MbcMessageRegistry {
  ui: UiMessages
}
