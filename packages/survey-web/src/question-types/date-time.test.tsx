import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type { DateQuestion, TimeQuestion } from '../schema/survey-schema'
import { DateRenderer } from './date'
import { TimeRenderer } from './time'

function DateHarness({
  question,
  initial,
}: {
  question: DateQuestion
  initial?: string
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <DateRenderer
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

function TimeHarness({
  question,
  initial,
}: {
  question: TimeQuestion
  initial?: SurveyAnswerValue
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <TimeRenderer
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

const dateQuestion: DateQuestion = {
  id: 'd',
  type: 'date',
  label: 'D',
  includeTime: false,
  includeYear: true,
}

describe('DateRenderer', () => {
  it('shows the placeholder, then a picked date, stored as ISO', async () => {
    render(
      <DateHarness
        question={dateQuestion}
        initial={new Date(2026, 9, 1).toISOString()}
      />
    )
    expect(
      screen.getByRole('button', { name: /2026年10月1日/ })
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /2026年10月1日/ }))
    await userEvent.click(await screen.findByRole('button', { name: /15/ }))
    // Like v0, the popover stays open after a pick; its modal hides the output.
    await userEvent.keyboard('{Escape}')

    const stored = JSON.parse(
      screen.getByRole('status').textContent ?? 'null'
    ) as string
    expect(new Date(stored).getDate()).toBe(15)
  })

  it('uses the no-year placeholder', () => {
    render(<DateHarness question={{ ...dateQuestion, includeYear: false }} />)
    expect(
      screen.getByRole('button', { name: /月日を選択してください/ })
    ).toBeInTheDocument()
  })

  it('sets the time of a date-time answer from the selects', async () => {
    render(
      <DateHarness
        question={{ ...dateQuestion, includeTime: true }}
        initial={new Date(2026, 9, 15, 0, 0).toISOString()}
      />
    )
    const [hour] = screen.getAllByRole('combobox')
    await userEvent.click(hour!)
    await userEvent.click(await screen.findByRole('option', { name: '09' }))

    const stored = JSON.parse(
      screen.getByRole('status').textContent ?? 'null'
    ) as string
    expect(new Date(stored).getHours()).toBe(9)
    expect(new Date(stored).getDate()).toBe(15)
  })
})

describe('TimeRenderer', () => {
  it('stores { hour, minute } like v0', async () => {
    render(
      <TimeHarness
        question={{ id: 't', type: 'time', label: 'T', answerType: 'time' }}
      />
    )
    const [hour, minute] = screen.getAllByRole('combobox')
    await userEvent.click(hour!)
    await userEvent.click(await screen.findByRole('option', { name: '07' }))
    await userEvent.click(minute!)
    await userEvent.click(await screen.findByRole('option', { name: '45' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      '{"hour":"07","minute":"45"}'
    )
  })

  it('shows a saved duration in its three selects', () => {
    render(
      <TimeHarness
        question={{ id: 't', type: 'time', label: 'T', answerType: 'duration' }}
        initial={{ hours: '01', minutes: '30', seconds: '00' }}
      />
    )
    const selects = screen.getAllByRole('combobox')
    expect(selects.map((select) => select.textContent)).toEqual([
      '01',
      '30',
      '00',
    ])
  })
})
