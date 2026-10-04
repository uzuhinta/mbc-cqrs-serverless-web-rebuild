'use client'

import type { VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { buttonVariants } from './button-variants'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      type,
      children,
      ...props
    },
    ref
  ) {
    const classes = cn(buttonVariants({ variant, size }), className)

    if (asChild) {
      return (
        <Slot
          ref={ref}
          data-mbc=""
          data-slot="button"
          className={classes}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        ref={ref}
        data-mbc=""
        data-slot="button"
        type={type ?? 'button'}
        className={classes}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <LoaderCircle className="mbc:animate-spin" aria-hidden />}
        {children}
      </button>
    )
  }
)
