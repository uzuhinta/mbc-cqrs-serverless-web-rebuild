import { describe, expect, it } from 'vitest'

import { MASTER_FIELD_TYPES } from './field-type-names'
import { fieldTypeOf, fieldTypes, numberOption } from './field-types'
import type { MasterField } from './types'

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'f',
  name: '項目',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
  ...overrides,
})

describe('fieldTypes', () => {
  it('defines all ten v0 types with v0’s editor options', () => {
    expect(Object.keys(fieldTypes).sort()).toEqual(
      [...MASTER_FIELD_TYPES].sort()
    )
    expect(fieldTypes.string.options).toEqual(['length', 'pattern'])
    expect(fieldTypes.number.options).toEqual(['min', 'max'])
    expect(fieldTypes.auto_number.options).toEqual(['format'])
    expect(fieldTypes['text-area'].options).toEqual(['maxRow'])
    expect(fieldTypes.array.hasDefault).toBe(false)
    expect(fieldTypes.auto_number.hasDefault).toBe(false)
    expect(fieldTypes.boolean.hasDefault).toBe(true)
  })

  it('treats an unknown stored type as string', () => {
    expect(fieldTypeOf({ dataType: 'text' })).toBe(fieldTypes.string)
    expect(fieldTypeOf({ dataType: 'json' })).toBe(fieldTypes.json)
  })

  it('turns whatever was stored into an input value without throwing', () => {
    expect(fieldTypes.string.toFormValue(undefined)).toBe('')
    expect(fieldTypes.string.toFormValue(42)).toBe('42')
    expect(fieldTypes.number.toFormValue(980)).toBe('980')
    expect(fieldTypes.number.toFormValue('1200')).toBe('1200')
    expect(fieldTypes.boolean.toFormValue('true')).toBe(true)
    expect(fieldTypes.boolean.toFormValue('false')).toBe(false)
    expect(fieldTypes.boolean.toFormValue(undefined)).toBe(false)
    expect(fieldTypes.array.toFormValue(['a', 2])).toEqual(['a', '2'])
    expect(fieldTypes.array.toFormValue(null)).toEqual([])
    expect(fieldTypes.array.toFormValue('one')).toEqual(['one'])
    expect(fieldTypes.json.toFormValue({ a: 1 })).toBe('{\n  "a": 1\n}')
    expect(fieldTypes.json.toFormValue('{"a":1}')).toBe('{"a":1}')
    expect(fieldTypes.date.toFormValue('2026-10-07T10:30:00+09:00')).toBe(
      '2026-10-07T10:30:00+09:00'
    )
  })

  it('stores input values the way v0 did, keeping a number stored as a number', () => {
    expect(fieldTypes.number.fromFormValue(' 12 ', undefined)).toBe('12')
    expect(fieldTypes.number.fromFormValue('12', '7')).toBe('12')
    expect(fieldTypes.number.fromFormValue('12', 7)).toBe(12)
    expect(fieldTypes.number.fromFormValue('', 7)).toBeUndefined()
    expect(fieldTypes.boolean.fromFormValue(true, undefined)).toBe(true)
    expect(fieldTypes.boolean.fromFormValue(false, 'true')).toBe('false')
    expect(fieldTypes.json.fromFormValue('{"a":1}', undefined)).toEqual({
      a: 1,
    })
    expect(fieldTypes.json.fromFormValue('  ', undefined)).toBe('')
    expect(fieldTypes.json.fromFormValue('{oops', undefined)).toBe('{oops')
    expect(fieldTypes.array.fromFormValue(['a', ''], undefined)).toEqual([
      'a',
      '',
    ])
  })

  it('applies v0’s rules to non-empty values', () => {
    const sku = field({ length: '4', pattern: '^[A-Z]+$', name: 'SKU' })
    expect(fieldTypes.string.validate('', sku)).toBeNull()
    expect(fieldTypes.string.validate('ABCDE', sku)).toEqual({
      key: 'maxLength',
      params: { max: 4 },
    })
    expect(fieldTypes.string.validate('ab', sku)).toEqual({
      key: 'pattern',
      params: { name: 'SKU' },
    })
    expect(fieldTypes.string.validate('x', field({ pattern: '([' }))).toEqual({
      key: 'pattern',
      params: { name: '項目' },
    })

    const price = field({ dataType: 'number', min: '0', max: '100' })
    expect(fieldTypes.number.validate('1.5', price)).toEqual({ key: 'integer' })
    expect(fieldTypes.number.validate('-1', price)).toEqual({
      key: 'min',
      params: { min: 0 },
    })
    expect(fieldTypes.number.validate('101', price)).toEqual({
      key: 'max',
      params: { max: 100 },
    })
    expect(fieldTypes.number.validate('', price)).toBeNull()

    const memo = field({ dataType: 'text-area', maxRow: 2 })
    expect(fieldTypes['text-area'].validate('a\nb\nc', memo)).toEqual({
      key: 'maxRows',
      params: { max: 2 },
    })
    expect(fieldTypes.json.validate('{oops', field({}))).toEqual({
      key: 'json',
    })
  })

  it('ignores a length below 1, as v0 did', () => {
    expect(fieldTypes.string.validate('abc', field({ length: '0' }))).toBeNull()
  })

  it('never counts a switch as empty, and an empty list as empty', () => {
    expect(fieldTypes.boolean.isEmpty(false)).toBe(false)
    expect(fieldTypes.array.isEmpty([])).toBe(true)
    expect(fieldTypes.number.isEmpty('  ')).toBe(true)
    expect(fieldTypes.string.isEmpty(' ')).toBe(false)
  })
})

describe('numberOption', () => {
  it('reads v0’s string options and ignores what is not a number', () => {
    expect(numberOption('255')).toBe(255)
    expect(numberOption(3)).toBe(3)
    expect(numberOption('')).toBeUndefined()
    expect(numberOption('abc')).toBeUndefined()
    expect(numberOption(undefined)).toBeUndefined()
  })
})
