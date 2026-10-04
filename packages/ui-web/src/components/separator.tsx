'use client'

import * as SeparatorPrimitive from '@radix-ui/react-separator'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'

export const Separator = forwardRef<
  ComponentRef<typeof SeparatorPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(function Separator(
  { className, orientation = 'horizontal', decorative = true, ...props },
  ref
) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'mbc:bg-border mbc:shrink-0 mbc:data-[orientation=horizontal]:h-px mbc:data-[orientation=vertical]:h-full mbc:data-[orientation=horizontal]:w-full mbc:data-[orientation=vertical]:w-px',
        className
      )}
      {...props}
    />
  )
})
