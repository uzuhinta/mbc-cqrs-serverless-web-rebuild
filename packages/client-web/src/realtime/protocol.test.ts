import { describe, expect, it } from 'vitest'

import { MbcRealtimeError } from '../errors'
import {
  authHeader,
  CONNECTION_INIT,
  connectUrl,
  parseServerMessage,
  realtimeEndpoint,
  startMessage,
  stopMessage,
} from './protocol'

describe('realtimeEndpoint', () => {
  it('maps AppSync API hosts to the real-time host', () => {
    expect(
      realtimeEndpoint(
        'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql'
      )
    ).toEqual({
      url: 'wss://abc.appsync-realtime-api.ap-northeast-1.amazonaws.com/graphql',
      host: 'abc.appsync-api.ap-northeast-1.amazonaws.com',
    })
  })

  it('maps custom domains to /graphql/realtime and keeps the HTTP host', () => {
    expect(realtimeEndpoint('https://api.example.com/graphql')).toEqual({
      url: 'wss://api.example.com/graphql/realtime',
      host: 'api.example.com',
    })
  })
})

describe('authHeader', () => {
  it('builds API key and user pool headers', () => {
    expect(
      authHeader({ type: 'API_KEY', apiKey: 'k' }, 'h', undefined)
    ).toEqual({
      host: 'h',
      'x-api-key': 'k',
    })
    expect(authHeader({ type: 'USER_POOL' }, 'h', 'jwt')).toEqual({
      host: 'h',
      Authorization: 'jwt',
    })
  })

  it('needs a token for user pools', () => {
    expect(() => authHeader({ type: 'USER_POOL' }, 'h', undefined)).toThrow(
      MbcRealtimeError
    )
  })
})

describe('messages', () => {
  it('encodes the header into the connect URL', () => {
    const url = connectUrl('wss://x/graphql', { host: 'h', 'x-api-key': 'k' })
    const parsed = new URL(url)

    expect(parsed.searchParams.get('payload')).toBe('e30=')
    expect(JSON.parse(atob(parsed.searchParams.get('header') ?? ''))).toEqual({
      host: 'h',
      'x-api-key': 'k',
    })
  })

  it('builds start, stop and init messages', () => {
    const header = { host: 'h', 'x-api-key': 'k' }
    expect(
      startMessage(
        '1',
        { query: 'subscription S { s }', variables: { a: 1 } },
        header
      )
    ).toEqual({
      id: '1',
      type: 'start',
      payload: {
        data: '{"query":"subscription S { s }","variables":{"a":1}}',
        extensions: { authorization: header },
      },
    })
    expect(stopMessage('1')).toEqual({ id: '1', type: 'stop' })
    expect(CONNECTION_INIT).toEqual({ type: 'connection_init' })
  })

  it('parses server messages and ignores garbage', () => {
    expect(parseServerMessage('{"type":"ka"}')).toEqual({ type: 'ka' })
    expect(
      parseServerMessage(
        '{"type":"connection_ack","payload":{"connectionTimeoutMs":300000}}'
      )
    ).toEqual({
      type: 'connection_ack',
      payload: { connectionTimeoutMs: 300000 },
    })
    expect(parseServerMessage('not json')).toBeUndefined()
    expect(parseServerMessage('{"no":"type"}')).toBeUndefined()
  })
})
