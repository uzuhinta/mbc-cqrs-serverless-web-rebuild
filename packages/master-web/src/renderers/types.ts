import type { ComponentType } from 'react'

import type { MasterFieldType } from '../core/field-type-names'
import type { FormValue } from '../core/field-types'
import type { MasterField } from '../core/types'

/** What the data editor gives each field's renderer. */
export type FieldRendererProps = {
  field: MasterField
  /** The input value (`fieldTypes[type].toFormValue` of the stored value). */
  value: FormValue
  onChange(value: FormValue): void
  onBlur(): void
  /** The control's id; the field's label points at it. */
  id: string
  /** The label's id, for a control that is a group of inputs. */
  labelId: string
  /** Ids of the field's description and error, when shown. */
  describedBy?: string
  invalid: boolean
  disabled: boolean
}

export type FieldRenderer = ComponentType<FieldRendererProps>

/** Renderers by field type; a host's replace the built-ins (`components`). */
export type FieldRenderers = Partial<Record<MasterFieldType, FieldRenderer>>
