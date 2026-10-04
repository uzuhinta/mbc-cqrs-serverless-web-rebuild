import { describe, expect, it } from 'vitest'

import { mergeMessages } from './merge'

describe('mergeMessages', () => {
  const base = {
    close: 'Close',
    pagination: { next: 'Next', previous: 'Previous' },
  }

  it('replaces only the overridden leaves', () => {
    expect(mergeMessages(base, { pagination: { next: 'Weiter' } })).toEqual({
      close: 'Close',
      pagination: { next: 'Weiter', previous: 'Previous' },
    })
  })

  it('ignores undefined override values', () => {
    expect(mergeMessages(base, { close: undefined })).toEqual(base)
  })

  it('returns the base when there is no override', () => {
    expect(mergeMessages(base, undefined)).toBe(base)
  })

  it('does not mutate the base', () => {
    mergeMessages(base, { pagination: { next: 'Weiter' } })
    expect(base.pagination.next).toBe('Next')
  })

  it('replaces function messages', () => {
    const merged = mergeMessages(
      { page: (p: { page: number }) => `Page ${p.page}` },
      { page: (p: { page: number }) => `S. ${p.page}` }
    )
    expect(merged.page({ page: 2 })).toBe('S. 2')
  })
})
