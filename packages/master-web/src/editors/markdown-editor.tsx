'use client'

import rehypeSanitize from 'rehype-sanitize'

import { EditorFallback } from './editor-fallback'
import type { EditorProps } from './types'
import { useLibrary } from './use-library'

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
  if (!library) return <EditorFallback {...props} />
  const Markdown = library.default
  return (
    <div data-mbc-editor="markdown" data-color-mode="light">
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
