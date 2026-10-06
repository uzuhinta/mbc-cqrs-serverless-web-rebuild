import { describe, expect, it } from 'vitest'

import type { Survey } from '../../schema/survey-schema'
import { TITLE_ID } from './types'
import { validateDraft } from './validate'

describe('validateDraft', () => {
  it('passes a valid survey and returns the parsed data', () => {
    const survey: Survey = {
      title: 'T',
      items: [{ id: 'sec_1', type: 'section-header', title: 'S' }],
    }
    expect(validateDraft(survey)).toEqual({
      valid: true,
      data: survey,
      errors: {},
      warnings: {},
    })
  })

  it('maps schema issues to the card that owns them', () => {
    const survey = {
      title: '',
      items: [
        { id: 'sec_1', type: 'section-header', title: '' },
        { id: 'q_1', type: 'single-choice', label: 'Q', options: [] },
        {
          id: 'q_2',
          type: 'dropdown',
          label: 'Q2',
          options: [{ value: '', label: '' }],
        },
        {
          id: 'q_3',
          type: 'short-text',
          label: 'Q3',
          validation: { custom: { type: 'number' } },
        },
      ],
    } as unknown as Survey
    const report = validateDraft(survey)
    expect(report.valid).toBe(false)
    expect(report.errors).toEqual({
      [TITLE_ID]: ['surveyTitle'],
      sec_1: ['sectionTitle'],
      q_1: ['options'],
      q_2: ['optionValueEmpty', 'optionLabel'],
      q_3: ['validationRule'],
    })
  })

  it('flags duplicate ids on the second item', () => {
    const survey: Survey = {
      title: 'T',
      items: [
        { id: 'dup', type: 'section-header', title: 'A' },
        { id: 'dup', type: 'short-text', label: 'B' },
      ],
    }
    expect(validateDraft(survey).errors).toEqual({ dup: ['duplicateId'] })
  })

  it('warns about branch targets that no longer exist, without failing', () => {
    const survey: Survey = {
      title: 'T',
      items: [
        {
          id: 'sec_1',
          type: 'section-header',
          title: 'S',
          action: { type: 'jump', targetSectionId: 'sec_gone' },
        },
        {
          id: 'q_1',
          type: 'single-choice',
          label: 'Q',
          options: [
            { value: 'a', label: 'a', nextSectionId: 'sec_gone' },
            { value: 'b', label: 'b', nextSectionId: 'sec_1' },
          ],
        },
      ],
    }
    const report = validateDraft(survey)
    expect(report.valid).toBe(true)
    expect(report.warnings).toEqual({
      sec_1: ['missingTarget'],
      q_1: ['missingTarget'],
    })
  })
})
