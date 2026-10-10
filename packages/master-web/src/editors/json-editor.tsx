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

/**
 * Disabled JSON gets the read-only tree view; text that is not JSON has no
 * tree, so it stays in code mode, read-only.
 */
function show(instance: JsonEditorInstance, text: string, disabled: boolean) {
  const mode = disabled && isJson(text) ? 'view' : 'code'
  if (instance.getMode() !== mode) instance.setMode(mode)
  if (mode === 'code')
    (instance.aceEditor as typeof instance.aceEditor | undefined)?.setReadOnly(
      disabled
    )
}

/** JSON in jsoneditor's code mode (v0); its read-only tree view when disabled. */
export function JsonEditor(props: EditorProps) {
  const { value, onChange, disabled = false } = props
  const { id, labelId, describedBy, invalid } = props
  const library = useLibrary(loadJsonEditor)
  const container = useRef<HTMLDivElement>(null)
  const editor = useRef<JsonEditorInstance | null>(null)
  const latest = useRef({ value, onChange, disabled })
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
    instance.setText(latest.current.value)
    show(instance, latest.current.value, latest.current.disabled)
    editor.current = instance
    return () => {
      instance.destroy()
      editor.current = null
    }
  }, [library])

  useEffect(() => {
    const instance = editor.current
    if (instance && instance.getText() !== value) instance.setText(value)
  }, [value])

  useEffect(() => {
    const instance = editor.current
    if (instance) show(instance, instance.getText(), disabled)
  }, [disabled])

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
