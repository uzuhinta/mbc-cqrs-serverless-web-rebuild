'use client'

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Search, X } from 'lucide-react'
import { useId, type FormEvent } from 'react'

import {
  BulkImportDialog,
  type BulkImportDialogProps,
} from '../bulk/bulk-import-dialog'
import { OPEN_ACCESS, type MasterAccess } from '../core/access'
import type { BulkMapper } from '../core/bulk'
import type {
  MasterSettingListItem,
  MasterSettingListState,
} from '../core/list'
import { settingCodeOf } from '../core/payload'
import { masterMessages } from '../i18n/master-messages'
import { masterSettingMessages } from '../i18n/master-setting-messages'
import type { JsonTextEditor } from '../json/json-text'
import { ListError } from '../list/list-error'
import { CommonMark } from '../list/common-mark'
import { systemColumn } from '../list/system-column'
import { useFilters } from '../list/use-filters'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import { DataTable, type DataTableColumn } from '../table/data-table'

export type MasterSettingListProps = {
  items: readonly MasterSettingListItem[]
  total: number
  state: MasterSettingListState
  onStateChange(state: MasterSettingListState): void
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
  /** The import dialog's JSON editor instead of a text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
  /** The back button (v0 went to the host's top page); hidden without it. */
  onBack?(): void
  /** Rows of another tenant are marked as common (`/mbc`'s `includeCommon`). */
  includeCommon?: boolean
  /**
   * The caller's access (`/mbc`'s `systems`). Enabled, it adds a system
   * filter and column, and offers create and import only when some system
   * is writable. Without it the screen is as before.
   */
  access?: MasterAccess
}

type Filters = { code: string; name: string; keyword: string; systemId: string }

/** Radix Select takes no empty value, so "every system" travels as this. */
const ALL_SYSTEMS = '\u0000all'

/** v0's master settings list: search, JSON editor and create, the table, back. */
export function MasterSettingList({
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
  jsonEditor,
  onBack,
  access = OPEN_ACCESS,
  includeCommon = false,
}: MasterSettingListProps) {
  const t = useMessages(masterSettingMessages)
  const m = useMessages(masterMessages)
  const id = useId()
  const [filters, setFilters] = useFilters<Filters>({
    code: state.code,
    name: state.name,
    keyword: state.keyword,
    systemId: state.systemId ?? '',
  })
  const scoped = access.enabled
  // Create and import need a system to write to; they wait for the grants.
  const canCreate = !scoped || access.writableSystems.length > 0
  const waiting = access.loading

  // The system filter is part of the state only where it is shown.
  const applied = ({ systemId, ...rest }: Filters) =>
    scoped ? { ...rest, systemId } : rest
  const search = (event: FormEvent) => {
    event.preventDefault()
    onStateChange({ ...state, ...applied(filters), page: 1 })
  }
  const clear = () => {
    const empty = { code: '', name: '', keyword: '', systemId: '' }
    setFilters(empty)
    onStateChange({ ...state, ...applied(empty), page: 1 })
  }

  const columns: DataTableColumn<MasterSettingListItem>[] = [
    {
      id: 'code',
      header: t.list.code,
      sortable: true,
      width: '25%',
      cell: (row) => (
        <>
          <MasterLink
            routing={routing}
            to={{ screen: 'data', settingId: row.id }}
            className="mbc:text-primary mbc:block mbc:w-full mbc:overflow-clip mbc:break-words mbc:hover:underline"
          >
            {settingCodeOf(row)}
          </MasterLink>
          {includeCommon && (
            <CommonMark rowTenant={row.tenantCode} tenantCode={tenantCode} />
          )}
        </>
      ),
    },
    {
      id: 'name',
      header: t.list.name,
      sortable: true,
      width: '25%',
      cell: (row) => row.name,
    },
    {
      id: 'description',
      header: t.list.description,
      width: '50%',
      cell: (row) => (
        <div className="mbc:px-4">
          {typeof row.attributes?.description === 'string'
            ? row.attributes.description
            : ''}
        </div>
      ),
    },
    ...(scoped
      ? [systemColumn<MasterSettingListItem>(access, m.access.system)]
      : []),
  ]

  const field = (key: Exclude<keyof Filters, 'systemId'>) => ({
    id: `${id}-${key}`,
    value: filters[key],
    onChange: (event: { target: { value: string } }) =>
      setFilters({ ...filters, [key]: event.target.value }),
  })

  return (
    <div data-mbc="">
      <div className="mbc:flex mbc:w-full mbc:justify-center">
        <div className="mbc:w-full mbc:py-3">
          <form className="mbc:w-full" onSubmit={search} role="search">
            <div className="mbc:flex mbc:w-full mbc:flex-col mbc:items-center mbc:justify-center mbc:px-3">
              <div className="mbc:flex mbc:w-full mbc:gap-10">
                <div className="mbc:flex mbc:w-fit mbc:flex-col mbc:gap-4">
                  <Label
                    htmlFor={`${id}-code`}
                    className="mbc:flex mbc:h-9 mbc:items-center mbc:text-sm mbc:font-semibold"
                  >
                    {t.list.code}
                  </Label>
                  <Label
                    htmlFor={`${id}-name`}
                    className="mbc:flex mbc:h-9 mbc:items-center mbc:text-sm mbc:font-semibold"
                  >
                    {t.list.name}
                  </Label>
                  <Label
                    htmlFor={`${id}-keyword`}
                    className="mbc:flex mbc:h-9 mbc:items-center mbc:text-sm mbc:font-semibold"
                  >
                    {t.list.description}
                  </Label>
                  {scoped && (
                    <Label
                      htmlFor={`${id}-system`}
                      className="mbc:flex mbc:h-9 mbc:items-center mbc:text-sm mbc:font-semibold"
                    >
                      {m.access.system}
                    </Label>
                  )}
                </div>
                <div className="mbc:flex mbc:flex-1 mbc:flex-col mbc:gap-4">
                  <Input {...field('code')} />
                  <Input {...field('name')} />
                  <Input {...field('keyword')} />
                  {scoped && (
                    <Select
                      value={filters.systemId || ALL_SYSTEMS}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          systemId: value === ALL_SYSTEMS ? '' : value,
                        })
                      }
                    >
                      <SelectTrigger id={`${id}-system`} className="mbc:w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_SYSTEMS}>
                          {m.access.allSystems}
                        </SelectItem>
                        {access.systems.map((system) => (
                          <SelectItem key={system.id} value={system.id}>
                            {system.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
      </div>

      <div className="mbc:mx-3 mbc:mb-2 mbc:flex mbc:justify-end mbc:gap-2 mbc:pt-3">
        {canCreate && onImport && (
          <BulkImportDialog
            disabled={waiting}
            access={access}
            screen="settings"
            tenantCode={tenantCode}
            inputSampleJson={inputSampleJson}
            mapRawItem={mapRawItem}
            onImport={onImport}
            onImported={onImported}
            jsonEditor={jsonEditor}
          />
        )}
        {canCreate &&
          (waiting ? (
            <Button type="button" disabled>
              {t.list.create}
            </Button>
          ) : (
            <Button asChild>
              <MasterLink routing={routing} to={{ screen: 'newSetting' }}>
                {t.list.create}
              </MasterLink>
            </Button>
          ))}
      </div>

      {error !== undefined && error !== null && (
        <div className="mbc:mx-3 mbc:mt-4">
          <ListError
            message={t.list.loadFailed}
            retry={t.list.retry}
            onRetry={onRetry}
          />
        </div>
      )}

      <div className="mbc:mt-4">
        <DataTable
          label={t.list.table}
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          total={total}
          page={state.page}
          pageSize={state.pageSize}
          loading={loading}
          failed={error !== undefined && error !== null}
          sort={state.sort}
          onPageChange={(page) => onStateChange({ ...state, page })}
          onPageSizeChange={(pageSize) =>
            onStateChange({ ...state, pageSize, page: 1 })
          }
          onSortChange={(sort) => onStateChange({ ...state, sort, page: 1 })}
        />
      </div>

      {onBack && (
        <div className="mbc:flex mbc:justify-evenly mbc:py-3">
          <Button
            type="button"
            variant="outline"
            className="mbc:min-w-[200px]"
            onClick={onBack}
          >
            {t.list.back}
          </Button>
        </div>
      )}
    </div>
  )
}
