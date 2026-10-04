'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { usePortalContainer } from '../i18n/provider'
import { cn } from '../lib/cn'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export const PopoverContent = forwardRef<
  ComponentRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent(
  { className, align = 'center', sideOffset = 4, ...props },
  ref
) {
  const container = usePortalContainer()
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        ref={ref}
        data-mbc=""
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'mbc:data-[state=closed]:fade-out-0 mbc:data-[state=open]:fade-in-0 mbc:data-[state=closed]:zoom-out-95 mbc:data-[state=open]:zoom-in-95 mbc:data-[side=bottom]:slide-in-from-top-2 mbc:data-[side=left]:slide-in-from-right-2 mbc:data-[side=right]:slide-in-from-left-2 mbc:data-[side=top]:slide-in-from-bottom-2 mbc:origin-(--radix-popover-content-transform-origin) mbc:bg-popover mbc:text-popover-foreground mbc:outline-hidden mbc:data-[state=closed]:animate-out mbc:data-[state=open]:animate-in mbc:z-50 mbc:w-72 mbc:rounded-md mbc:border mbc:border-border mbc:p-4 mbc:shadow-md',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
