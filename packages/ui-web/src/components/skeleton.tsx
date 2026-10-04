import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '../lib/cn'

export const Skeleton = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function Skeleton({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-mbc=""
      data-slot="skeleton"
      className={cn(
        'mbc:bg-accent mbc:animate-pulse mbc:rounded-md',
        className
      )}
      {...props}
    />
  )
})
