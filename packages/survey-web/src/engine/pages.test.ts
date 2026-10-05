import { describe, expect, it } from 'vitest'

import type { Survey } from '../schema/survey-schema'
import { buildPages, START_SECTION_ID } from './pages'

describe('buildPages', () => {
  it('groups questions under their section headers', () => {
    const survey: Survey = {
      title: 'S',
      items: [
        {
          id: 'a',
          type: 'section-header',
          title: 'A',
          action: { type: 'submit' },
        },
        { id: 'q1', type: 'short-text', label: 'Q1' },
        { id: 'b', type: 'section-header', title: 'B', description: 'd' },
        { id: 'q2', type: 'long-text', label: 'Q2' },
      ],
    }
    const pages = buildPages(survey)

    expect(
      pages.map((page) => [page.id, page.questions.map((q) => q.id)])
    ).toEqual([
      ['a', ['q1']],
      ['b', ['q2']],
    ])
    expect(pages[0]?.action).toEqual({ type: 'submit' })
    expect(pages[1]?.description).toBe('d')
  })

  it('adds a start page when the survey does not open with a header', () => {
    const pages = buildPages({
      title: 'Title',
      description: 'Intro',
      items: [{ id: 'q1', type: 'short-text', label: 'Q1' }],
    })
    expect(pages).toEqual([
      {
        id: START_SECTION_ID,
        title: 'Title',
        description: 'Intro',
        questions: [{ id: 'q1', type: 'short-text', label: 'Q1' }],
      },
    ])
  })

  it('returns no pages for an empty survey', () => {
    expect(buildPages({ title: 'Empty', items: [] })).toEqual([])
  })
})
