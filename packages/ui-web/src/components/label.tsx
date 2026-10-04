'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'

export type LabelProps = ComponentPropsWithoutRef<
  typeof LabelPrimitive.Root
> & {
  required?: boolean
}

export const Label = forwardRef<
  ComponentRef<typeof LabelPrimitive.Root>,
  LabelProps
>(function Label({ className, children, required, ...props }, ref) {
  const t = useMessages(uiMessages)
  return (
    <LabelPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="label"
      className={cn(
        'mbc:flex mbc:select-none mbc:items-center mbc:text-sm mbc:font-medium mbc:leading-none mbc:peer-disabled:cursor-not-allowed mbc:peer-disabled:opacity-50 mbc:group-data-[disabled=true]:pointer-events-none mbc:group-data-[disabled=true]:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="mbc:ml-1 mbc:text-red-500">
            *
          </span>
          <span className="mbc:sr-only">{t.required}</span>
        </>
      )}
    </LabelPrimitive.Root>
  )
})
