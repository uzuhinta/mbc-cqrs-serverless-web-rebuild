import type { MbcMessage, MessageFilter } from '../messages'

/**
 * One AppSync Events channel segment, made exactly as the backend makes it
 * (`AppSyncEventsService.sanitizeSegment`): non-alphanumerics become `-`,
 * cut to 50 characters, then leading and trailing `-` removed. Channels are
 * case-sensitive, so case is kept.
 */
export function sanitizeSegment(value: string | undefined): string {
  if (!value) return 'none'
  const segment = value
    .replace(/[^a-zA-Z0-9]/g, '-')
    .slice(0, 50)
    .replace(/^-+|-+$/g, '')
  return segment || 'none'
}

/**
 * The channel the backend publishes a filter's messages to:
 * `/{namespace}/{tenantCode}/{action}/{id}`, with `/*` for what the filter
 * leaves open. An id counts only with an action.
 */
export function eventsChannel(
  namespace: string,
  filter: MessageFilter
): string {
  const base = `/${sanitizeSegment(namespace)}/${sanitizeSegment(filter.tenantCode)}`
  if (!filter.action) return `${base}/*`
  const action = `${base}/${sanitizeSegment(filter.action)}`
  return filter.id ? `${action}/${sanitizeSegment(filter.id)}` : `${action}/*`
}

/**
 * Whether a message is one the GraphQL filter would deliver. Sanitized
 * channels can be shared by different values (`a_b` and `a-b`).
 */
export function matchesFilter(
  message: MbcMessage,
  filter: MessageFilter
): boolean {
  if (message.tenantCode !== filter.tenantCode) return false
  if (filter.action !== undefined && message.action !== filter.action)
    return false
  if (filter.id !== undefined && message.id !== filter.id) return false
  return true
}
