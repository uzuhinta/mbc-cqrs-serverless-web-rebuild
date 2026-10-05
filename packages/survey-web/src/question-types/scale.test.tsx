import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type {
  LinearScaleQuestion,
  RatingQuestion,
} from '../schema/survey-schema'
import { LinearScaleRenderer } from './linear-scale'
import { RatingRenderer } from './rating'

function Scale({
  question,
  initial,
}: {
  question: LinearScaleQuestion
  initial?: number
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <LinearScaleRenderer
        question={question}
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

function Rating({
  question,
  initial,
}: {
  question: RatingQuestion
  initial?: number
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <RatingRenderer
        question={question}
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

describe('LinearScaleRenderer', () => {
  it('offers min..max including 0 and stores a number', async () => {
    render(
      <Scale
        question={{
          id: 's',
          type: 'linear-scale',
          label: 'S',
          min: 0,
          max: 3,
          minLabel: '低',
          maxLabel: '高',
        }}
      />
    )
    expect(
      screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))
    ).toEqual(['0', '1', '2', '3'])
    expect(screen.getByText('低')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: '0' }))
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })

  it('moves with arrow keys', async () => {
    render(
      <Scale
        question={{ id: 's', type: 'linear-scale', label: 'S', min: 1, max: 3 }}
        initial={1}
      />
    )
    screen.getByRole('radio', { name: '1' }).focus()
    await userEvent.keyboard('{ArrowRight>}')
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })
})

describe('RatingRenderer', () => {
  const question: RatingQuestion = {
    id: 'r',
    type: 'rating',
    label: 'R',
    levels: 5,
    symbol: 'heart',
  }

  it('is a radio group named per level, storing a number', async () => {
    render(<Rating question={question} />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    await userEvent.click(screen.getByRole('radio', { name: '5段階中4' }))
    expect(screen.getByRole('status')).toHaveTextContent('4')
  })

  it('fills icons up to the selected value', () => {
    const { container } = render(<Rating question={question} initial={2} />)
    const icons = container.querySelectorAll('svg')
    expect(icons[1]).toHaveClass('mbc:fill-red-500')
    expect(icons[2]).toHaveClass('mbc:text-muted-foreground')
  })

  it('is operable from the keyboard', async () => {
    render(<Rating question={question} initial={1} />)
    screen.getByRole('radio', { name: '5段階中1' }).focus()
    await userEvent.keyboard('{ArrowRight>}')
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })
})
