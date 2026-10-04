import type { Locale, MessageCatalog, MessageTree } from './types'

export function defineMessages<T extends MessageTree>(
  namespace: string,
  locales: Record<Locale, T>
): MessageCatalog<T> {
  return { namespace, locales }
}
