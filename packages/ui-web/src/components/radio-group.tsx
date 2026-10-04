'use client'

import { Circle } from 'lucide-react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'
import { FieldReset, useFieldControl } from './field'

export type RadioGroupProps = ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Root
>

export const RadioGroup = forwardRef<
  ComponentRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(function RadioGroup({ className, children, ...rest }, ref) {
  const props = useFieldControl(rest, { group: true })
  return (
    <RadioGroupPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="radio-group"
      className={cn('mbc:grid mbc:gap-2', className)}
      {...props}
    >
      <FieldReset>{children}</FieldReset>
    </RadioGroupPrimitive.Root>
  )
})

export type RadioGroupItemProps = ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
>

export const RadioGroupItem = forwardRef<
  ComponentRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(function RadioGroupItem({ className, ...props }, ref) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      data-slot="radio-group-item"
      className={cn(
        'mbc:border-primary mbc:text-primary mbc:ring-offset-background mbc:focus-visible:ring-ring mbc:aspect-square mbc:h-4 mbc:w-4 mbc:rounded-full mbc:border mbc:focus:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-offset-2 mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="mbc:flex mbc:items-center mbc:justify-center">
        <Circle
          aria-hidden
          className="mbc:h-2.5 mbc:w-2.5 mbc:fill-current mbc:text-current"
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
