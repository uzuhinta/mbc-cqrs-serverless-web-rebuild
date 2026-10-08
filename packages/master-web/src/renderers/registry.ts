import {
  isMasterFieldType,
  type MasterFieldType,
} from '../core/field-type-names'
import type { MasterField } from '../core/types'
import { ArrayRenderer } from './array-renderer'
import { DateRenderer } from './date-renderer'
import {
  AutoNumberRenderer,
  BooleanRenderer,
  JsonRenderer,
  NumberRenderer,
  StringRenderer,
  TextAreaRenderer,
} from './text-renderers'
import type { FieldRenderer } from './types'

export type { FieldRenderer, FieldRendererProps, FieldRenderers } from './types'

/** The built-in renderer of each field type. */
export const defaultRenderers: Readonly<
  Record<MasterFieldType, FieldRenderer>
> = {
  string: StringRenderer,
  number: NumberRenderer,
  auto_number: AutoNumberRenderer,
  boolean: BooleanRenderer,
  date: DateRenderer,
  array: ArrayRenderer,
  json: JsonRenderer,
  'text-area': TextAreaRenderer,
  'text-html': TextAreaRenderer,
  'text-markdown': TextAreaRenderer,
}

/** The type whose renderer a field uses: unknown types render as `string`. */
export function rendererType(
  field: Pick<MasterField, 'dataType'>
): MasterFieldType {
  return isMasterFieldType(field.dataType) ? field.dataType : 'string'
}
