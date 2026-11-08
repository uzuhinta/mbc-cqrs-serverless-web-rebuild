import { describe, expect, it } from 'vitest'

import { V0_SETTING } from '../../test/fixtures/v0-master'
import { defaultSettingFields } from './field-definition'
import { parseMasterSetting } from './parse'
import {
  applyFieldDialog,
  fieldFromForm,
  fieldToForm,
  formatCodeOf,
  settingToForm,
  toSettingPayload,
  validateSettingForm,
  type SequenceFormat,
} from './setting-form'
import type { MasterField, MasterSetting } from './types'

function stored(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
  { code: 'SEQ#ORDER', name: '注文番号', format: 'O-%%no%%' },
]

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'memo',
  name: 'メモ',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
  ...overrides,
})

describe('settingToForm', () => {
  it('starts a new setting with empty inputs and v0’s three fixed fields', () => {
    const form = settingToForm(undefined, ['flagA'])
    expect(form.values).toEqual({
      code: '',
      name: '',
      description: '',
      options: { flagA: false },
    })
    expect(form.fields).toEqual(defaultSettingFields)
    expect(form.fields[0]).not.toBe(defaultSettingFields[0])
  })

  it('names the fixed fields it adds in the screen’s language when given names', () => {
    const names = { code: 'Code', name: 'Name', seq: 'Order' }
    expect(
      settingToForm(undefined, [], names).fields.map((f) => f.name)
    ).toEqual(['Code', 'Name', 'Order'])
    // A stored setting's own names stay.
    expect(settingToForm(stored(), [], names).fields[1]?.name).toBe('名称')
  })

  it('reads a stored setting, its option flags and its fields', () => {
    const setting = stored()
    setting.attributes.flagA = true
    const form = settingToForm(setting, ['flagA', 'flagB'])
    expect(form.values).toEqual({
      code: 'PRODUCT',
      name: '商品',
      description: '商品マスタ',
      options: { flagA: true, flagB: false },
    })
    expect(form.fields.map((f) => f.physicalName)).toEqual(
      setting.attributes.fields.map((f) => f.physicalName)
    )
  })

  it('reads a flag stored as the string "true" as on (v0’s switch did)', () => {
    const setting = stored()
    setting.attributes.flagA = 'true'
    setting.attributes.flagB = 'false'
    const form = settingToForm(setting, ['flagA', 'flagB'])
    expect(form.values.options).toEqual({ flagA: true, flagB: false })
  })

  it('adds the fixed fields a stored setting lacks, in front (v0)', () => {
    const setting = stored()
    setting.attributes.fields = [field({ physicalName: 'name', name: '名前' })]
    const names = settingToForm(setting, []).fields.map((f) => f.physicalName)
    expect(names).toEqual(['code', 'seq', 'name'])
  })
})

describe('field conversions', () => {
  it('edits a JSON default as text and stores it parsed again', () => {
    const json = field({ dataType: 'json', defaultValue: { size: 'L' } })
    const form = fieldToForm(json)
    expect(form.defaultValue).toBe('{"size":"L"}')
    expect(fieldFromForm(form).defaultValue).toEqual({ size: 'L' })
    // A JSON default v0 stored as a string survives the round trip.
    const text = field({ dataType: 'json', defaultValue: '{"a":1}' })
    expect(fieldFromForm(fieldToForm(text)).defaultValue).toBe('{"a":1}')
    expect(fieldFromForm(field({ dataType: 'json' })).defaultValue).toBe('')
  })

  it('keeps a JSON default of 0, false or null through a save', () => {
    for (const defaultValue of [0, false, null]) {
      const stored = field({ dataType: 'json', defaultValue })
      expect(fieldFromForm(fieldToForm(stored)).defaultValue).toEqual(
        defaultValue
      )
    }
  })

  it('edits a boolean default as "true" / "false" and stores a boolean (v0)', () => {
    expect(
      fieldToForm(field({ dataType: 'boolean', defaultValue: true }))
        .defaultValue
    ).toBe('true')
    expect(
      fieldFromForm(field({ dataType: 'boolean', defaultValue: 'true' }))
        .defaultValue
    ).toBe(true)
    expect(fieldFromForm(field({ dataType: 'boolean' })).defaultValue).toBe(
      false
    )
  })

  it('marks every stored field with v0’s uiComponent and keeps unknown keys', () => {
    const stored = fieldFromForm(field({ extra: 1, uiComponent: 'other' }))
    expect(stored).toMatchObject({ extra: 1, uiComponent: 'string' })
  })
})

describe('applyFieldDialog', () => {
  it('stores the chosen sequence as v0 did: its code, its format and its name', () => {
    const code = field({ physicalName: 'code', dataType: 'auto_number' })
    expect(applyFieldDialog(code, FORMATS[1])).toMatchObject({
      formatCode: 'SEQ#ORDER',
      dataFormat: 'O-%%no%%',
      formatName: '注文番号',
    })
  })

  it('drops options the type does not use, including the sequence', () => {
    const changed = field({
      dataType: 'number',
      length: '10',
      min: '1',
      formatCode: 'SEQ#ORDER',
      dataFormat: 'O-%%no%%',
      formatName: '注文番号',
      prefix: 'P',
    })
    const result = applyFieldDialog(changed, undefined)
    expect(result).toMatchObject({ min: '1' })
    for (const key of [
      'length',
      'formatCode',
      'dataFormat',
      'formatName',
      'prefix',
    ])
      expect(result).not.toHaveProperty(key)
  })
})

describe('formatCodeOf', () => {
  it('finds the sequence by its code, or by the format v0 sometimes stored there', () => {
    const code = (overrides: Partial<MasterField>) =>
      field({ physicalName: 'code', dataType: 'auto_number', ...overrides })
    expect(formatCodeOf(code({ formatCode: 'SEQ#ORDER' }), FORMATS)).toBe(
      'SEQ#ORDER'
    )
    expect(formatCodeOf(code({ dataFormat: 'SEQ#PRODUCT' }), FORMATS)).toBe(
      'SEQ#PRODUCT'
    )
    expect(formatCodeOf(code({ dataFormat: '%%no%%' }), FORMATS)).toBe('')
  })
})

describe('validateSettingForm', () => {
  it('needs a code and a name that are not only spaces', () => {
    const values = { code: '', name: '  ', description: '', options: {} }
    expect(validateSettingForm(values)).toEqual({
      code: { key: 'required' },
      name: { key: 'blank' },
    })
    expect(validateSettingForm({ ...values, code: 'A', name: 'B' })).toEqual({})
  })
})

describe('toSettingPayload', () => {
  const values = {
    code: ' NEW ',
    name: '新規',
    description: '説明',
    options: { flagA: true },
  }

  it('creates with a trimmed code and the attributes twice, as settingValue too (v0)', () => {
    const body = toSettingPayload(values, settingToForm(undefined, []).fields, {
      mode: 'create',
    })
    expect(body).toEqual({
      code: 'NEW',
      name: '新規',
      attributes: body.attributes,
      settingValue: body.attributes,
    })
    expect(body.attributes).toMatchObject({ description: '説明', flagA: true })
    expect(body.attributes.fields).toHaveLength(3)
  })

  it('updates the attributes and keeps keys this editor does not know', () => {
    const previous = stored()
    const form = settingToForm(previous, [])
    const body = toSettingPayload(
      { ...form.values, name: '商品2' },
      form.fields,
      { mode: 'update', previous }
    )
    expect(body).not.toHaveProperty('settingValue')
    expect(body).toMatchObject({ code: 'PRODUCT', name: '商品2' })
    expect(body.attributes.extraFlag).toBe(true)
    expect(body.attributes.fields).toHaveLength(
      previous.attributes.fields.length
    )
  })

  it('keeps a flag stored as a string while its switch is unchanged', () => {
    const previous = stored()
    previous.attributes.flagA = 'true'
    previous.attributes.flagB = 'false'
    const form = settingToForm(previous, ['flagA', 'flagB'])
    const body = toSettingPayload(form.values, form.fields, {
      mode: 'update',
      previous,
    })
    expect(body.attributes).toMatchObject({ flagA: 'true', flagB: 'false' })
  })

  it('saves a boolean for a flag whose switch was changed', () => {
    const previous = stored()
    previous.attributes.flagA = 'true'
    const form = settingToForm(previous, ['flagA'])
    const body = toSettingPayload(
      { ...form.values, options: { flagA: false } },
      form.fields,
      { mode: 'update', previous }
    )
    expect(body.attributes.flagA).toBe(false)
  })
})
