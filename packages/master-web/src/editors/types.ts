/** What each rich editor takes; `editorRenderers` maps `FieldRendererProps` onto it. */
export type EditorProps = {
  value: string
  /** Called for the user's edits only, never when the editor loads. */
  onChange(value: string): void
  onBlur?(): void
  disabled?: boolean
  /** The control's id (a label's `htmlFor`). */
  id?: string
  /** The label's id, for controls a `<label for>` cannot name. */
  labelId?: string
  describedBy?: string
  invalid?: boolean
}
