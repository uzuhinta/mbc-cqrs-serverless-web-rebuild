import type { Locale } from '@mbc-cqrs-serverless/ui-web'

const INTL_LOCALES: Record<Locale, string> = { ja: 'ja-JP', en: 'en-US' }

/** Reads a stored answer. Without a year, any stored year (v0 wrote 0 or 2000) is replaced. */
export function readDate(
  value: unknown,
  includeYear: boolean,
  today: Date = new Date()
): Date | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (!includeYear) date.setFullYear(today.getFullYear())
  return date
}

/** v0's storage format: ISO string, year 0 when the question has no year. */
export function writeDate(date: Date, includeYear: boolean): string {
  const copy = new Date(date)
  if (!includeYear) copy.setFullYear(0)
  return copy.toISOString()
}

export function formatDate(
  date: Date,
  includeYear: boolean,
  locale: Locale
): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? 'ja-JP', {
    ...(includeYear && { year: 'numeric' }),
    month: 'long',
    day: 'numeric',
  }).format(date)
}
