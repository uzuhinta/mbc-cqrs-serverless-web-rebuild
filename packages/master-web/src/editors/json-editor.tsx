'use client'

import { useEffect, useRef } from 'react'

import { EditorFallback } from './editor-fallback'
import type { EditorProps } from './types'
import { useAttributes, useLibrary } from './use-library'

const loadJsonEditor = () => import('jsoneditor')

type JsonEditorModule = Awaited<ReturnType<typeof loadJsonEditor>>
type JsonEditorInstance = InstanceType<JsonEditorModule['default']>

/** jsoneditor's class, whether the bundler hands the UMD build over as `default` or as the module. */
function editorClass(module: JsonEditorModule): JsonEditorModule['default'] {
  return (
    (module as { default?: JsonEditorModule['default'] }).default ??
    (module as unknown as JsonEditorModule['default'])
  )
}

const isJson = (text: string) => {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

type Ace = {
  setReadOnly(readOnly: boolean): void
  commands: { bindKeys(keys: Record<string, null>): void }
}

/**
 * Shows `value`: disabled JSON in the read-only tree view, anything else in
 * code mode (read-only when disabled). Text always goes in through code
 * mode: the tree would "repair" text that is not JSON, or throw on it.
 */
function sync(instance: JsonEditorInstance, value: string, disabled: boolean) {
  if (instance.getMode() !== 'code') instance.setMode('code')
  if (instance.getText() !== value) instance.setText(value)
  const ace = instance.aceEditor as unknown as Ace | undefined
  ace?.setReadOnly(disabled)
  // Tab moves the focus on instead of indenting (WCAG 2.1.2).
  ace?.commands.bindKeys({ Tab: null, 'Shift-Tab': null })
  if (disabled && isJson(value)) instance.setMode('view')
}

/** JSON in jsoneditor's code mode (v0); its read-only tree view when disabled. */
export function JsonEditor(props: EditorProps) {
  const { value, onChange, disabled = false } = props
  const { id, labelId, describedBy, invalid } = props
  const library = useLibrary(loadJsonEditor)
  const container = useRef<HTMLDivElement>(null)
  const editor = useRef<JsonEditorInstance | null>(null)
  const latest = useRef({ value, onChange, disabled })
  // The `disabled` the editor last showed.
  const shownDisabled = useRef(disabled)
  useEffect(() => {
    latest.current = { value, onChange, disabled }
  })

  useEffect(() => {
    const element = container.current
    if (!library || !element) return
    const Editor = editorClass(library)
    const instance = new Editor(element, {
      mode: 'code',
      enableSort: false,
      enableTransform: false,
      // The user's edits only: setText does not call it.
      onChangeText: (text: string) => latest.current.onChange(text),
      // jsoneditor's default is window.alert; its code mode marks errors itself.
      onError: () => {},
    })
    sync(instance, latest.current.value, latest.current.disabled)
    shownDisabled.current = latest.current.disabled
    editor.current = instance
    return () => {
      instance.destroy()
      editor.current = null
    }
  }, [library])

  // While the user types, the value is what the editor holds: nothing moves.
  useEffect(() => {
    const instance = editor.current
    if (!instance) return
    const shown =
      instance.getMode() === 'code' &&
      instance.getText() === value &&
      shownDisabled.current === disabled
    if (shown) return
    sync(instance, value, disabled)
    shownDisabled.current = disabled
  }, [value, disabled])

  // Ace's input is created again on every mode change.
  useAttributes(container, 'textarea.ace_text-input', {
    id,
    'aria-labelledby': labelId,
    'aria-describedby': describedBy,
    'aria-invalid': invalid ? 'true' : undefined,
  })

  if (!library) return <EditorFallback {...props} />
  return (
    <div
      ref={container}
      data-mbc-editor="json"
      role="group"
      aria-labelledby={labelId}
      className="mbc:h-[500px]"
    />
  )
}
