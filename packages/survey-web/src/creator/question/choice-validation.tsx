'use client'

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { X } from 'lucide-react'

import type { MultipleChoiceQuestion } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

const UNDERLINE =
  'mbc:grow mbc:rounded-none mbc:border-0 mbc:border-b mbc:px-1 mbc:text-xs mbc:shadow-none mbc:placeholder:text-xs mbc:focus-visible:ring-0'

type CountRule = NonNullable<
  NonNullable<MultipleChoiceQuestion['validation']>['custom']
>

/** v0's multiple-choice rule: select at least / at most / exactly N. */
export function ChoiceCountEditor({
  question,
  onChange,
}: {
  question: MultipleChoiceQuestion
  onChange: (next: MultipleChoiceQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const custom = question.validation?.custom
  if (!custom) return null
  const set = (next: Partial<CountRule>) =>
    onChange({
      ...question,
      validation: { ...question.validation, custom: { ...custom, ...next } },
    })
  const close = () => {
    const { custom: _custom, ...validation } = question.validation ?? {}
    onChange({ ...question, validation })
  }
  return (
    <div className="mbc:mt-4 mbc:p-3">
      <div className="mbc:flex mbc:w-full mbc:grow mbc:gap-2 mbc:sm:w-auto mbc:sm:grow-0">
        <Select
          value={custom.rule}
          onValueChange={(rule) => set({ rule: rule as CountRule['rule'] })}
        >
          <SelectTrigger
            size="xs"
            className="mbc:w-[180px] mbc:border-0"
            aria-label={t.rules.choiceRule}
          >
            <SelectValue placeholder={t.rules.choiceRule} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="min" className="mbc:text-xs">
              {t.rules.atLeast}
            </SelectItem>
            <SelectItem value="max" className="mbc:text-xs">
              {t.rules.atMost}
            </SelectItem>
            <SelectItem value="exact" className="mbc:text-xs">
              {t.rules.exactly}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder={t.rules.count}
          className={UNDERLINE}
          value={Number.isNaN(custom.value) ? '' : custom.value}
          onChange={(event) => set({ value: event.target.valueAsNumber })}
        />
        <Input
          placeholder={t.rules.customError}
          className={UNDERLINE}
          value={custom.customError ?? ''}
          onChange={(event) => set({ customError: event.target.value })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:shrink-0"
          aria-label={t.rules.close}
          onClick={close}
        >
          <X aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      </div>
    </div>
  )
}
