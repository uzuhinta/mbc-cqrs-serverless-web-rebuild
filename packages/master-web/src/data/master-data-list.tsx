'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Input,
  Label,
  Switch,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Search, X } from 'lucide-react'
import { useId, type FormEvent } from 'react'

import {
  BulkImportDialog,
  type BulkImportDialogProps,
} from '../bulk/bulk-import-dialog'
import type { BulkMapper } from '../core/bulk'
import {
  dataCodeOf,
  type MasterDataListItem,
  type MasterDataListState,
} from '../core/list'
import { settingCodeOf } from '../core/payload'
import type { MasterSetting } from '../core/types'
import { masterDataMessages } from '../i18n/master-data-messages'
import { ListError } from '../list/list-error'
import { useFilters } from '../list/use-filters'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import { DataTable } from '../table/data-table'
import { dataColumns } from './data-columns'

export type MasterDataListProps = {
  setting: MasterSetting
  items: readonly MasterDataListItem[]
  total: number
  state: MasterDataListState
  onStateChange(state: MasterDataListState): void
  routing: MasterRouting
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRetry`. */
  error?: unknown
  onRetry?(): void
  /** Bulk import through the JSON editor; without it the button is hidden. */
  onImport?: BulkImportDialogProps['onImport']
  /** After an import (also after a partial one), e.g. to reload the list. */
  onImported?(): void
  /** The current tenant: import entries for another tenant are refused. */
  tenantCode?: string
  inputSampleJson?: string
  mapRawItem?: BulkMapper
}

type Filters = Pick<MasterDataListState, 'code' | 'keyword' | 'isDeleted'>

// v0's accordion sections; `focus:!outline-0` is replaced by a visible ring.
const SECTION = 'mbc:border-none mbc:shadow-sm'
const HEADER =
  'mbc:bg-emphasis mbc:text-emphasis-foreground mbc:w-full mbc:overflow-hidden mbc:text-ellipsis mbc:px-6 mbc:py-3 mbc:text-lg mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring mbc:focus-visible:ring-offset-2'
const LABEL = 'mbc:flex mbc:h-9 mbc:items-center mbc:text-sm mbc:font-semibold'

/** v0's data list of one setting: its details, a search, the table, back to the settings. */
export function MasterDataList({
  setting,
  items,
  total,
  state,
  onStateChange,
  routing,
  loading = false,
  error,
  onRetry,
  onImport,
  onImported,
  tenantCode,
  inputSampleJson,
  mapRawItem,
}: MasterDataListProps) {
  const t = useMessages(masterDataMessages)
  const id = useId()
  const code = settingCodeOf(setting)
  const [filters, setFilters] = useFilters<Filters>({
    code: state.code,
    keyword: state.keyword,
    isDeleted: state.isDeleted,
  })

  const search = (event: FormEvent) => {
    event.preventDefault()
    onStateChange({ ...state, ...filters, page: 1 })
  }
  const clear = () => {
    const empty = { code: '', keyword: '', isDeleted: false }
    setFilters(empty)
    onStateChange({ ...state, ...empty, page: 1 })
  }
  const info: [string, string][] = [
    [t.list.code, code],
    [t.list.name, setting.name],
    [t.list.description, setting.attributes.description],
  ]

  return (
    <div data-mbc="">
      <Accordion
        type="multiple"
        defaultValue={['search', 'result']}
        className="mbc:flex mbc:flex-col mbc:gap-2"
      >
        <AccordionItem value="setting" className={SECTION}>
          <AccordionTrigger className={HEADER}>
            {t.list.settingInfo({ code, name: setting.name })}
          </AccordionTrigger>
          <AccordionContent className="mbc:flex mbc:justify-center">
            <div className="mbc:flex mbc:w-[85%] mbc:flex-col mbc:items-center mbc:justify-center mbc:px-6 mbc:py-2">
              <dl className="mbc:w-full mbc:pb-3 mbc:md:w-[90%] mbc:lg:w-[85%]">
                {info.map(([label, value]) => (
                  <div
                    key={label}
                    className="mbc:border-foreground/80 mbc:flex mbc:w-full mbc:border-b"
                  >
                    <dt className="mbc:w-[4rem] mbc:shrink-0 mbc:py-2 mbc:text-left mbc:text-sm mbc:font-semibold">
                      {label}
                    </dt>
                    <dd className="mbc:py-2 mbc:pl-8 mbc:text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
              <Button asChild>
                <MasterLink
                  routing={routing}
                  to={{ screen: 'setting', id: setting.id }}
                >
                  {t.list.details}
                </MasterLink>
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="search" className={SECTION}>
          <AccordionTrigger className={HEADER}>
            {t.list.searchSection}
          </AccordionTrigger>
          <AccordionContent className="mbc:flex mbc:flex-col mbc:justify-center mbc:p-0">
            <div className="mbc:py-3">
              <form onSubmit={search} role="search">
                <div className="mbc:flex mbc:w-full mbc:flex-col mbc:items-center mbc:justify-center mbc:px-3">
                  <div className="mbc:flex mbc:w-full mbc:gap-10">
                    <div className="mbc:flex mbc:w-fit mbc:flex-col mbc:gap-4">
                      <Label htmlFor={`${id}-code`} className={LABEL}>
                        {t.list.code}
                      </Label>
                      <Label htmlFor={`${id}-keyword`} className={LABEL}>
                        {t.list.name}
                      </Label>
                      <Label htmlFor={`${id}-deleted`} className={LABEL}>
                        {t.list.includeDeleted}
                      </Label>
                    </div>
                    <div className="mbc:flex mbc:flex-1 mbc:flex-col mbc:gap-4">
                      <Input
                        id={`${id}-code`}
                        value={filters.code}
                        onChange={(event) =>
                          setFilters({ ...filters, code: event.target.value })
                        }
                      />
                      <Input
                        id={`${id}-keyword`}
                        value={filters.keyword}
                        onChange={(event) =>
                          setFilters({
                            ...filters,
                            keyword: event.target.value,
                          })
                        }
                      />
                      <div className="mbc:flex mbc:h-9 mbc:items-center">
                        <Switch
                          id={`${id}-deleted`}
                          checked={filters.isDeleted}
                          onCheckedChange={(checked) =>
                            setFilters({ ...filters, isDeleted: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mbc:mt-3 mbc:flex mbc:justify-end mbc:gap-5 mbc:px-3">
                  <Button type="submit">
                    <Search aria-hidden />
                    {t.list.search}
                  </Button>
                  <Button type="button" variant="secondary" onClick={clear}>
                    <X aria-hidden />
                    {t.list.clear}
                  </Button>
                </div>
              </form>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="result" className={SECTION}>
          <AccordionTrigger className={HEADER}>
            {t.list.resultSection}
          </AccordionTrigger>
          <AccordionContent className="mbc:flex mbc:flex-col mbc:justify-center">
            <div className="mbc:my-3 mbc:flex mbc:justify-end mbc:gap-4 mbc:px-3">
              {onImport && (
                <BulkImportDialog
                  screen="data"
                  settingCode={code}
                  tenantCode={tenantCode}
                  inputSampleJson={inputSampleJson}
                  mapRawItem={mapRawItem}
                  onImport={onImport}
                  onImported={onImported}
                />
              )}
              <Button asChild>
                <MasterLink
                  routing={routing}
                  to={{ screen: 'newData', settingId: setting.id }}
                >
                  {t.list.create}
                </MasterLink>
              </Button>
            </div>
            {error !== undefined && error !== null && (
              <div className="mbc:mb-3 mbc:px-3">
                <ListError
                  message={t.list.loadFailed}
                  retry={t.list.retry}
                  onRetry={onRetry}
                />
              </div>
            )}
            <div className="mbc:px-3">
              <DataTable
                label={t.list.table}
                columns={dataColumns(setting, t.list, (row) => (
                  <MasterLink
                    routing={routing}
                    to={{
                      screen: 'dataItem',
                      settingId: setting.id,
                      id: row.id,
                    }}
                    className="mbc:text-primary mbc:block mbc:w-full mbc:overflow-hidden mbc:text-ellipsis mbc:hover:underline"
                  >
                    {dataCodeOf(row)}
                  </MasterLink>
                ))}
                rows={items}
                rowKey={(row) => row.id}
                total={total}
                page={state.page}
                pageSize={state.pageSize}
                loading={loading}
                sort={state.sort}
                onPageChange={(page) => onStateChange({ ...state, page })}
                onPageSizeChange={(pageSize) =>
                  onStateChange({ ...state, pageSize, page: 1 })
                }
                onSortChange={(sort) =>
                  onStateChange({ ...state, sort, page: 1 })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mbc:flex mbc:justify-evenly mbc:py-3">
        <Button asChild variant="outline" className="mbc:min-w-[200px]">
          <MasterLink routing={routing} to={{ screen: 'settings' }}>
            {t.list.back}
          </MasterLink>
        </Button>
      </div>
    </div>
  )
}
