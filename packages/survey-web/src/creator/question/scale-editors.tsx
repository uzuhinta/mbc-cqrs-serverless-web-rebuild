'use client'

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Calendar, Clock, Heart, Star, ThumbsUp } from 'lucide-react'

import type {
  DateQuestion,
  LinearScaleQuestion,
  RatingQuestion,
  TimeQuestion,
} from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

const TWO_TO_TEN = Array.from({ length: 9 }, (_, i) => String(i + 2))
const SMALL_TRIGGER = 'mbc:w-[80px] mbc:border-0 mbc:placeholder:text-xs'
const LABEL_INPUT =
  'mbc:max-w-[200px] mbc:rounded-none mbc:border-0 mbc:border-b mbc:text-xs mbc:shadow-none mbc:placeholder:text-xs mbc:focus-visible:ring-0'
const SYMBOLS = { star: Star, heart: Heart, thumb: ThumbsUp } as const

function NumberSelect({
  label,
  value,
  values,
  onChange,
  className = SMALL_TRIGGER,
}: {
  label: string
  value: number
  values: readonly string[]
  onChange: (value: number) => void
  className?: string
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
    >
      <SelectTrigger size="xs" className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((option) => (
          <SelectItem key={option} value={option} className="mbc:text-xs">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function LinearScaleEditor({
  question,
  onChange,
}: {
  question: LinearScaleQuestion
  onChange: (next: LinearScaleQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const ends = [
    ['min', question.min, 'minLabel'],
    ['max', question.max, 'maxLabel'],
  ] as const
  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-4 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-4">
        <div className="mbc:flex mbc:items-center mbc:gap-2">
          <NumberSelect
            label={t.scale.min}
            value={question.min}
            values={['0', '1']}
            onChange={(min) => onChange({ ...question, min })}
          />
          <span className="mbc:text-muted-foreground mbc:text-sm">
            {t.scale.to}
          </span>
          <NumberSelect
            label={t.scale.max}
            value={question.max}
            values={TWO_TO_TEN}
            onChange={(max) => onChange({ ...question, max })}
          />
        </div>
      </div>
      <div className="mbc:flex mbc:flex-col mbc:gap-2">
        {ends.map(([end, value, key]) => (
          <div key={end} className="mbc:flex mbc:items-center mbc:gap-4">
            <span className="mbc:text-muted-foreground mbc:w-8 mbc:shrink-0 mbc:text-center mbc:text-sm">
              {value}
            </span>
            <Input
              placeholder={t.scale.labelPlaceholder}
              aria-label={`${t.scale[end]} ${t.scale.labelPlaceholder}`}
              className={LABEL_INPUT}
              value={question[key] ?? ''}
              onChange={(event) =>
                onChange({ ...question, [key]: event.target.value })
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RatingEditor({
  question,
  onChange,
}: {
  question: RatingQuestion
  onChange: (next: RatingQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const Icon = SYMBOLS[question.symbol] ?? Star
  const levels = Array.from({ length: question.levels }, (_, i) => i + 1)
  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-4 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-4">
        <NumberSelect
          label={t.rating.levels}
          value={question.levels}
          values={TWO_TO_TEN}
          onChange={(n) => onChange({ ...question, levels: n })}
        />
        <Select
          value={question.symbol}
          onValueChange={(symbol) =>
            onChange({
              ...question,
              symbol: symbol as RatingQuestion['symbol'],
            })
          }
        >
          <SelectTrigger
            size="xs"
            className="mbc:w-[120px] mbc:border-0 mbc:placeholder:text-xs"
            aria-label={t.rating.symbol}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['star', 'heart', 'thumb'] as const).map((symbol) => {
              const SymbolIcon = SYMBOLS[symbol]
              return (
                <SelectItem key={symbol} value={symbol} className="mbc:text-xs">
                  <div className="mbc:flex mbc:items-center mbc:gap-2">
                    <SymbolIcon aria-hidden className="mbc:h-4 mbc:w-4" />{' '}
                    {t.rating[symbol]}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="mbc:pointer-events-none mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:gap-4">
        <div className="mbc:flex mbc:grow mbc:justify-around">
          {levels.map((num) => (
            <div
              key={num}
              className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
            >
              <span className="mbc:text-muted-foreground mbc:text-sm">
                {num}
              </span>
              <Icon
                aria-hidden
                className="mbc:text-muted-foreground mbc:h-6 mbc:w-6"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** v0 shows disabled inputs; the date and time options live in the card's menu. */
export function DateEditor({ question }: { question: DateQuestion }) {
  const t = useMessages(creatorMessages)
  return (
    <div className="mbc:pointer-events-none mbc:flex mbc:max-w-[250px] mbc:flex-col mbc:gap-2 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-2">
        <Input
          disabled
          aria-label={t.kinds.date}
          placeholder={
            question.includeYear === false
              ? t.preview.dateNoYear
              : t.preview.dateWithYear
          }
          className="mbc:border-0 mbc:border-b mbc:shadow-none"
        />
        <Calendar
          aria-hidden
          className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
        />
      </div>
      {question.includeTime && (
        <div className="mbc:flex mbc:items-center mbc:gap-2">
          <Input
            disabled
            aria-label={t.preview.time}
            placeholder={t.preview.time}
            className="mbc:border-0 mbc:border-b mbc:shadow-none"
          />
          <Clock
            aria-hidden
            className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
          />
        </div>
      )}
    </div>
  )
}

export function TimeEditor({ question }: { question: TimeQuestion }) {
  const t = useMessages(creatorMessages)
  const label =
    question.answerType === 'duration'
      ? t.question.answerDuration
      : t.question.answerTime
  return (
    <div className="mbc:pointer-events-none mbc:flex mbc:max-w-[250px] mbc:flex-col mbc:gap-2 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-2">
        <Input
          disabled
          aria-label={label}
          placeholder={label}
          className="mbc:border-0 mbc:border-b mbc:shadow-none"
        />
        <Clock
          aria-hidden
          className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
        />
      </div>
    </div>
  )
}
