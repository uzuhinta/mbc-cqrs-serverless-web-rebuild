'use client'

import { cn } from '@mbc-cqrs-serverless/ui-web'
import { useRef } from 'react'

import { EditorFallback } from './editor-fallback'
import type { EditorProps } from './types'
import { useAttributes, useLibrary } from './use-library'

const loadQuill = () => import('react-quill-new')

// v0's palette and toolbar.
const COLORS = [
  '#000000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#008a00',
  '#0066cc',
  '#9933ff',
  '#ffffff',
  '#facccc',
  '#ffebcc',
  '#ffffcc',
  '#cce8cc',
  '#cce0f5',
  '#ebd6ff',
  '#bbbbbb',
  '#f06666',
  '#ffc266',
  '#ffff66',
  '#66b966',
  '#66a3e0',
  '#c285ff',
  '#888888',
  '#a10000',
  '#b26b00',
  '#b2b200',
  '#006100',
  '#0047b2',
  '#6b24b2',
  '#444444',
  '#5c0000',
  '#663d00',
  '#666600',
  '#003700',
  '#002966',
  '#3d1466',
]

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: COLORS }],
    [{ background: COLORS }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean'],
  ],
}

/** HTML in Quill (react-quill-new), v0's toolbar; read-only without its toolbar when disabled. */
export function RichTextEditor(props: EditorProps) {
  const { value, onChange, onBlur, disabled = false } = props
  const { id, labelId, describedBy, invalid } = props
  const library = useLibrary(loadQuill)
  const wrapper = useRef<HTMLDivElement>(null)

  // Quill's editing area is a div: name it for screen readers.
  useAttributes(wrapper, '.ql-editor', {
    id,
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-labelledby': labelId,
    'aria-describedby': describedBy,
    'aria-invalid': invalid ? 'true' : undefined,
  })

  if (!library) return <EditorFallback {...props} />
  const Quill = library.default
  return (
    <div
      ref={wrapper}
      data-mbc-editor="rich-text"
      data-disabled={disabled || undefined}
      className={cn(
        'mbc:bg-background',
        disabled && 'mbc:[&_.ql-toolbar]:hidden'
      )}
    >
      <Quill
        theme="snow"
        value={value}
        modules={MODULES}
        readOnly={disabled}
        // Quill normalises what it loads; only the user's edits count.
        onChange={(html, _delta, source) => {
          if (source === 'user') onChange(html)
        }}
        onBlur={() => onBlur?.()}
      />
    </div>
  )
}
