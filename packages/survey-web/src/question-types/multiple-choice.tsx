'use client'

import {
  Checkbox,
  FieldGroup,
  Input,
  Label,
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
import type { MultipleChoiceQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'
import { useShuffled } from './use-shuffled'

const ROW =
  'mbc:hover:bg-muted mbc:flex mbc:items-center mbc:gap-2 mbc:rounded-md mbc:p-2 mbc:transition-colors'

export function MultipleChoiceRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<MultipleChoiceQuestion>) {
  const t = useMessages(surveyMessages)
  const baseId = useId()
  // useShuffled reshuffles when `items` changes identity: memoise the filter.
  const regularOptions = useMemo(
    () => question.options.filter((option) => !option.isOther),
    [question.options]
  )
  const regular = useShuffled(
    regularOptions,
    question.validation?.shuffleOptions === true
  )
  const other = question.options.find((option) => option.isOther)
  const values = Array.isArray(value) ? value : []
  const otherValue = values.find(isOtherValue)

  const toggle = (optionValue: string, checked: boolean) => {
    onChange(
      checked
        ? [...values, optionValue]
        : values.filter((item) => item !== optionValue)
    )
  }
  const toggleOther = (checked: boolean) => {
    const rest = values.filter((item) => !isOtherValue(item))
    onChange(checked ? [...rest, OTHER_VALUE] : rest)
  }
  const setOtherText = (text: string) => {
    onChange(
      values.map((item) => (isOtherValue(item) ? toOtherValue(text) : item))
    )
  }

  return (
    <FieldGroup onBlur={onBlur}>
      {regular.map((option, index) => (
        <div key={option.value} className={ROW}>
          <Checkbox
            id={`${baseId}-${index}`}
            checked={values.includes(option.value)}
            onCheckedChange={(checked) =>
              toggle(option.value, checked === true)
            }
            disabled={disabled}
          />
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
          <Checkbox
            id={`${baseId}-other`}
            checked={otherValue !== undefined}
            onCheckedChange={(checked) => toggleOther(checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor={`${baseId}-other`}
            className="mbc:shrink-0 mbc:cursor-pointer mbc:whitespace-nowrap mbc:font-normal"
          >
            {other.label}
          </Label>
          {otherValue !== undefined && (
            <Input
              value={otherText(otherValue)}
              onChange={(event) => setOtherText(event.target.value)}
              placeholder={t.form.otherPlaceholder}
              disabled={disabled}
              className="mbc:ml-2 mbc:min-w-0 mbc:flex-1"
            />
          )}
        </div>
      )}
    </FieldGroup>
  )
}
