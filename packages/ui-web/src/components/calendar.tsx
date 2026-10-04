'use client'

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, type ComponentProps } from 'react'
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from 'react-day-picker'
import { enUS, ja } from 'react-day-picker/locale'

import { useLocale } from '../i18n/provider'
import { cn } from '../lib/cn'
import { Button, type ButtonProps } from './button'
import { buttonVariants } from './button-variants'

const DAY_PICKER_LOCALES = { ja, en: enUS } as const
const INTL_LOCALES = { ja: 'ja-JP', en: 'en-US' } as const

export type CalendarProps = ComponentProps<typeof DayPicker> & {
  buttonVariant?: ButtonProps['variant']
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: CalendarProps) {
  const locale = useLocale()
  const defaults = getDefaultClassNames()
  const navButton = cn(
    buttonVariants({ variant: buttonVariant }),
    'mbc:h-(--cell-size) mbc:w-(--cell-size) mbc:select-none mbc:p-0 mbc:aria-disabled:opacity-50'
  )

  return (
    <DayPicker
      locale={DAY_PICKER_LOCALES[locale]}
      showOutsideDays={showOutsideDays}
      className={cn(
        'mbc:group/calendar mbc:bg-background mbc:p-3 mbc:[--cell-size:2rem] mbc:[[data-slot=card-content]_&]:bg-transparent mbc:[[data-slot=popover-content]_&]:bg-transparent',
        String.raw`mbc:rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`mbc:rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(INTL_LOCALES[locale], { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('mbc:w-fit', defaults.root),
        months: cn(
          'mbc:relative mbc:flex mbc:flex-col mbc:gap-4 mbc:md:flex-row',
          defaults.months
        ),
        month: cn('mbc:flex mbc:w-full mbc:flex-col mbc:gap-4', defaults.month),
        nav: cn(
          'mbc:absolute mbc:inset-x-0 mbc:top-0 mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:gap-1',
          defaults.nav
        ),
        button_previous: cn(navButton, defaults.button_previous),
        button_next: cn(navButton, defaults.button_next),
        month_caption: cn(
          'mbc:flex mbc:h-(--cell-size) mbc:w-full mbc:items-center mbc:justify-center mbc:px-(--cell-size)',
          defaults.month_caption
        ),
        dropdowns: cn(
          'mbc:flex mbc:h-(--cell-size) mbc:w-full mbc:items-center mbc:justify-center mbc:gap-1.5 mbc:text-sm mbc:font-medium',
          defaults.dropdowns
        ),
        dropdown_root: cn(
          'mbc:has-focus:border-ring mbc:border-input mbc:shadow-xs mbc:has-focus:ring-ring/50 mbc:has-focus:ring-[3px] mbc:relative mbc:rounded-md mbc:border',
          defaults.dropdown_root
        ),
        dropdown: cn(
          'mbc:bg-popover mbc:absolute mbc:inset-0 mbc:opacity-0',
          defaults.dropdown
        ),
        caption_label: cn(
          'mbc:select-none mbc:font-medium',
          captionLayout === 'label'
            ? 'mbc:text-sm'
            : 'mbc:[&>svg]:text-muted-foreground mbc:flex mbc:h-8 mbc:items-center mbc:gap-1 mbc:rounded-md mbc:pl-2 mbc:pr-1 mbc:text-sm mbc:[&>svg]:size-3.5',
          defaults.caption_label
        ),
        table: 'mbc:w-full mbc:border-collapse',
        weekdays: cn('mbc:flex', defaults.weekdays),
        weekday: cn(
          'mbc:text-muted-foreground mbc:flex-1 mbc:select-none mbc:rounded-md mbc:text-[0.8rem] mbc:font-normal',
          defaults.weekday
        ),
        week: cn('mbc:mt-2 mbc:flex mbc:w-full', defaults.week),
        week_number_header: cn(
          'mbc:w-(--cell-size) mbc:select-none',
          defaults.week_number_header
        ),
        week_number: cn(
          'mbc:text-muted-foreground mbc:select-none mbc:text-[0.8rem]',
          defaults.week_number
        ),
        day: cn(
          'mbc:group/day mbc:relative mbc:aspect-square mbc:h-full mbc:w-full mbc:select-none mbc:p-0 mbc:text-center mbc:[&:first-child[data-selected=true]_button]:rounded-l-md mbc:[&:last-child[data-selected=true]_button]:rounded-r-md',
          defaults.day
        ),
        range_start: cn('mbc:bg-accent mbc:rounded-l-md', defaults.range_start),
        range_middle: cn('mbc:rounded-none', defaults.range_middle),
        range_end: cn('mbc:bg-accent mbc:rounded-r-md', defaults.range_end),
        today: cn(
          'mbc:bg-accent mbc:text-accent-foreground mbc:rounded-md mbc:data-[selected=true]:rounded-none',
          defaults.today
        ),
        outside: cn(
          'mbc:text-muted-foreground mbc:aria-selected:text-muted-foreground',
          defaults.outside
        ),
        disabled: cn(
          'mbc:text-muted-foreground mbc:opacity-50',
          defaults.disabled
        ),
        hidden: cn('mbc:invisible', defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div
            data-mbc=""
            data-slot="calendar"
            ref={rootRef}
            className={cn(rootClassName)}
            {...rootProps}
          />
        ),
        Chevron: ({ className: iconClassName, orientation, ...iconProps }) => {
          const Icon =
            orientation === 'left'
              ? ChevronLeft
              : orientation === 'right'
                ? ChevronRight
                : ChevronDown
          return (
            <Icon className={cn('mbc:size-4', iconClassName)} {...iconProps} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...cellProps }) => (
          <td {...cellProps}>
            <div className="mbc:flex mbc:size-(--cell-size) mbc:items-center mbc:justify-center mbc:text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  )
}

export function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const defaults = getDefaultClassNames()
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'mbc:data-[range-end=true]:bg-primary mbc:data-[range-middle=true]:bg-accent mbc:data-[range-start=true]:bg-primary mbc:data-[selected-single=true]:bg-primary mbc:data-[range-end=true]:text-primary-foreground mbc:data-[range-middle=true]:text-accent-foreground mbc:data-[range-start=true]:text-primary-foreground mbc:data-[selected-single=true]:text-primary-foreground mbc:group-data-[focused=true]/day:border-ring mbc:group-data-[focused=true]/day:ring-ring/50 mbc:flex mbc:aspect-square mbc:h-auto mbc:w-full mbc:min-w-(--cell-size) mbc:flex-col mbc:gap-1 mbc:font-normal mbc:leading-none mbc:data-[range-end=true]:rounded-md mbc:data-[range-middle=true]:rounded-none mbc:data-[range-start=true]:rounded-md mbc:group-data-[focused=true]/day:relative mbc:group-data-[focused=true]/day:z-10 mbc:group-data-[focused=true]/day:ring-[3px] mbc:[&>span]:text-xs mbc:[&>span]:opacity-70',
        defaults.day,
        className
      )}
      {...props}
    />
  )
}
