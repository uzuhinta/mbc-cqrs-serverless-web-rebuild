'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import type { DurationAnswer, TimeAnswer } from '../answers/types'
import { surveyMessages } from '../i18n/survey-messages'
import type { TimeQuestion } from '../schema/survey-schema'
import { CLOCK_TRIGGER, HOURS, SIXTY, TimeSelect } from './time-selects'
import type { QuestionRendererProps } from './types'

function asRecord(value: unknown): Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {}
}

export function TimeRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<TimeQuestion>) {
  const t = useMessages(surveyMessages)
  const current = asRecord(value)

  if (question.answerType === 'duration') {
    const update = (part: keyof DurationAnswer, text: string) =>
      onChange({
        hours: '',
        minutes: '',
        seconds: '',
        ...current,
        [part]: text,
      } as DurationAnswer)
    return (
      <div
        className="mbc:flex mbc:max-w-sm mbc:items-center mbc:gap-2"
        onBlur={onBlur}
      >
        <div className="mbc:flex-1">
          <TimeSelect
            value={current.hours ?? ''}
            options={HOURS}
            placeholder={t.form.hours}
            onChange={(text) => update('hours', text)}
            disabled={disabled}
            className="mbc:w-full"
          />
        </div>
        <span className="mbc:text-muted-foreground">:</span>
        <div className="mbc:flex-1">
          <TimeSelect
            value={current.minutes ?? ''}
            options={SIXTY}
            placeholder={t.form.minutes}
            onChange={(text) => update('minutes', text)}
            disabled={disabled}
            className="mbc:w-full"
          />
        </div>
        <span className="mbc:text-muted-foreground">:</span>
        <div className="mbc:flex-1">
          <TimeSelect
            value={current.seconds ?? ''}
            options={SIXTY}
            placeholder={t.form.seconds}
            onChange={(text) => update('seconds', text)}
            disabled={disabled}
            className="mbc:w-full"
          />
        </div>
      </div>
    )
  }

  const update = (part: keyof TimeAnswer, text: string) =>
    onChange({ hour: '', minute: '', ...current, [part]: text } as TimeAnswer)
  return (
    <div
      className="mbc:flex mbc:max-w-sm mbc:items-center mbc:gap-2"
      onBlur={onBlur}
    >
      <div>
        <TimeSelect
          value={current.hour ?? ''}
          options={HOURS}
          placeholder={t.form.hour}
          onChange={(text) => update('hour', text)}
          disabled={disabled}
          className={CLOCK_TRIGGER}
        />
      </div>
      <span className="mbc:mr-8 mbc:font-normal mbc:text-gray-500">
        {t.form.hour}
      </span>
      <div>
        <TimeSelect
          value={current.minute ?? ''}
          options={SIXTY}
          placeholder={t.form.minute}
          onChange={(text) => update('minute', text)}
          disabled={disabled}
          className={CLOCK_TRIGGER}
        />
      </div>
      <span className="mbc:font-normal mbc:text-gray-500">{t.form.minute}</span>
    </div>
  )
}
