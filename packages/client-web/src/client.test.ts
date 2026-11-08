import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { FakeWebSocket } from '../test/fake-websocket'
import { createMbcClient, type MbcClientConfig } from './client'
import { MbcRealtimeError } from './errors'

beforeEach(() => {
  FakeWebSocket.reset()
})

describe('createMbcClient', () => {
  it('exposes verbs that call the HTTP layer', async () => {
    const fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) =>
        new Response(
          JSON.stringify({ url: String(input), method: init?.method }),
          {
            headers: { 'content-type': 'application/json' },
          }
        )
    ) as unknown as typeof globalThis.fetch
    const client = createMbcClient({
      apiUrl: 'https://api',
      tenantCode: 't',
      fetch,
    })

    await expect(client.get('/a', { query: { page: 1 } })).resolves.toEqual({
      url: 'https://api/a?page=1',
      method: 'GET',
    })
    await expect(client.post('/b', { x: 1 })).resolves.toMatchObject({
      method: 'POST',
    })
    await expect(client.put('/c', {})).resolves.toMatchObject({ method: 'PUT' })
    await expect(client.patch('/d', {})).resolves.toMatchObject({
      method: 'PATCH',
    })
    await expect(client.delete('/e')).resolves.toMatchObject({
      method: 'DELETE',
    })
    expect(client.tenantCode()).toBe('t')
    expect(client.messages).toBeUndefined()
  })

  it('subscribes to parsed messages when real-time is configured', async () => {
    const client = createMbcClient({
      apiUrl: 'https://api',
      tenantCode: 't',
      realtime: {
        url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql',
        auth: { type: 'API_KEY', apiKey: 'k' },
        WebSocket: FakeWebSocket,
      },
    })
    const received: unknown[] = []
    client.messages?.subscribe({ tenantCode: 't', action: 'x' }, (message) =>
      received.push(message.content)
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    const socket = FakeWebSocket.latest()
    socket.accept()
    socket.receive({
      type: 'data',
      id: socket.starts()[0]?.id,
      payload: {
        data: { onMessage: { id: '1', tenantCode: 't', content: '{"a":1}' } },
      },
    })

    expect(received).toEqual([{ a: 1 }])
    client.close()
    expect(socket.closedWith?.code).toBe(1000)
  })
})

describe('createMbcClient with AppSync Events', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
  const EVENTS = {
    transport: 'events',
    url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/event',
    auth: { type: 'API_KEY', apiKey: 'k' },
    WebSocket: FakeWebSocket,
  } as const

  function json(body: unknown) {
    return vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          headers: { 'content-type': 'application/json' },
        })
    ) as unknown as typeof globalThis.fetch
  }

  it('events transport: messages.subscribe listens on the tenant channel', async () => {
    const client = createMbcClient({
      apiUrl: 'https://api',
      tenantCode: 't',
      realtime: { ...EVENTS, namespace: 'app' },
    })
    const received: unknown[] = []
    client.messages?.subscribe({ tenantCode: 't' }, (message) =>
      received.push(message)
    )
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()
    socket.ackSubscribes()
    const subscribe = socket.subscribes()[0]
    expect(subscribe?.channel).toBe('/app/t/*')
    socket.receive({
      type: 'data',
      id: subscribe?.id,
      event: JSON.stringify({ id: 'm', tenantCode: 't', content: '{"a":1}' }),
    })
    expect(received).toEqual([{ id: 'm', tenantCode: 't', content: { a: 1 } }])
    client.close()
  })

  it('events transport: command waits on command-status', async () => {
    const client = createMbcClient({
      apiUrl: 'https://api',
      tenantCode: 't',
      fetch: json({ requestId: 'r' }),
      realtime: EVENTS,
    })
    const pending = client.command({ method: 'POST', path: '/x' })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()
    socket.ackSubscribes()
    await flush()
    socket.receive({
      type: 'data',
      id: socket.subscribes()[0]?.id,
      event: JSON.stringify({
        id: 'r',
        tenantCode: 't',
        action: 'command-status',
        content: JSON.stringify({ status: 'finish:FINISHED' }),
      }),
    })
    await expect(pending).resolves.toMatchObject({ requestId: 'r' })
  })

  it('events with user-pool auth fails before sending', async () => {
    const fetch = json({ requestId: 'r' })
    const client = createMbcClient({
      apiUrl: 'https://api',
      tenantCode: 't',
      fetch,
      realtime: { ...EVENTS, auth: { type: 'USER_POOL' } as never },
    })
    await expect(
      client.command({ method: 'POST', path: '/x' })
    ).rejects.toBeInstanceOf(MbcRealtimeError)
    expect(fetch).not.toHaveBeenCalled()
    expect(FakeWebSocket.instances).toHaveLength(0)
  })

  it('graphql stays the default', async () => {
    const client = createMbcClient({
      apiUrl: 'https://api',
      tenantCode: 't',
      realtime: {
        url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql',
        auth: { type: 'API_KEY', apiKey: 'k' },
        WebSocket: FakeWebSocket,
      },
    })
    client.messages?.subscribe({ tenantCode: 't' }, () => {})
    await flush()
    expect(FakeWebSocket.latest().protocols).toEqual(['graphql-ws'])
    client.close()
  })

  it('types Events auth as API key only', () => {
    expectTypeOf<MbcClientConfig>().toMatchTypeOf<{ apiUrl: string }>()
    const config: MbcClientConfig = {
      apiUrl: 'https://api',
      tenantCode: 't',
      realtime: {
        transport: 'events',
        url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/event',
        // @ts-expect-error Events supports only API key auth
        auth: { type: 'USER_POOL' },
      },
    }
    expect(config.realtime?.url).toContain('/event')
  })
})
