'use client'

import { cn, inputVariants, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { Calendar, Clock, Heart, Star, ThumbsUp } from 'lucide-react'

import type { QuestionOption, SurveyQuestion } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

const MUTED_SM = 'mbc:text-muted-foreground mbc:text-sm'
const RADIO =
  'mbc:border-muted-foreground mbc:h-4 mbc:w-4 mbc:rounded-full mbc:border'
const CHECKBOX =
  'mbc:border-muted-foreground mbc:h-4 mbc:w-4 mbc:rounded-sm mbc:border'
/** Looks like v0's disabled `<Input>` but is not a form control (the card is a button). */
const FAKE_INPUT = cn(
  inputVariants(),
  'mbc:items-center mbc:border-0 mbc:border-b mbc:shadow-none mbc:opacity-50 mbc:text-[#545454]'
)
const SYMBOLS = { star: Star, heart: Heart, thumb: ThumbsUp } as const

function ChoiceList({
  options,
  shuffled,
  marker,
}: {
  options: readonly QuestionOption[]
  shuffled: boolean
  marker: string
}) {
  const t = useMessages(creatorMessages)
  const regular = options.filter((option) => !option.isOther)
  const other = options.find((option) => option.isOther)
  const rest = regular.length - Math.min(3, regular.length)
  const row = (option: QuestionOption, key: string | number) => (
    <div key={key} className="mbc:flex mbc:items-center mbc:gap-3">
      <div className={marker} />
      <p className="mbc:text-muted-foreground">{option.label}</p>
    </div>
  )
  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-2">
      {regular.slice(0, 3).map(row)}
      {rest > 0 && (
        <p className={MUTED_SM}>
          {t.preview.moreOptions({ count: rest })}
          {shuffled && t.preview.shuffled}
        </p>
      )}
      {other && row(other, 'other')}
    </div>
  )
}

function FakeField({
  text,
  icon: Icon,
}: {
  text: string
  icon: typeof Calendar
}) {
  return (
    <div className="mbc:flex mbc:items-center mbc:gap-2">
      <div className={FAKE_INPUT}>{text}</div>
      <Icon
        aria-hidden
        className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
      />
    </div>
  )
}

/** v0's view-mode previews (shapes only; nothing focusable). */
export function QuestionPreview({ question }: { question: SurveyQuestion }) {
  const t = useMessages(creatorMessages)
  switch (question.type) {
    case 'short-text':
      return (
        <p className="mbc:text-muted-foreground mbc:pointer-events-none mbc:w-1/2 mbc:border-b mbc:border-dashed mbc:border-border mbc:text-sm">
          {t.preview.shortText}
        </p>
      )
    case 'long-text':
      return (
        <div className="mbc:text-muted-foreground mbc:pointer-events-none mbc:min-h-[80px] mbc:w-full mbc:rounded mbc:border mbc:border-dashed mbc:border-border mbc:p-3 mbc:text-sm">
          {t.preview.longText}
        </div>
      )
    case 'single-choice':
    case 'multiple-choice':
      return (
        <ChoiceList
          options={question.options}
          shuffled={question.validation?.shuffleOptions === true}
          marker={question.type === 'single-choice' ? RADIO : CHECKBOX}
        />
      )
    case 'dropdown': {
      const rest = question.options.length - 3
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:flex-col mbc:gap-2">
          {question.options.slice(0, 3).map((option, index) => (
            <div
              key={index}
              className="mbc:text-muted-foreground mbc:flex mbc:items-center mbc:gap-2"
            >
              <span>{index + 1}.</span>
              <p>{option.label}</p>
            </div>
          ))}
          {rest > 0 && (
            <p className={MUTED_SM}>
              {t.preview.moreOptions({ count: rest })}
              {question.validation?.shuffleOptions && t.preview.shuffled}
            </p>
          )}
        </div>
      )
    }
    case 'linear-scale': {
      const min = question.min ?? 1
      const max = question.max ?? 5
      const numbers = Array.from(
        { length: Math.max(0, max - min + 1) },
        (_, i) => min + i
      )
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:gap-4">
          <span
            className={cn(MUTED_SM, 'mbc:w-1/12 mbc:shrink-0 mbc:text-center')}
          >
            {question.minLabel}
          </span>
          <div className="mbc:flex mbc:grow mbc:justify-around">
            {numbers.map((num) => (
              <div
                key={num}
                className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
              >
                <span className={MUTED_SM}>{num}</span>
                <div className={RADIO} />
              </div>
            ))}
          </div>
          <span
            className={cn(MUTED_SM, 'mbc:w-1/12 mbc:shrink-0 mbc:text-center')}
          >
            {question.maxLabel}
          </span>
        </div>
      )
    }
    case 'rating': {
      const Icon = SYMBOLS[question.symbol] ?? Star
      const levels = Array.from(
        { length: question.levels || 5 },
        (_, i) => i + 1
      )
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:gap-4">
          <div className="mbc:flex mbc:grow mbc:justify-around">
            {levels.map((num) => (
              <div
                key={num}
                className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
              >
                <span className={MUTED_SM}>{num}</span>
                <Icon
                  aria-hidden
                  className="mbc:text-muted-foreground mbc:h-6 mbc:w-6"
                />
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'date':
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:max-w-[250px] mbc:flex-col mbc:gap-2 mbc:px-1 mbc:pt-4">
          <FakeField
            text={
              question.includeYear === false
                ? t.preview.dateNoYear
                : t.preview.dateWithYear
            }
            icon={Calendar}
          />
          {question.includeTime && (
            <FakeField text={t.preview.time} icon={Clock} />
          )}
        </div>
      )
    case 'time':
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:w-1/2 mbc:items-center mbc:gap-2">
          <FakeField
            text={
              question.answerType === 'duration'
                ? t.question.answerDuration
                : t.question.answerTime
            }
            icon={Clock}
          />
        </div>
      )
  }
}
