'use client'

import {
  cn,
  Input,
  Switch,
  Textarea,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'

import { numberOption, type FormValue } from '../core/field-types'
import { masterDataMessages } from '../i18n/master-data-messages'
import type { FieldRendererProps } from './types'

const text = (value: FormValue) =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.join('\n')
      : String(value)

/** The props every built-in passes to its control. */
function control({
  id,
  describedBy,
  invalid,
  disabled,
  onBlur,
}: FieldRendererProps) {
  return {
    id,
    disabled,
    onBlur,
    'aria-describedby': describedBy,
    'aria-invalid': invalid || undefined,
  }
}

/** `string`: one line, or a text area when the field allows more than one row (v0). */
export function StringRenderer(props: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  const rows = numberOption(props.field.maxRow)
  const common = {
    ...control(props),
    value: text(props.value),
    placeholder: t.textPlaceholder,
  }
  if (rows !== undefined && rows > 1)
    return (
      <Textarea
        {...common}
        rows={rows}
        className="mbc:resize-none"
        onChange={(event) => props.onChange(event.target.value)}
      />
    )
  return (
    <Input
      {...common}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `number`: a text input, checked as a whole number on save (v0). */
export function NumberRenderer(props: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  return (
    <Input
      {...control(props)}
      inputMode="numeric"
      value={text(props.value)}
      placeholder={t.numberPlaceholder}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `auto_number`: generated on save, so read-only; names its sequence until then. */
export function AutoNumberRenderer(props: FieldRendererProps) {
  const t = useMessages(masterDataMessages).editor
  return (
    <Input
      {...control(props)}
      disabled
      value={text(props.value)}
      placeholder={props.field.formatName || t.autoNumber}
      onChange={() => {}}
    />
  )
}

/** `text-area`, `text-html`, `text-markdown`: a plain text area (rich editors come from `/editors`). */
export function TextAreaRenderer(props: FieldRendererProps) {
  return (
    <Textarea
      {...control(props)}
      value={text(props.value)}
      className="mbc:min-h-32"
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `json`: JSON as text, checked on save. */
export function JsonRenderer(props: FieldRendererProps) {
  return (
    <Textarea
      {...control(props)}
      value={text(props.value)}
      spellCheck={false}
      className={cn('mbc:min-h-48 mbc:font-mono mbc:text-xs')}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `boolean`: a switch. */
export function BooleanRenderer(props: FieldRendererProps) {
  return (
    <Switch
      {...control(props)}
      checked={props.value === true}
      onCheckedChange={(checked) => props.onChange(checked)}
    />
  )
}
