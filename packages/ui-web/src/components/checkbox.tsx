'use client'

import { Check } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'
import { useFieldControl } from './field'

export type CheckboxProps = ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
>

export const Checkbox = forwardRef<
  ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox({ className, ...rest }, ref) {
  const props = useFieldControl(rest)
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="checkbox"
      className={cn(
        'mbc:border-input mbc:shadow-xs mbc:focus-visible:border-ring mbc:focus-visible:ring-ring/50 mbc:aria-invalid:border-[#FDA29B] mbc:aria-invalid:ring-[#FDA29B]/20 mbc:data-[state=checked]:border-primary mbc:data-[state=checked]:bg-primary mbc:data-[state=checked]:text-primary-foreground mbc:dark:bg-input/30 mbc:dark:data-[state=checked]:bg-primary mbc:dark:aria-invalid:ring-destructive/40 mbc:peer mbc:size-[19px] mbc:shrink-0 mbc:rounded-[4px] mbc:border mbc:bg-white mbc:outline-none mbc:transition-shadow mbc:focus-visible:ring-[3px] mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="mbc:flex mbc:items-center mbc:justify-center mbc:text-current mbc:transition-none"
      >
        <Check aria-hidden className="mbc:size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
