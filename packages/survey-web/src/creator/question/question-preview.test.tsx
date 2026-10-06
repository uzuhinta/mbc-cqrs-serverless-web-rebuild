import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { classesOf, v0c } from '../../../test/v0-creator-classes'
import type { SurveyQuestion } from '../../schema/survey-schema'
import { QuestionPreview } from './question-preview'

const preview = (question: SurveyQuestion) =>
  render(<QuestionPreview question={question} />)

const options = ['A', 'B', 'C', 'D', 'E'].map((label) => ({
  value: label,
  label,
}))

describe('QuestionPreview', () => {
  it('shows the short and long answer placeholders', () => {
    preview({ id: 'q', type: 'short-text', label: 'Q' })
    expect(classesOf(screen.getByText('短文回答'))).toEqual(
      v0c('preview.short')
    )
    preview({ id: 'q', type: 'long-text', label: 'Q' })
    expect(classesOf(screen.getByText('長文回答 (段落)'))).toEqual(
      v0c('preview.long')
    )
  })

  it('lists three choices, the rest as a count, and "Other" last', () => {
    preview({
      id: 'q',
      type: 'single-choice',
      label: 'Q',
      options: [...options, { value: 'other', label: 'その他', isOther: true }],
      validation: { shuffleOptions: true },
    })
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.queryByText('D')).toBeNull()
    expect(
      screen.getByText('+2 個の追加オプション (シャッフル)')
    ).toBeInTheDocument()
    const row = screen.getByText('その他').parentElement
    expect(classesOf(row)).toEqual(v0c('preview.row'))
    expect(classesOf(row?.firstElementChild ?? null)).toEqual(
      v0c('preview.radio')
    )
  })

  it('draws checkbox squares for multiple choice and numbers for dropdowns', () => {
    preview({
      id: 'q',
      type: 'multiple-choice',
      label: 'Q',
      options: options.slice(0, 1),
    })
    expect(classesOf(screen.getByText('A').previousElementSibling)).toEqual(
      v0c('preview.checkbox')
    )
    preview({ id: 'q2', type: 'dropdown', label: 'Q', options })
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('+2 個の追加オプション')).toBeInTheDocument()
  })

  it('shows the scale, rating, date and time shapes', () => {
    const { container } = preview({
      id: 'q',
      type: 'linear-scale',
      label: 'Q',
      min: 0,
      max: 3,
      minLabel: '低',
      maxLabel: '高',
    })
    expect(screen.getByText('低')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    container.remove()

    const rating = preview({
      id: 'q',
      type: 'rating',
      label: 'Q',
      levels: 4,
      symbol: 'heart',
    })
    expect(rating.container.querySelectorAll('svg')).toHaveLength(4)
    rating.container.remove()

    preview({
      id: 'q',
      type: 'date',
      label: 'Q',
      includeTime: true,
      includeYear: false,
    })
    expect(screen.getByText('年月')).toBeInTheDocument()
    expect(screen.getByText('時間')).toBeInTheDocument()

    preview({ id: 'q', type: 'time', label: 'Q', answerType: 'duration' })
    expect(screen.getByText('期間')).toBeInTheDocument()
  })

  it('contains nothing focusable', () => {
    const { container } = preview({
      id: 'q',
      type: 'date',
      label: 'Q',
      includeTime: true,
      includeYear: true,
    })
    expect(
      container.querySelectorAll('input, button, select, textarea, [tabindex]')
    ).toHaveLength(0)
  })
})
