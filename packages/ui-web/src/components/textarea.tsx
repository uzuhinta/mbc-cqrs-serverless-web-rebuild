'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { useFieldControl } from './field'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...rest }, ref) {
    const props = useFieldControl(rest)
    return (
      <textarea
        ref={ref}
        data-mbc=""
        data-slot="textarea"
        className={cn(
          'mbc:field-sizing-content mbc:border-input mbc:shadow-xs mbc:placeholder:text-muted-foreground mbc:focus-visible:border-primary mbc:aria-invalid:border-destructive mbc:aria-invalid:ring-destructive/20 mbc:dark:bg-input/30 mbc:dark:aria-invalid:ring-destructive/40 mbc:flex mbc:min-h-16 mbc:w-full mbc:rounded-md mbc:border mbc:bg-transparent mbc:px-3 mbc:py-2 mbc:text-base mbc:outline-none mbc:transition-[color,box-shadow] mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50 mbc:md:text-sm',
          className
        )}
        {...props}
      />
    )
  }
)
