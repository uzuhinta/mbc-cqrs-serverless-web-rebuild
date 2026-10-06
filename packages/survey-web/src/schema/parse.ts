import type { z } from 'zod'

import {
  SurveyItemSchema,
  SurveySchema,
  type Survey,
  type SurveyInput,
} from './survey-schema'

export type ParseSurveyResult =
  { success: true; data: Survey } | { success: false; error: z.ZodError }

export function parseSurvey(json: unknown): ParseSurveyResult {
  const result = SurveySchema.safeParse(json)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

/**
 * @deprecated Use `parseSurvey`. Keeps v0's result shape, so v0 code that reads
 * `result.data` / `result.error` without narrowing still compiles.
 */
export function validateSurveyJson(json: unknown): {
  success: boolean
  data?: Survey
  error?: z.ZodError
} {
  const result = parseSurvey(json)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

/**
 * For rendering stored JSON: the parsed survey when it is valid; otherwise
 * each item parsed on its own (defaults filled), and items that still fail
 * kept as given — renderers fall back like v0 for those.
 */
export function normalizeSurvey(input: SurveyInput): Survey {
  const whole = SurveySchema.safeParse(input)
  if (whole.success) return whole.data
  const raw = input as Survey
  const items = Array.isArray(raw.items) ? raw.items : []
  return {
    ...raw,
    items: items.map((item) => {
      const parsed = SurveyItemSchema.safeParse(item)
      return parsed.success ? parsed.data : item
    }),
  }
}
