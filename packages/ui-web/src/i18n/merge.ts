function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep-merges message overrides into a base tree without mutating either. */
export function mergeMessages<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return base

  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    const current = result[key]
    result[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeMessages(current, value)
        : value
  }
  return result as T
}
