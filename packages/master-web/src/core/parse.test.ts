import { describe, expect, it } from 'vitest'

import { V0_DATA, V0_DATA_ODD, V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterData, parseMasterSetting, publicRow } from './parse'

describe('parseMasterSetting', () => {
  it('reads a v0 setting and keeps every key it does not know', () => {
    const result = parseMasterSetting(V0_SETTING)
    if (!result.success) throw result.error
    const setting = result.data

    expect(setting.code).toBe('PRODUCT')
    expect(setting.attributes.fields).toHaveLength(12)
    expect(setting.type).toBe('MASTER')
    expect(setting.attributes.extraFlag).toBe(true)
    expect(setting.attributes.fields[1]).toMatchObject({
      length: '255',
      uiComponent: 'string',
    })
    expect(setting.attributes.fields[4]?.defaultValue).toBe('true')
  })

  it('fills what v0 sometimes left out', () => {
    const result = parseMasterSetting({
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'C',
      name: 'N',
      attributes: {
        fields: [
          {
            physicalName: 'x',
            name: 'X',
            dataType: 'string',
            isRequired: 'true',
            min: null,
          },
        ],
      },
    })
    if (!result.success) throw result.error
    expect(result.data.version).toBe(0)
    expect(result.data.attributes.description).toBe('')
    expect(result.data.attributes.fields[0]).toMatchObject({
      isRequired: true,
      isShowedOnList: false,
    })
    expect(result.data.attributes.fields[0]?.min).toBeUndefined()
  })

  it('treats a missing attributes object as an empty setting', () => {
    const result = parseMasterSetting({
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'C',
      name: 'N',
    })
    if (!result.success) throw result.error
    expect(result.data.attributes).toEqual({ description: '', fields: [] })
  })

  it('still loads a setting with an odd field, so it can be opened and fixed', () => {
    const result = parseMasterSetting({
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'C',
      name: 'N',
      attributes: {
        fields: [{ physicalName: 'x' }, { name: 'Y', dataType: 3 }],
      },
    })
    if (!result.success) throw result.error
    expect(result.data.attributes.fields).toMatchObject([
      { physicalName: 'x', name: '', dataType: 'string' },
      { physicalName: '', name: 'Y', dataType: 'string' },
    ])
  })

  it('still loads a field whose optional texts were stored as other types', () => {
    const result = parseMasterSetting({
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'C',
      name: 'N',
      attributes: {
        fields: [
          {
            physicalName: 'x',
            name: 'X',
            dataType: 'string',
            description: true,
            pattern: 5,
            dataFormat: 1,
            formatCode: 2,
            formatName: 3,
            prefix: 100,
            postfix: 200,
          },
        ],
      },
    })
    if (!result.success) throw result.error
    expect(result.data.attributes.fields[0]).toMatchObject({
      description: 'true',
      pattern: '5',
      dataFormat: '1',
      formatCode: '2',
      formatName: '3',
      prefix: '100',
      postfix: '200',
    })
  })

  it('loads a setting whose fields are not a list as one with no fields', () => {
    const result = parseMasterSetting({
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'C',
      name: 'N',
      attributes: { fields: { code: {} } },
    })
    if (!result.success) throw result.error
    expect(result.data.attributes.fields).toEqual([])
  })
})

describe('parseMasterData', () => {
  it('reads a v0 record and keeps unknown attributes', () => {
    const result = parseMasterData(V0_DATA)
    if (!result.success) throw result.error
    expect(result.data.seq).toBe(3)
    expect(result.data.attributes.importedBy).toBe('batch-7')
    expect(result.data.attributes.price).toBe('1200')
  })

  it('accepts null seq and odd attribute types', () => {
    const result = parseMasterData(V0_DATA_ODD)
    if (!result.success) throw result.error
    expect(result.data.seq).toBeUndefined()
    expect(result.data.attributes.price).toBe(980)
    expect(result.data.attributes.tags).toBeNull()
  })
})

describe('publicRow', () => {
  it('keeps a string systemId and drops null or empty', () => {
    expect(publicRow({ id: 'a', systemId: 'app-a' })).toEqual({
      id: 'a',
      systemId: 'app-a',
    })
    expect(publicRow({ id: 'a', systemId: null })).not.toHaveProperty(
      'systemId'
    )
    expect(publicRow({ id: 'a', systemId: '' })).not.toHaveProperty('systemId')
  })

  it('drops the reserved owner attribute', () => {
    expect(
      publicRow({ id: 'a', attributes: { __systemId: 'x', keep: 1 } })
    ).toEqual({ id: 'a', attributes: { keep: 1 } })
  })

  it('returns what is not an object as it is', () => {
    expect(publicRow(null)).toBeNull()
    expect(publicRow('x')).toBe('x')
  })
})

describe('systemId on parsed rows', () => {
  type Row = Record<string, unknown> & { attributes: Record<string, unknown> }
  const v0Setting = V0_SETTING as Row
  const v0Data = V0_DATA as Row

  it('keeps a setting’s and a record’s owner and drops the reserved attribute', () => {
    const setting = parseMasterSetting({
      ...v0Setting,
      systemId: 'app-a',
      attributes: { ...v0Setting.attributes, __systemId: 'app-a' },
    })
    expect(setting.success && setting.data.systemId).toBe('app-a')
    expect(setting.success && setting.data.attributes).not.toHaveProperty(
      '__systemId'
    )
    const data = parseMasterData({ ...v0Data, systemId: null })
    expect(data.success && data.data).not.toHaveProperty('systemId')
  })
})
