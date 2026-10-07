import type { MasterFieldType } from './field-type-names'

/** A stored type name; names this version does not know are kept as-is. */
export type StoredFieldType = MasterFieldType | (string & {})

/** One field of a master setting (`attributes.fields[]`), as v0 stores it. */
export type MasterField = {
  physicalName: string
  name: string
  description?: string
  dataType: StoredFieldType
  isRequired: boolean
  isShowedOnList: boolean
  defaultValue?: unknown
  /** string: maximum length. v0 stores numbers as strings. */
  length?: string | number
  /** string: regular expression the value must match. */
  pattern?: string
  /** number: bounds. */
  min?: string | number
  max?: string | number
  /** string / text-area: maximum number of lines. */
  maxRow?: string | number
  /** auto_number: the sequence format and the sequence setting it came from. */
  dataFormat?: string
  formatCode?: string
  formatName?: string
  prefix?: string
  postfix?: string
  [key: string]: unknown
}

export type MasterSettingAttributes = {
  description: string
  fields: MasterField[]
  [key: string]: unknown
}

/** A master setting as `GET /api/master-setting/detail/:id` returns it. */
export type MasterSetting = {
  id: string
  pk: string
  sk: string
  code: string
  name: string
  version: number
  tenantCode?: string
  isDeleted?: boolean
  attributes: MasterSettingAttributes
  [key: string]: unknown
}

/** A master data record as `GET /api/master-data/detail/:id` returns it. */
export type MasterData = {
  id: string
  pk: string
  sk: string
  code: string
  name: string
  version: number
  tenantCode?: string
  seq?: number
  isDeleted?: boolean
  attributes: Record<string, unknown>
  [key: string]: unknown
}
