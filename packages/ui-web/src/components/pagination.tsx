'use client'

import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react'
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
} from 'react'

import { useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'
import type { ButtonProps } from './button'
import { buttonVariants } from './button-variants'

export const Pagination = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  function Pagination({ className, ...props }, ref) {
    const t = useMessages(uiMessages)
    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label={t.pagination.label}
        data-mbc=""
        data-slot="pagination"
        className={cn('mbc:flex mbc:gap-2', className)}
        {...props}
      />
    )
  }
)

export const PaginationContent = forwardRef<
  HTMLUListElement,
  HTMLAttributes<HTMLUListElement>
>(function PaginationContent({ className, ...props }, ref) {
  return (
    <ul
      ref={ref}
      data-slot="pagination-content"
      className={cn(
        'mbc:flex mbc:flex-row mbc:items-center mbc:gap-2',
        className
      )}
      {...props}
    />
  )
})

export const PaginationItem = forwardRef<
  HTMLLIElement,
  LiHTMLAttributes<HTMLLIElement>
>(function PaginationItem(props, ref) {
  return <li ref={ref} data-slot="pagination-item" {...props} />
})

export type PaginationLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  isActive?: boolean
  size?: ButtonProps['size']
}

export const PaginationLink = forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>(function PaginationLink(
  { className, isActive, size = 'icon', ...props },
  ref
) {
  return (
    <a
      ref={ref}
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }),
        'mbc:hover:text-primary mbc:h-8 mbc:w-8 mbc:border mbc:text-sm mbc:text-[#191A32] mbc:dark:text-foreground mbc:hover:border-brand-accent mbc:hover:bg-white',
        // Inactive links (ghost) get no border colour from their variant.
        !isActive && 'mbc:border-border',
        className
      )}
      {...props}
    />
  )
})

export const PaginationPrevious = forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>(function PaginationPrevious({ className, ...props }, ref) {
  const t = useMessages(uiMessages)
  return (
    <PaginationLink
      ref={ref}
      aria-label={t.pagination.previous}
      className={cn('mbc:h-8 mbc:w-8 mbc:gap-1 mbc:border', className)}
      {...props}
    >
      <ChevronLeft aria-hidden />
    </PaginationLink>
  )
})

export const PaginationNext = forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>(function PaginationNext({ className, ...props }, ref) {
  const t = useMessages(uiMessages)
  return (
    <PaginationLink
      ref={ref}
      aria-label={t.pagination.next}
      className={cn('mbc:h-8 mbc:w-8 mbc:gap-1 mbc:border', className)}
      {...props}
    >
      <ChevronRight aria-hidden />
    </PaginationLink>
  )
})

export const PaginationEllipsis = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(function PaginationEllipsis({ className, ...props }, ref) {
  const t = useMessages(uiMessages)
  return (
    <span
      ref={ref}
      data-slot="pagination-ellipsis"
      className={cn(
        'mbc:flex mbc:size-9 mbc:items-center mbc:justify-center',
        className
      )}
      {...props}
    >
      <Ellipsis aria-hidden className="mbc:size-4" />
      <span className="mbc:sr-only">{t.pagination.morePages}</span>
    </span>
  )
})
