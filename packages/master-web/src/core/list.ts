/** A sort on one column; the list screens sort by `code`, `name` and `seq`. */
export type ListSort = { column: string; desc: boolean }

/** master v0's page size. */
export const DEFAULT_PAGE_SIZE = 20

/** The settings list's filters, sort and page (owned by the host or `/mbc`). */
export type MasterSettingListState = {
  page: number
  pageSize: number
  code: string
  name: string
  /** v0 searches the description with it. */
  keyword: string
  sort?: ListSort
}

/** A setting's data list: filters, sort and page. */
export type MasterDataListState = {
  page: number
  pageSize: number
  code: string
  /** v0 searches the name with it. */
  keyword: string
  isDeleted: boolean
  sort?: ListSort
}

export function initialSettingListState(): MasterSettingListState {
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    code: '',
    name: '',
    keyword: '',
  }
}

export function initialDataListState(): MasterDataListState {
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    code: '',
    keyword: '',
    isDeleted: false,
  }
}

/**
 * A row of `GET /api/master-setting/list` (the database table): `code` is
 * `MASTER_SETTING#<code>`; `settingCodeOf` reads the code itself.
 */
export type MasterSettingListItem = {
  id: string
  pk: string
  sk: string
  code: string
  name: string
  tenantCode?: string
  attributes?: { description?: unknown; [key: string]: unknown }
  [key: string]: unknown
}

/** A row of `GET /api/master-data/list` (the database table). */
export type MasterDataListItem = {
  id: string
  pk: string
  sk: string
  masterCode?: string
  code?: string
  name: string
  seq?: number | null
  isDeleted?: boolean
  attributes?: Record<string, unknown>
  [key: string]: unknown
}

/** The record's own code: v0 showed the list row's `masterCode`. */
export function dataCodeOf(row: MasterDataListItem): string {
  return row.masterCode ?? row.code ?? ''
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * The calendar date a stored date names, as written: no time-zone
 * conversion, so every browser and the server show the same day.
 */
export function dateParts(
  value: unknown
): { year: string; month: string; day: string } | undefined {
  if (typeof value !== 'string') return undefined
  const [, year, month, day] = DATE.exec(value) ?? []
  return year && month && day ? { year, month, day } : undefined
}

/** A moment's parts in the runtime's time zone (the browser's, after hydration). */
export type TimeParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The parts of a stored timestamp, or `undefined` when it is not one. */
export function localTimeParts(value: unknown): TimeParts | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return {
    year: String(date.getFullYear()),
    month: pad(date.getMonth() + 1),
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
    second: pad(date.getSeconds()),
  }
}
