import { describe, expect, it } from 'vitest'

import type { Survey, SurveyQuestion } from '../schema/survey-schema'
import { validateAnswer, validateAnswers } from './validate'

const text = (custom?: unknown, required = false) =>
  ({
    id: 'q',
    type: 'short-text',
    label: 'Q',
    validation: { required, ...(custom ? { custom } : {}) },
  }) as SurveyQuestion

describe('validateAnswer — required', () => {
  it('uses the v0 message key for each question type', () => {
    const required = { required: true }
    const cases: [SurveyQuestion, string][] = [
      [
        { id: 'a', type: 'short-text', label: 'A', validation: required },
        'required',
      ],
      [
        { id: 'b', type: 'long-text', label: 'B', validation: required },
        'required',
      ],
      [
        {
          id: 'c',
          type: 'linear-scale',
          label: 'C',
          min: 0,
          max: 10,
          validation: required,
        },
        'required',
      ],
      [
        {
          id: 'd',
          type: 'rating',
          label: 'D',
          levels: 5,
          symbol: 'star',
          validation: required,
        },
        'required',
      ],
      [
        {
          id: 'e',
          type: 'date',
          label: 'E',
          includeTime: false,
          includeYear: true,
          validation: required,
        },
        'requiredField',
      ],
      [
        {
          id: 'f',
          type: 'time',
          label: 'F',
          answerType: 'time',
          validation: required,
        },
        'required',
      ],
      [
        {
          id: 'g',
          type: 'dropdown',
          label: 'G',
          options: [{ value: 'x', label: 'X' }],
          validation: required,
        },
        'requiredChoice',
      ],
      [
        {
          id: 'h',
          type: 'single-choice',
          label: 'H',
          options: [{ value: 'x', label: 'X' }],
          validation: required,
        },
        'requiredChoice',
      ],
      [
        {
          id: 'i',
          type: 'multiple-choice',
          label: 'I',
          options: [{ value: 'x', label: 'X' }],
          validation: required,
        },
        'requiredChoices',
      ],
    ]
    for (const [question, key] of cases) {
      expect(validateAnswer(question, undefined), question.type).toEqual({
        key,
      })
    }
    expect(validateAnswer(cases[0]![0], '')).toEqual({ key: 'required' })
    expect(validateAnswer(cases[8]![0], [])).toEqual({ key: 'requiredChoices' })
  })

  it('accepts empty optional answers', () => {
    expect(validateAnswer(text(), undefined)).toBeNull()
    expect(
      validateAnswer(text({ type: 'length', rule: 'min', value: 3 }), '')
    ).toBeNull()
  })

  it('requires "other" text only when the question is required', () => {
    const single: SurveyQuestion = {
      id: 's',
      type: 'single-choice',
      label: 'S',
      options: [{ value: 'other', label: 'Other', isOther: true }],
      validation: { required: true },
    }
    expect(validateAnswer(single, 'other')).toEqual({ key: 'otherRequired' })
    expect(validateAnswer(single, 'other:   ')).toEqual({
      key: 'otherRequired',
    })
    expect(validateAnswer(single, 'other:Bike')).toBeNull()
    expect(validateAnswer({ ...single, validation: {} }, 'other')).toBeNull()

    const multi: SurveyQuestion = {
      ...single,
      type: 'multiple-choice',
      options: [{ value: 'other', label: 'O' }],
    }
    expect(validateAnswer(multi, ['other'])).toEqual({ key: 'otherRequired' })
  })

  it('checks time and duration parts as v0 did', () => {
    const time: SurveyQuestion = {
      id: 't',
      type: 'time',
      label: 'T',
      answerType: 'time',
      validation: { required: true },
    }
    expect(validateAnswer(time, { hour: '09', minute: '' })).toEqual({
      key: 'required',
    })
    expect(validateAnswer(time, { hour: '09', minute: '30' })).toBeNull()

    const duration: SurveyQuestion = { ...time, answerType: 'duration' }
    expect(
      validateAnswer(duration, { hours: '', minutes: '', seconds: '' })
    ).toEqual({ key: 'required' })
    expect(
      validateAnswer(duration, { hours: '1', minutes: '0', seconds: '0' })
    ).toBeNull()
  })
})

describe('validateAnswer — custom rules', () => {
  it('validates numbers strictly', () => {
    const between = text({
      type: 'number',
      rule: 'between',
      value: 18,
      value2: 65,
    })
    expect(validateAnswer(between, '30')).toBeNull()
    expect(validateAnswer(between, '17')).toEqual({ key: 'criteria' })
    expect(validateAnswer(between, '12abc')).toEqual({ key: 'invalidNumber' })
    expect(
      validateAnswer(text({ type: 'number', rule: 'is_whole' }), '1.5')
    ).toEqual({ key: 'criteria' })
    expect(
      validateAnswer(
        text({ type: 'number', rule: 'not_between', value: 1, value2: 3 }),
        '2'
      )
    ).toEqual({ key: 'criteria' })
    expect(validateAnswer(text({ type: 'number', rule: 'gt' }), '2')).toBeNull()
  })

  it('validates text rules', () => {
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_email' }), 'a@b.co')
    ).toBeNull()
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_email' }), 'nope')
    ).toEqual({ key: 'criteria' })
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_url' }), 'https://x.jp')
    ).toBeNull()
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_url' }), 'x.jp')
    ).toEqual({ key: 'criteria' })
    expect(
      validateAnswer(
        text({ type: 'text', rule: 'not_contains', value: 'spam' }),
        'no spam'
      )
    ).toEqual({ key: 'criteria' })
  })

  it('validates length and regex', () => {
    expect(
      validateAnswer(text({ type: 'length', rule: 'max', value: 3 }), 'abcd')
    ).toEqual({ key: 'length' })
    const matches = text({ type: 'regex', rule: 'matches', value: '[0-9]{3}' })
    expect(validateAnswer(matches, '123')).toBeNull()
    expect(validateAnswer(matches, '1234')).toEqual({ key: 'pattern' })
    expect(
      validateAnswer(
        text({ type: 'regex', rule: 'contains', value: 'a+' }),
        'xaay'
      )
    ).toBeNull()
    expect(
      validateAnswer(text({ type: 'regex', rule: 'matches', value: '(' }), 'x')
    ).toBeNull()
  })

  it('returns the custom error message', () => {
    expect(
      validateAnswer(
        text({
          type: 'length',
          rule: 'min',
          value: 5,
          customError: '5文字以上',
        }),
        'abc'
      )
    ).toEqual({ key: 'custom', message: '5文字以上' })
  })

  it('enforces multiple-choice counts', () => {
    const multi = (
      rule: 'min' | 'max' | 'exact',
      value: number
    ): SurveyQuestion => ({
      id: 'm',
      type: 'multiple-choice',
      label: 'M',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
      validation: { custom: { rule, value } },
    })
    expect(validateAnswer(multi('max', 1), ['a', 'b'])).toEqual({
      key: 'choiceCount',
      params: { rule: 'max', value: 1 },
    })
    expect(validateAnswer(multi('min', 2), ['a'])).toEqual({
      key: 'choiceCount',
      params: { rule: 'min', value: 2 },
    })
    expect(validateAnswer(multi('exact', 2), ['a', 'b'])).toBeNull()
    expect(validateAnswer(multi('min', 2), [])).toBeNull()
  })
})

describe('validateAnswers', () => {
  const survey: Survey = {
    title: 'S',
    items: [
      { id: 'start', type: 'section-header', title: 'Start' },
      {
        id: 'route',
        type: 'single-choice',
        label: 'Route',
        options: [
          { value: 'skip', label: 'Skip', nextSectionId: 'end' },
          { value: 'stay', label: 'Stay' },
        ],
        validation: { required: true },
      },
      { id: 'middle', type: 'section-header', title: 'Middle' },
      {
        id: 'q_middle',
        type: 'short-text',
        label: 'M',
        validation: { required: true },
      },
      { id: 'end', type: 'section-header', title: 'End' },
      {
        id: 'q_end',
        type: 'short-text',
        label: 'E',
        validation: { custom: { type: 'length', rule: 'max', value: 2 } },
      },
    ],
  }

  it('ignores questions in sections the answers skipped', () => {
    expect(validateAnswers(survey, { route: 'skip', q_end: 'ok' })).toEqual({})
  })

  it('reports errors on the visited path', () => {
    expect(validateAnswers(survey, { route: 'stay', q_end: 'long' })).toEqual({
      q_middle: { key: 'required' },
      q_end: { key: 'length' },
    })
  })
})
