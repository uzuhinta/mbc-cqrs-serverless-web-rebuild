import { describe, expect, it } from 'vitest'

import { isMasterFieldType, MASTER_FIELD_TYPES } from './field-type-names'

describe('MASTER_FIELD_TYPES', () => {
  it('lists v0’s ten field types in v0’s order', () => {
    expect(MASTER_FIELD_TYPES).toEqual([
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
    ])
  })

  it('recognises only those names', () => {
    expect(isMasterFieldType('text-area')).toBe(true)
    expect(isMasterFieldType('text')).toBe(false)
  })
})
