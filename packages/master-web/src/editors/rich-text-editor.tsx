'use client'

import { cn, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { useEffect, useRef, useState } from 'react'

import { masterMessages } from '../i18n/master-messages'
import { EditorFallback } from './editor-fallback'
import type { EditorProps } from './types'
import { useAttributes, useLibrary } from './use-library'

const loadQuill = () => import('react-quill-new')

type ReactQuill = InstanceType<Awaited<ReturnType<typeof loadQuill>>['default']>

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
  // Tab moves the focus on (WCAG 2.1.2): Quill's Tab bindings are off, and
  // the toolbar's buttons indent.
  keyboard: {
    bindings: {
      tab: null,
      'remove tab': null,
      indent: null,
      outdent: null,
      'indent code-block': null,
      'outdent code-block': null,
      'table tab': null,
    },
  },
}

/**
 * Quill's semantic HTML as it is stored: it writes every space as `&nbsp;`,
 * so a lone one becomes a space again (runs keep theirs); an empty document is ''.
 */
function storedHtml(html: string, length: number): string {
  if (length <= 1) return ''
  return html.replace(/(?<!&nbsp;)&nbsp;(?!&nbsp;)/g, ' ')
}

/** HTML in Quill (react-quill-new), v0's toolbar; read-only without its toolbar when disabled. */
export function RichTextEditor(props: EditorProps) {
  const { value, onChange, onBlur, disabled = false } = props
  const { id, labelId, describedBy, invalid } = props
  const library = useLibrary(loadQuill)
  const wrapper = useRef<HTMLDivElement>(null)
  const quill = useRef<ReactQuill>(null)
  const [initial] = useState(value)
  // The value Quill holds: the user's last edit, or the last one applied.
  const held = useRef(value)

  // Quill is uncontrolled, so a re-render never re-parses the document. A
  // value from outside (a reset, an imported JSON) is applied here, silently.
  useEffect(() => {
    const editor = quill.current?.getEditor()
    if (!editor || value === held.current) return
    held.current = value
    editor.setContents(editor.clipboard.convert({ html: value }), 'silent')
  }, [library, value])

  // Quill's editing area is a div: name it for screen readers.
  useAttributes(wrapper, '.ql-editor', {
    id,
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-labelledby': labelId,
    'aria-describedby': describedBy,
    'aria-invalid': invalid ? 'true' : undefined,
  })

  // Quill's pickers and link box have no names of their own.
  const t = useMessages(masterMessages).editors
  const picker = (name: string) => `.ql-picker.ql-${name} .ql-picker-label`
  useAttributes(wrapper, picker('header'), { 'aria-label': t.heading })
  useAttributes(wrapper, picker('font'), { 'aria-label': t.font })
  useAttributes(wrapper, picker('size'), { 'aria-label': t.size })
  useAttributes(wrapper, picker('color'), { 'aria-label': t.color })
  useAttributes(wrapper, picker('background'), { 'aria-label': t.background })
  useAttributes(wrapper, picker('align'), { 'aria-label': t.align })
  useAttributes(wrapper, '.ql-tooltip input[type="text"]', {
    'aria-label': t.linkUrl,
  })
  useAttributes(wrapper, '.ql-tooltip a.ql-preview', {
    'aria-label': t.openLink,
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
        ref={quill}
        theme="snow"
        defaultValue={initial}
        modules={MODULES}
        readOnly={disabled}
        // Quill normalises what it loads; only the user's edits count.
        onChange={(html, _delta, source, editor) => {
          if (source !== 'user') return
          const next = storedHtml(html, editor.getLength())
          held.current = next
          onChange(next)
        }}
        onBlur={() => onBlur?.()}
      />
    </div>
  )
}
