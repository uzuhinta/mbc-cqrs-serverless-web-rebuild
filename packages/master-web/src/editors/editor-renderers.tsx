'use client'

import type { FieldRendererProps, FieldRenderers } from '../renderers/types'
import { JsonEditor } from './json-editor'
import { MarkdownEditor } from './markdown-editor'
import { RichTextEditor } from './rich-text-editor'
import type { EditorProps } from './types'

function editorProps(props: FieldRendererProps): EditorProps {
  return {
    value: typeof props.value === 'string' ? props.value : String(props.value),
    onChange: props.onChange,
    onBlur: props.onBlur,
    disabled: props.disabled,
    id: props.id,
    labelId: props.labelId,
    describedBy: props.describedBy,
    invalid: props.invalid,
  }
}

/** The rich editors as field renderers: `<MasterDataEditor components={editorRenderers} />`. */
export const editorRenderers: FieldRenderers = {
  'text-html': (props) => <RichTextEditor {...editorProps(props)} />,
  'text-markdown': (props) => <MarkdownEditor {...editorProps(props)} />,
  json: (props) => <JsonEditor {...editorProps(props)} />,
}
