import {
  isMasterFieldType,
  MASTER_FIELD_TYPES,
  type MasterFieldType,
} from './field-type-names'
import { numberOption } from './field-types'
import type { MasterField } from './types'

/** v0's three fixed fields of a new setting; they cannot be removed. */
export const defaultSettingFields: readonly MasterField[] = Object.freeze([
  {
    physicalName: 'code',
    name: 'コード',
    description: '',
    dataType: 'string',
    defaultValue: '',
    isRequired: true,
    isShowedOnList: true,
    length: '255',
  },
  {
    physicalName: 'name',
    name: '名称',
    description: '',
    dataType: 'string',
    isRequired: true,
    isShowedOnList: true,
    length: '255',
  },
  {
    physicalName: 'seq',
    name: '並び順',
    description: '',
    dataType: 'number',
    defaultValue: '',
    isRequired: false,
    isShowedOnList: true,
  },
])

export const FIXED_FIELD_NAMES: readonly string[] = Object.freeze(
  defaultSettingFields.map((field) => field.physicalName)
)

/** v0: the code field can be text, number or auto-numbered; other fields cannot be auto-numbered. */
export function allowedFieldTypes(
  physicalName: string
): readonly MasterFieldType[] {
  return physicalName === 'code'
    ? ['string', 'number', 'auto_number']
    : MASTER_FIELD_TYPES.filter((type) => type !== 'auto_number')
}

export type FieldDefinitionInput =
  | 'physicalName'
  | 'name'
  | 'dataType'
  | 'length'
  | 'min'
  | 'max'
  | 'maxRow'
  | 'defaultValue'
  | 'dataFormat'

export type FieldDefinitionError =
  | { key: 'required' }
  | { key: 'tooLong'; params: { max: number } }
  | { key: 'nameChars' }
  | { key: 'duplicate' }
  | { key: 'reserved' }
  | { key: 'typeNotAllowed' }
  | { key: 'numeric' }
  | { key: 'lengthRange' }
  | { key: 'maxRowMin' }
  | { key: 'minNotLess' }
  | { key: 'maxNotGreater' }
  | { key: 'defaultRange' }
  | { key: 'defaultJson' }
  | { key: 'defaultBoolean' }
  | { key: 'defaultLength' }
  | { key: 'formatRequired' }

export type FieldDefinitionErrors = Partial<
  Record<FieldDefinitionInput, FieldDefinitionError>
>

const INTEGER = /^-?[0-9]+$/
const DIGITS = /^[0-9]+$/
const MAX_TEXT = 255

/** Names that collide with Object.prototype or poison plain-object lookups. */
const RESERVED_PHYSICAL_NAMES = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  '__proto__',
])

const isSet = (value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== ''

function textInput(value: string): FieldDefinitionError | undefined {
  if (value.trim() === '') return { key: 'required' }
  if (value.length > MAX_TEXT)
    return { key: 'tooLong', params: { max: MAX_TEXT } }
  return undefined
}

/**
 * v0's field-dialog rules, one error per input, plus three that v0 lacked:
 * physical names must be unique, may not contain `.`, `[` or `]` (they name
 * form inputs), and the type must be allowed for the field.
 * `siblings` are the setting's other fields (not the one being edited).
 */
export function validateFieldDefinition(
  field: MasterField,
  siblings: readonly MasterField[]
): FieldDefinitionErrors {
  const errors: FieldDefinitionErrors = {}
  const physicalName =
    textInput(field.physicalName) ??
    (/[.[\]]/.test(field.physicalName)
      ? { key: 'nameChars' as const }
      : undefined) ??
    (RESERVED_PHYSICAL_NAMES.has(field.physicalName)
      ? { key: 'reserved' as const }
      : undefined) ??
    (siblings.some((other) => other.physicalName === field.physicalName)
      ? { key: 'duplicate' as const }
      : undefined)
  if (physicalName) errors.physicalName = physicalName
  const name = textInput(field.name)
  if (name) errors.name = name

  const type = field.dataType
  if (
    !isMasterFieldType(type) ||
    !allowedFieldTypes(field.physicalName).includes(type)
  )
    errors.dataType = { key: 'typeNotAllowed' }

  if (type === 'string' && isSet(field.length)) {
    const length = String(field.length).trim()
    if (!DIGITS.test(length)) errors.length = { key: 'numeric' }
    else if (Number(length) < 1 || Number(length) > MAX_TEXT)
      errors.length = { key: 'lengthRange' }
  }

  if (type === 'number') {
    for (const input of ['min', 'max'] as const) {
      if (isSet(field[input]) && !INTEGER.test(String(field[input]).trim()))
        errors[input] = { key: 'numeric' }
    }
    const min = numberOption(field.min)
    const max = numberOption(field.max)
    if (
      !errors.min &&
      !errors.max &&
      min !== undefined &&
      max !== undefined &&
      min >= max
    ) {
      errors.min = { key: 'minNotLess' }
      errors.max = { key: 'maxNotGreater' }
    }
  }

  if (isSet(field.maxRow)) {
    const rows = String(field.maxRow).trim()
    if (!INTEGER.test(rows) || Number(rows) < 1)
      errors.maxRow = { key: 'maxRowMin' }
  }

  const fallback = field.defaultValue
  if (type === 'number' && isSet(fallback)) {
    const value = String(fallback).trim()
    const min = numberOption(field.min) ?? -Infinity
    const max = numberOption(field.max) ?? Infinity
    if (!INTEGER.test(value)) errors.defaultValue = { key: 'numeric' }
    else if (Number(value) < min || Number(value) > max)
      errors.defaultValue = { key: 'defaultRange' }
  }
  if (type === 'json' && isSet(fallback)) {
    try {
      JSON.parse(String(fallback))
    } catch {
      errors.defaultValue = { key: 'defaultJson' }
    }
  }
  if (
    type === 'boolean' &&
    fallback !== undefined &&
    fallback !== '' &&
    ![true, false, 'true', 'false'].includes(fallback as never)
  )
    errors.defaultValue = { key: 'defaultBoolean' }
  const maxLength = numberOption(field.length)
  if (
    type === 'string' &&
    typeof fallback === 'string' &&
    maxLength !== undefined &&
    fallback.length > maxLength
  )
    errors.defaultValue = { key: 'defaultLength' }

  if (
    type === 'auto_number' &&
    field.physicalName === 'code' &&
    !field.dataFormat &&
    !field.formatCode
  )
    errors.dataFormat = { key: 'formatRequired' }

  return errors
}

/**
 * What v0's dialog saved: length / pattern only on strings, min / max only on
 * numbers, a boolean default as 'true' / 'false', maxRow as a number. Every
 * other key, including unknown ones, is kept.
 */
export function normalizeFieldDefinition(field: MasterField): MasterField {
  const next: MasterField = { ...field }
  if (field.dataType !== 'string') {
    delete next.length
    delete next.pattern
  }
  if (field.dataType !== 'number') {
    delete next.min
    delete next.max
  }
  if (field.dataType === 'boolean' && typeof field.defaultValue === 'boolean')
    next.defaultValue = String(field.defaultValue)
  const rows = numberOption(field.maxRow)
  if (rows === undefined) delete next.maxRow
  else next.maxRow = rows
  return next
}
