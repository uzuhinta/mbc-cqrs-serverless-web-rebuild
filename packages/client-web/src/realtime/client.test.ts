import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeWebSocket } from '../../test/fake-websocket'
import { MbcRealtimeError } from '../errors'
import { createRealtimeClient } from './client'

const OPERATION = {
  query: 'subscription S { s }',
  variables: { tenantCode: 't' },
}

function client(
  overrides: Partial<Parameters<typeof createRealtimeClient>[0]> = {}
) {
  return createRealtimeClient({
    url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql',
    auth: { type: 'API_KEY', apiKey: 'key' },
    WebSocket: FakeWebSocket,
    random: () => 0,
    ...overrides,
  })
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  FakeWebSocket.reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createRealtimeClient', () => {
  it('opens one socket lazily with the graphql-ws protocol and auth header', async () => {
    const realtime = client()
    expect(FakeWebSocket.instances).toHaveLength(0)

    realtime.subscribe(OPERATION, { next: () => {} })
    await flush()
    const socket = FakeWebSocket.latest()

    expect(socket.protocols).toEqual(['graphql-ws'])
    expect(socket.url).toMatch(
      /^wss:\/\/abc\.appsync-realtime-api\.ap-northeast-1\.amazonaws\.com\/graphql\?header=/
    )
    socket.open()
    expect(socket.sent).toEqual([{ type: 'connection_init' }])
  })

  it('sends start after the ack, resolves ready on start_ack, delivers data', async () => {
    const realtime = client()
    const received: unknown[] = []
    const subscription = realtime.subscribe(OPERATION, {
      next: (data) => received.push(data),
    })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.accept()

    const [start] = socket.starts()
    expect(start?.payload?.data).toBe(JSON.stringify(OPERATION))
    socket.ackAll()
    await expect(subscription.ready).resolves.toBeUndefined()

    socket.receive({ type: 'data', id: start?.id, payload: { data: { s: 1 } } })
    expect(received).toEqual([{ s: 1 }])
  })

  it('multiplexes subscriptions on one socket and routes data by id', async () => {
    const realtime = client()
    const a: unknown[] = []
    const b: unknown[] = []
    realtime.subscribe(OPERATION, { next: (data) => a.push(data) })
    realtime.subscribe(OPERATION, { next: (data) => b.push(data) })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.accept()
    const [first, second] = socket.starts()

    socket.receive({ type: 'data', id: second?.id, payload: { data: 'to-b' } })
    socket.receive({ type: 'data', id: first?.id, payload: { data: 'to-a' } })

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect([a, b]).toEqual([['to-a'], ['to-b']])
  })

  it('stops a subscription and closes the socket after the last one', async () => {
    const realtime = client()
    const one = realtime.subscribe(OPERATION, { next: () => {} })
    const two = realtime.subscribe(OPERATION, { next: () => {} })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.accept()
    const [first] = socket.starts()

    one.unsubscribe()
    expect(socket.sent.at(-1)).toEqual({ id: first?.id, type: 'stop' })
    expect(socket.closedWith).toBeUndefined()

    two.unsubscribe()
    expect(socket.closedWith?.code).toBe(1000)
  })

  it('fails one subscription on its error message', async () => {
    const realtime = client()
    const errors: MbcRealtimeError[] = []
    const failing = realtime.subscribe(OPERATION, {
      next: () => {},
      error: (e) => errors.push(e),
    })
    const healthy = realtime.subscribe(OPERATION, { next: () => {} })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.accept()
    const [first, second] = socket.starts()

    socket.receive({
      type: 'error',
      id: first?.id,
      payload: { errors: [{ errorType: 'Unauthorized' }] },
    })
    socket.receive({ type: 'start_ack', id: second?.id })

    await expect(failing.ready).rejects.toBeInstanceOf(MbcRealtimeError)
    expect(errors[0]?.errors).toEqual([{ errorType: 'Unauthorized' }])
    await expect(healthy.ready).resolves.toBeUndefined()
  })

  it('fails everything on connection_error and does not reconnect', async () => {
    vi.useFakeTimers()
    const realtime = client()
    const subscription = realtime.subscribe(OPERATION, { next: () => {} })
    const rejection = expect(subscription.ready).rejects.toBeInstanceOf(
      MbcRealtimeError
    )
    await vi.advanceTimersByTimeAsync(0)
    const socket = FakeWebSocket.latest()
    socket.open()
    socket.receive({
      type: 'connection_error',
      payload: { errors: [{ errorType: 'BadKey' }] },
    })

    await rejection
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('reconnects after a drop and re-subscribes live subscriptions', async () => {
    vi.useFakeTimers()
    const realtime = client({ reconnect: { initialDelayMs: 1000 } })
    const received: unknown[] = []
    realtime.subscribe(OPERATION, { next: (data) => received.push(data) })
    await vi.advanceTimersByTimeAsync(0)
    FakeWebSocket.latest().accept()

    FakeWebSocket.latest().drop()
    await vi.advanceTimersByTimeAsync(499)
    expect(FakeWebSocket.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeWebSocket.instances).toHaveLength(2)

    const second = FakeWebSocket.latest()
    second.accept()
    const [restart] = second.starts()
    expect(restart?.payload?.data).toBe(JSON.stringify(OPERATION))
    second.receive({
      type: 'data',
      id: restart?.id,
      payload: { data: 'after' },
    })
    expect(received).toEqual(['after'])
  })

  it('reconnects when keep-alives stop, and keep-alives postpone it', async () => {
    vi.useFakeTimers()
    const realtime = client()
    realtime.subscribe(OPERATION, { next: () => {} })
    await vi.advanceTimersByTimeAsync(0)
    const socket = FakeWebSocket.latest()
    socket.accept(10_000)

    await vi.advanceTimersByTimeAsync(9_000)
    socket.receive({ type: 'ka' })
    await vi.advanceTimersByTimeAsync(9_000)
    expect(socket.closedWith).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1_001)
    expect(socket.closedWith?.code).toBe(4000)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('does not reconnect after the last subscription ends', async () => {
    vi.useFakeTimers()
    const realtime = client()
    const subscription = realtime.subscribe(OPERATION, { next: () => {} })
    await vi.advanceTimersByTimeAsync(0)
    FakeWebSocket.latest().accept()

    subscription.unsubscribe()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('uses the user-pool token in the connect header and start auth', async () => {
    const realtime = client({
      auth: { type: 'USER_POOL' },
      getAuthToken: async () => 'jwt-1',
    })
    realtime.subscribe(OPERATION, { next: () => {} })
    await flush()
    const socket = FakeWebSocket.latest()
    const header = JSON.parse(
      atob(
        decodeURIComponent(new URL(socket.url).searchParams.get('header') ?? '')
      )
    ) as Record<string, string>
    socket.accept()

    expect(header.Authorization).toBe('jwt-1')
    expect(socket.starts()[0]?.payload).toMatchObject({
      extensions: { authorization: { Authorization: 'jwt-1' } },
    })
  })

  it('fails subscriptions when the user-pool token cannot be read', async () => {
    const realtime = client({
      auth: { type: 'USER_POOL' },
      getAuthToken: () => Promise.reject(new Error('expired')),
    })
    const subscription = realtime.subscribe(OPERATION, { next: () => {} })

    await expect(subscription.ready).rejects.toBeInstanceOf(MbcRealtimeError)
    expect(FakeWebSocket.instances).toHaveLength(0)
  })
})
