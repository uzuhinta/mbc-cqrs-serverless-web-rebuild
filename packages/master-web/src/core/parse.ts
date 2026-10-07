import { z } from 'zod'

import type { MasterData, MasterSetting } from './types'

export type ParseResult<T> =
  { success: true; data: T } | { success: false; error: z.ZodError }

/** v0 sometimes stores `null` where a value is optional. */
const optional = <T extends z.ZodType>(schema: T) =>
  z
    .preprocess(
      (value) => (value === null ? undefined : value),
      schema.optional()
    )
    .optional()

/** v0 stores flags as booleans, older data as 'true' / 'false'. */
const flag = z.preprocess(
  (value) => value === true || value === 'true',
  z.boolean()
)

const stringOrNumber = optional(z.union([z.string(), z.number()]))

/** A field v0 stored oddly still loads, so its setting can be opened and fixed. */
const text = z.preprocess(
  (value) =>
    typeof value === 'string' ? value : value == null ? '' : String(value),
  z.string()
)

const MasterFieldSchema = z.looseObject({
  physicalName: text,
  name: text,
  description: optional(z.string()),
  dataType: z.preprocess(
    (value) => (typeof value === 'string' && value !== '' ? value : 'string'),
    z.string()
  ),
  isRequired: flag,
  isShowedOnList: flag,
  defaultValue: z.unknown().optional(),
  length: stringOrNumber,
  pattern: optional(z.string()),
  min: stringOrNumber,
  max: stringOrNumber,
  maxRow: stringOrNumber,
  dataFormat: optional(z.string()),
  formatCode: optional(z.string()),
  formatName: optional(z.string()),
  prefix: optional(z.string()),
  postfix: optional(z.string()),
})

const entity = {
  id: z.string(),
  pk: z.string(),
  sk: z.string(),
  code: z.string(),
  name: z.string(),
  version: z.preprocess((value) => value ?? 0, z.number()),
  tenantCode: optional(z.string()),
  isDeleted: optional(z.boolean()),
}

const MasterSettingSchema = z.looseObject({
  ...entity,
  attributes: z.preprocess(
    (value) => value ?? {},
    z.looseObject({
      description: z.preprocess(
        (value) => (typeof value === 'string' ? value : ''),
        z.string()
      ),
      fields: z.preprocess((value) => value ?? [], z.array(MasterFieldSchema)),
    })
  ),
})

const MasterDataSchema = z.looseObject({
  ...entity,
  seq: optional(z.number()),
  attributes: z.preprocess(
    (value) => value ?? {},
    z.record(z.string(), z.unknown())
  ),
})

function wrap<T>(result: z.ZodSafeParseResult<unknown>): ParseResult<T> {
  return result.success
    ? { success: true, data: result.data as T }
    : { success: false, error: result.error }
}

/** Reads a stored setting the way v0 wrote it; unknown keys are kept. */
export function parseMasterSetting(input: unknown): ParseResult<MasterSetting> {
  return wrap(MasterSettingSchema.safeParse(input))
}

/** Reads a stored data record the way v0 wrote it; unknown keys are kept. */
export function parseMasterData(input: unknown): ParseResult<MasterData> {
  return wrap(MasterDataSchema.safeParse(input))
}
