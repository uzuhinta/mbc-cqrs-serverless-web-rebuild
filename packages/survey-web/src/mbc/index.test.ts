import * as client from '@mbc-cqrs-serverless/client-web'
import * as react from '@mbc-cqrs-serverless/client-web/react'
import { describe, expect, it } from 'vitest'

import * as mbc from './index'

describe('/mbc re-exports what its examples need from client-web', () => {
  it('is the same client, provider and errors (one copy, one context)', () => {
    expect(mbc.createMbcClient).toBe(client.createMbcClient)
    expect(mbc.MbcClientProvider).toBe(react.MbcClientProvider)
    expect(mbc.useMbcClient).toBe(react.useMbcClient)
    expect(mbc.useCommand).toBe(react.useCommand)
    for (const name of [
      'MbcError',
      'MbcApiError',
      'MbcAbortError',
      'MbcCommandError',
      'MbcRealtimeError',
      'MbcTimeoutError',
    ] as const) {
      expect(mbc[name], name).toBe(client[name])
    }
  })
})
