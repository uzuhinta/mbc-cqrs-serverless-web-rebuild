'use client'

import {
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { useId, useMemo } from 'react'

import {
  isOtherValue,
  OTHER_VALUE,
  otherText,
  toOtherValue,
} from '../answers/choice'
import { surveyMessages } from '../i18n/survey-messages'
import type { SingleChoiceQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'
import { useShuffled } from './use-shuffled'

const ROW =
  'mbc:hover:bg-muted mbc:flex mbc:items-center mbc:gap-2 mbc:rounded-md mbc:p-2 mbc:transition-colors'

export function SingleChoiceRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<SingleChoiceQuestion>) {
  const t = useMessages(surveyMessages)
  const baseId = useId()
  // Filtered once per options change.
  const regularOptions = useMemo(
    () => question.options.filter((option) => !option.isOther),
    [question.options]
  )
  const regular = useShuffled(
    regularOptions,
    question.validation?.shuffleOptions === true
  )
  const other = question.options.find((option) => option.isOther)
  const current = typeof value === 'string' ? value : ''
  const otherSelected = current !== '' && isOtherValue(current)

  return (
    <RadioGroup
      value={otherSelected ? OTHER_VALUE : current}
      onValueChange={(next) => onChange(next)}
      onBlur={onBlur}
      disabled={disabled}
      className="mbc:flex mbc:flex-col mbc:gap-1"
    >
      {regular.map((option, index) => (
        <div key={option.value} className={ROW}>
          <RadioGroupItem value={option.value} id={`${baseId}-${index}`} />
          <Label
            htmlFor={`${baseId}-${index}`}
            className="mbc:w-full mbc:cursor-pointer mbc:font-normal"
          >
            {option.label}
          </Label>
        </div>
      ))}
      {other && (
        <div className={`${ROW} mbc:min-w-0`}>
          <RadioGroupItem value={OTHER_VALUE} id={`${baseId}-other`} />
          <Label
            htmlFor={`${baseId}-other`}
            className="mbc:shrink-0 mbc:cursor-pointer mbc:whitespace-nowrap mbc:font-normal"
          >
            {other.label}
          </Label>
          {otherSelected && (
            <Input
              value={otherText(current)}
              onChange={(event) => onChange(toOtherValue(event.target.value))}
              placeholder={t.form.otherPlaceholder}
              disabled={disabled}
              className="mbc:ml-2 mbc:min-w-0 mbc:flex-1"
            />
          )}
        </div>
      )}
    </RadioGroup>
  )
}
