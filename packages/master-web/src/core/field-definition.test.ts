import { describe, expect, it } from 'vitest'

import {
  allowedFieldTypes,
  defaultSettingFields,
  FIXED_FIELD_NAMES,
  normalizeFieldDefinition,
  validateFieldDefinition,
} from './field-definition'
import type { MasterField } from './types'

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'f',
  name: '項目',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
  ...overrides,
})

describe('defaultSettingFields', () => {
  it('is v0’s code, name and seq', () => {
    expect(FIXED_FIELD_NAMES).toEqual(['code', 'name', 'seq'])
    expect(defaultSettingFields[0]).toMatchObject({
      length: '255',
      isRequired: true,
    })
    expect(Object.isFrozen(defaultSettingFields)).toBe(true)
  })
})

describe('allowedFieldTypes', () => {
  it('offers auto_number only for code', () => {
    expect(allowedFieldTypes('code')).toEqual([
      'string',
      'number',
      'auto_number',
    ])
    expect(allowedFieldTypes('price')).not.toContain('auto_number')
    expect(allowedFieldTypes('price')).toHaveLength(9)
  })
})

describe('validateFieldDefinition', () => {
  it('accepts a valid field', () => {
    expect(validateFieldDefinition(field({ length: '20' }), [])).toEqual({})
  })

  it('checks names: required, at most 255, no . [ ], unique', () => {
    expect(
      validateFieldDefinition(field({ physicalName: ' ', name: '' }), []),
    ).toEqual({
      physicalName: { key: 'required' },
      name: { key: 'required' },
    })
    expect(
      validateFieldDefinition(field({ physicalName: 'a'.repeat(256) }), [])
        .physicalName,
    ).toEqual({ key: 'tooLong', params: { max: 255 } })
    expect(
      validateFieldDefinition(field({ physicalName: 'a.b' }), []).physicalName,
    ).toEqual({
      key: 'nameChars',
    })
    expect(
      validateFieldDefinition(field({ physicalName: 'price' }), [
        field({ physicalName: 'price' }),
      ]).physicalName,
    ).toEqual({ key: 'duplicate' })
  })

  it('allows auto_number only on code, and asks code for its format', () => {
    expect(
      validateFieldDefinition(field({ dataType: 'auto_number' }), []).dataType,
    ).toEqual({
      key: 'typeNotAllowed',
    })
    expect(
      validateFieldDefinition(
        field({ physicalName: 'code', dataType: 'auto_number' }),
        [],
      ),
    ).toEqual({ dataFormat: { key: 'formatRequired' } })
    expect(
      validateFieldDefinition(field({ dataType: 'text' }), []).dataType,
    ).toEqual({
      key: 'typeNotAllowed',
    })
  })

  it('applies v0’s option rules', () => {
    expect(validateFieldDefinition(field({ length: '0' }), []).length).toEqual({
      key: 'lengthRange',
    })
    expect(validateFieldDefinition(field({ length: 'x' }), []).length).toEqual({
      key: 'numeric',
    })
    expect(
      validateFieldDefinition(
        field({ dataType: 'number', min: '5', max: '5' }),
        [],
      ),
    ).toEqual({ min: { key: 'minNotLess' }, max: { key: 'maxNotGreater' } })
    expect(
      validateFieldDefinition(field({ dataType: 'text-area', maxRow: '0' }), [])
        .maxRow,
    ).toEqual({ key: 'maxRowMin' })
  })

  it('checks the default value against the type', () => {
    expect(
      validateFieldDefinition(
        field({ dataType: 'number', min: '1', max: '9', defaultValue: '10' }),
        [],
      ).defaultValue,
    ).toEqual({ key: 'defaultRange' })
    expect(
      validateFieldDefinition(
        field({ dataType: 'json', defaultValue: '{x' }),
        [],
      ).defaultValue,
    ).toEqual({ key: 'defaultJson' })
    expect(
      validateFieldDefinition(
        field({ dataType: 'boolean', defaultValue: 'yes' }),
        [],
      ).defaultValue,
    ).toEqual({ key: 'defaultBoolean' })
    expect(
      validateFieldDefinition(field({ length: '2', defaultValue: 'abc' }), [])
        .defaultValue,
    ).toEqual({ key: 'defaultLength' })
  })
})

describe('normalizeFieldDefinition', () => {
  it('keeps only the options of the field’s type and v0’s stored forms', () => {
    expect(
      normalizeFieldDefinition(
        field({
          dataType: 'boolean',
          length: '9',
          min: '1',
          defaultValue: true,
          maxRow: '3',
          uiComponent: 'switch',
        }),
      ),
    ).toEqual(
      field({
        dataType: 'boolean',
        defaultValue: 'true',
        maxRow: 3,
        uiComponent: 'switch',
      }),
    )
  })
})
