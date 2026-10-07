import { describe, expect, it } from 'vitest'

import { V0_DATA, V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterData, parseMasterSetting } from './parse'
import { settingCodeOf, toDataPayload } from './payload'
import type { MasterData, MasterSetting } from './types'
import { dataFields, toFormValues } from './values'

function setting(): MasterSetting {
  const result = parseMasterSetting(V0_SETTING)
  if (!result.success) throw result.error
  return result.data
}
function record(): MasterData {
  const result = parseMasterData(V0_DATA)
  if (!result.success) throw result.error
  return result.data
}

describe('toDataPayload', () => {
  it('builds v0’s create body with the generated code', () => {
    const values = {
      ...toFormValues(dataFields(setting())),
      name: 'ぶどう',
      price: '300',
      seq: '',
    }
    const body = toDataPayload(setting(), values, {
      mode: 'create',
      generatedCode: 'P-010',
    })
    expect(body).toMatchObject({
      settingCode: 'PRODUCT',
      code: 'P-010',
      name: 'ぶどう',
      attributes: { code: 'P-010', name: 'ぶどう', price: '300', active: true },
    })
    expect('seq' in body).toBe(false)
  })

  it('refuses to create an auto-numbered record without a generated code', () => {
    expect(() =>
      toDataPayload(setting(), toFormValues(dataFields(setting())), {
        mode: 'create',
      })
    ).toThrow('generatedCode')
  })

  it('uses typed code / name when the setting has no such fields', () => {
    const bare = { ...setting(), attributes: { description: '', fields: [] } }
    expect(
      toDataPayload(bare, { code: ' C1 ', name: 'N1' }, { mode: 'create' })
    ).toEqual({
      settingCode: 'PRODUCT',
      code: 'C1',
      name: 'N1',
      attributes: { code: 'C1' },
    })
  })

  it('builds v0’s update body: seq is a number, 0 when empty; untouched attributes unchanged', () => {
    const data = record()
    const values = toFormValues(dataFields(setting()), data)
    expect(
      toDataPayload(setting(), values, { mode: 'update', previous: data })
    ).toEqual({
      name: 'りんご',
      seq: 3,
      attributes: data.attributes,
    })
    expect(
      toDataPayload(
        setting(),
        { ...values, seq: '' },
        { mode: 'update', previous: data }
      ).seq
    ).toBe(0)
  })
})

describe('settingCodeOf', () => {
  it('strips the MASTER_SETTING# prefix list rows carry', () => {
    expect(settingCodeOf({ code: 'MASTER_SETTING#PRODUCT' })).toBe('PRODUCT')
    expect(settingCodeOf({ code: 'PRODUCT' })).toBe('PRODUCT')
  })
})
