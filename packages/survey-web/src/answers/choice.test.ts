import { describe, expect, it } from 'vitest'

import { isOtherValue, OTHER_VALUE, otherText, toOtherValue } from './choice'

describe('"other" answer encoding (v0-compatible)', () => {
  it('recognises bare and filled "other" values', () => {
    expect(isOtherValue('other')).toBe(true)
    expect(isOtherValue('other:自転車')).toBe(true)
    expect(isOtherValue('others')).toBe(false)
    expect(isOtherValue('a')).toBe(false)
  })

  it('reads and writes the free text', () => {
    expect(otherText('other:自転車: 速い')).toBe('自転車: 速い')
    expect(otherText(OTHER_VALUE)).toBe('')
    expect(toOtherValue('  ')).toBe('other')
    expect(toOtherValue('徒歩')).toBe('other:徒歩')
  })
})
