import { describe, expect, it } from 'vitest'

import type { MbcMessage } from '../messages'
import { eventsChannel, matchesFilter, sanitizeSegment } from './channel'

describe('sanitizeSegment', () => {
  it.each([
    [undefined, 'none'],
    ['', 'none'],
    ['default', 'default'],
    ['MBC', 'MBC'],
    ['my_tenant', 'my-tenant'],
    ['MASTER#mbc#PRODUCT', 'MASTER-mbc-PRODUCT'],
    ['#a@', 'a'],
    ['---', 'none'],
    // Truncated to 50 before trimming, as the backend does.
    ['a'.repeat(49) + '#b', 'a'.repeat(49)],
    ['#' + 'a'.repeat(60), 'a'.repeat(49)],
    ['x'.repeat(60), 'x'.repeat(50)],
  ])('%j → %j', (value, expected) => {
    expect(sanitizeSegment(value)).toBe(expected)
  })
})

describe('eventsChannel', () => {
  it('subscribes the whole tenant without an action', () => {
    expect(eventsChannel('default', { tenantCode: 'MBC' })).toBe(
      '/default/MBC/*'
    )
  })

  it('narrows to an action', () => {
    expect(
      eventsChannel('default', { tenantCode: 'MBC', action: 'command-status' })
    ).toBe('/default/MBC/command-status/*')
  })

  it('names one item with an action and an id', () => {
    expect(
      eventsChannel('default', {
        tenantCode: 'MBC',
        action: 'command-status',
        id: 'MASTER#MBC#X@1',
      })
    ).toBe('/default/MBC/command-status/MASTER-MBC-X-1')
  })

  it('ignores an id without an action', () => {
    expect(eventsChannel('default', { tenantCode: 'MBC', id: 'x' })).toBe(
      '/default/MBC/*'
    )
  })

  it('sanitizes the namespace too', () => {
    expect(eventsChannel('my_ns', { tenantCode: 't' })).toBe('/my-ns/t/*')
  })
})

describe('matchesFilter', () => {
  const message: MbcMessage = {
    id: 'a-b',
    tenantCode: 'MBC',
    action: 'y',
    content: null,
  }

  it('accepts the same tenant', () => {
    expect(matchesFilter(message, { tenantCode: 'MBC' })).toBe(true)
  })

  it('compares the tenant exactly', () => {
    expect(
      matchesFilter({ ...message, tenantCode: 'mbc' }, { tenantCode: 'MBC' })
    ).toBe(false)
  })

  it('compares the id exactly', () => {
    expect(
      matchesFilter(message, { tenantCode: 'MBC', action: 'y', id: 'a_b' })
    ).toBe(false)
  })

  it('compares the action exactly', () => {
    expect(matchesFilter(message, { tenantCode: 'MBC', action: 'x' })).toBe(
      false
    )
  })

  it('accepts any action when the filter has none', () => {
    expect(matchesFilter(message, { tenantCode: 'MBC' })).toBe(true)
  })
})
