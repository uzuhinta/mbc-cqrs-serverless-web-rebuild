import { describe, expect, it } from 'vitest'

import { validateDraft } from '../creator/state/validate'
import { optionValueProblems } from './option-values'
import { parseSurvey } from './parse'
import type { Survey } from './survey-schema'

const withOptions = (
  options: { value: string; label: string; isOther?: boolean }[]
) =>
  ({
    title: 'T',
    items: [{ id: 'q', type: 'single-choice', label: 'Q', options }],
  }) as Survey

describe('option values (v0 0.0.49 rule)', () => {
  it('rejects duplicate values, since a value identifies the answer', () => {
    const result = parseSurvey(
      withOptions([
        { value: 'a', label: 'A' },
        { value: 'a', label: 'A2' },
      ])
    )
    expect(result.success).toBe(false)
    expect(
      !result.success && result.error.issues.map((issue) => issue.path)
    ).toEqual([['items', 0, 'options', 1, 'value']])
  })

  it('reserves "other" and "other:…" for the Other option', () => {
    expect(
      parseSurvey(withOptions([{ value: 'other', label: 'Other' }])).success
    ).toBe(false)
    expect(
      parseSurvey(withOptions([{ value: 'other:x', label: 'X' }])).success
    ).toBe(false)
    expect(
      parseSurvey(
        withOptions([
          { value: 'a', label: 'A' },
          { value: 'other', label: 'その他', isOther: true },
        ])
      ).success
    ).toBe(true)
  })

  it('reports the problem on the card with its own message key', () => {
    const report = validateDraft(
      withOptions([
        { value: 'a', label: 'A' },
        { value: 'a', label: 'A' },
      ])
    )
    expect(report.errors).toEqual({ q: ['optionValue'] })
  })
})

describe('optionValueProblems', () => {
  it('blames the option that misuses "other", not the fixed "Other" option', () => {
    expect(
      optionValueProblems([
        { value: 'other' },
        { value: 'other', isOther: true },
      ])
    ).toEqual(['reserved', undefined])
  })

  it('reports a repeat on the later option, and empty values', () => {
    expect(
      optionValueProblems([{ value: '1' }, { value: '1' }, { value: '' }])
    ).toEqual([undefined, 'duplicate', 'empty'])
  })
})
