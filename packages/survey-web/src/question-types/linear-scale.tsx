'use client'

import { Label, RadioGroup, RadioGroupItem } from '@mbc-cqrs-serverless/ui-web'
import { useId } from 'react'

import type { LinearScaleQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

export function LinearScaleRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<LinearScaleQuestion>) {
  const baseId = useId()
  const count = Math.max(0, question.max - question.min + 1)
  const options = Array.from({ length: count }, (_, i) => question.min + i)

  return (
    <RadioGroup
      value={typeof value === 'number' ? String(value) : ''}
      onValueChange={(next) => onChange(Number(next))}
      onBlur={onBlur}
      disabled={disabled}
      orientation="horizontal"
      className="mbc:w-full"
    >
      <div className="mbc:flex mbc:items-center mbc:justify-between mbc:gap-4">
        <Label className="mbc:w-1/12 mbc:shrink-0 mbc:text-center mbc:text-sm">
          {question.minLabel}
        </Label>
        <div className="mbc:flex mbc:grow mbc:justify-around">
          {options.map((num) => (
            <div
              key={num}
              className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
            >
              <Label
                htmlFor={`${baseId}-${num}`}
                className="mbc:text-muted-foreground mbc:text-sm"
              >
                {num}
              </Label>
              <RadioGroupItem value={String(num)} id={`${baseId}-${num}`} />
            </div>
          ))}
        </div>
        <Label className="mbc:w-1/12 mbc:shrink-0 mbc:text-center mbc:text-sm">
          {question.maxLabel}
        </Label>
      </div>
    </RadioGroup>
  )
}
