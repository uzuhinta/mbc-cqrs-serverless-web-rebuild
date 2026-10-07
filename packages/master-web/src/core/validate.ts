import type { MasterError } from './errors'
import { fieldTypeOf } from './field-types'
import type { MasterField } from './types'
import type { MasterFormValues } from './values'

export type MasterDataErrors = Record<string, MasterError>

/**
 * v0's rules for a data record, one error per field. On create the code is
 * always required and may not be only spaces (unless it is generated); on
 * update the code is read-only and not checked.
 */
export function validateMasterData(
  fields: readonly MasterField[],
  values: MasterFormValues,
  { mode }: { mode: 'create' | 'update' },
): MasterDataErrors {
  const errors: MasterDataErrors = {}
  for (const field of fields) {
    const name = field.physicalName
    const type = fieldTypeOf(field)
    const form = values[name] ?? type.toFormValue(undefined)
    if (name === 'code') {
      if (mode === 'update' || field.dataType === 'auto_number') continue
      if (type.isEmpty(form)) {
        errors[name] = { key: 'required' }
        continue
      }
      if (typeof form === 'string' && form.trim() === '') {
        errors[name] = { key: 'blank' }
        continue
      }
    } else if (field.isRequired && type.isEmpty(form)) {
      errors[name] = { key: 'required' }
      continue
    }
    const error = type.validate(form, field)
    if (error) errors[name] = error
  }
  return errors
}
