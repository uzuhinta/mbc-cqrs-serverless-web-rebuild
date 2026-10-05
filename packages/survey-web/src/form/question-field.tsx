'use client'

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@mbc-cqrs-serverless/ui-web'
import type { ReactNode } from 'react'

export type QuestionFieldProps = {
  questionId: string
  label: string
  description?: string
  required?: boolean
  error?: string
  children: ReactNode
}

/** v0's QuestionWrapper (card, label, description, error) on ui-web's Field. */
export function QuestionField({
  questionId,
  label,
  description,
  required,
  error,
  children,
}: QuestionFieldProps) {
  return (
    <div
      data-question-id={questionId}
      data-invalid={error ? '' : undefined}
      className="mbc:bg-card mbc:text-card-foreground mbc:focus-within:ring-ring mbc:mb-8 mbc:rounded-lg mbc:border mbc:border-border mbc:p-6 mbc:shadow-sm mbc:transition-all mbc:duration-300 mbc:ease-in-out mbc:focus-within:ring-2"
    >
      {/* Field wires the ids; `contents` keeps v0's block flow instead of Field's grid. */}
      <Field invalid={Boolean(error)} className="mbc:contents">
        <FieldLabel
          required={required}
          className="mbc:text-lg mbc:font-semibold mbc:leading-relaxed mbc:tracking-tight"
        >
          {label}
        </FieldLabel>
        {description && (
          <FieldDescription className="mbc:text-muted-foreground mbc:mb-4 mbc:mt-1">
            {description}
          </FieldDescription>
        )}
        <div className="mbc:mt-4">{children}</div>
        <FieldError role="alert" className="mbc:mt-2 mbc:font-medium">
          {error}
        </FieldError>
      </Field>
    </div>
  )
}
