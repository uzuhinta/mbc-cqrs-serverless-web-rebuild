import { describe, expect, it } from 'vitest'

import type { Survey } from '../schema/survey-schema'
import { resolveNext, resolvePath } from './navigation'
import { buildPages } from './pages'

const survey: Survey = {
  title: 'Branching',
  items: [
    { id: 'start', type: 'section-header', title: 'Start' },
    {
      id: 'route',
      type: 'single-choice',
      label: 'Route',
      options: [
        { value: 'car', label: 'Car', nextSectionId: 'car' },
        { value: 'walk', label: 'Walk', nextSectionId: 'walk' },
        { value: 'ghost', label: 'Ghost', nextSectionId: 'nowhere' },
        { value: 'plain', label: 'Plain' },
      ],
    },
    {
      id: 'car',
      type: 'section-header',
      title: 'Car',
      action: { type: 'jump', targetSectionId: 'end' },
    },
    { id: 'q_car', type: 'short-text', label: 'Model' },
    {
      id: 'walk',
      type: 'section-header',
      title: 'Walk',
      action: { type: 'submit' },
    },
    { id: 'q_walk', type: 'short-text', label: 'Steps' },
    { id: 'end', type: 'section-header', title: 'End' },
    { id: 'q_end', type: 'short-text', label: 'Thanks' },
  ],
}
const pages = buildPages(survey)
const page = (id: string) => {
  const found = pages.find((p) => p.id === id)
  if (!found) throw new Error(id)
  return found
}

describe('resolveNext', () => {
  it('follows the chosen option', () => {
    expect(resolveNext(page('start'), { route: 'car' }, pages)).toBe('car')
    expect(resolveNext(page('start'), { route: 'walk' }, pages)).toBe('walk')
  })

  it('falls back to the next section for a missing target or no target', () => {
    expect(resolveNext(page('start'), { route: 'ghost' }, pages)).toBe('car')
    expect(resolveNext(page('start'), { route: 'plain' }, pages)).toBe('car')
    expect(resolveNext(page('start'), {}, pages)).toBe('car')
  })

  it('lets the section action win over options', () => {
    expect(resolveNext(page('car'), {}, pages)).toBe('end')
    expect(resolveNext(page('walk'), {}, pages)).toBeNull()
  })

  it('submits after the last section', () => {
    expect(resolveNext(page('end'), {}, pages)).toBeNull()
  })

  it('treats a jump to a missing section like no action', () => {
    const broken = buildPages({
      title: 'B',
      items: [
        {
          id: 'a',
          type: 'section-header',
          title: 'A',
          action: { type: 'jump', targetSectionId: 'x' },
        },
        { id: 'b', type: 'section-header', title: 'B' },
      ],
    })
    expect(resolveNext(broken[0]!, {}, broken)).toBe('b')
  })
})

describe('resolvePath', () => {
  it('lists the sections a set of answers visits', () => {
    expect(resolvePath(pages, { route: 'car' })).toEqual([
      'start',
      'car',
      'end',
    ])
    expect(resolvePath(pages, { route: 'walk' })).toEqual(['start', 'walk'])
  })

  it('stops at a cycle', () => {
    const loop = buildPages({
      title: 'Loop',
      items: [
        {
          id: 'a',
          type: 'section-header',
          title: 'A',
          action: { type: 'jump', targetSectionId: 'b' },
        },
        {
          id: 'b',
          type: 'section-header',
          title: 'B',
          action: { type: 'jump', targetSectionId: 'a' },
        },
      ],
    })
    expect(resolvePath(loop, {})).toEqual(['a', 'b'])
  })

  it('is empty for a survey without pages', () => {
    expect(resolvePath([], {})).toEqual([])
  })
})
