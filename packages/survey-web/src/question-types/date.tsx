'use client'

import {
  Button,
  Calendar,
  cn,
  FieldGroup,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useFieldControl,
  useLocale,
  useMessages,
  type FieldControlProps,
} from '@mbc-cqrs-serverless/ui-web'
import { CalendarIcon } from 'lucide-react'
import { useId } from 'react'

import { surveyMessages } from '../i18n/survey-messages'
import type { DateQuestion } from '../schema/survey-schema'
import { formatDate, readDate, writeDate } from './date-value'
import { CLOCK_TRIGGER, HOURS, SIXTY, TimeSelect } from './time-selects'
import type { QuestionRendererProps } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function DateRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<DateQuestion>) {
  const t = useMessages(surveyMessages)
  const locale = useLocale()
  // v0's reading (`!== false`), for stored items that failed validation.
  const includeYear = question.includeYear !== false
  const includeTime = question.includeTime === true
  const date = readDate(value, includeYear)
  const placeholder = includeTime
    ? includeYear
      ? t.form.dateTimePlaceholder
      : t.form.dateTimePlaceholderNoYear
    : includeYear
      ? t.form.datePlaceholder
      : t.form.datePlaceholderNoYear

  const pickDay = (day: Date | undefined) => {
    if (!day) {
      onChange(undefined)
      return
    }
    const next = new Date(day)
    next.setHours(date?.getHours() ?? 0, date?.getMinutes() ?? 0, 0, 0)
    onChange(writeDate(next, includeYear))
  }

  const setTime = (part: 'hours' | 'minutes', text: string) => {
    const next = date ? new Date(date) : new Date()
    if (part === 'hours') next.setHours(Number(text))
    else next.setMinutes(Number(text))
    onChange(writeDate(next, includeYear))
  }

  // Date only: the button is the question's control, named by the question
  // and its own text. Date and time: the group carries the question instead.
  const valueId = useId()
  const control = useFieldControl<FieldControlProps>({}, { group: true })
  const controlProps = includeTime
    ? {}
    : {
        ...control,
        'aria-labelledby': control['aria-labelledby']
          ? `${control['aria-labelledby']} ${valueId}`
          : undefined,
      }

  const picker = (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          {...controlProps}
          variant="outline"
          disabled={disabled}
          onBlur={onBlur}
          className={cn(
            'mbc:w-full mbc:pl-3 mbc:text-left mbc:font-normal',
            includeTime && 'mbc:justify-start mbc:md:col-span-2',
            !date && 'mbc:text-muted-foreground'
          )}
        >
          <span id={valueId}>
            {date ? formatDate(date, includeYear, locale) : placeholder}
          </span>
          <CalendarIcon
            aria-hidden
            className="mbc:ml-auto mbc:h-4 mbc:w-4 mbc:opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="mbc:w-auto mbc:p-0" align="start">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          defaultMonth={date ?? undefined}
          onSelect={pickDay}
          disabled={disabled}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )

  if (!includeTime) return picker

  return (
    <FieldGroup className="mbc:w-full">
      <div className="mbc:grid mbc:grid-cols-1 mbc:gap-8 mbc:md:grid-cols-4">
        {picker}
        <div className="mbc:flex mbc:items-center mbc:gap-2 mbc:md:col-span-1">
          <TimeSelect
            value={date ? pad(date.getHours()) : ''}
            options={HOURS}
            placeholder={t.form.hour}
            onChange={(text) => setTime('hours', text)}
            disabled={disabled || !date}
            className={CLOCK_TRIGGER}
          />
          <span className="mbc:mr-8 mbc:font-normal mbc:text-gray-500">
            {t.form.hour}
          </span>
          <TimeSelect
            value={date ? pad(date.getMinutes()) : ''}
            options={SIXTY}
            placeholder={t.form.minute}
            onChange={(text) => setTime('minutes', text)}
            disabled={disabled || !date}
            className={CLOCK_TRIGGER}
          />
          <span className="mbc:font-normal mbc:text-gray-500">
            {t.form.minute}
          </span>
        </div>
      </div>
    </FieldGroup>
  )
}
