import { fieldTypeOf, type FormValue } from './field-types'
import type { MasterData, MasterField, MasterSetting } from './types'

/** Input values keyed by `physicalName`. */
export type MasterFormValues = Record<string, FormValue>

/**
 * v0 shows its own required code and name inputs when the setting has no
 * `code` / `name` field. They are record-level values, not attributes.
 */
export const ENTITY_CODE_FIELD: MasterField = Object.freeze({
  physicalName: 'code',
  name: '',
  dataType: 'string',
  isRequired: true,
  isShowedOnList: true,
})
export const ENTITY_NAME_FIELD: MasterField = Object.freeze({
  physicalName: 'name',
  name: '',
  dataType: 'string',
  isRequired: true,
  isShowedOnList: true,
})

/** True for the record-level code / name inputs added by `dataFields`. */
export function isEntityField(field: MasterField): boolean {
  return field === ENTITY_CODE_FIELD || field === ENTITY_NAME_FIELD
}

/** The inputs of a data record: the setting's fields, plus code / name when the setting lacks them. */
export function dataFields(setting: MasterSetting): MasterField[] {
  const fields = setting.attributes.fields
  const has = (name: string) =>
    fields.some((field) => field.physicalName === name)
  return [
    ...(has('code') ? [] : [ENTITY_CODE_FIELD]),
    ...(has('name') ? [] : [ENTITY_NAME_FIELD]),
    ...fields,
  ]
}

/**
 * Input values: a stored record's values (its own code, name and seq win over
 * the same keys in `attributes`, as in v0), or each field's default for a new record.
 */
export function toFormValues(
  fields: readonly MasterField[],
  data?: MasterData
): MasterFormValues {
  const stored: Record<string, unknown> | undefined = data && {
    ...data.attributes,
    code: data.code,
    name: data.name,
    seq: data.seq ?? 0,
  }
  const values: MasterFormValues = {}
  for (const field of fields) {
    const source = stored
      ? Object.hasOwn(stored, field.physicalName)
        ? stored[field.physicalName]
        : undefined
      : field.defaultValue
    values[field.physicalName] = fieldTypeOf(field).toFormValue(source)
  }
  return values
}

function sameFormValue(a: FormValue, b: FormValue): boolean {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, index) => item === b[index])
  return a === b
}

/**
 * Attributes to save. Keys no field owns are kept; a field whose input is
 * unchanged keeps its stored value exactly (type included); an empty input
 * adds no key; record-level code / name inputs are not attributes.
 */
export function fromFormValues(
  fields: readonly MasterField[],
  values: MasterFormValues,
  previous: Readonly<Record<string, unknown>> = {}
): Record<string, unknown> {
  const attributes: Record<string, unknown> = { ...previous }
  for (const field of fields) {
    const name = field.physicalName
    const form = values[name]
    if (form === undefined || isEntityField(field)) continue
    const type = fieldTypeOf(field)
    const stored = Object.hasOwn(previous, name)
    const before = stored ? previous[name] : undefined
    // An empty input does not add a key the record never had — unless the
    // field's default is non-empty (e.g. a switch defaulting to on that the
    // user turned off), in which case the answer must be written.
    if (!stored && sameFormValue(form, type.toFormValue(undefined))) {
      const defaultForm = type.toFormValue(field.defaultValue)
      if (sameFormValue(defaultForm, type.toFormValue(undefined))) continue
    }
    const next =
      stored && sameFormValue(form, type.toFormValue(before))
        ? before
        : type.fromFormValue(form, before)
    if (next === undefined) delete attributes[name]
    else attributes[name] = next
  }
  return attributes
}

const pad = (value: number) =>
  String(Math.floor(Math.abs(value))).padStart(2, '0')

/** v0's stored date: local date and time with the offset, e.g. 2026-10-07T00:00:00+09:00. */
export function formatDateValue(date: Date): string {
  const offset = -date.getTimezoneOffset()
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${offset >= 0 ? '+' : '-'}${pad(offset / 60)}:${pad(offset % 60)}`
  )
}
