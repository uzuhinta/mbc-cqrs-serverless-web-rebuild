import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { SurveyCreator } from '../src/creator/survey-creator'
import type { Survey } from '../src/schema/survey-schema'

const everyType: Survey = {
  title: 'All types',
  items: [
    { id: 's1', type: 'section-header', title: 'One' },
    {
      id: 'a',
      type: 'short-text',
      label: 'Short',
      validation: { custom: { type: 'number', rule: 'between' } },
    },
    { id: 'b', type: 'long-text', label: 'Long' },
    {
      id: 'c',
      type: 'single-choice',
      label: 'Single',
      options: [
        { value: 'x', label: 'x', nextSectionId: 's2' },
        { value: 'other', label: 'Other', isOther: true },
      ],
    },
    {
      id: 'd',
      type: 'multiple-choice',
      label: 'Multiple',
      options: [{ value: 'x', label: 'x' }],
      validation: { custom: { rule: 'min', value: 1 } },
    },
    { id: 's2', type: 'section-header', title: 'Two', locked: true },
    {
      id: 'e',
      type: 'dropdown',
      label: 'Dropdown',
      options: [{ value: 'x', label: 'x' }],
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
    { id: 'i', type: 'time', label: 'Time', answerType: 'time', locked: true },
  ],
}

const run = async () => {
  const result = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`
  )
}

describe('SurveyCreator accessibility', () => {
  it('has no axe violations in view mode', async () => {
    render(<SurveyCreator defaultValue={everyType} />)
    expect(await run()).toEqual([])
  })

  it('has no axe violations with each editor open', async () => {
    render(<SurveyCreator defaultValue={everyType} />)
    for (const name of [
      'Short',
      'Single',
      'Multiple',
      'Scale',
      'Rating',
      'Date',
    ]) {
      await userEvent.click(screen.getByRole('button', { name }))
      expect(await run(), name).toEqual([])
    }
  })
})
