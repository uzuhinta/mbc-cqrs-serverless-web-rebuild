import {
  validateFieldDefinition,
  type FieldDefinitionError,
} from './field-definition'
import {
  fieldFromForm,
  fieldToForm,
  type SettingFormValues,
} from './setting-form'
import type { MasterField, MasterSetting } from './types'

/** What the settings editor's JSON dialog edits. */
export type SettingJson = Pick<MasterSetting, 'code' | 'name' | 'attributes'>

export type SettingJsonError =
  | { key: 'invalidJson' }
  | { key: 'invalidSetting' }
  | {
      key: 'invalidField'
      /** `n` counts from 1; `name` is the field's physical name. */
      params: { n: number; name: string }
      error: FieldDefinitionError
    }

export type SettingJsonResult =
  { ok: true; setting: SettingJson } | { ok: false; error: SettingJsonError }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFilled = (value: unknown) => typeof value === 'string' && value !== ''

/** v0's check of one field's keys. */
function isField(value: unknown): value is MasterField {
  return (
    isObject(value) &&
    isFilled(value.physicalName) &&
    isFilled(value.name) &&
    isFilled(value.dataType) &&
    typeof value.isRequired === 'boolean' &&
    typeof value.isShowedOnList === 'boolean'
  )
}

/** The JSON the dialog opens with: the setting as it would be saved. */
export function settingJson(
  values: SettingFormValues,
  fields: readonly MasterField[]
): string {
  const setting = {
    code: values.code,
    name: values.name,
    attributes: {
      description: values.description,
      ...values.options,
      fields: fields.map(fieldFromForm),
    },
  }
  return JSON.stringify(setting, null, 2)
}

/**
 * v0's checks (an object with a code, a name and `attributes.fields`, each
 * field with its five keys), then the field dialog's rules on every field:
 * a setting the dialog could not have made is refused, naming the field.
 */
export function parseSettingJson(text: string): SettingJsonResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: { key: 'invalidJson' } }
  }
  if (
    !isObject(value) ||
    !isFilled(value.code) ||
    !isFilled(value.name) ||
    !isObject(value.attributes) ||
    !Array.isArray(value.attributes.fields) ||
    !value.attributes.fields.every(isField)
  )
    return { ok: false, error: { key: 'invalidSetting' } }

  const fields = value.attributes.fields.map(fieldToForm)
  for (const [index, field] of fields.entries()) {
    // Against the fields before it: of two duplicates, the second is named.
    const errors = validateFieldDefinition(field, fields.slice(0, index))
    const first = Object.values(errors)[0]
    if (first)
      return {
        ok: false,
        error: {
          key: 'invalidField',
          params: { n: index + 1, name: field.physicalName },
          error: first,
        },
      }
  }
  const setting = value as SettingJson
  return { ok: true, setting }
}
