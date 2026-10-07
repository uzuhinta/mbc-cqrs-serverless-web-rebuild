import type { BulkError } from '../core/bulk'
import type { MasterError } from '../core/errors'
import type { FieldDefinitionError } from '../core/field-definition'
import type { MasterMessages } from './master-messages'

export function formatMasterError(
  error: MasterError,
  t: MasterMessages['validation'],
): string {
  switch (error.key) {
    case 'maxLength':
      return t.maxLength(error.params)
    case 'maxRows':
      return t.maxRows(error.params)
    case 'pattern':
      return t.pattern(error.params)
    case 'min':
      return t.min(error.params)
    case 'max':
      return t.max(error.params)
    default:
      return t[error.key]
  }
}

export function formatFieldDefinitionError(
  error: FieldDefinitionError,
  t: MasterMessages['fieldDefinition'],
): string {
  return error.key === 'tooLong' ? t.tooLong(error.params) : t[error.key]
}

export function formatBulkError(
  error: BulkError,
  t: MasterMessages['bulk'],
): string {
  const text =
    error.key === 'mapFailed'
      ? t.mapFailed({ message: error.message })
      : t[error.key]
  return 'index' in error ? `${t.item({ n: error.index + 1 })}${text}` : text
}
