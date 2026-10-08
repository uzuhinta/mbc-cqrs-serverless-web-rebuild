import { describe, expect, it } from 'vitest'

import { V0_DATA, V0_SETTING } from '../../test/fixtures/v0-master'
import { dataJson, parseDataJson } from './data-json'
import { parseMasterData, parseMasterSetting } from './parse'
import type { MasterData, MasterSetting } from './types'
import { dataFields, toFormValues } from './values'

function setting(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

function record(): MasterData {
  const parsed = parseMasterData(V0_DATA)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

describe('dataJson', () => {
  it('writes v0’s shape with every field: defaults, and v0’s empty value for the rest', () => {
    const values = toFormValues(dataFields(setting()))
    const json = JSON.parse(dataJson(setting(), values))
    expect(Object.keys(json)).toEqual([
      'settingCode',
      'code',
      'name',
      'attributes',
    ])
    expect(json.settingCode).toBe('PRODUCT')
    expect(json.attributes).toMatchObject({
      price: 0,
      // Defaults: the switch is on, the JSON is parsed.
      active: true,
      spec: { size: 'M' },
      tags: [],
      memo: '',
    })
  })

  it('writes a stored record as it would be saved, keys no field owns included', () => {
    const stored = record()
    const values = toFormValues(dataFields(setting()), stored)
    const json = JSON.parse(dataJson(setting(), values, stored))
    expect(json).toMatchObject({ code: 'P-001', name: 'りんご', seq: 3 })
    expect(json.attributes).toMatchObject({
      price: '1200',
      spec: { size: 'L' },
      importedBy: 'batch-7',
    })
  })
})

describe('parseDataJson', () => {
  it('reads back what dataJson wrote', () => {
    const stored = record()
    const values = toFormValues(dataFields(setting()), stored)
    const result = parseDataJson(dataJson(setting(), values, stored), setting())
    expect(result).toEqual({ ok: true, values })
  })

  it('refuses text that is not JSON, and a record without settingCode, code or name (v0)', () => {
    expect(parseDataJson('{', setting())).toEqual({
      ok: false,
      error: { key: 'invalidJson' },
    })
    const invalid = { ok: false, error: { key: 'invalidData' } }
    expect(parseDataJson('[]', setting())).toEqual(invalid)
    expect(
      parseDataJson(
        JSON.stringify({ settingCode: 'PRODUCT', code: 'A', name: '' }),
        setting()
      )
    ).toEqual(invalid)
    expect(
      parseDataJson(
        JSON.stringify({
          settingCode: 'PRODUCT',
          code: 'A',
          name: 'B',
          attributes: [],
        }),
        setting()
      )
    ).toEqual(invalid)
  })
})
