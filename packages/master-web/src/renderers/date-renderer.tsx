'use client'

import {
  Button,
  Calendar,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { CalendarIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { dateParts } from '../core/list'
import { formatDateValue } from '../core/values'
import { masterDataMessages } from '../i18n/master-data-messages'
import type { FieldRendererProps } from './types'

/**
 * `date`: a calendar in a popover. It shows the calendar date as stored
 * (no time-zone shift, so the server and the browser agree) and stores the
 * picked day at local midnight with its offset, as v0 did.
 */
export function DateRenderer({
  value,
  onChange,
  onBlur,
  id,
  labelId,
  describedBy,
  invalid,
  disabled,
}: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  const valueId = useId()
  const [open, setOpen] = useState(false)
  const parts = dateParts(value)
  const selected = parts
    ? new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
    : undefined
  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          onBlur={onBlur}
          // The label, then the date: the button's text alone is not its name.
          aria-labelledby={`${labelId} ${valueId}`}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            'mbc:w-full mbc:pl-3 mbc:text-left mbc:font-normal',
            !parts && 'mbc:text-muted-foreground'
          )}
        >
          <span id={valueId}>{parts ? t.date(parts) : t.datePlaceholder}</span>
          <CalendarIcon
            aria-hidden
            className="mbc:ml-auto mbc:h-4 mbc:w-4 mbc:opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="mbc:w-auto mbc:p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(day) => {
            onChange(day ? formatDateValue(day) : '')
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
