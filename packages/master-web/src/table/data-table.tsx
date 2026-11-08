'use client'

import {
  Button,
  Checkbox,
  cn,
  PaginationBar,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronsUpDown,
  Inbox,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { masterMessages } from '../i18n/master-messages'

export type DataTableColumn<T> = {
  id: string
  header: string
  /** A sortable column sends its `id` as the sort key. */
  sortable?: boolean
  /** v0's column width (`meta.size`), e.g. '25%'. */
  width?: string
  cell(row: T): ReactNode
}

export type DataTableSort = { column: string; desc: boolean }

export type DataTableProps<T> = {
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[]
  rowKey(row: T): string
  /** Accessible name of the table. */
  label: string
  total: number
  /** 1-based. */
  page: number
  pageSize: number
  onPageChange(page: number): void
  onPageSizeChange(pageSize: number): void
  sort?: DataTableSort
  onSortChange?(sort: DataTableSort): void
  /** Selected row keys; with `onSelectionChange`, a checkbox column appears. */
  selection?: ReadonlySet<string>
  onSelectionChange?(selection: Set<string>): void
  /** Accessible name of a row's checkbox; by default a generic "select this row". */
  rowLabel?(row: T): string
  loading?: boolean
  /** The rows failed to load (the screen shows why): no "no data" row. */
  failed?: boolean
}

/** master v0's page sizes. */
const PAGE_SIZES = [10, 20, 50, 100] as const

// ui-web's header text is muted; on the muted header it is under 4.5:1.
const HEAD = 'mbc:bg-muted mbc:text-foreground'

// A column narrower than this wraps its text one character per line.
const MIN_COLUMN_REM = 6.5

function SortIcon({ state }: { state: false | 'asc' | 'desc' }) {
  const className = 'mbc:ml-2 mbc:h-4 mbc:w-4'
  if (state === 'asc')
    return <ArrowUpNarrowWide aria-hidden className={className} />
  if (state === 'desc')
    return <ArrowDownWideNarrow aria-hidden className={className} />
  return (
    <ChevronsUpDown aria-hidden className={cn(className, 'mbc:opacity-50')} />
  )
}

/** master v0's data table: pagination above and below, sortable headers, an empty row. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  label,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
  selection,
  onSelectionChange,
  rowLabel,
  loading = false,
  failed = false,
}: DataTableProps<T>) {
  const t = useMessages(masterMessages)
  const selectable = onSelectionChange !== undefined
  const keys = rows.map(rowKey)
  const selected: ReadonlySet<string> = selection ?? new Set()
  const allSelected = keys.length > 0 && keys.every((key) => selected.has(key))
  const someSelected = keys.some((key) => selected.has(key))
  const columnCount = columns.length + (selectable ? 1 : 0)

  const select = (changed: readonly string[], checked: boolean) => {
    const next = new Set(selected)
    for (const key of changed) {
      if (checked) next.add(key)
      else next.delete(key)
    }
    onSelectionChange?.(next)
  }

  const bar = (name: string) => (
    <PaginationBar
      variant="table"
      label={name}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={PAGE_SIZES}
    />
  )

  return (
    <div className="mbc:space-y-2">
      {bar(t.table.pagerTop)}
      <div className="mbc:rounded-md">
        <Table
          className="mbc:table-fixed"
          // Below this the container scrolls sideways.
          style={{
            minWidth: `${columns.length * MIN_COLUMN_REM + (selectable ? 2.5 : 0)}rem`,
          }}
          aria-label={label}
          aria-busy={loading || undefined}
        >
          <TableHeader>
            <TableRow className="mbc:border-border mbc:border-b mbc:font-bold">
              {selectable && (
                <TableHead className={cn(HEAD, 'mbc:w-10 mbc:px-2')}>
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) =>
                      select(keys, checked === true)
                    }
                    aria-label={t.table.selectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => {
                const state =
                  sort?.column === column.id
                    ? sort.desc
                      ? 'desc'
                      : 'asc'
                    : false
                const ariaSort = !column.sortable
                  ? undefined
                  : state === 'asc'
                    ? 'ascending'
                    : state === 'desc'
                      ? 'descending'
                      : 'none'
                return (
                  <TableHead
                    key={column.id}
                    aria-sort={ariaSort}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(HEAD, 'mbc:px-0 mbc:font-bold')}
                  >
                    {column.sortable && onSortChange ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mbc:bg-muted mbc:hover:bg-muted/80 mbc:focus:bg-muted/80 mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:rounded-none mbc:font-bold"
                        // v0: ascending first, then flip.
                        onClick={() =>
                          onSortChange({
                            column: column.id,
                            desc: state === 'asc',
                          })
                        }
                      >
                        {column.header}
                        <SortIcon state={state} />
                      </Button>
                    ) : (
                      <div className="mbc:px-4 mbc:font-bold">
                        {column.header}
                      </div>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, index) => {
                const key = keys[index] ?? String(index)
                const checked = selected.has(key)
                return (
                  <TableRow
                    key={key}
                    data-state={checked ? 'selected' : undefined}
                    className="mbc:border-border mbc:border-b mbc:transition-all mbc:duration-200 mbc:data-[state=selected]:bg-accent/70 mbc:data-[state=selected]:font-normal"
                  >
                    {selectable && (
                      <TableCell className="mbc:px-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            select([key], value === true)
                          }
                          aria-label={
                            rowLabel ? rowLabel(row) : t.table.selectRow
                          }
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} className="mbc:break-words">
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : loading ? (
              <TableRow className="mbc:border-border mbc:border-b">
                <TableCell colSpan={columnCount} className="mbc:h-48">
                  <div
                    role="status"
                    aria-label={t.table.loading}
                    className="mbc:flex mbc:flex-col mbc:gap-3"
                  >
                    <Skeleton className="mbc:h-4 mbc:w-full" />
                    <Skeleton className="mbc:h-4 mbc:w-full" />
                    <Skeleton className="mbc:h-4 mbc:w-2/3" />
                  </div>
                </TableCell>
              </TableRow>
            ) : failed ? null : (
              <TableRow className="mbc:border-border mbc:border-b">
                <TableCell colSpan={columnCount} className="mbc:h-48">
                  <div className="mbc:text-muted-foreground mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:gap-4">
                    {/* v0 faded the whole block to 20%; only the icon stays faded so the text is readable. */}
                    <Inbox
                      aria-hidden
                      className="mbc:h-16 mbc:w-16 mbc:opacity-20"
                    />
                    <p>{t.table.empty}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {bar(t.table.pagerBottom)}
    </div>
  )
}
