'use client'

import { Input, useMessages } from '@mbc-cqrs-serverless/ui-web'

import { surveyMessages } from '../i18n/survey-messages'
import type { ShortTextQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

export function ShortTextRenderer({
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<ShortTextQuestion>) {
  const t = useMessages(surveyMessages)
  return (
    <Input
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={t.form.placeholder}
    />
  )
}
