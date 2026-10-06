'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'

export const Accordion = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Root>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(function Accordion(props, ref) {
  return (
    <AccordionPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="accordion"
      {...props}
    />
  )
})

export const AccordionItem = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      data-slot="accordion-item"
      className={cn('mbc:border-b mbc:border-border', className)}
      {...props}
    />
  )
})

export const AccordionTrigger = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="mbc:flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        data-slot="accordion-trigger"
        className={cn(
          'mbc:flex mbc:flex-1 mbc:items-center mbc:justify-between mbc:py-4 mbc:font-medium mbc:transition-all mbc:hover:underline mbc:[&[data-state=open]>svg]:rotate-180',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden
          className="mbc:h-4 mbc:w-4 mbc:shrink-0 mbc:transition-transform mbc:duration-200"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
})

export const AccordionContent = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      data-slot="accordion-content"
      className="mbc:data-[state=closed]:animate-accordion-up mbc:data-[state=open]:animate-accordion-down mbc:overflow-hidden mbc:text-sm mbc:transition-all"
      {...props}
    >
      <div className={cn('mbc:pb-4 mbc:pt-0', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
})
