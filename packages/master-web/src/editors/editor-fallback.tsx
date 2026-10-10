'use client'

import { Textarea } from '@mbc-cqrs-serverless/ui-web'

import type { EditorProps } from './types'

/** What an editor shows on the server and until its library has loaded. */
export function EditorFallback({
  value,
  onChange,
  onBlur,
  disabled,
  id,
  describedBy,
  invalid,
}: EditorProps) {
  return (
    <Textarea
      id={id}
      value={value}
      disabled={disabled}
      onBlur={onBlur}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="mbc:min-h-32"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
