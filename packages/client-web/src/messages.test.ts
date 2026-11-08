import { describe, expect, it } from 'vitest'

import { parseMessage, readMessage } from './messages'

describe('readMessage', () => {
  it('parses string content as JSON', () => {
    expect(
      readMessage({ id: '1', tenantCode: 't', content: '{"a":1}' })
    ).toEqual({ id: '1', tenantCode: 't', content: { a: 1 } })
  })

  it('needs a string id', () => {
    expect(readMessage({ id: 1 })).toBeUndefined()
  })

  it('needs an object', () => {
    expect(readMessage('x')).toBeUndefined()
  })
})

describe('parseMessage', () => {
  it('keeps content that is not JSON', () => {
    expect(
      parseMessage({ onMessage: { id: '1', tenantCode: 't', content: 'raw' } })
    ).toEqual({ id: '1', tenantCode: 't', content: 'raw' })
  })
})
