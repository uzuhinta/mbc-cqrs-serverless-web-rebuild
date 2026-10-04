import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeWebSocket } from '../test/fake-websocket'
import { createMbcClient } from './client'

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
