import { describe, expect, it } from 'vitest'

import { V0_DATA, V0_DATA_ODD, V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterData, parseMasterSetting } from './parse'
import type { MasterData, MasterField, MasterSetting } from './types'
import {
  dataFields,
  ENTITY_CODE_FIELD,
  ENTITY_NAME_FIELD,
  formatDateValue,
  fromFormValues,
  toFormValues,
} from './values'

function parsed<T>(
  result: { success: true; data: T } | { success: false; error: Error }
): T {
  if (!result.success) throw result.error
  return result.data
}
const setting = (): MasterSetting => parsed(parseMasterSetting(V0_SETTING))
const record = (): MasterData => parsed(parseMasterData(V0_DATA))
const odd = (): MasterData => parsed(parseMasterData(V0_DATA_ODD))

describe('dataFields', () => {
  it('adds record-level code and name inputs only when the setting lacks them', () => {
    expect(dataFields(setting())).toEqual(setting().attributes.fields)
    const bare = { ...setting(), attributes: { description: '', fields: [] } }
    expect(dataFields(bare)).toEqual([ENTITY_CODE_FIELD, ENTITY_NAME_FIELD])
  })
})

describe('toFormValues', () => {
  it('uses each field’s default for a new record', () => {
    const values = toFormValues(dataFields(setting()))
    expect(values).toMatchObject({
      code: '',
      seq: '',
      active: true,
      tags: [],
      spec: '{"size":"M"}',
      released: '',
    })
  })

  it('shows a stored record, its own code / name / seq winning', () => {
    const values = toFormValues(dataFields(setting()), {
      ...record(),
      attributes: { ...record().attributes, name: 'old', seq: '9' },
    })
    expect(values).toMatchObject({
      code: 'P-001',
      name: 'りんご',
      seq: '3',
      price: '1200',
      active: true,
      tags: ['fruit', 'red'],
      spec: '{\n  "size": "L"\n}',
    })
  })
})

describe('fromFormValues', () => {
  it('saves an untouched record with exactly the stored attributes', () => {
    const fields = dataFields(setting())
    const data = record()
    expect(
      fromFormValues(fields, toFormValues(fields, data), data.attributes)
    ).toEqual(data.attributes)
  })

  it('adds only v0’s code / name / seq copies to a record that lacked them', () => {
    const fields = dataFields(setting())
    const data = odd()
    expect(
      fromFormValues(fields, toFormValues(fields, data), data.attributes)
    ).toEqual({
      ...data.attributes,
      code: 'P-002',
      name: 'みかん',
      seq: '0',
    })
  })

  it('stores edits the way v0 did and keeps keys no field owns', () => {
    const fields = dataFields(setting())
    const data = odd()
    const values = {
      ...toFormValues(fields, data),
      price: '1000',
      active: false,
      spec: '{"size":"XL"}',
      tags: ['new'],
    }
    expect(fromFormValues(fields, values, data.attributes)).toMatchObject({
      price: 1000,
      active: 'false',
      spec: { size: 'XL' },
      tags: ['new'],
      released: '2026-10-07T10:30:00+09:00',
    })
    expect(
      fromFormValues(
        fields,
        { ...toFormValues(fields, record()), sku: 'AP-2' },
        record().attributes
      )
    ).toMatchObject({ importedBy: 'batch-7', sku: 'AP-2' })
  })

  it('sends a cleared number as empty: the backend keeps a key left out', () => {
    const fields = dataFields(setting())
    const data = odd()
    expect(data.attributes.price).toBe(980)
    const values = { ...toFormValues(fields, data), price: '' }
    expect(fromFormValues(fields, values, data.attributes)).toHaveProperty(
      'price',
      ''
    )
  })

  it('never writes the record-level code / name inputs into attributes', () => {
    const bare = { ...setting(), attributes: { description: '', fields: [] } }
    expect(fromFormValues(dataFields(bare), { code: 'X', name: 'Y' })).toEqual(
      {}
    )
  })

  it('does not treat inherited object properties as stored attributes', () => {
    const fields: MasterField[] = [
      {
        physicalName: 'constructor',
        name: '構築',
        dataType: 'string',
        isRequired: false,
        isShowedOnList: false,
      },
    ]
    const data: MasterData = {
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'c',
      name: 'n',
      version: 1,
      attributes: { other: 1 },
    }
    expect(toFormValues(fields, data)['constructor']).toBe('')
    expect(
      fromFormValues(fields, toFormValues(fields, data), data.attributes)
    ).toEqual({ other: 1 })
  })

  it('leaves an untouched update alone where fields have non-empty defaults', () => {
    const fields: MasterField[] = [
      {
        physicalName: 'flag',
        name: 'F',
        dataType: 'boolean',
        defaultValue: 'true',
        isRequired: false,
        isShowedOnList: false,
      },
      {
        physicalName: 'label',
        name: 'L',
        dataType: 'string',
        defaultValue: 'x',
        isRequired: false,
        isShowedOnList: false,
      },
    ]
    const data: MasterData = {
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'c',
      name: 'n',
      version: 1,
      attributes: { other: 1 },
    }
    expect(
      fromFormValues(fields, toFormValues(fields, data), data.attributes)
    ).toEqual({ other: 1 })
  })

  it('writes an off switch when the field’s default is on', () => {
    const fields: MasterField[] = [
      {
        physicalName: 'active',
        name: '有効',
        dataType: 'boolean',
        defaultValue: 'true',
        isRequired: false,
        isShowedOnList: false,
      },
    ]
    expect(fromFormValues(fields, { active: false })).toEqual({
      active: false,
    })
  })
})

describe('formatDateValue', () => {
  it('writes v0’s local date-time with the offset', () => {
    const date = new Date(2026, 9, 7, 9, 5, 3)
    const offset = -date.getTimezoneOffset()
    const sign = offset >= 0 ? '+' : '-'
    const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
    const mm = String(Math.abs(offset) % 60).padStart(2, '0')
    expect(formatDateValue(date)).toBe(`2026-10-07T09:05:03${sign}${hh}:${mm}`)
  })
})
