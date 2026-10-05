import { describe, expect, it } from 'vitest'

import { surveyMessages } from '../i18n/survey-messages'
import type { SurveyQuestion } from '../schema/survey-schema'
import { createSectionResolver } from './resolver'

const questions: SurveyQuestion[] = [
  { id: 'a', type: 'short-text', label: 'A', validation: { required: true } },
  { id: 'b', type: 'short-text', label: 'B' },
]
const resolver = createSectionResolver(
  questions,
  surveyMessages.locales.ja.validation
)

describe('createSectionResolver', () => {
  it('reports translated errors for the current section only', async () => {
    const result = await resolver({ a: '', other: '' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    })
    expect(result.errors).toEqual({
      a: { type: 'required', message: 'この質問は必須です' },
    })
  })

  it('returns the values when the section is valid', async () => {
    const result = await resolver({ a: 'x' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    })
    expect(result).toEqual({ values: { a: 'x' }, errors: {} })
  })
})
