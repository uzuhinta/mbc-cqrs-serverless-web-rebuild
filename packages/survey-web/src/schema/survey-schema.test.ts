import { describe, expect, it } from 'vitest'

import { SurveySchema as SurveySchemaV0 } from '../../test/v0/schema-v0'
import { COMPAT_INPUTS } from '../../test/fixtures/surveys'
import { parseSurvey } from './parse'
import { SurveySchema } from './survey-schema'

describe('SurveySchema compatibility with v0', () => {
  for (const [name, input] of Object.entries(COMPAT_INPUTS)) {
    it(`parses "${name}" exactly like v0`, () => {
      const v0 = SurveySchemaV0.safeParse(input)
      const v1 = SurveySchema.safeParse(input)

      expect(v1.success).toBe(v0.success)
      if (v0.success && v1.success) expect(v1.data).toEqual(v0.data)
    })
  }

  it('reports duplicate ids on the second occurrence', () => {
    const result = parseSurvey(COMPAT_INPUTS.duplicateIds)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['items', 1, 'id'])
      expect(result.error.issues[0]?.message).toBe('Duplicate item id "q1".')
    }
  })
})
