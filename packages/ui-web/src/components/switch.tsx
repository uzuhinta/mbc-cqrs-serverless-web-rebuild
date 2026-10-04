'use client'

import { Switch as SwitchPrimitive } from 'radix-ui'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'
import { useFieldControl } from './field'

export type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>

export const Switch = forwardRef<
  ComponentRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(function Switch({ className, ...rest }, ref) {
  const props = useFieldControl(rest)
  return (
    <SwitchPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="switch"
      className={cn(
        'mbc:shadow-xs mbc:focus-visible:border-ring mbc:focus-visible:ring-ring/50 mbc:data-[state=checked]:bg-primary mbc:data-[state=unchecked]:bg-input mbc:dark:data-[state=unchecked]:bg-input/80 mbc:peer mbc:inline-flex mbc:h-[1.15rem] mbc:w-8 mbc:shrink-0 mbc:cursor-pointer mbc:items-center mbc:rounded-full mbc:border mbc:border-transparent mbc:outline-none mbc:transition-all mbc:focus-visible:ring-[3px] mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="mbc:bg-background mbc:dark:data-[state=checked]:bg-primary-foreground mbc:dark:data-[state=unchecked]:bg-foreground mbc:pointer-events-none mbc:block mbc:size-4 mbc:rounded-full mbc:ring-0 mbc:transition-transform mbc:data-[state=checked]:translate-x-[calc(100%-2px)] mbc:data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
})
