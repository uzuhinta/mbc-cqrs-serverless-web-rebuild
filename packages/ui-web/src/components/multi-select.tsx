'use client'

import { Check, ChevronsUpDown, Inbox } from 'lucide-react'
import { forwardRef, useState, type ButtonHTMLAttributes } from 'react'

import { useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'
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

export type MultiSelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'type'
> & {
  options: readonly MultiSelectOption[]
  value: readonly string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
}

// master v0's outline Button and secondary Badge; ui-web's Button and Badge
// carry survey v0's look, so they are not used here.
const TRIGGER =
  'mbc:inline-flex mbc:items-center mbc:whitespace-nowrap mbc:rounded-md mbc:text-sm mbc:font-medium mbc:ring-offset-background mbc:transition-colors mbc:focus-visible:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring mbc:focus-visible:ring-offset-2 mbc:disabled:pointer-events-none mbc:disabled:opacity-50 mbc:border mbc:border-input mbc:bg-background mbc:hover:bg-accent mbc:hover:text-accent-foreground mbc:px-4 mbc:py-2 mbc:h-auto mbc:w-full mbc:justify-between'
const CHIP =
  'mbc:inline-flex mbc:items-center mbc:rounded-full mbc:px-2.5 mbc:py-0.5 mbc:text-xs mbc:font-semibold mbc:transition-colors mbc:focus:outline-none mbc:focus:ring-2 mbc:focus:ring-ring mbc:focus:ring-offset-2 mbc:border-transparent mbc:bg-secondary mbc:text-secondary-foreground mbc:hover:bg-secondary/80 mbc:mr-1'

/** v0's multi-select combobox: chips in the trigger, search and a check list in a popover. */
export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(
  function MultiSelect(
    { options, value, onValueChange, placeholder, className, ...rest },
    ref
  ) {
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
          <button
            ref={ref}
            type="button"
            role="combobox"
            aria-expanded={open}
            {...control}
            className={cn(TRIGGER, className)}
          >
            <span className="mbc:flex mbc:flex-wrap mbc:gap-1">
              {value.length > 0 ? (
                value.map((item) => (
                  <span key={item} className={CHIP}>
                    {labelOf(item)}
                  </span>
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
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={t.multiSelect.options}
          className="mbc:w-(--radix-popover-trigger-width) mbc:p-0"
        >
          <Command label={t.multiSelect.search}>
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
                            {t.multiSelect.checked}
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
)
