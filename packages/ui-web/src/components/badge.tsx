'use client'

import type { VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { badgeVariants } from './badge-variants'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot.Root : 'span'
  return (
    <Comp
      ref={ref}
      data-mbc=""
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
})
