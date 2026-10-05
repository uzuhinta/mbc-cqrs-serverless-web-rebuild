import { describe, expect, it } from 'vitest'

import { collectAnswers } from './collect'
import { buildPages } from './pages'

const pages = buildPages({
  title: 'S',
  items: [
    { id: 'a', type: 'section-header', title: 'A' },
    { id: 'q1', type: 'short-text', label: 'Name' },
    { id: 'b', type: 'section-header', title: 'B' },
    { id: 'q2', type: 'time', label: 'When', answerType: 'time' },
    { id: 'c', type: 'section-header', title: 'C' },
    {
      id: 'q3',
      type: 'multiple-choice',
      label: 'Pick',
      options: [{ value: 'other', label: 'O' }],
    },
  ],
})

describe('collectAnswers', () => {
  it('keeps answers on the path and clears abandoned sections', () => {
    const { answers, meta } = collectAnswers(pages, ['a', 'c'], {
      q1: 'Ann',
      q2: { hour: '09', minute: '30' },
      q3: ['other:Bike'],
      removed: 'gone',
    })

    expect(answers).toEqual({ q1: 'Ann', q2: undefined, q3: ['other:Bike'] })
    expect(Object.keys(answers)).toEqual(['q1', 'q2', 'q3'])
    expect(meta).toEqual([
      { id: 'q1', label: 'Name', type: 'short-text', value: 'Ann' },
      { id: 'q2', label: 'When', type: 'time', value: undefined },
      {
        id: 'q3',
        label: 'Pick',
        type: 'multiple-choice',
        value: ['other:Bike'],
      },
    ])
  })
})
