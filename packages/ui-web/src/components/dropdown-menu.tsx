'use client'

import { Check, Circle } from 'lucide-react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { usePortalContainer } from '../i18n/provider'
import { cn } from '../lib/cn'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const CHOICE_ITEM =
  "mbc:data-[disabled]:opacity-50 mbc:[&_svg:not([class*='size-'])]:size-4 mbc:outline-hidden mbc:focus:bg-accent mbc:focus:text-accent-foreground mbc:relative mbc:flex mbc:cursor-default mbc:select-none mbc:items-center mbc:gap-2 mbc:rounded-sm mbc:py-1.5 mbc:pl-8 mbc:pr-2 mbc:text-sm mbc:data-[disabled]:pointer-events-none mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0"

const INDICATOR_SLOT =
  'mbc:pointer-events-none mbc:absolute mbc:left-2 mbc:flex mbc:size-3.5 mbc:items-center mbc:justify-center'

export const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 4, ...props }, ref) {
  const container = usePortalContainer()
  return (
    <DropdownMenuPrimitive.Portal container={container}>
      <DropdownMenuPrimitive.Content
        ref={ref}
        data-mbc=""
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'mbc:data-[state=closed]:fade-out-0 mbc:data-[state=open]:fade-in-0 mbc:data-[state=closed]:zoom-out-95 mbc:data-[state=open]:zoom-in-95 mbc:data-[side=bottom]:slide-in-from-top-2 mbc:data-[side=left]:slide-in-from-right-2 mbc:data-[side=right]:slide-in-from-left-2 mbc:data-[side=top]:slide-in-from-bottom-2 mbc:max-h-(--radix-dropdown-menu-content-available-height) mbc:origin-(--radix-dropdown-menu-content-transform-origin) mbc:bg-popover mbc:text-popover-foreground mbc:data-[state=closed]:animate-out mbc:data-[state=open]:animate-in mbc:z-50 mbc:min-w-[8rem] mbc:overflow-y-auto mbc:overflow-x-hidden mbc:rounded-md mbc:border mbc:p-1 mbc:shadow-md',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
})

export type DropdownMenuItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> & { inset?: boolean; variant?: 'default' | 'destructive' }

export const DropdownMenuItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(function DropdownMenuItem(
  { className, inset, variant = 'default', ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "mbc:data-[variant=destructive]:*:[svg]:text-destructive! mbc:outline-hidden mbc:focus:bg-primary/50 mbc:data-[variant=destructive]:text-destructive mbc:data-[variant=destructive]:focus:bg-destructive/10 mbc:data-[variant=destructive]:focus:text-destructive mbc:dark:data-[variant=destructive]:focus:bg-destructive/20 mbc:[&_svg:not([class*='text-'])]:text-muted-foreground mbc:relative mbc:flex mbc:cursor-default mbc:select-none mbc:items-center mbc:gap-2 mbc:rounded-md mbc:px-2 mbc:py-1.5 mbc:text-sm mbc:hover:outline-none mbc:focus:text-black mbc:data-[disabled]:pointer-events-none mbc:data-[inset]:pl-8 mbc:data-[disabled]:opacity-50 mbc:[&_svg:not([class*='size-'])]:size-4 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
})

export const DropdownMenuCheckboxItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      data-slot="dropdown-menu-checkbox-item"
      className={cn(CHOICE_ITEM, className)}
      {...props}
    >
      <span className={INDICATOR_SLOT}>
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden className="mbc:size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
})

export const DropdownMenuRadioItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      data-slot="dropdown-menu-radio-item"
      className={cn(CHOICE_ITEM, className)}
      {...props}
    >
      <span className={INDICATOR_SLOT}>
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle aria-hidden className="mbc:size-2 mbc:fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
})

export const DropdownMenuLabel = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(function DropdownMenuLabel({ className, inset, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'mbc:px-2 mbc:py-1.5 mbc:text-sm mbc:font-medium mbc:data-[inset]:pl-8',
        className
      )}
      {...props}
    />
  )
})

export const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      data-slot="dropdown-menu-separator"
      className={cn('mbc:bg-border mbc:-mx-1 mbc:my-1 mbc:h-px', className)}
      {...props}
    />
  )
})
