'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  MultiSelect,
  RadioGroup,
  RadioGroupItem,
  Switch,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Search } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'

import {
  buildCopyRequest,
  COPY_TYPES,
  type CopyType,
  type MasterCopyRequest,
  type MasterTenant,
} from '../core/copy'
import {
  dataCodeOf,
  type MasterDataListItem,
  type MasterDataListState,
} from '../core/list'
import type { MasterSetting } from '../core/types'
import { dataColumns } from '../data/data-columns'
import { FailureAlert, type Failure } from '../form/failure'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { ListError } from '../list/list-error'
import { useFilters } from '../list/use-filters'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import { DataTable } from '../table/data-table'

export type MasterCopyRequestFormProps = {
  /** The setting to copy: the request names it; its fields make the data columns. */
  setting: MasterSetting
  /** The tenants it can be copied to (v0 read them from a host endpoint). */
  tenants: readonly MasterTenant[]
  /** "Chosen data only" picks rows from the setting's data: this page of it. */
  items: readonly MasterDataListItem[]
  total: number
  state: MasterDataListState
  onStateChange(state: MasterDataListState): void
  routing: MasterRouting
  /** The data rows are loading. */
  loading?: boolean
  /** The data rows failed to load; shown with a reload button that calls `onRetry`. */
  error?: unknown
  onRetry?(): void
  /** Sends the request; reject to show the failure. What follows is the host's. */
  onRequestCopy(request: MasterCopyRequest): Promise<void>
}

type Filters = Pick<MasterDataListState, 'code' | 'keyword' | 'isDeleted'>

const LABEL = 'mbc:flex mbc:h-9 mbc:items-center mbc:text-sm mbc:font-semibold'

const isCopyType = (value: string): value is CopyType =>
  (COPY_TYPES as readonly string[]).includes(value)

/** v0's copy request: where to, what, and for chosen data the rows to copy. */
export function MasterCopyRequestForm({
  setting,
  tenants,
  items,
  total,
  state,
  onStateChange,
  routing,
  loading = false,
  error,
  onRetry,
  onRequestCopy,
}: MasterCopyRequestFormProps) {
  const t = useMessages(masterCopyMessages).request
  const id = useId()
  const [destination, setDestination] = useState<'all' | 'chosen'>('all')
  const [chosen, setChosen] = useState<string[]>([])
  const [copyType, setCopyType] = useState<CopyType>('BOTH')
  // Kept across pages and searches, like v0's row selection.
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [noTargets, setNoTargets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [requested, setRequested] = useState(false)
  const tenantList = useRef<HTMLButtonElement>(null)
  const [filters, setFilters] = useFilters<Filters>({
    code: state.code,
    keyword: state.keyword,
    isDeleted: state.isDeleted,
  })

  const search = (event: FormEvent) => {
    event.preventDefault()
    onStateChange({ ...state, ...filters, page: 1 })
  }

  const submit = async () => {
    const request = buildCopyRequest({
      masterSettingId: setting.id,
      copyType,
      targets: destination === 'all' ? 'all' : chosen,
      allTenants: tenants.map((tenant) => tenant.code),
      dataIds: [...selection],
    })
    // v0 copied to every tenant when none was chosen.
    if (request.targetTenants.length === 0) {
      setNoTargets(true)
      tenantList.current?.focus()
      return
    }
    setSaving(true)
    setFailure(null)
    setRequested(false)
    try {
      await onRequestCopy(request)
      setRequested(true)
    } catch {
      setFailure({ title: t.failed, hint: t.failedHint })
    } finally {
      setSaving(false)
    }
  }

  const errorId = `${id}-no-targets`

  return (
    <div data-mbc="" className="mbc:space-y-6 mbc:p-5">
      <Card>
        <CardHeader>
          <CardTitle id={`${id}-destination`}>{t.destination}</CardTitle>
        </CardHeader>
        <CardContent className="mbc:space-y-4">
          <RadioGroup
            value={destination}
            onValueChange={(value) => {
              setDestination(value === 'chosen' ? 'chosen' : 'all')
              setNoTargets(false)
            }}
            aria-labelledby={`${id}-destination`}
            className="mbc:flex mbc:flex-wrap mbc:gap-4"
          >
            {(['all', 'chosen'] as const).map((value) => (
              <div key={value} className="mbc:flex mbc:items-center mbc:gap-2">
                <RadioGroupItem value={value} id={`${id}-${value}`} />
                <Label htmlFor={`${id}-${value}`}>
                  {value === 'all' ? t.allTenants : t.chosenTenants}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {destination === 'chosen' && (
            <div className="mbc:mt-2 mbc:md:px-5">
              <div id={`${id}-tenants`}>{t.chooseTenants}</div>
              <MultiSelect
                ref={tenantList}
                options={tenants.map((tenant) => ({
                  value: tenant.code,
                  label: tenant.name,
                }))}
                value={chosen}
                onValueChange={(value) => {
                  setChosen(value)
                  setNoTargets(false)
                }}
                placeholder={t.tenantsPlaceholder}
                aria-labelledby={`${id}-tenants`}
                aria-invalid={noTargets || undefined}
                aria-describedby={noTargets ? errorId : undefined}
                className="mbc:mt-3 mbc:w-full"
              />
            </div>
          )}
          {noTargets && (
            <p
              id={errorId}
              role="alert"
              className="mbc:text-destructive mbc:text-sm"
            >
              {t.noTargets}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle id={`${id}-content`}>{t.content}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={copyType}
            onValueChange={(value) => {
              if (isCopyType(value)) setCopyType(value)
            }}
            aria-labelledby={`${id}-content`}
            className="mbc:space-y-2"
          >
            {COPY_TYPES.map((type) => (
              <div key={type} className="mbc:flex mbc:items-center mbc:gap-2">
                <RadioGroupItem value={type} id={`${id}-${type}`} />
                <Label htmlFor={`${id}-${type}`}>{t.copyTypes[type]}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {copyType === 'DATA_ONLY' && (
        <Card>
          <CardContent className="mbc:space-y-4">
            <form onSubmit={search} role="search">
              <div className="mbc:flex mbc:w-full mbc:flex-col mbc:justify-center mbc:md:px-6">
                <div className="mbc:flex mbc:w-full mbc:gap-4 mbc:md:gap-10">
                  <div className="mbc:flex mbc:w-fit mbc:flex-col mbc:gap-4">
                    <Label htmlFor={`${id}-code`} className={LABEL}>
                      {t.code}
                    </Label>
                    <Label htmlFor={`${id}-keyword`} className={LABEL}>
                      {t.name}
                    </Label>
                    <Label htmlFor={`${id}-deleted`} className={LABEL}>
                      {t.includeDeleted}
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
                        setFilters({ ...filters, keyword: event.target.value })
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
                <div className="mbc:mt-3 mbc:flex mbc:justify-end">
                  <Button type="submit">
                    <Search aria-hidden />
                    {t.search}
                  </Button>
                </div>
              </div>
            </form>
            <p aria-live="polite" className="mbc:ml-2 mbc:min-h-5">
              {selection.size > 0 ? t.selected({ count: selection.size }) : ''}
            </p>
            {error !== undefined && error !== null && (
              <ListError
                message={t.loadFailed}
                retry={t.retry}
                onRetry={onRetry}
              />
            )}
            <DataTable
              label={t.table}
              columns={dataColumns(setting, t, (row) => (
                <span className="mbc:text-primary mbc:block mbc:w-full mbc:overflow-hidden mbc:text-ellipsis">
                  {dataCodeOf(row)}
                </span>
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
              selection={selection}
              onSelectionChange={setSelection}
            />
          </CardContent>
        </Card>
      )}

      {failure && <FailureAlert failure={failure} />}
      <div role="status">
        {requested && (
          <p className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-2">
            {t.requested}
            <MasterLink
              routing={routing}
              to={{ screen: 'copyTasks', settingId: setting.id }}
              className="mbc:text-primary mbc:underline"
            >
              {t.viewResults}
            </MasterLink>
          </p>
        )}
      </div>

      <div className="mbc:mt-10 mbc:flex mbc:flex-wrap mbc:justify-evenly mbc:gap-4">
        <Button asChild variant="outline" className="mbc:min-w-[200px]">
          <MasterLink
            routing={routing}
            to={{ screen: 'setting', id: setting.id }}
          >
            {t.back}
          </MasterLink>
        </Button>
        <Button
          type="button"
          className="mbc:min-w-[200px]"
          loading={saving}
          onClick={() => void submit()}
        >
          {t.submit}
        </Button>
      </div>
    </div>
  )
}
