'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  AlignLeft,
  BarChartHorizontal,
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  Clock,
  Minus,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Fragment } from 'react'

import type { QuestionKind } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

export const KIND_GROUPS: readonly (readonly QuestionKind[])[] = [
  ['short-text', 'long-text'],
  ['single-choice', 'multiple-choice', 'dropdown'],
  ['linear-scale', 'rating'],
  ['date', 'time'],
]

export const KIND_ICONS: Record<QuestionKind, LucideIcon> = {
  'short-text': Minus,
  'long-text': AlignLeft,
  'single-choice': CircleDot,
  'multiple-choice': CheckSquare,
  dropdown: ChevronDownSquare,
  'linear-scale': BarChartHorizontal,
  rating: Star,
  date: Calendar,
  time: Clock,
}

export function TypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: QuestionKind
  onChange: (kind: QuestionKind) => void
  disabled?: boolean
}) {
  const t = useMessages(creatorMessages)
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as QuestionKind)}
      disabled={disabled}
    >
      <SelectTrigger className="mbc:w-[220px]" aria-label={t.question.type}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {KIND_GROUPS.map((group, index) => (
          <Fragment key={group[0]}>
            {index > 0 && <SelectSeparator />}
            <SelectGroup>
              {group.map((kind) => {
                const Icon = KIND_ICONS[kind]
                return (
                  <SelectItem key={kind} value={kind}>
                    <div className="mbc:flex mbc:items-center mbc:gap-2">
                      <Icon aria-hidden className="mbc:h-4 mbc:w-4" />{' '}
                      {t.kinds[kind]}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectGroup>
          </Fragment>
        ))}
      </SelectContent>
    </Select>
  )
}
