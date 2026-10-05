'use client'

import { Textarea, useMessages } from '@mbc-cqrs-serverless/ui-web'

import { surveyMessages } from '../i18n/survey-messages'
import type { LongTextQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

export function LongTextRenderer({
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<LongTextQuestion>) {
  const t = useMessages(surveyMessages)
  return (
    <Textarea
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={t.form.placeholder}
      className="mbc:min-h-[120px] mbc:resize-y"
      rows={5}
    />
  )
}
