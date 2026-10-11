import type { JsonTextEditorProps } from '../src/json/json-text'

/** A stand-in for `/editors`' JsonEditor: a text box labelled as the dialogs label an editor. */
export function FakeJsonEditor(props: JsonTextEditorProps) {
  return (
    <textarea
      data-editor="fake"
      aria-labelledby={props.labelId}
      aria-invalid={props.invalid || undefined}
      aria-describedby={props.describedBy}
      disabled={props.disabled}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}
