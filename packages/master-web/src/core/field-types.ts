import { isMasterFieldType, type MasterFieldType } from './field-type-names'
import type { MasterError } from './errors'
import type { MasterField } from './types'

/** What a field's input holds: text, a switch, or a list of texts (`array`). */
export type FormValue = string | boolean | string[]

/** Definition inputs the settings editor shows for a type, besides the common ones. */
export type FieldOptionName =
  'length' | 'pattern' | 'min' | 'max' | 'maxRow' | 'format'

export type FieldTypeDefinition = {
  options: readonly FieldOptionName[]
  /** Whether a definition can carry a default value (v0: not `array` / `auto_number`). */
  hasDefault: boolean
  /** v0's value for an empty field in the record JSON view. */
  empty: unknown
  /** Stored value → input value. Never throws, whatever was stored. */
  toFormValue(stored: unknown): FormValue
  /** Input value → stored value. `previous` is what was stored before. `undefined` removes the key. */
  fromFormValue(form: FormValue, previous: unknown): unknown
  /** Type rules for a non-empty value; `required` is checked separately. */
  validate(form: FormValue, field: MasterField): MasterError | null
  /** Whether the input counts as empty for `isRequired`. */
  isEmpty(form: FormValue): boolean
}

const INTEGER = /^-?[0-9]+$/

/** v0 stores numeric options as strings; '' and non-numbers mean "not set". */
export function numberOption(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }
  return undefined
}

function toText(stored: unknown): string {
  if (stored === undefined || stored === null) return ''
  if (typeof stored === 'string') return stored
  if (typeof stored === 'object') return JSON.stringify(stored)
  return String(stored)
}

function asString(form: FormValue): string {
  if (typeof form === 'string') return form
  return Array.isArray(form) ? form.join('\n') : String(form)
}

function lengthAndRows(value: string, field: MasterField): MasterError | null {
  // v0 ignored a length below 1.
  const max = numberOption(field.length)
  if (max !== undefined && max >= 1 && value.length > max)
    return { key: 'maxLength', params: { max } }
  const rows = numberOption(field.maxRow)
  if (rows !== undefined && rows >= 1 && value.split('\n').length > rows)
    return { key: 'maxRows', params: { max: rows } }
  return null
}

function matchesPattern(value: string, field: MasterField): MasterError | null {
  if (!field.pattern) return null
  try {
    if (new RegExp(field.pattern).test(value)) return null
  } catch {
    // v0: a pattern that does not compile rejects every value.
  }
  return { key: 'pattern', params: { name: field.name } }
}

function textType(
  options: readonly FieldOptionName[],
  check?: (value: string, field: MasterField) => MasterError | null
): FieldTypeDefinition {
  return {
    options,
    hasDefault: true,
    empty: '',
    toFormValue: toText,
    fromFormValue: (form) => asString(form),
    validate: (form, field) => {
      const value = asString(form)
      return value === '' || !check ? null : check(value, field)
    },
    isEmpty: (form) => asString(form) === '',
  }
}

const number: FieldTypeDefinition = {
  options: ['min', 'max'],
  hasDefault: true,
  empty: 0,
  toFormValue: toText,
  // v0 saves what the input holds (a string); a value stored as a number stays
  // a number. A cleared input is sent as '' (as v0 did): the backend keeps a
  // key an update leaves out.
  fromFormValue: (form, previous) => {
    const value = asString(form).trim()
    if (typeof previous !== 'number' || value === '') return value
    return Number(value)
  },
  validate: (form, field) => {
    const value = asString(form).trim()
    if (value === '') return null
    if (!INTEGER.test(value)) return { key: 'integer' }
    const min = numberOption(field.min)
    if (min !== undefined && Number(value) < min)
      return { key: 'min', params: { min } }
    const max = numberOption(field.max)
    if (max !== undefined && Number(value) > max)
      return { key: 'max', params: { max } }
    return null
  },
  isEmpty: (form) => asString(form).trim() === '',
}

const boolean: FieldTypeDefinition = {
  options: [],
  hasDefault: true,
  empty: false,
  toFormValue: (stored) => stored === true || stored === 'true',
  // Definitions and older records hold 'true' / 'false'; keep the stored representation.
  fromFormValue: (form, previous) => {
    const value = form === true
    return typeof previous === 'string' ? String(value) : value
  },
  validate: () => null,
  // `false` is an answer, so a required switch never blocks saving.
  isEmpty: () => false,
}

const array: FieldTypeDefinition = {
  options: [],
  hasDefault: false,
  empty: [],
  toFormValue: (stored) => {
    if (Array.isArray(stored)) return stored.map(toText)
    return stored === undefined || stored === null || stored === ''
      ? []
      : [toText(stored)]
  },
  fromFormValue: (form) => {
    if (Array.isArray(form)) return [...form]
    const value = asString(form)
    return value === '' ? [] : [value]
  },
  validate: () => null,
  isEmpty: (form) =>
    Array.isArray(form) ? form.length === 0 : asString(form) === '',
}

const json: FieldTypeDefinition = {
  options: [],
  hasDefault: true,
  empty: '',
  toFormValue: (stored) => {
    if (stored === undefined || stored === null) return ''
    return typeof stored === 'string' ? stored : JSON.stringify(stored, null, 2)
  },
  // v0 saves parsed JSON; an empty input stays ''. Text that does not parse is
  // returned as-is (validation reports it before anything is saved).
  fromFormValue: (form) => {
    const value = asString(form)
    if (value.trim() === '') return ''
    try {
      return JSON.parse(value) as unknown
    } catch {
      return value
    }
  },
  validate: (form) => {
    const value = asString(form)
    if (value.trim() === '') return null
    try {
      JSON.parse(value)
      return null
    } catch {
      return { key: 'json' }
    }
  },
  isEmpty: (form) => asString(form).trim() === '',
}

export const fieldTypes: Readonly<
  Record<MasterFieldType, FieldTypeDefinition>
> = {
  string: textType(
    ['length', 'pattern'],
    (value, field) =>
      lengthAndRows(value, field) ?? matchesPattern(value, field)
  ),
  number,
  auto_number: { ...textType(['format']), hasDefault: false },
  boolean,
  date: textType([]),
  array,
  json,
  'text-area': textType(['maxRow'], lengthAndRows),
  'text-html': textType([]),
  'text-markdown': textType([]),
}

/** The field's type; a stored type this version does not know behaves as `string`. */
export function fieldTypeOf(
  field: Pick<MasterField, 'dataType'>
): FieldTypeDefinition {
  return isMasterFieldType(field.dataType)
    ? fieldTypes[field.dataType]
    : fieldTypes.string
}
