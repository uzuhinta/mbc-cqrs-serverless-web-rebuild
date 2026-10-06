import { describe, expect, it } from 'vitest'

import type { SurveyInput, SurveyQuestion } from '../../schema/survey-schema'
import {
  changeQuestionType,
  createQuestion,
  initialCreatorState,
} from './defaults'
import { TITLE_ID } from './reducer'

let n = 0
const ids = (prefix: 'q' | 'sec') => `${prefix}_${++n}`
const text = {
  untitledSurvey: '未タイトル調査',
  firstSection: '最初のセクション',
}

describe('changeQuestionType', () => {
  const short: SurveyQuestion = {
    id: 'q1',
    type: 'short-text',
    label: 'Q',
    description: 'D',
    validation: {
      required: true,
      custom: { type: 'number', rule: 'gt', value: 1 },
    },
  }

  it('keeps id, label, description and required; drops the custom rule', () => {
    expect(changeQuestionType(short, 'long-text', 'オプション 1')).toEqual({
      id: 'q1',
      type: 'long-text',
      label: 'Q',
      description: 'D',
      validation: { required: true },
    })
  })

  it('gives each kind v0’s defaults', () => {
    expect(changeQuestionType(short, 'rating', 'x')).toMatchObject({
      levels: 5,
      symbol: 'star',
    })
    expect(changeQuestionType(short, 'linear-scale', 'x')).toMatchObject({
      min: 1,
      max: 5,
    })
    expect(changeQuestionType(short, 'date', 'x')).toMatchObject({
      includeTime: false,
      includeYear: true,
    })
    expect(changeQuestionType(short, 'time', 'x')).toMatchObject({
      answerType: 'time',
    })
  })

  it('adds one option when entering a choice kind, keeps options between choice kinds', () => {
    const single = changeQuestionType(short, 'single-choice', 'オプション 1')
    expect(single).toMatchObject({
      options: [{ value: 'オプション 1', label: 'オプション 1' }],
    })
    const branched: SurveyQuestion = {
      id: 'q2',
      type: 'dropdown',
      label: 'D',
      options: [{ value: 'a', label: 'a', nextSectionId: 'sec_x' }],
      validation: { required: false, shuffleOptions: true },
    }
    expect(changeQuestionType(branched, 'multiple-choice', 'x')).toEqual({
      id: 'q2',
      type: 'multiple-choice',
      label: 'D',
      options: [{ value: 'a', label: 'a' }],
      validation: { required: false, shuffleOptions: true },
    })
  })
})

describe('initialCreatorState', () => {
  it('starts a new survey with one section and the title card selected (v0)', () => {
    const state = initialCreatorState(undefined, text, ids)
    expect(state.survey).toEqual({
      title: '未タイトル調査',
      description: '',
      items: [
        {
          id: expect.stringMatching(/^sec_/),
          type: 'section-header',
          title: '最初のセクション',
        },
      ],
    })
    expect(state.selectedId).toBe(TITLE_ID)
    expect(state.dirty).toBe(false)
  })

  it('parses stored JSON (defaults filled) and selects the first item', () => {
    const state = initialCreatorState(
      { title: 'T', items: [{ id: 'q_r', type: 'rating', label: 'R' }] },
      text,
      ids
    )
    expect(state.survey.items[0]).toMatchObject({ levels: 5, symbol: 'star' })
    expect(state.selectedId).toBe('q_r')
  })

  it('gives duplicate ids fresh ones so cards and fields stay distinct', () => {
    const state = initialCreatorState(
      {
        title: 'T',
        items: [
          { id: 'dup', type: 'short-text', label: 'A' },
          { id: 'dup', type: 'short-text', label: 'B' },
        ],
      },
      text,
      ids
    )
    const [a, b] = state.survey.items
    expect(a?.id).toBe('dup')
    expect(b?.id).toMatch(/^q_/)
  })

  it('creates questions with v0’s defaults', () => {
    expect(createQuestion(ids)).toEqual({
      id: expect.stringMatching(/^q_/),
      type: 'short-text',
      label: '',
      validation: { required: false },
    })
  })
})

describe('review fixes', () => {
  it('keeps item defaults when ids are duplicated', () => {
    const state = initialCreatorState(
      {
        title: 'T',
        items: [
          { id: 'dup', type: 'rating', label: 'R', extra: 1 },
          { id: 'dup', type: 'linear-scale', label: 'S' },
        ],
      } as unknown as SurveyInput,
      text,
      ids
    )
    expect(state.survey.items[0]).toEqual({
      id: 'dup',
      type: 'rating',
      label: 'R',
      levels: 5,
      symbol: 'star',
    })
    expect(state.survey.items[1]).toMatchObject({
      type: 'linear-scale',
      min: 0,
      max: 10,
    })
  })

  it('drops "Other" when the new kind is a dropdown, which cannot edit it', () => {
    const single: SurveyQuestion = {
      id: 'q',
      type: 'single-choice',
      label: 'Q',
      options: [
        { value: 'a', label: 'a' },
        { value: 'other', label: 'その他', isOther: true },
      ],
    }
    expect(changeQuestionType(single, 'dropdown', 'x')).toMatchObject({
      options: [{ value: 'a', label: 'a' }],
    })
  })
})
