import { describe, expect, it } from 'vitest'

import { LOCKS } from '../../../test/fixtures/creator-surveys'
import {
  headerIndexOf,
  isInLockedSection,
  questionInsertIndex,
  sectionEndOf,
  sectionHeaders,
  sectionInsertIndex,
} from './items'

const items = LOCKS.items

describe('section helpers', () => {
  it('finds the header and the end of an item’s section', () => {
    expect(headerIndexOf(items, 1)).toBe(0)
    expect(headerIndexOf(items, 2)).toBe(2)
    expect(headerIndexOf(items, 4)).toBe(2)
    expect(headerIndexOf([{ id: 'q', type: 'short-text', label: '' }], 0)).toBe(
      -1
    )
    expect(sectionEndOf(items, 0)).toBe(2)
    expect(sectionEndOf(items, 3)).toBe(5)
    expect(sectionEndOf(items, 6)).toBe(7)
  })

  it('knows which items sit in a locked section', () => {
    expect(isInLockedSection(items, 0)).toBe(true)
    expect(isInLockedSection(items, 1)).toBe(true)
    expect(isInLockedSection(items, 3)).toBe(false)
    expect(isInLockedSection(items, -1)).toBe(false)
    expect(sectionHeaders(items).map((s) => s.id)).toEqual([
      'sec_locked',
      'sec_open',
      'sec_last',
    ])
  })

  it('places a new question after the selection, never into a locked section', () => {
    expect(questionInsertIndex(items, 3)).toBe(4)
    expect(questionInsertIndex(items, 0)).toBeNull()
    expect(questionInsertIndex(items, 1)).toBeNull()
    expect(questionInsertIndex(items, -1)).toBe(7)
    const lastLocked = [
      ...items,
      {
        id: 'sec_z',
        type: 'section-header' as const,
        title: 'Z',
        locked: true,
      },
    ]
    expect(questionInsertIndex(lastLocked, -1)).toBeNull()
  })

  it('places a new section after the selection, or after a locked section', () => {
    expect(sectionInsertIndex(items, 3)).toBe(4)
    expect(sectionInsertIndex(items, 0)).toBe(2)
    expect(sectionInsertIndex(items, 1)).toBe(2)
    expect(sectionInsertIndex(items, -1)).toBe(7)
  })
})
