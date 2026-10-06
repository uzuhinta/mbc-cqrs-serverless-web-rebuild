// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SurveyForm } from '../src/form/survey-form'
import type { Survey } from '../src/schema/survey-schema'

const everyType: Survey = {
  title: 'All types',
  items: [
    { id: 'a', type: 'short-text', label: 'Short' },
    { id: 'b', type: 'long-text', label: 'Long' },
    {
      id: 'c',
      type: 'single-choice',
      label: 'Single',
      options: [
        { value: 'x', label: 'X' },
        { value: 'other', label: 'Other', isOther: true },
      ],
      validation: { shuffleOptions: true },
    },
    {
      id: 'd',
      type: 'multiple-choice',
      label: 'Multiple',
      options: [{ value: 'x', label: 'X' }],
    },
    {
      id: 'e',
      type: 'dropdown',
      label: 'Dropdown',
      options: [{ value: 'x', label: 'X' }],
    },
    { id: 'f', type: 'linear-scale', label: 'Scale', min: 1, max: 5 },
    { id: 'g', type: 'rating', label: 'Rating', levels: 5, symbol: 'star' },
    {
      id: 'h',
      type: 'date',
      label: 'Date',
      includeTime: true,
      includeYear: false,
    },
    { id: 'i', type: 'time', label: 'Time', answerType: 'duration' },
  ],
}

describe('server rendering without a DOM', () => {
  it('renders every question kind without touching window or document', () => {
    expect(typeof window).toBe('undefined')
    const html = renderToString(
      <SurveyForm
        schema={everyType}
        defaultValues={{
          h: '0000-10-04T00:00:00.000Z',
          i: { hours: '01', minutes: '30', seconds: '00' },
        }}
        onSubmit={() => {}}
      />
    )
    expect(html).toContain('All types')
  })
})
