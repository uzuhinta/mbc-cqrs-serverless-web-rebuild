'use client'

import {
  Badge,
  Button,
  cn,
  useHydrated,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

import {
  isCopyTaskStatus,
  type CopyTask,
  type CopyTaskStatus,
} from '../core/copy'
import { localTimeParts } from '../core/list'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { ListError } from '../list/list-error'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting, MasterTarget } from '../routing/routing'
import { DataTable, type DataTableColumn } from '../table/data-table'

// v0's status colours: background, text, border.
const STATUS_CLASS: Record<CopyTaskStatus, string> = {
  CREATED: 'mbc:bg-[#DBEAFE] mbc:text-[#1E3A8A] mbc:border-[#93C5FD]',
  QUEUED: 'mbc:bg-[#E0E7FF] mbc:text-[#3730A3] mbc:border-[#A5B4FC]',
  PROCESSING: 'mbc:bg-[#FEF9C3] mbc:text-[#92400E] mbc:border-[#FDE68A]',
  STARTED: 'mbc:bg-[#CCFBF1] mbc:text-[#115E59] mbc:border-[#5EEAD4]',
  FINISHED: 'mbc:bg-[#DCFCE7] mbc:text-[#166534] mbc:border-[#86EFAC]',
  COMPLETED: 'mbc:bg-[#BBF7D0] mbc:text-[#14532D] mbc:border-[#4ADE80]',
  ERRORED: 'mbc:bg-[#FFEDD5] mbc:text-[#C2410C] mbc:border-[#FDBA74]',
  FAILED: 'mbc:bg-[#FECACA] mbc:text-[#991B1B] mbc:border-[#FCA5A5]',
}

/** A task's status as v0's coloured badge; an unknown status as it is. */
export function CopyStatus({ status }: { status?: string }) {
  const t = useMessages(masterCopyMessages)
  if (!status) return null
  const known = isCopyTaskStatus(status)
  return (
    <Badge
      variant="outline"
      className={cn(
        'mbc:whitespace-nowrap mbc:text-center',
        known && STATUS_CLASS[status]
      )}
    >
      {known ? t.status[status] : status}
    </Badge>
  )
}

/**
 * A stored timestamp in the browser's time zone. The server does not know
 * that zone, so the text appears after hydration.
 */
export function CopyTime({ value }: { value: unknown }) {
  const t = useMessages(masterCopyMessages)
  const hydrated = useHydrated()
  const parts = localTimeParts(value)
  if (!parts) return null
  return (
    <time dateTime={new Date(value as string | number).toISOString()}>
      {hydrated ? t.time(parts) : ''}
    </time>
  )
}

/** v0's link colour for a row's name. */
export const ROW_LINK =
  'mbc:text-primary mbc:block mbc:w-full mbc:overflow-hidden mbc:text-ellipsis mbc:hover:underline'

/** v0's page size for the copy results. */
const PAGE_SIZE = 10

/** The copy result screens: a heading, Refresh, the tasks a page at a time, Back. */
export function CopyTaskScreen({
  title,
  labels,
  columns,
  tasks,
  routing,
  back,
  loading,
  error,
  onRefresh,
}: {
  title: string
  labels: { refresh: string; back: string; loadFailed: string; retry: string }
  columns: readonly DataTableColumn<CopyTask>[]
  tasks: readonly CopyTask[]
  routing: MasterRouting
  back: MasterTarget
  loading: boolean
  error: unknown
  onRefresh?(): void
}) {
  const [paging, setPaging] = useState({ page: 1, pageSize: PAGE_SIZE })
  // A refresh can bring fewer tasks: stay on a page that exists.
  const pages = Math.max(1, Math.ceil(tasks.length / paging.pageSize))
  const page = Math.min(paging.page, pages)
  const rows = tasks.slice((page - 1) * paging.pageSize, page * paging.pageSize)

  return (
    <div data-mbc="" className="mbc:p-4">
      <div className="mbc:mb-5 mbc:flex mbc:flex-wrap mbc:items-center mbc:justify-between mbc:gap-4">
        <h2 className="mbc:text-lg mbc:font-semibold">{title}</h2>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCw
              aria-hidden
              className={cn(loading && 'mbc:animate-spin')}
            />
            {labels.refresh}
          </Button>
        )}
      </div>
      {error !== undefined && error !== null && (
        <div className="mbc:mb-3">
          <ListError
            message={labels.loadFailed}
            retry={labels.retry}
            onRetry={onRefresh}
          />
        </div>
      )}
      <DataTable
        label={title}
        columns={columns}
        rows={rows}
        rowKey={(task) => task.id}
        total={tasks.length}
        page={page}
        pageSize={paging.pageSize}
        loading={loading}
        onPageChange={(next) => setPaging({ ...paging, page: next })}
        onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })}
      />
      <div className="mbc:flex mbc:justify-evenly mbc:py-3">
        <Button asChild variant="outline" className="mbc:min-w-[200px]">
          <MasterLink routing={routing} to={back}>
            {labels.back}
          </MasterLink>
        </Button>
      </div>
    </div>
  )
}
