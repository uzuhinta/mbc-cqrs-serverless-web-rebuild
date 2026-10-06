'use client'

import { Check, ChevronsUpDown, Inbox } from 'lucide-react'
import { useState } from 'react'

import { useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'
import { Badge } from './badge'
import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'
import { useFieldControl } from './field'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type MultiSelectOption = { value: string; label: string }

export type MultiSelectProps = {
  options: readonly MultiSelectOption[]
  value: readonly string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** v0's multi-select combobox: chips in the trigger, search and a check list in a popover. */
export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  ...rest
}: MultiSelectProps) {
  const t = useMessages(uiMessages)
  const control = useFieldControl(rest)
  const [open, setOpen] = useState(false)
  // A value that is no longer an option keeps its chip (shown as the raw value).
  const labelOf = (item: string) =>
    options.find((option) => option.value === item)?.label ?? item
  const toggle = (item: string) =>
    onValueChange(
      value.includes(item)
        ? value.filter((entry) => entry !== item)
        : [...value, item]
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          {...control}
          className={cn('mbc:h-auto mbc:w-full mbc:justify-between', className)}
        >
          <span className="mbc:flex mbc:flex-wrap mbc:gap-1">
            {value.length > 0 ? (
              value.map((item) => (
                <Badge key={item} variant="secondary" className="mbc:mr-1">
                  {labelOf(item)}
                </Badge>
              ))
            ) : (
              <span className="mbc:text-muted-foreground mbc:font-normal">
                {placeholder ?? t.multiSelect.placeholder}
              </span>
            )}
          </span>
          <ChevronsUpDown
            aria-hidden
            className="mbc:h-4 mbc:w-4 mbc:shrink-0 mbc:opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="mbc:w-(--radix-popover-trigger-width) mbc:p-0">
        <Command>
          <CommandInput
            placeholder={t.multiSelect.search}
            aria-label={t.multiSelect.search}
          />
          <CommandList>
            <CommandEmpty>
              <div className="mbc:text-muted-foreground mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:gap-4">
                {/* v0 faded the whole block to 20%; only the icon stays faded so the text is readable. */}
                <Inbox
                  aria-hidden
                  className="mbc:h-16 mbc:w-16 mbc:opacity-20"
                />
                <p>{t.multiSelect.empty}</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = value.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    // cmdk matches on `value`; the option value keeps repeated labels apart.
                    value={`${option.label} ${option.value}`}
                    onSelect={() => toggle(option.value)}
                  >
                    <Check
                      aria-hidden
                      className={cn(
                        'mbc:mr-2 mbc:h-4 mbc:w-4',
                        selected ? 'mbc:opacity-100' : 'mbc:opacity-0'
                      )}
                    />
                    {option.label}
                    {selected ? (
                      <>
                        {' '}
                        <span className="mbc:sr-only">
                          {t.multiSelect.selected}
                        </span>
                      </>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
