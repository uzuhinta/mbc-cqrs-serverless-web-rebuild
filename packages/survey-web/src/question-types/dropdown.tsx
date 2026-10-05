'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'

import { surveyMessages } from '../i18n/survey-messages'
import type { DropdownQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'
import { useShuffled } from './use-shuffled'

export function DropdownRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<DropdownQuestion>) {
  const t = useMessages(surveyMessages)
  const options = useShuffled(
    question.options,
    question.validation?.shuffleOptions === true
  )
  return (
    <Select
      value={typeof value === 'string' && value ? value : undefined}
      onValueChange={(next) => onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger onBlur={onBlur}>
        <SelectValue placeholder={t.form.selectPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
