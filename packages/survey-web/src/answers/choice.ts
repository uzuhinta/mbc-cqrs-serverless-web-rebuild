/** v0 stores an "other" choice as `'other'` or `'other:<free text>'`. */
export const OTHER_VALUE = 'other'
const PREFIX = `${OTHER_VALUE}:`

export function isOtherValue(value: string): boolean {
  return value === OTHER_VALUE || value.startsWith(PREFIX)
}

export function otherText(value: string): string {
  return value.startsWith(PREFIX) ? value.slice(PREFIX.length) : ''
}

export function toOtherValue(text: string): string {
  return text.trim() ? `${PREFIX}${text}` : OTHER_VALUE
}
