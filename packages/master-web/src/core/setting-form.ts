import type { MasterError } from './errors'
import {
  defaultSettingFields,
  normalizeFieldDefinition,
} from './field-definition'
import type {
  MasterField,
  MasterSetting,
  MasterSettingAttributes,
} from './types'

/**
 * A sequence the code field can number from (v0: the records of the
 * `sequence_setting` master). `format` is stored as the field's `dataFormat`.
 */
export type SequenceFormat = { code: string; name: string; format: string }

/** An extra on/off flag stored in `attributes[key]`, for hosts whose backend reads one. */
export type SettingOption = { key: string; label: string }

export type SettingFormValues = {
  code: string
  name: string
  description: string
  /** `SettingOption` flags by key. */
  options: Record<string, boolean>
}

/** `POST /api/master-setting` body. */
export type MasterSettingCreateBody = {
  code: string
  name: string
  attributes: MasterSettingAttributes
  /** v0 sends the attributes twice; the backend reads this one on create. */
  settingValue: MasterSettingAttributes
}

/** `PUT /api/master-setting/:id` body. */
export type MasterSettingUpdateBody = {
  code: string
  name: string
  attributes: MasterSettingAttributes
}

/**
 * A field as the editor holds it: a JSON default as text, a boolean default
 * as 'true' / 'false'. Everything else as stored.
 */
export function fieldToForm(field: MasterField): MasterField {
  const { defaultValue } = field
  if (
    field.dataType === 'json' &&
    defaultValue !== undefined &&
    defaultValue !== ''
  )
    return { ...field, defaultValue: JSON.stringify(defaultValue) }
  if (field.dataType === 'boolean' && typeof defaultValue === 'boolean')
    return { ...field, defaultValue: String(defaultValue) }
  return { ...field }
}

/** The stored shape of an editor field (v0's save): JSON parsed, booleans as booleans. */
export function fieldFromForm(field: MasterField): MasterField {
  const next: MasterField = { ...field, uiComponent: 'string' }
  const { defaultValue } = field
  if (field.dataType === 'boolean')
    next.defaultValue = defaultValue === true || defaultValue === 'true'
  if (field.dataType === 'json') {
    if (defaultValue === undefined || defaultValue === '')
      next.defaultValue = ''
    else if (typeof defaultValue !== 'string') next.defaultValue = defaultValue
    else {
      try {
        next.defaultValue = JSON.parse(defaultValue)
      } catch {
        next.defaultValue = defaultValue
      }
    }
  }
  return next
}

/**
 * The editor's starting point. A stored setting without a `code` field gets
 * the fixed fields it lacks in front (v0 added them on load).
 */
export function settingToForm(
  setting: Pick<MasterSetting, 'code' | 'name' | 'attributes'> | undefined,
  optionKeys: readonly string[]
): { values: SettingFormValues; fields: MasterField[] } {
  const attributes = setting?.attributes
  const options = Object.fromEntries(
    optionKeys.map((key) => [key, attributes?.[key] === true])
  )
  const values: SettingFormValues = {
    code: setting?.code ?? '',
    name: setting?.name ?? '',
    description:
      typeof attributes?.description === 'string' ? attributes.description : '',
    options,
  }
  const stored = attributes?.fields ?? []
  const names = new Set(stored.map((field) => field.physicalName))
  const missing = names.has('code')
    ? []
    : defaultSettingFields.filter((field) => !names.has(field.physicalName))
  const fields = [...missing, ...stored].map(fieldToForm)
  return { values, fields }
}

/** The sequence a code field uses: its `formatCode`, or a `dataFormat` that names one. */
export function formatCodeOf(
  field: MasterField,
  formats: readonly SequenceFormat[]
): string {
  if (field.formatCode) return field.formatCode
  return formats.find((format) => format.code === field.dataFormat)?.code ?? ''
}

const SEQUENCE_KEYS = [
  'dataFormat',
  'formatCode',
  'formatName',
  'prefix',
  'postfix',
] as const

/**
 * A field as the field dialog saves it: `normalizeFieldDefinition`, plus the
 * chosen sequence on an `auto_number` field (v0 stored its code, format and
 * name) or no sequence keys on any other type.
 */
export function applyFieldDialog(
  field: MasterField,
  format: SequenceFormat | undefined
): MasterField {
  const next = normalizeFieldDefinition(field)
  if (field.dataType !== 'auto_number') {
    for (const key of SEQUENCE_KEYS) delete next[key]
    return next
  }
  if (format) {
    next.formatCode = format.code
    next.dataFormat = format.format
    next.formatName = format.name
  }
  return next
}

/** v0's checks of the code and name inputs. */
export function validateSettingForm(
  values: SettingFormValues
): Partial<Record<'code' | 'name', MasterError>> {
  const errors: Partial<Record<'code' | 'name', MasterError>> = {}
  for (const key of ['code', 'name'] as const) {
    if (values[key] === '') errors[key] = { key: 'required' }
    else if (values[key].trim() === '') errors[key] = { key: 'blank' }
  }
  return errors
}

export function toSettingPayload(
  values: SettingFormValues,
  fields: readonly MasterField[],
  options: { mode: 'create' }
): MasterSettingCreateBody
export function toSettingPayload(
  values: SettingFormValues,
  fields: readonly MasterField[],
  options: { mode: 'update'; previous: MasterSetting }
): MasterSettingUpdateBody
/**
 * v0's request bodies. On update, attribute keys this editor does not know
 * are kept; option flags are written only for the given `values.options`.
 */
export function toSettingPayload(
  values: SettingFormValues,
  fields: readonly MasterField[],
  options: { mode: 'create' } | { mode: 'update'; previous: MasterSetting }
): MasterSettingCreateBody | MasterSettingUpdateBody {
  const previous = options.mode === 'update' ? options.previous.attributes : {}
  const attributes: MasterSettingAttributes = {
    ...previous,
    ...values.options,
    description: values.description,
    fields: fields.map(fieldFromForm),
  }
  if (options.mode === 'update')
    return { code: values.code, name: values.name, attributes }
  return {
    code: values.code.trim(),
    name: values.name,
    attributes,
    settingValue: attributes,
  }
}
