import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '../lib/cn'

type DivProps = HTMLAttributes<HTMLDivElement>

function part(slot: string, classes: string, root = false) {
  const Part = forwardRef<HTMLDivElement, DivProps>(function Part(
    { className, ...props },
    ref
  ) {
    return (
      <div
        ref={ref}
        data-mbc={root ? '' : undefined}
        data-slot={slot}
        className={cn(classes, className)}
        {...props}
      />
    )
  })
  Part.displayName = slot
  return Part
}

export const Card = part(
  'card',
  'mbc:bg-card mbc:text-card-foreground mbc:flex mbc:flex-col mbc:gap-6 mbc:rounded-xl mbc:border mbc:py-6 mbc:shadow-sm',
  true
)
export const CardHeader = part(
  'card-header',
  // String.raw: Tailwind scans source text, so the escape must match runtime.
  String.raw`mbc:@container/card-header mbc:has-data-[slot=card-action]:grid-cols-[1fr_auto] mbc:[.mbc\:border-b]:pb-6 mbc:grid mbc:auto-rows-min mbc:grid-rows-[auto_auto] mbc:items-start mbc:gap-1.5 mbc:px-6`
)
export const CardTitle = part(
  'card-title',
  'mbc:font-semibold mbc:leading-none'
)
export const CardDescription = part(
  'card-description',
  'mbc:text-muted-foreground mbc:text-sm'
)
export const CardAction = part(
  'card-action',
  'mbc:col-start-2 mbc:row-span-2 mbc:row-start-1 mbc:self-start mbc:justify-self-end'
)
export const CardContent = part('card-content', 'mbc:px-6')
export const CardFooter = part(
  'card-footer',
  String.raw`mbc:[.mbc\:border-t]:pt-6 mbc:flex mbc:items-center mbc:px-6`
)
