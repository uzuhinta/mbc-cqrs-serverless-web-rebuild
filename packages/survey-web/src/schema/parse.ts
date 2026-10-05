import type { z } from 'zod'

import { SurveySchema, type Survey } from './survey-schema'

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
