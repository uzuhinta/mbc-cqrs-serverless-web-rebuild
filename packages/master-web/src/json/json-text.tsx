'use client'

import { Textarea } from '@mbc-cqrs-serverless/ui-web'
import { useId, type ComponentType } from 'react'

/** What a JSON dialog gives its editor; `/editors`' JsonEditor takes these. */
export type JsonTextEditorProps = {
  value: string
  onChange(value: string): void
  /** Id of the dialog's (visually hidden) label for the editor's input. */
  labelId?: string
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
}

/** An editor for the JSON dialogs' text, e.g. `JsonEditor` from `/editors`. */
export type JsonTextEditor = ComponentType<JsonTextEditorProps>

/** A JSON dialog's text: a monospace text box, or the host's editor. */
export function JsonText({
  value,
  onChange,
  label,
  invalid,
  describedBy,
  disabled,
  editor: Editor,
}: {
  value: string
  onChange(value: string): void
  label: string
  invalid: boolean
  describedBy?: string
  disabled?: boolean
  editor?: JsonTextEditor
}) {
  const labelId = useId()
  if (!Editor)
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        spellCheck={false}
        disabled={disabled}
        className="mbc:max-h-[50vh] mbc:min-h-[50vh] mbc:font-mono mbc:text-xs"
      />
    )
  return (
    <div>
      <span id={labelId} className="mbc:sr-only">
        {label}
      </span>
      <Editor
        value={value}
        onChange={onChange}
        labelId={labelId}
        describedBy={describedBy}
        invalid={invalid}
        disabled={disabled}
      />
    </div>
  )
}
