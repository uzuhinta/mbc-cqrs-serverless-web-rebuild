'use client'

import { CircleAlert, Search } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { useFieldControl } from './field'
import { inputVariants } from './input-variants'

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: 'sm' | 'md' | 'extra-md' | 'lg'
  showSearchIcon?: boolean
  showIconError?: boolean
}

const ICON_SLOT =
  'mbc:pointer-events-none mbc:absolute mbc:inset-y-0 mbc:right-0 mbc:flex mbc:items-center mbc:pr-3'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, showSearchIcon = false, showIconError = true, ...rest },
  ref
) {
  const props = useFieldControl(rest)
  const invalid =
    props['aria-invalid'] === true || props['aria-invalid'] === 'true'

  return (
    <div
      data-mbc=""
      data-slot="input-wrapper"
      className="mbc:relative mbc:w-full"
    >
      <input
        ref={ref}
        data-slot="input"
        className={cn(inputVariants({ size }), className)}
        {...props}
      />
      {showSearchIcon && (
        <div className={ICON_SLOT}>
          <Search aria-hidden className="mbc:h-5 mbc:w-5 mbc:text-gray-400" />
        </div>
      )}
      {invalid && showIconError && (
        <div
          className={cn(ICON_SLOT, size === 'lg' && 'mbc:translate-y-[4px]')}
        >
          <CircleAlert
            aria-hidden
            className="mbc:h-5 mbc:w-5 mbc:text-destructive"
          />
        </div>
      )}
    </div>
  )
})
