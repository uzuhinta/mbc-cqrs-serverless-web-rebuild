import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_SIZE,
  dataCodeOf,
  dateParts,
  initialDataListState,
  initialSettingListState,
} from './list'

describe('list state', () => {
  it('starts on page 1 with v0’s 20 rows and empty filters', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20)
    expect(initialSettingListState()).toEqual({
      page: 1,
      pageSize: 20,
      code: '',
      name: '',
      keyword: '',
    })
    expect(initialDataListState()).toEqual({
      page: 1,
      pageSize: 20,
      code: '',
      keyword: '',
      isDeleted: false,
    })
    expect(initialSettingListState()).not.toBe(initialSettingListState())
  })
})

describe('dateParts', () => {
  it('reads the calendar date as written, whatever the time and offset', () => {
    expect(dateParts('2026-10-07T23:30:00-05:00')).toEqual({
      year: '2026',
      month: '10',
      day: '07',
    })
    expect(dateParts('2026-01-02')).toEqual({
      year: '2026',
      month: '01',
      day: '02',
    })
  })

  it('returns undefined for anything that is not a dated string', () => {
    expect(dateParts('soon')).toBeUndefined()
    expect(dateParts(20261007)).toBeUndefined()
    expect(dateParts(undefined)).toBeUndefined()
  })
})

describe('dataCodeOf', () => {
  it('prefers the list row’s masterCode (v0), then its code', () => {
    const row = { id: 'i', pk: 'p', sk: 's', name: 'n' }
    expect(dataCodeOf({ ...row, masterCode: 'P-1', code: 'X#P-1' })).toBe('P-1')
    expect(dataCodeOf({ ...row, code: 'P-2' })).toBe('P-2')
    expect(dataCodeOf(row)).toBe('')
  })
})
