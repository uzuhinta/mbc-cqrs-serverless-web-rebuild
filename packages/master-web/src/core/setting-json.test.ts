import { describe, expect, it } from 'vitest'

import { V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterSetting } from './parse'
import { settingToForm } from './setting-form'
import { parseSettingJson, settingJson } from './setting-json'

function stored() {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

const minimal = (fields: unknown[]) =>
  JSON.stringify({ code: 'P', name: '商品', attributes: { fields } })

const FIELD = {
  physicalName: 'code',
  name: 'コード',
  dataType: 'string',
  isRequired: true,
  isShowedOnList: true,
}

describe('settingJson', () => {
  it('writes the code, name and attributes as they would be saved', () => {
    const setting = stored()
    const spec = setting.attributes.fields.find((f) => f.dataType === 'json')!
    spec.defaultValue = { size: 'L' }
    const form = settingToForm(setting, [])
    const json = JSON.parse(settingJson(form.values, form.fields))
    expect(Object.keys(json)).toEqual(['code', 'name', 'attributes'])
    expect(json.attributes.description).toBe('商品マスタ')
    // The JSON default is an object again, not the editor's text.
    expect(
      json.attributes.fields.find(
        (field: { dataType: string }) => field.dataType === 'json'
      ).defaultValue
    ).toEqual({ size: 'L' })
  })

  it('reads back what it wrote', () => {
    const form = settingToForm(stored(), [])
    const result = parseSettingJson(settingJson(form.values, form.fields))
    expect(result.ok).toBe(true)
    // Saving marks every field with v0's uiComponent.
    if (result.ok)
      expect(settingToForm(result.setting, []).fields).toEqual(
        form.fields.map((field) => ({ ...field, uiComponent: 'string' }))
      )
  })
})

describe('parseSettingJson', () => {
  it('refuses text that is not JSON', () => {
    expect(parseSettingJson('{')).toEqual({
      ok: false,
      error: { key: 'invalidJson' },
    })
  })

  it('needs a code, a name and fields with v0’s five keys', () => {
    const invalid = { ok: false, error: { key: 'invalidSetting' } }
    expect(parseSettingJson('[]')).toEqual(invalid)
    expect(
      parseSettingJson(JSON.stringify({ code: 'P', name: '', attributes: {} }))
    ).toEqual(invalid)
    expect(
      parseSettingJson(minimal([{ ...FIELD, isRequired: 'yes' }]))
    ).toEqual(invalid)
    expect(parseSettingJson(minimal([FIELD])).ok).toBe(true)
  })

  it('names the first field the field dialog would refuse', () => {
    const result = parseSettingJson(
      minimal([FIELD, { ...FIELD, name: '重複' }])
    )
    expect(result).toEqual({
      ok: false,
      error: {
        key: 'invalidField',
        params: { n: 2, name: 'code' },
        error: { key: 'duplicate' },
      },
    })
  })
})
