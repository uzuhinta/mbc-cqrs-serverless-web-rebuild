import type { MasterData, MasterSetting } from './types'
import { dataFields, fromFormValues, type MasterFormValues } from './values'

/** `POST /api/master-data/create` body. */
export type MasterDataCreateBody = {
  settingCode: string
  code: string
  name: string
  seq?: number
  attributes: Record<string, unknown>
}

/** `PUT /api/master-data/:id` body. */
export type MasterDataUpdateBody = {
  name: string
  seq: number
  attributes: Record<string, unknown>
}

const SETTING_PREFIX = 'MASTER_SETTING#'

/** The setting's own code; list rows may carry it as `MASTER_SETTING#<code>`. */
export function settingCodeOf(setting: Pick<MasterSetting, 'code'>): string {
  return setting.code.startsWith(SETTING_PREFIX)
    ? setting.code.slice(SETTING_PREFIX.length)
    : setting.code
}

function text(value: unknown): string {
  if (typeof value === 'string') return value
  return value === undefined || value === null ? '' : String(value)
}

export function toDataPayload(
  setting: MasterSetting,
  values: MasterFormValues,
  options: { mode: 'create'; generatedCode?: string }
): MasterDataCreateBody
export function toDataPayload(
  setting: MasterSetting,
  values: MasterFormValues,
  options: { mode: 'update'; previous: MasterData }
): MasterDataUpdateBody
/**
 * v0's request bodies. Code and name come from the inputs (a generated code
 * when the code field is `auto_number`); `seq` is a number, empty → omitted
 * on create, 0 on update; the code is also written to `attributes.code` on create.
 */
export function toDataPayload(
  setting: MasterSetting,
  values: MasterFormValues,
  options:
    | { mode: 'create'; generatedCode?: string }
    | { mode: 'update'; previous: MasterData }
): MasterDataCreateBody | MasterDataUpdateBody {
  const fields = dataFields(setting)
  const hasSeq = fields.some((field) => field.physicalName === 'seq')
  const name = text(values.name)

  if (options.mode === 'update') {
    const { previous } = options
    const attributes = fromFormValues(fields, values, previous.attributes)
    const seqText = hasSeq ? text(values.seq).trim() : String(previous.seq ?? 0)
    return { name, seq: seqText === '' ? 0 : Number(seqText), attributes }
  }

  const codeField = fields.find((field) => field.physicalName === 'code')
  const generated = codeField?.dataType === 'auto_number'
  if (generated && options.generatedCode === undefined)
    throw new Error('toDataPayload: an auto_number code needs generatedCode')
  const code = generated
    ? text(options.generatedCode)
    : text(values.code).trim()
  const seqText = hasSeq ? text(values.seq).trim() : ''
  const attributes = { ...fromFormValues(fields, values), code }
  return {
    settingCode: settingCodeOf(setting),
    code,
    name,
    ...(seqText === '' ? {} : { seq: Number(seqText) }),
    attributes,
  }
}
