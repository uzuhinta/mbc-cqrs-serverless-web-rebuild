/** v0's field types, in v0's order (the settings editor lists them this way). */
export const MASTER_FIELD_TYPES = [
  'string',
  'number',
  'auto_number',
  'boolean',
  'date',
  'array',
  'json',
  'text-area',
  'text-html',
  'text-markdown',
] as const

export type MasterFieldType = (typeof MASTER_FIELD_TYPES)[number]

export function isMasterFieldType(value: string): value is MasterFieldType {
  return (MASTER_FIELD_TYPES as readonly string[]).includes(value)
}
