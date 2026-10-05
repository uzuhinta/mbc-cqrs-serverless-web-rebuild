import { render } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { SurveyForm } from '../src/form/survey-form'
import type { Survey } from '../src/schema/survey-schema'

const everyType: Survey = {
  title: 'All types',
  items: [
    {
      id: 'a',
      type: 'short-text',
      label: 'Short',
      validation: { required: true },
    },
    { id: 'b', type: 'long-text', label: 'Long' },
    {
      id: 'c',
      type: 'single-choice',
      label: 'Single',
      options: [
        { value: 'x', label: 'X' },
        { value: 'other', label: 'Other', isOther: true },
      ],
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
      includeYear: true,
    },
    { id: 'i', type: 'time', label: 'Time', answerType: 'duration' },
  ],
}

describe('SurveyForm accessibility', () => {
  it('has no axe violations', async () => {
    render(<SurveyForm schema={everyType} onSubmit={() => {}} />)
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(
      result.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`
      )
    ).toEqual([])
  })
})
