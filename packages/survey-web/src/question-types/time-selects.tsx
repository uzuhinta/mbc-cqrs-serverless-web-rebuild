'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mbc-cqrs-serverless/ui-web'

const pad = (n: number) => String(n).padStart(2, '0')
export const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
export const SIXTY = Array.from({ length: 60 }, (_, i) => pad(i))

export function TimeSelect({
  value,
  options,
  placeholder,
  onChange,
  disabled,
  className,
}: {
  value: string
  options: readonly string[]
  placeholder: string
  onChange: (value: string) => void
  disabled: boolean
  className?: string
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="mbc:max-h-60 mbc:overflow-y-auto">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** v0's hour/minute pair used by time and date-time questions. */
export const CLOCK_TRIGGER =
  'mbc:w-full mbc:max-w-[120px] mbc:justify-between mbc:bg-white'
