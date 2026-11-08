'use client'

import { useRef } from 'react'
import rehypeSanitize from 'rehype-sanitize'

import { EditorFallback } from './editor-fallback'
import type { EditorProps } from './types'
import { useAttributes, useLibrary } from './use-library'

const loadMarkdown = () => import('@uiw/react-md-editor')

// The preview renders the Markdown's raw HTML (rehype-raw) and keeps every
// link: sanitise it, or a stored record runs script when it is opened.
const PREVIEW = { rehypePlugins: [rehypeSanitize] }

/**
 * Markdown in @uiw/react-md-editor with a live preview; the preview only,
 * without the toolbar, when disabled. The library brings its own scoped CSS.
 */
export function MarkdownEditor(props: EditorProps) {
  const { value, onChange, onBlur, disabled = false } = props
  const { id, describedBy, invalid } = props
  const library = useLibrary(loadMarkdown)
  const wrapper = useRef<HTMLDivElement>(null)
  // The toolbar's buttons are named; their icons are images without names.
  useAttributes(wrapper, '.w-md-editor-toolbar svg', {
    'aria-hidden': 'true',
  })
  // The preview's heading anchors are empty links next to the heading.
  useAttributes(
    wrapper,
    '.wmde-markdown :is(h1, h2, h3, h4, h5, h6) > a[href^="#"]',
    { 'aria-hidden': 'true' }
  )
  if (!library) return <EditorFallback {...props} />
  const Markdown = library.default
  return (
    <div ref={wrapper} data-mbc-editor="markdown" data-color-mode="light">
      <Markdown
        value={value}
        onChange={(next) => onChange(next ?? '')}
        preview={disabled ? 'preview' : 'live'}
        hideToolbar={disabled}
        overflow={false}
        previewOptions={PREVIEW}
        // Tab moves the focus on instead of indenting (WCAG 2.1.2).
        defaultTabEnable
        textareaProps={{
          id,
          onBlur,
          'aria-describedby': describedBy,
          'aria-invalid': invalid || undefined,
        }}
      />
    </div>
  )
}
