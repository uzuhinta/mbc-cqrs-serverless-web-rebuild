import { describe, expect, it } from 'vitest'

import { V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterSetting } from './parse'
import type { MasterField, MasterSetting } from './types'
import { validateMasterData } from './validate'
import { dataFields, toFormValues } from './values'

function setting(): MasterSetting {
  const result = parseMasterSetting(V0_SETTING)
  if (!result.success) throw result.error
  return result.data
}

const codeField = (dataType: string): MasterField => ({
  physicalName: 'code',
  name: 'コード',
  dataType,
  isRequired: false,
  isShowedOnList: true,
})

describe('validateMasterData', () => {
  it('reports one error per field, required first', () => {
    const fields = dataFields(setting())
    const values = {
      ...toFormValues(fields),
      name: '',
      price: '-5',
      sku: 'toolong-sku',
      memo: 'a\nb\nc\nd',
      spec: '{oops',
    }
    expect(validateMasterData(fields, values, { mode: 'create' })).toEqual({
      name: { key: 'required' },
      price: { key: 'min', params: { min: 0 } },
      sku: { key: 'maxLength', params: { max: 8 } },
      memo: { key: 'maxRows', params: { max: 3 } },
      spec: { key: 'json' },
    })
  })

  it('requires a typed code on create, even when the field is optional, and rejects spaces', () => {
    const fields = [codeField('string')]
    expect(
      validateMasterData(fields, { code: '' }, { mode: 'create' }),
    ).toEqual({
      code: { key: 'required' },
    })
    expect(
      validateMasterData(fields, { code: '  ' }, { mode: 'create' }),
    ).toEqual({
      code: { key: 'blank' },
    })
    expect(
      validateMasterData(fields, { code: '' }, { mode: 'update' }),
    ).toEqual({})
    expect(
      validateMasterData(
        [codeField('auto_number')],
        { code: '' },
        { mode: 'create' },
      ),
    ).toEqual({})
  })

  it('accepts a required switch that is off, and checks a missing value as empty', () => {
    const fields: MasterField[] = [
      {
        physicalName: 'ok',
        name: 'OK',
        dataType: 'boolean',
        isRequired: true,
        isShowedOnList: false,
      },
      {
        physicalName: 'list',
        name: 'L',
        dataType: 'array',
        isRequired: true,
        isShowedOnList: false,
      },
    ]
    expect(
      validateMasterData(fields, { ok: false }, { mode: 'create' }),
    ).toEqual({
      list: { key: 'required' },
    })
  })
})
