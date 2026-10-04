'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'

export const Tabs = forwardRef<
  ComponentRef<typeof TabsPrimitive.Root>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(function Tabs({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="tabs"
      className={cn('mbc:flex mbc:flex-col mbc:gap-x-2 mbc:gap-y-6', className)}
      {...props}
    />
  )
})

export const TabsList = forwardRef<
  ComponentRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      className={cn(
        'mbc:inline-flex mbc:h-9 mbc:w-fit mbc:items-center mbc:justify-center mbc:gap-5',
        className
      )}
      {...props}
    />
  )
})

export const TabsTrigger = forwardRef<
  ComponentRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "mbc:data-[state=active]:border-b-primary mbc:data-[state=active]:text-primary mbc:dark:data-[state=active]:bg-input/30 mbc:inline-flex mbc:h-[calc(100%-1px)] mbc:flex-1 mbc:cursor-pointer mbc:items-center mbc:justify-center mbc:gap-1.5 mbc:whitespace-nowrap mbc:px-3 mbc:py-5 mbc:text-base mbc:font-normal mbc:transition-[color,box-shadow] mbc:disabled:pointer-events-none mbc:disabled:opacity-50 mbc:data-[state=active]:border-b-[2px] mbc:[&_svg:not([class*='size-'])]:size-4 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
})

export const TabsContent = forwardRef<
  ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      data-slot="tabs-content"
      className={cn('mbc:flex-1 mbc:outline-none', className)}
      {...props}
    />
  )
})
