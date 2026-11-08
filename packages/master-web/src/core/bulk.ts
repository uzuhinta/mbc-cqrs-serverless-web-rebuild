import type { FixedFieldNames } from './field-definition'
import { isSameTenant } from './tenant'

/** One item of `POST /api/master-bulk`; `settingCode` makes it a data record. */
export type BulkJsonItem = {
  name: string
  code: string
  attributes: Record<string, unknown>
  tenantCode?: string
  settingCode?: string
  seq?: number
}

/** v0's mapper result types: hosts map their own JSON shape with `mapRawItem`. */
export type MappedSetting = {
  kind: 'setting'
  value: {
    name: string
    code: string
    tenantCode?: string
    settingValue: Record<string, unknown>
  }
}

export type MappedData = {
  kind: 'data'
  value: {
    settingCode: string
    code: string
    name: string
    seq: number
    attributes: Record<string, unknown>
    tenantCode?: string
  }
}

export type MapResult = MappedSetting | MappedData

/** Return `null` / `undefined` to skip an entry. */
export type BulkMapper = (raw: unknown) => MapResult | null | undefined

export type BulkError =
  | { key: 'invalidJson' }
  | { key: 'notArray' }
  | { key: 'empty' }
  | { key: 'mapFailed'; index: number; message: string }
  | { key: 'invalidItem'; index: number }
  | { key: 'invalidDataItem'; index: number }
  | { key: 'invalidMappedSetting'; index: number }
  | { key: 'invalidMappedData'; index: number }
  | { key: 'settingNotAllowed'; index: number }
  | { key: 'otherTenant'; index: number }

export type BulkParseResult = { items: BulkJsonItem[]; errors: BulkError[] }

/** The settings list imports settings and data; a setting's data list imports data only. */
export type BulkScreen = 'settings' | 'data'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isText = (value: unknown): value is string => typeof value === 'string'
const isFilled = (value: unknown): value is string =>
  isText(value) && value.trim() !== ''
const optionalText = (value: unknown) => value === undefined || isText(value)

export function mapResultToBulkItem(result: MapResult): BulkJsonItem {
  if (result.kind === 'setting') {
    const { name, code, tenantCode, settingValue } = result.value
    return { name, code, tenantCode, attributes: settingValue }
  }
  const { name, code, settingCode, tenantCode, seq, attributes } = result.value
  return { name, code, settingCode, tenantCode, seq, attributes }
}

function isMappedSetting(value: MappedSetting['value']): boolean {
  return (
    isText(value.name) &&
    isText(value.code) &&
    isPlainObject(value.settingValue) &&
    optionalText(value.tenantCode)
  )
}

function isMappedData(value: MappedData['value']): boolean {
  return (
    isFilled(value.settingCode) &&
    isText(value.code) &&
    isText(value.name) &&
    typeof value.seq === 'number' &&
    isPlainObject(value.attributes) &&
    optionalText(value.tenantCode)
  )
}

function isBulkItem(entry: unknown, screen: BulkScreen): entry is BulkJsonItem {
  if (!isPlainObject(entry)) return false
  if (
    !isText(entry.code) ||
    !isText(entry.name) ||
    !isPlainObject(entry.attributes)
  )
    return false
  if (!optionalText(entry.tenantCode)) return false
  const isData = screen === 'data' || 'settingCode' in entry
  return (
    !isData || (isFilled(entry.settingCode) && typeof entry.seq === 'number')
  )
}

/**
 * v0's bulk-import checks, reported per entry instead of stopping at the
 * first one. Without a mapper each entry must already be a bulk item; with
 * one, entries mapped to `null` are skipped. `items` holds the valid entries;
 * import only when `errors` is empty.
 */
export function parseBulkJson(
  text: string,
  {
    screen,
    mapRawItem,
    tenantCode,
  }: {
    screen: BulkScreen
    mapRawItem?: BulkMapper
    /** The current tenant: entries for another tenant are refused (the backend rejects the whole batch). */
    tenantCode?: string
  }
): BulkParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { items: [], errors: [{ key: 'invalidJson' }] }
  }
  if (!Array.isArray(raw)) return { items: [], errors: [{ key: 'notArray' }] }

  const items: BulkJsonItem[] = []
  const errors: BulkError[] = []
  const accept = (item: BulkJsonItem, index: number) => {
    if (
      tenantCode !== undefined &&
      item.tenantCode !== undefined &&
      !isSameTenant(item.tenantCode, tenantCode)
    )
      errors.push({ key: 'otherTenant', index })
    else items.push(item)
  }
  raw.forEach((entry: unknown, index) => {
    if (!mapRawItem) {
      if (isBulkItem(entry, screen)) accept(entry, index)
      else
        errors.push({
          key: screen === 'data' ? 'invalidDataItem' : 'invalidItem',
          index,
        })
      return
    }
    let mapped: MapResult | null | undefined
    try {
      mapped = mapRawItem(entry)
    } catch (error) {
      errors.push({
        key: 'mapFailed',
        index,
        message: error instanceof Error ? error.message : String(error),
      })
      return
    }
    if (!mapped) return
    // A host mapper may hand back anything; check the shape before reading it.
    const raw: unknown = mapped
    const kind = isPlainObject(raw) ? raw.kind : undefined
    const value = isPlainObject(raw) ? raw.value : undefined
    if (kind === 'setting') {
      if (screen === 'data') errors.push({ key: 'settingNotAllowed', index })
      else if (
        !isPlainObject(value) ||
        !isMappedSetting(value as MappedSetting['value'])
      )
        errors.push({ key: 'invalidMappedSetting', index })
      else accept(mapResultToBulkItem(mapped), index)
      return
    }
    if (
      kind !== 'data' ||
      !isPlainObject(value) ||
      !isMappedData(value as MappedData['value'])
    )
      errors.push({ key: 'invalidMappedData', index })
    else accept(mapResultToBulkItem(mapped), index)
  })
  if (items.length === 0 && errors.length === 0) errors.push({ key: 'empty' })
  return { items, errors }
}

/** The names in the import dialog's sample, e.g. from the screen's messages. */
export type BulkSampleTexts = {
  fields: FixedFieldNames
  settingName: string
  dataName: string
}

const SAMPLE_TEXTS: BulkSampleTexts = {
  fields: { code: 'コード', name: '名称', seq: '並び順' },
  settingName: 'マスター設定サンプル',
  dataName: 'マスターデータサンプル',
}

/**
 * The starting JSON in the import dialog (v0's samples, indented for a plain
 * text box), its names from `texts` when given (v0's Japanese otherwise).
 */
export function bulkSampleJson(
  screen: BulkScreen,
  settingCode = 'SETTING_CODE',
  texts: BulkSampleTexts = SAMPLE_TEXTS
): string {
  const data = {
    settingCode,
    code: 'MASTER_DATA_CODE',
    name: texts.dataName,
    seq: 0,
    attributes:
      screen === 'data' ? { seq: 0, code: '', name: '' } : { description: '' },
  }
  if (screen === 'data') return JSON.stringify([data], null, 2)
  const field = (
    physicalName: string,
    name: string,
    dataType: string,
    extra: Record<string, unknown>
  ) => ({
    physicalName,
    name,
    description: '',
    dataType,
    ...extra,
    isShowedOnList: true,
    uiComponent: 'string',
  })
  return JSON.stringify(
    [
      {
        code: 'MASTER_SETTING_CODE',
        name: texts.settingName,
        attributes: {
          description: '',
          fields: [
            field('code', texts.fields.code, 'string', {
              defaultValue: '',
              isRequired: true,
              length: '255',
            }),
            field('name', texts.fields.name, 'string', {
              isRequired: true,
              length: '255',
            }),
            field('seq', texts.fields.seq, 'number', {
              defaultValue: '',
              isRequired: false,
            }),
          ],
        },
      },
      data,
    ],
    null,
    2
  )
}
