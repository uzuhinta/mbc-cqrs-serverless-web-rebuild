import type { Locale, MbcMessageRegistry, MessageCatalog } from './types'

/** `namespace` must be registered in `MbcMessageRegistry` (module augmentation). */
export function defineMessages<K extends keyof MbcMessageRegistry>(
  namespace: K,
  locales: Record<Locale, MbcMessageRegistry[K]>
): MessageCatalog<MbcMessageRegistry[K]> {
  return { namespace, locales }
}
