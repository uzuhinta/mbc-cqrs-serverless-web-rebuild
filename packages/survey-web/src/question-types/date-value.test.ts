import { describe, expect, it } from 'vitest'

import { formatDate, readDate, writeDate } from './date-value'

describe('date values (v0-compatible ISO strings)', () => {
  const today = new Date(2026, 9, 4)

  it('round-trips a full date', () => {
    const date = new Date(2026, 9, 15, 9, 30)
    expect(readDate(writeDate(date, true), true, today)?.getTime()).toBe(
      date.getTime()
    )
  })

  it('writes year 0 without a year and reads it into the current year', () => {
    const written = writeDate(new Date(2026, 9, 15), false)
    expect(new Date(written).getFullYear()).toBe(0)
    const read = readDate(written, false, today)
    expect([read?.getFullYear(), read?.getMonth(), read?.getDate()]).toEqual([
      2026, 9, 15,
    ])
  })

  it('ignores the year v0 wrote (2000) for no-year date-time answers', () => {
    const v0 = new Date(2000, 2, 3, 8, 15).toISOString()
    const read = readDate(v0, false, today)
    expect([
      read?.getFullYear(),
      read?.getMonth(),
      read?.getDate(),
      read?.getHours(),
    ]).toEqual([2026, 2, 3, 8])
  })

  it('keeps a no-year Feb 29 answer in a non-leap current year', () => {
    const stored = writeDate(new Date(2024, 1, 29, 9, 0), false)
    const read = readDate(stored, false, today)
    expect([read?.getMonth(), read?.getDate(), read?.getHours()]).toEqual([
      1, 29, 9,
    ])
  })

  it('returns null for empty or invalid values', () => {
    expect(readDate(undefined, true, today)).toBeNull()
    expect(readDate('not a date', true, today)).toBeNull()
    expect(readDate(42, true, today)).toBeNull()
  })

  it('formats like v0 in Japanese and naturally in English', () => {
    const date = new Date(2026, 9, 15)
    expect(formatDate(date, true, 'ja')).toBe('2026年10月15日')
    expect(formatDate(date, false, 'ja')).toBe('10月15日')
    expect(formatDate(date, true, 'en')).toBe('October 15, 2026')
  })
})
