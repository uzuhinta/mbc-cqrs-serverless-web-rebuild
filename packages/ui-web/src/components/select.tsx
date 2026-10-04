'use client'

import { ChevronDown, ChevronUp, CircleCheck } from 'lucide-react'
import * as SelectPrimitive from '@radix-ui/react-select'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { usePortalContainer } from '../i18n/provider'
import { cn } from '../lib/cn'
import { useFieldControl } from './field'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group

export const SelectValue = forwardRef<
  ComponentRef<typeof SelectPrimitive.Value>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(function SelectValue(props, ref) {
  return <SelectPrimitive.Value ref={ref} data-slot="select-value" {...props} />
})

export type SelectTriggerProps = ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> & { size?: 'xs' | 'sm' | 'default' | 'extra-md' | 'lg' }

export const SelectTrigger = forwardRef<
  ComponentRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(function SelectTrigger(
  { className, size = 'default', children, ...rest },
  ref
) {
  const props = useFieldControl(rest)
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      data-mbc=""
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "mbc:border-input mbc:shadow-xs mbc:aria-invalid:border-[#FDA29B] mbc:aria-invalid:ring-[#FDA29B]/20 mbc:data-[state=open]:border-primary mbc:data-[placeholder]:text-muted-foreground mbc:dark:bg-input/30 mbc:dark:aria-invalid:ring-[#FDA29B]/40 mbc:dark:hover:bg-input/50 mbc:[&_svg:not([class*='text-'])]:text-muted-foreground mbc:flex mbc:w-fit mbc:items-center mbc:justify-between mbc:gap-2 mbc:whitespace-nowrap mbc:rounded-md mbc:border mbc:bg-transparent mbc:px-3 mbc:py-2 mbc:text-sm mbc:outline-none mbc:transition-[color,box-shadow] mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50 mbc:data-[size=default]:h-9 mbc:data-[size=extra-md]:h-10 mbc:data-[size=lg]:h-11 mbc:data-[size=sm]:h-8 mbc:data-[size=xs]:text-xs mbc:*:data-[slot=select-value]:line-clamp-1 mbc:*:data-[slot=select-value]:flex mbc:*:data-[slot=select-value]:items-center mbc:*:data-[slot=select-value]:gap-2 mbc:[&_svg:not([class*='size-'])]:size-4 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <p className="mbc:truncate">{children}</p>
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden className="mbc:size-4 mbc:opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})

const SCROLL_BUTTON =
  'mbc:flex mbc:cursor-default mbc:items-center mbc:justify-center mbc:py-1'

export const SelectScrollUpButton = forwardRef<
  ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(function SelectScrollUpButton({ className, ...props }, ref) {
  return (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      data-slot="select-scroll-up-button"
      className={cn(SCROLL_BUTTON, className)}
      {...props}
    >
      <ChevronUp aria-hidden className="mbc:size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
})

export const SelectScrollDownButton = forwardRef<
  ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(function SelectScrollDownButton({ className, ...props }, ref) {
  return (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      data-slot="select-scroll-down-button"
      className={cn(SCROLL_BUTTON, className)}
      {...props}
    >
      <ChevronDown aria-hidden className="mbc:size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
})

export const SelectContent = forwardRef<
  ComponentRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent(
  { className, children, position = 'popper', ...props },
  ref
) {
  const container = usePortalContainer()
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        ref={ref}
        data-mbc=""
        data-slot="select-content"
        position={position}
        className={cn(
          'mbc:data-[state=closed]:fade-out-0 mbc:data-[state=open]:fade-in-0 mbc:data-[state=closed]:zoom-out-95 mbc:data-[state=open]:zoom-in-95 mbc:data-[side=bottom]:slide-in-from-top-2 mbc:data-[side=left]:slide-in-from-right-2 mbc:data-[side=right]:slide-in-from-left-2 mbc:data-[side=top]:slide-in-from-bottom-2 mbc:max-h-(--radix-select-content-available-height) mbc:origin-(--radix-select-content-transform-origin) mbc:bg-popover mbc:text-popover-foreground mbc:data-[state=closed]:animate-out mbc:data-[state=open]:animate-in mbc:relative mbc:z-50 mbc:min-w-[8rem] mbc:overflow-y-auto mbc:overflow-x-hidden mbc:rounded-md mbc:border mbc:shadow-md',
          position === 'popper' &&
            'mbc:data-[side=bottom]:translate-y-1 mbc:data-[side=left]:-translate-x-1 mbc:data-[side=right]:translate-x-1 mbc:data-[side=top]:-translate-y-1',
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'mbc:p-1',
            position === 'popper' &&
              'mbc:h-[var(--radix-select-trigger-height)] mbc:w-full mbc:min-w-[var(--radix-select-trigger-width)] mbc:scroll-my-1'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})

export const SelectLabel = forwardRef<
  ComponentRef<typeof SelectPrimitive.Label>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(function SelectLabel({ className, ...props }, ref) {
  return (
    <SelectPrimitive.Label
      ref={ref}
      data-slot="select-label"
      className={cn(
        'mbc:text-muted-foreground mbc:px-2 mbc:py-1.5 mbc:text-xs',
        className
      )}
      {...props}
    />
  )
})

export const SelectItem = forwardRef<
  ComponentRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      data-slot="select-item"
      className={cn(
        "mbc:data-[disabled]:opacity-50 mbc:[&_svg:not([class*='size-'])]:size-4 mbc:outline-hidden mbc:hover:bg-accent mbc:focus:bg-accent mbc:focus:text-accent-foreground mbc:[&_svg:not([class*='text-'])]:text-muted-foreground mbc:*:[span]:last:flex mbc:*:[span]:last:items-center mbc:*:[span]:last:gap-2 mbc:relative mbc:flex mbc:w-full mbc:cursor-default mbc:select-none mbc:items-center mbc:gap-2 mbc:rounded-sm mbc:py-1.5 mbc:pl-2 mbc:pr-8 mbc:text-sm mbc:data-[disabled]:pointer-events-none mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <span className="mbc:absolute mbc:right-2 mbc:flex mbc:size-3.5 mbc:items-center mbc:justify-center">
        <SelectPrimitive.ItemIndicator>
          <CircleCheck aria-hidden className="mbc:size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})

export const SelectSeparator = forwardRef<
  ComponentRef<typeof SelectPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(function SelectSeparator({ className, ...props }, ref) {
  return (
    <SelectPrimitive.Separator
      ref={ref}
      data-slot="select-separator"
      className={cn(
        'mbc:bg-border mbc:pointer-events-none mbc:-mx-1 mbc:my-1 mbc:h-px',
        className
      )}
      {...props}
    />
  )
})
