import { describe, expect, it } from 'vitest'

import { V0_DATA, V0_DATA_ODD, V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterData, parseMasterSetting } from './parse'

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

  it('rejects a field without a physical name', () => {
    const result = parseMasterSetting({
      id: 'i',
      pk: 'p',
      sk: 's',
      code: 'C',
      name: 'N',
      attributes: { fields: [{ name: 'X', dataType: 'string' }] },
    })
    expect(result.success).toBe(false)
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
