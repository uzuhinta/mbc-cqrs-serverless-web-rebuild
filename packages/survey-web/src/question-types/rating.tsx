'use client'

import { cn, useFieldControl, useMessages } from '@mbc-cqrs-serverless/ui-web'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Heart, Star, ThumbsUp } from 'lucide-react'
import { useState } from 'react'

import { surveyMessages } from '../i18n/survey-messages'
import type { RatingQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

const SYMBOLS = {
  star: { Icon: Star, filled: 'mbc:text-yellow-500 mbc:fill-yellow-400' },
  heart: { Icon: Heart, filled: 'mbc:text-red-600 mbc:fill-red-500' },
  thumb: { Icon: ThumbsUp, filled: 'mbc:text-blue-600 mbc:fill-blue-500' },
} as const

export function RatingRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<RatingQuestion>) {
  const t = useMessages(surveyMessages)
  const [hover, setHover] = useState<number | null>(null)
  const groupProps = useFieldControl({}, { group: true })
  const { Icon, filled } = SYMBOLS[question.symbol]
  const levels = Array.from({ length: question.levels }, (_, i) => i + 1)
  const shown = hover ?? (typeof value === 'number' ? value : 0)

  return (
    <RadioGroupPrimitive.Root
      {...groupProps}
      data-mbc=""
      value={typeof value === 'number' ? String(value) : ''}
      onValueChange={(next) => onChange(Number(next))}
      onBlur={onBlur}
      disabled={disabled}
      orientation="horizontal"
      className="mbc:flex mbc:grow mbc:justify-around"
      onMouseLeave={() => setHover(null)}
    >
      {levels.map((level) => (
        <div
          key={level}
          className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
          onMouseEnter={() => setHover(level)}
        >
          <span aria-hidden className="mbc:text-muted-foreground mbc:text-sm">
            {level}
          </span>
          <RadioGroupPrimitive.Item
            value={String(level)}
            aria-label={t.form.rating({ value: level, max: question.levels })}
            className="mbc:cursor-pointer mbc:rounded-md mbc:outline-none mbc:focus-visible:ring-[3px] mbc:focus-visible:ring-ring/50 mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50"
          >
            <Icon
              aria-hidden
              className={cn(
                'mbc:h-7 mbc:w-7 mbc:transition-colors mbc:sm:h-8 mbc:sm:w-8',
                shown >= level ? filled : 'mbc:text-muted-foreground'
              )}
            />
          </RadioGroupPrimitive.Item>
        </div>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
