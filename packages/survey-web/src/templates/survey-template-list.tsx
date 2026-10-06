'use client'

import {
  Alert,
  AlertDescription,
  Button,
  cn,
  Skeleton,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { AlertCircle, Plus, RefreshCw, Search } from 'lucide-react'

import { templateMessages } from './i18n/template-messages'
import { SurveyTemplateCard } from './template-card'
import { TemplatePagination } from './template-pagination'
import { TemplateSearch } from './template-search'
import type { SurveyTemplateSummary } from './types'

export type SurveyTemplateListProps = {
  items: readonly SurveyTemplateSummary[]
  total: number
  page: number
  pageSize: number
  keyword: string
  loading?: boolean
  error?: unknown
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onKeywordChange: (keyword: string) => void
  onCreate?: () => void
  onSelect: (item: SurveyTemplateSummary) => void
  onRetry?: () => void
  className?: string
}

const GRID =
  'mbc:grid mbc:grid-cols-1 mbc:gap-6 mbc:md:grid-cols-2 mbc:lg:grid-cols-3'

function LoadingGrid() {
  const t = useMessages(templateMessages)
  return (
    <div
      role="status"
      aria-label={t.list.loading}
      className="mbc:flex mbc:items-start mbc:justify-center mbc:p-4"
      style={{ minHeight: 375, maxHeight: 500 }}
    >
      <div className="mbc:grid mbc:w-full mbc:grid-cols-1 mbc:gap-4 mbc:sm:gap-6 mbc:md:grid-cols-2 mbc:lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="mbc:from-muted/30 mbc:to-muted/10 mbc:group mbc:animate-pulse mbc:rounded-lg mbc:border-2 mbc:border-border mbc:bg-linear-to-br mbc:p-4 mbc:transition-all mbc:duration-300 mbc:hover:shadow-md"
          >
            <div className="mbc:flex mbc:flex-col mbc:gap-2 mbc:pb-4">
              <Skeleton className="mbc:h-5 mbc:w-3/4 mbc:rounded-md" />
              <Skeleton className="mbc:h-4 mbc:w-full mbc:rounded-md" />
              <Skeleton className="mbc:h-4 mbc:w-2/3 mbc:rounded-md" />
            </div>
            <div className="mbc:flex mbc:flex-col mbc:gap-2 mbc:sm:flex-row mbc:sm:items-center mbc:sm:justify-between">
              <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-3 mbc:sm:gap-4">
                {[0, 1].map((n) => (
                  <div
                    key={n}
                    className="mbc:flex mbc:items-center mbc:gap-1.5"
                  >
                    <Skeleton className="mbc:h-4 mbc:w-4 mbc:rounded-full" />
                    <Skeleton className="mbc:h-4 mbc:w-16 mbc:rounded-md" />
                  </div>
                ))}
              </div>
              <Skeleton className="mbc:h-6 mbc:w-20 mbc:rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** v0's survey-template page as a prop-driven screen. */
export function SurveyTemplateList({
  items,
  total,
  page,
  pageSize,
  keyword,
  loading = false,
  error,
  onPageChange,
  onPageSizeChange,
  onKeywordChange,
  onCreate,
  onSelect,
  onRetry,
  className,
}: SurveyTemplateListProps) {
  const t = useMessages(templateMessages)

  let body
  if (loading) {
    body = <LoadingGrid />
  } else if (error) {
    body = (
      <Alert variant="destructive" role="alert">
        <AlertCircle aria-hidden className="mbc:h-4 mbc:w-4" />
        <AlertDescription className="mbc:flex mbc:flex-col mbc:gap-3">
          <p>{t.list.loadError}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mbc:w-fit"
            >
              <RefreshCw aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
              {t.list.retry}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  } else if (items.length === 0) {
    body = (
      <div className="mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:py-12 mbc:text-center">
        <Search
          aria-hidden
          className="mbc:text-muted-foreground mbc:mb-4 mbc:h-12 mbc:w-12"
        />
        <h3 className="mbc:mb-2 mbc:text-lg mbc:font-semibold">
          {t.list.emptyTitle}
        </h3>
        <p className="mbc:text-muted-foreground mbc:mb-4">
          {t.list.emptyDescription}
        </p>
      </div>
    )
  } else {
    body = (
      <>
        <div className={GRID}>
          {items.map((item) => (
            <SurveyTemplateCard key={item.id} item={item} onSelect={onSelect} />
          ))}
        </div>
        <div className="mbc:flex mbc:items-center mbc:justify-center">
          <TemplatePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </>
    )
  }

  return (
    <div
      data-mbc=""
      className={cn('mbc:flex mbc:flex-col mbc:gap-9', className)}
    >
      <div className="mbc:mb-2 mbc:flex mbc:flex-row mbc:items-center mbc:justify-between mbc:gap-2">
        <div className="mbc:w-full mbc:md:w-1/2 mbc:lg:w-1/3">
          <TemplateSearch value={keyword} onChange={onKeywordChange} />
        </div>
        {onCreate && (
          <Button
            aria-label={t.list.createLabel}
            onClick={onCreate}
            className="mbc:rounded-full mbc:border mbc:border-[#636F80] mbc:bg-[#EEEEEE] mbc:px-10! mbc:text-black mbc:transition-colors mbc:duration-200 mbc:hover:bg-[#B7BDC6]"
          >
            <Plus aria-hidden className="mbc:h-5! mbc:w-5! mbc:text-black" />
            {t.list.create}
          </Button>
        )}
      </div>
      {body}
    </div>
  )
}
