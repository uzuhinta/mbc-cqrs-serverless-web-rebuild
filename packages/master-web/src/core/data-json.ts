import { fieldTypeOf } from './field-types'
import { settingCodeOf } from './payload'
import type { MasterData, MasterSetting } from './types'
import {
  dataFields,
  fromFormValues,
  isEntityField,
  toFormValues,
  type MasterFormValues,
} from './values'

export type DataJsonError = { key: 'invalidJson' } | { key: 'invalidData' }

export type DataJsonResult =
  { ok: true; values: MasterFormValues } | { ok: false; error: DataJsonError }

const INTEGER = /^-?[0-9]+$/

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

/**
 * The JSON a record's dialog opens with, in v0's shape: `settingCode`,
 * `code`, `name`, `seq` and the attributes as they would be saved, with
 * every field present (an empty one as v0's empty value for its type).
 */
export function dataJson(
  setting: MasterSetting,
  values: MasterFormValues,
  previous?: MasterData
): string {
  const fields = dataFields(setting)
  const attributes = fromFormValues(fields, values, previous?.attributes)
  for (const field of fields) {
    if (isEntityField(field) || Object.hasOwn(attributes, field.physicalName))
      continue
    attributes[field.physicalName] = fieldTypeOf(field).empty
  }
  const seq = text(values.seq).trim()
  const record = {
    settingCode: settingCodeOf(setting),
    code: text(values.code),
    name: text(values.name),
    ...(seq === '' ? {} : { seq: INTEGER.test(seq) ? Number(seq) : seq }),
    attributes,
  }
  return JSON.stringify(record, null, 2)
}

/**
 * The input values of a record JSON. v0's check: an object with a
 * `settingCode`, a `code` and a `name`; `attributes`, when present, is an object.
 */
export function parseDataJson(
  text: string,
  setting: MasterSetting
): DataJsonResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: { key: 'invalidJson' } }
  }
  if (
    !isObject(value) ||
    !value.settingCode ||
    !value.code ||
    !value.name ||
    (value.attributes !== undefined && !isObject(value.attributes))
  )
    return { ok: false, error: { key: 'invalidData' } }

  const seq =
    typeof value.seq === 'number'
      ? value.seq
      : typeof value.seq === 'string' && INTEGER.test(value.seq.trim())
        ? Number(value.seq)
        : undefined
  const record: MasterData = {
    id: '',
    pk: '',
    sk: '',
    version: 0,
    code: String(value.code),
    name: String(value.name),
    seq,
    attributes: isObject(value.attributes) ? value.attributes : {},
  }
  return { ok: true, values: toFormValues(dataFields(setting), record) }
}
