import { describe, expect, it } from 'vitest'

import { LOCKED_SECOND, LOCKS } from '../../../test/fixtures/creator-surveys'
import { canDelete, canDrag, canDuplicate, canEdit, canMerge } from './locks'

const items = LOCKS.items

describe('lock rules (v0)', () => {
  it('locked items are not editable; unlocked questions in a locked section are', () => {
    expect(canEdit(items, 0)).toBe(false)
    expect(canEdit(items, 1)).toBe(true)
    expect(canEdit(items, 4)).toBe(false)
    expect(canEdit(items, 99)).toBe(false)
  })

  it('deletes neither locked items, sections holding a locked question, nor the last section', () => {
    expect(canDelete(items, 4)).toBe(false)
    expect(canDelete(items, 0)).toBe(false)
    expect(canDelete(items, 2)).toBe(false)
    expect(canDelete(items, 5)).toBe(true)
    expect(canDelete(items, 3)).toBe(true)
    expect(
      canDelete([{ id: 's', type: 'section-header', title: 'Only' }], 0)
    ).toBe(false)
  })

  it('duplicates sections (as unlocked copies) but adds nothing into a locked section', () => {
    expect(canDuplicate(items, 0)).toBe(true)
    expect(canDuplicate(items, 1)).toBe(false)
    expect(canDuplicate(items, 3)).toBe(true)
    expect(canDuplicate(items, 4)).toBe(false)
  })

  it('drags only unlocked questions outside locked sections', () => {
    expect(canDrag(items, 1)).toBe(false)
    expect(canDrag(items, 2)).toBe(false)
    expect(canDrag(items, 3)).toBe(true)
    expect(canDrag(items, 4)).toBe(false)
  })

  it('merges neither the first section, a locked one, nor into a locked one', () => {
    expect(canMerge(items, 0)).toBe(false)
    expect(canMerge(items, 2)).toBe(false)
    expect(canMerge(items, 5)).toBe(true)
    expect(canMerge(items, 3)).toBe(false)
    expect(canMerge(LOCKED_SECOND.items, 2)).toBe(false)
    expect(canMerge(LOCKED_SECOND.items, 4)).toBe(false)
  })
})
