'use client'

import {
  cn,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import type { MouseEvent } from 'react'

import { templateMessages } from './i18n/template-messages'
import { getPaginationItems } from './pagination-items'

const ARROW =
  'mbc:flex mbc:h-8 mbc:w-8 mbc:items-center mbc:justify-center mbc:aria-disabled:pointer-events-none mbc:aria-disabled:cursor-not-allowed mbc:aria-disabled:text-[#A3ACBA] mbc:aria-disabled:opacity-50'

/** v0's pagination; links are `href="#"` so they are reachable from the keyboard. */
export function TemplatePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 300, 500],
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: readonly number[]
}) {
  const t = useMessages(templateMessages)
  const lastPage = Math.ceil(total / Math.max(1, pageSize))
  if (lastPage <= 1 || total === 0) return null

  const go = (target: number, enabled: boolean) => (event: MouseEvent) => {
    event.preventDefault()
    if (enabled) onPageChange(target)
  }

  return (
    <Pagination className="mbc:mt-4">
      {onPageSizeChange && (
        <div className="mbc:flex mbc:items-center mbc:gap-x-2 mbc:text-sm">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              className="mbc:h-8 mbc:w-[120px]"
              aria-label={t.list.pageSize}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t.list.perPage({ size: option })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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
            aria-disabled={page === lastPage || undefined}
            className={cn(ARROW, 'mbc:rounded-l-none')}
            onClick={go(page + 1, page < lastPage)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
