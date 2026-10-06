export type IdFactory = (prefix: 'q' | 'sec') => string

let counter = 0

/**
 * Stable item ids (`q_…`, `sec_…`). They are form field names and branch
 * targets, so they must be unique and contain neither `.` nor `[`.
 * `crypto.randomUUID` is missing on insecure origins, hence the fallback.
 */
export const createId: IdFactory = (prefix) => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `${prefix}_${uuid.replaceAll('-', '')}`
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}${random}`
}
