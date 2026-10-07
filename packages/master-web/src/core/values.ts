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
 * `previous` is the stored attributes of the record being updated; without
 * it the values are a new record.
 */
export function fromFormValues(
  fields: readonly MasterField[],
  values: MasterFormValues,
  previous?: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const creating = previous === undefined
  const stored: Readonly<Record<string, unknown>> = previous ?? {}
  const attributes: Record<string, unknown> = { ...stored }
  for (const field of fields) {
    const name = field.physicalName
    const form = values[name]
    if (form === undefined || isEntityField(field)) continue
    const type = fieldTypeOf(field)
    const has = Object.hasOwn(stored, name)
    const before = has ? stored[name] : undefined
    // An empty input does not add a key the record never had. On create, a
    // field whose default is non-empty (a switch defaulting to on that the
    // user turned off) still gets the answer written.
    if (!has && sameFormValue(form, type.toFormValue(undefined))) {
      const emptyDefault = sameFormValue(
        type.toFormValue(field.defaultValue),
        type.toFormValue(undefined)
      )
      if (!creating || emptyDefault) continue
    }
    const next =
      has && sameFormValue(form, type.toFormValue(before))
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
