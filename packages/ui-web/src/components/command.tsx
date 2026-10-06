'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'

export const Command = forwardRef<
  ComponentRef<typeof CommandPrimitive>,
  ComponentPropsWithoutRef<typeof CommandPrimitive>
>(function Command({ className, ...props }, ref) {
  return (
    <CommandPrimitive
      ref={ref}
      data-mbc=""
      data-slot="command"
      className={cn(
        'mbc:bg-popover mbc:text-popover-foreground mbc:flex mbc:h-full mbc:w-full mbc:flex-col mbc:overflow-hidden mbc:rounded-md',
        className
      )}
      {...props}
    />
  )
})

export const CommandInput = forwardRef<
  ComponentRef<typeof CommandPrimitive.Input>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(function CommandInput({ className, ...props }, ref) {
  return (
    <div
      className="mbc:flex mbc:items-center mbc:border-b mbc:border-border mbc:px-3"
      cmdk-input-wrapper=""
    >
      <Search
        aria-hidden
        className="mbc:mr-2 mbc:h-4 mbc:w-4 mbc:shrink-0 mbc:opacity-50"
      />
      <CommandPrimitive.Input
        ref={ref}
        data-slot="command-input"
        className={cn(
          'mbc:placeholder:text-muted-foreground mbc:flex mbc:h-11 mbc:w-full mbc:rounded-md mbc:bg-transparent mbc:py-3 mbc:text-sm mbc:outline-none mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
})

export const CommandList = forwardRef<
  ComponentRef<typeof CommandPrimitive.List>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(function CommandList({ className, ...props }, ref) {
  return (
    <CommandPrimitive.List
      ref={ref}
      data-slot="command-list"
      className={cn(
        'mbc:max-h-[300px] mbc:overflow-y-auto mbc:overflow-x-hidden',
        className
      )}
      {...props}
    />
  )
})

export const CommandEmpty = forwardRef<
  ComponentRef<typeof CommandPrimitive.Empty>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(function CommandEmpty({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Empty
      ref={ref}
      data-slot="command-empty"
      className={cn('mbc:py-6 mbc:text-center mbc:text-sm', className)}
      {...props}
    />
  )
})

export const CommandGroup = forwardRef<
  ComponentRef<typeof CommandPrimitive.Group>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(function CommandGroup({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Group
      ref={ref}
      data-slot="command-group"
      className={cn(
        'mbc:text-foreground mbc:[&_[cmdk-group-heading]]:text-muted-foreground mbc:overflow-hidden mbc:p-1 mbc:[&_[cmdk-group-heading]]:px-2 mbc:[&_[cmdk-group-heading]]:py-1.5 mbc:[&_[cmdk-group-heading]]:text-xs mbc:[&_[cmdk-group-heading]]:font-medium',
        className
      )}
      {...props}
    />
  )
})

export const CommandItem = forwardRef<
  ComponentRef<typeof CommandPrimitive.Item>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(function CommandItem({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      data-slot="command-item"
      className={cn(
        'mbc:data-[selected=true]:bg-accent mbc:data-[selected=true]:text-accent-foreground mbc:relative mbc:flex mbc:cursor-default mbc:select-none mbc:items-center mbc:gap-2 mbc:rounded-sm mbc:px-2 mbc:py-1.5 mbc:text-sm mbc:outline-none mbc:data-[disabled=true]:pointer-events-none mbc:data-[disabled=true]:opacity-50 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:size-4 mbc:[&_svg]:shrink-0',
        className
      )}
      {...props}
    />
  )
})
