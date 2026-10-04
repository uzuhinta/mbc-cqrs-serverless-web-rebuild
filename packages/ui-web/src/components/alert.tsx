import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '../lib/cn'

export const alertVariants = cva(
  'mbc:relative mbc:w-full mbc:rounded-lg mbc:border mbc:border-border mbc:p-4 mbc:[&>svg~*]:pl-7 mbc:[&>svg+div]:translate-y-[-3px] mbc:[&>svg]:absolute mbc:[&>svg]:left-4 mbc:[&>svg]:top-4 mbc:[&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'mbc:bg-background mbc:text-foreground',
        destructive:
          'mbc:border-destructive/50 mbc:text-destructive mbc:dark:text-red-400 mbc:dark:border-destructive mbc:[&>svg]:text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, variant, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      role="alert"
      data-mbc=""
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
})

export const AlertTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(function AlertTitle({ className, ...props }, ref) {
  return (
    <h5
      ref={ref}
      data-slot="alert-title"
      className={cn(
        'mbc:mb-1 mbc:font-medium mbc:leading-none mbc:tracking-tight',
        className
      )}
      {...props}
    />
  )
})

export const AlertDescription = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function AlertDescription({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="alert-description"
      className={cn('mbc:text-sm mbc:[&_p]:leading-relaxed', className)}
      {...props}
    />
  )
})
