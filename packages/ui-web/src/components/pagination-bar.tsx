'use client'

import { useState, type KeyboardEvent, type MouseEvent } from 'react'

import { useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'
import { getPaginationItems } from '../lib/pagination-items'
import { Input } from './input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

// Labels keep their width; CJK text would otherwise break after every character.
const LABEL = 'mbc:shrink-0 mbc:whitespace-nowrap mbc:text-muted-foreground'

const ARROW =
  'mbc:flex mbc:h-8 mbc:w-8 mbc:items-center mbc:justify-center mbc:aria-disabled:pointer-events-none mbc:aria-disabled:cursor-not-allowed mbc:aria-disabled:text-[#A3ACBA] mbc:aria-disabled:opacity-50'

export type PaginationBarProps = {
  /** 1-based. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: readonly number[]
  /**
   * `table`: a data table's bar (master v0) — the result count first, the
   * page size after the pages, a page-number box, and shown even with one
   * page or no rows. `default`: survey v0's bar, hidden with one page.
   */
  variant?: 'default' | 'table'
  /** Accessible name; give each bar its own when a page has two. Default: the `ui` pagination label. */
  label?: string
  className?: string
}

function JumpToPage({
  lastPage,
  onPageChange,
}: {
  lastPage: number
  onPageChange: (page: number) => void
}) {
  const t = useMessages(uiMessages)
  const [value, setValue] = useState('')
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const target = Number(value)
    if (Number.isInteger(target) && target >= 1 && target <= lastPage)
      onPageChange(target)
    setValue('')
  }
  return (
    <span data-part="jump" className="mbc:flex mbc:items-center mbc:gap-2">
      {t.pagination.jumpBefore && (
        <span aria-hidden className={LABEL}>
          {t.pagination.jumpBefore}
        </span>
      )}
      {/* Input's wrapper is w-full: bound it, or it takes the row. */}
      <span data-part="page-box" className="mbc:w-16 mbc:shrink-0">
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={lastPage}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label={t.pagination.jump({ last: lastPage })}
          className="mbc:h-8 mbc:text-center"
        />
      </span>
      {t.pagination.jumpAfter && (
        <span aria-hidden className={LABEL}>
          {t.pagination.jumpAfter}
        </span>
      )}
    </span>
  )
}

/** Page links with an optional page-size select; links are `href="#"` so they are reachable from the keyboard. */
export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 300, 500],
  variant = 'default',
  label,
  className,
}: PaginationBarProps) {
  const t = useMessages(uiMessages)
  const lastPage = Math.ceil(total / Math.max(1, pageSize))
  const table = variant === 'table'
  // Only when given: an explicit undefined would remove Pagination's default name.
  const named = label === undefined ? {} : { 'aria-label': label }
  if (!table && (lastPage <= 1 || total === 0)) return null

  const go = (target: number, enabled: boolean) => (event: MouseEvent) => {
    event.preventDefault()
    if (enabled) onPageChange(target)
  }

  const sizeSelect = onPageSizeChange && (
    <div
      data-part="size"
      className="mbc:flex mbc:items-center mbc:gap-x-2 mbc:text-sm"
    >
      <Select
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      >
        <SelectTrigger
          className="mbc:h-8 mbc:w-fit mbc:min-w-[120px]"
          aria-label={t.pagination.pageSize}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {t.pagination.perPage({ size: option })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const pages = lastPage > 1 && (
    <PaginationContent className="mbc:flex mbc:items-center mbc:justify-center mbc:gap-0">
      <PaginationItem>
        <PaginationPrevious
          href="#"
          aria-disabled={page === 1 || undefined}
          className={cn(ARROW, 'mbc:rounded-r-none')}
          onClick={go(page - 1, page > 1)}
        />
      </PaginationItem>
      {getPaginationItems(page, lastPage, 7).map((item, index) =>
        Number.isNaN(item) ? (
          <PaginationItem key={`ellipsis-${index}`}>
            <PaginationEllipsis />
          </PaginationItem>
        ) : (
          <PaginationItem key={item}>
            <PaginationLink
              href="#"
              isActive={item === page}
              onClick={go(item, item !== page)}
              className={cn(
                'mbc:hover:text-primary mbc:flex mbc:h-8 mbc:w-8 mbc:items-center mbc:justify-center mbc:rounded-none mbc:text-sm mbc:transition-colors mbc:duration-200',
                item === page &&
                  'mbc:border-primary mbc:bg-primary/5 mbc:text-primary mbc:border'
              )}
            >
              {item}
            </PaginationLink>
          </PaginationItem>
        )
      )}
      <PaginationItem>
        <PaginationNext
          href="#"
          aria-disabled={page >= lastPage || undefined}
          className={cn(ARROW, 'mbc:rounded-l-none')}
          onClick={go(page + 1, page < lastPage)}
        />
      </PaginationItem>
    </PaginationContent>
  )

  if (!table)
    return (
      <Pagination {...named} className={cn('mbc:mt-4', className)}>
        {sizeSelect}
        {pages}
      </Pagination>
    )
  return (
    <Pagination
      {...named}
      className={cn(
        'mbc:flex-wrap mbc:items-center mbc:justify-end mbc:text-sm',
        className
      )}
    >
      <span data-part="total" className={cn(LABEL, 'mbc:font-medium')}>
        {t.pagination.total({ count: total })}
      </span>
      {pages}
      {sizeSelect}
      {lastPage > 1 && (
        <JumpToPage lastPage={lastPage} onPageChange={onPageChange} />
      )}
    </Pagination>
  )
}
