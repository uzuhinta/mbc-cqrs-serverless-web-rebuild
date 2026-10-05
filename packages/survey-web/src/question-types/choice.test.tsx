import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentType } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type { SurveyQuestion } from '../schema/survey-schema'
import { DropdownRenderer } from './dropdown'
import { MultipleChoiceRenderer } from './multiple-choice'
import { SingleChoiceRenderer } from './single-choice'
import type { QuestionRendererProps } from './types'

function Harness({
  Renderer,
  question,
  initial,
}: {
  Renderer: ComponentType<QuestionRendererProps<never>>
  question: SurveyQuestion
  initial?: SurveyAnswerValue
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <Renderer
        question={question as never}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

const options = [
  { value: 'bus', label: 'バス' },
  { value: 'car', label: '車' },
  { value: 'other', label: 'その他', isOther: true },
]

describe('SingleChoiceRenderer', () => {
  const question: SurveyQuestion = {
    id: 'route',
    type: 'single-choice',
    label: 'Route',
    options,
  }

  it('selects an option and writes "other:<text>"', async () => {
    render(
      <Harness Renderer={SingleChoiceRenderer as never} question={question} />
    )
    await userEvent.click(screen.getByRole('radio', { name: '車' }))
    expect(screen.getByRole('status')).toHaveTextContent('"car"')

    await userEvent.click(screen.getByRole('radio', { name: 'その他' }))
    expect(screen.getByRole('status')).toHaveTextContent('"other"')
    await userEvent.type(
      screen.getByPlaceholderText('その他の回答を入力...'),
      '徒歩'
    )
    expect(screen.getByRole('status')).toHaveTextContent('"other:徒歩"')
  })

  it('shows a v0 "other" answer in the text input', () => {
    render(
      <Harness
        Renderer={SingleChoiceRenderer as never}
        question={question}
        initial="other:自転車"
      />
    )
    expect(screen.getByRole('radio', { name: 'その他' })).toBeChecked()
    expect(screen.getByPlaceholderText('その他の回答を入力...')).toHaveValue(
      '自転車'
    )
  })

  it('keeps "other" last when shuffling', () => {
    const shuffled: SurveyQuestion = {
      ...question,
      validation: { shuffleOptions: true },
    } as SurveyQuestion
    render(
      <Harness Renderer={SingleChoiceRenderer as never} question={shuffled} />
    )
    const labels = screen
      .getAllByRole('radio')
      .map((radio) => radio.getAttribute('aria-label') ?? radio.id)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getAllByRole('radio').at(-1)).toBe(
      screen.getByRole('radio', { name: 'その他' })
    )
    expect(labels).toHaveLength(3)
  })
})

describe('MultipleChoiceRenderer', () => {
  const question: SurveyQuestion = {
    id: 'pick',
    type: 'multiple-choice',
    label: 'Pick',
    options,
  }

  it('toggles options and keeps "other" when a regular option is ticked', async () => {
    render(
      <Harness Renderer={MultipleChoiceRenderer as never} question={question} />
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'その他' }))
    await userEvent.type(
      screen.getByPlaceholderText('その他の回答を入力...'),
      'Walk'
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'バス' }))

    expect(screen.getByRole('status')).toHaveTextContent('["other:Walk","bus"]')

    await userEvent.click(screen.getByRole('checkbox', { name: 'その他' }))
    expect(screen.getByRole('status')).toHaveTextContent('["bus"]')
  })
})

describe('DropdownRenderer', () => {
  it('chooses an option from the list', async () => {
    const question: SurveyQuestion = {
      id: 'drop',
      type: 'dropdown',
      label: 'Drop',
      options: options.slice(0, 2),
    }
    render(<Harness Renderer={DropdownRenderer as never} question={question} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: '車' }))

    expect(screen.getByRole('status')).toHaveTextContent('"car"')
    expect(screen.getByRole('combobox')).toHaveTextContent('車')
  })
})
