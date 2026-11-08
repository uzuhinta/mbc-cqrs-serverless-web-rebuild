import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeWebSocket } from '../../test/fake-websocket'
import { MbcRealtimeError } from '../errors'
import { createEventsClient, eventsEndpoint } from './events'

const URL_ = 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/event'
const HOST = 'abc.appsync-api.ap-northeast-1.amazonaws.com'

function client(
  overrides: Partial<Parameters<typeof createEventsClient>[0]> = {}
) {
  return createEventsClient({
    url: URL_,
    auth: { type: 'API_KEY', apiKey: 'key' },
    WebSocket: FakeWebSocket,
    random: () => 0,
    ...overrides,
  })
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function decodeHeader(protocol: string): unknown {
  const encoded = protocol.slice('header-'.length)
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)))
}

beforeEach(() => {
  FakeWebSocket.reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('eventsEndpoint', () => {
  it.each([
    [
      URL_,
      'wss://abc.appsync-realtime-api.ap-northeast-1.amazonaws.com/event/realtime',
      HOST,
    ],
    [
      'https://api.example.com/event',
      'wss://api.example.com/event/realtime',
      'api.example.com',
    ],
    [
      'http://localhost:4000/event',
      'ws://localhost:4000/event/realtime',
      'localhost:4000',
    ],
  ])('%s', (httpUrl, url, host) => {
    expect(eventsEndpoint(httpUrl)).toEqual({ url, host })
  })
})

describe('createEventsClient', () => {
  it('opens one socket lazily with the events subprotocols', async () => {
    const events = client()
    expect(FakeWebSocket.instances).toHaveLength(0)

    events.subscribe('/default/t/*', { next: () => {} })
    await flush()
    const socket = FakeWebSocket.latest()

    expect(socket.url).toBe(
      'wss://abc.appsync-realtime-api.ap-northeast-1.amazonaws.com/event/realtime'
    )
    const protocols = socket.protocols as string[]
    expect(protocols[0]).toBe('aws-appsync-event-ws')
    expect(protocols[1]).toMatch(/^header-[A-Za-z0-9_-]+$/)
    expect(decodeHeader(protocols[1]!)).toEqual({
      host: HOST,
      'x-api-key': 'key',
    })
    socket.open()
    expect(socket.sent).toEqual([{ type: 'connection_init' }])
  })

  it('subscribes after the ack and resolves ready on subscribe_success', async () => {
    const events = client()
    const subscription = events.subscribe('/default/t/*', { next: () => {} })
    let ready = false
    void subscription.ready.then(() => (ready = true))
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()

    expect(socket.subscribes()).toEqual([
      {
        type: 'subscribe',
        id: expect.any(String),
        channel: '/default/t/*',
        authorization: { 'x-api-key': 'key', host: HOST },
      },
    ])
    await flush()
    expect(ready).toBe(false)
    socket.ackSubscribes()
    await expect(subscription.ready).resolves.toBeUndefined()
  })

  it('delivers each event of an array', async () => {
    const events = client()
    const received: unknown[] = []
    events.subscribe('/default/t/*', { next: (event) => received.push(event) })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()
    socket.ackSubscribes()
    const id = socket.subscribes()[0]!.id

    socket.receive({ type: 'data', id, event: ['{"a":1}', 'plain'] })
    socket.receive({ type: 'data', id, event: '{"b":2}' })

    expect(received).toEqual([{ a: 1 }, 'plain', { b: 2 }])
  })

  it('subscribe_error rejects ready and calls error', async () => {
    const events = client()
    const error = vi.fn()
    const subscription = events.subscribe('/default/t/*', {
      next: () => {},
      error,
    })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()
    const id = socket.subscribes()[0]!.id
    socket.receive({
      type: 'subscribe_error',
      id,
      errors: [{ errorType: 'UnauthorizedException' }],
    })

    await expect(subscription.ready).rejects.toBeInstanceOf(MbcRealtimeError)
    expect(error).toHaveBeenCalledWith(expect.any(MbcRealtimeError))
  })

  it('error with id fails that subscription only', async () => {
    const events = client()
    const first = events.subscribe('/default/a/*', { next: () => {} })
    const received: unknown[] = []
    events.subscribe('/default/b/*', { next: (event) => received.push(event) })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()
    socket.ackSubscribes()
    const [a, b] = socket.subscribes()

    socket.receive({ type: 'error', id: a!.id, errors: [] })
    socket.receive({ type: 'data', id: b!.id, event: '1' })

    await expect(first.ready).resolves.toBeUndefined()
    expect(received).toEqual([1])
    expect(socket.closedWith).toBeUndefined()
  })

  it('broadcast_error keeps the subscription', async () => {
    const events = client()
    const error = vi.fn()
    const received: unknown[] = []
    events.subscribe('/default/t/*', {
      next: (event) => received.push(event),
      error,
    })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()
    socket.ackSubscribes()
    const id = socket.subscribes()[0]!.id

    socket.receive({ type: 'broadcast_error', id, errors: [] })
    socket.receive({ type: 'data', id, event: '"later"' })

    expect(error).not.toHaveBeenCalled()
    expect(received).toEqual(['later'])
  })

  it('an error before the ack rejects everything without reconnecting', async () => {
    vi.useFakeTimers()
    const events = client()
    const subscription = events.subscribe('/default/t/*', { next: () => {} })
    await vi.advanceTimersByTimeAsync(0)
    const socket = FakeWebSocket.latest()
    socket.open()
    socket.receive({
      type: 'error',
      errors: [{ errorType: 'UnauthorizedException' }],
    })

    await expect(subscription.ready).rejects.toBeInstanceOf(MbcRealtimeError)
    expect(socket.closedWith?.code).toBe(1000)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('closes after connectionTimeoutMs without ka', async () => {
    vi.useFakeTimers()
    const events = client()
    events.subscribe('/default/t/*', { next: () => {} })
    await vi.advanceTimersByTimeAsync(0)
    const socket = FakeWebSocket.latest()
    socket.acceptEvents(1_000)

    await vi.advanceTimersByTimeAsync(900)
    socket.receive({ type: 'ka' })
    await vi.advanceTimersByTimeAsync(900)
    expect(socket.closedWith).toBeUndefined()
    await vi.advanceTimersByTimeAsync(100)
    expect(socket.closedWith?.code).toBe(4000)
  })

  it('reconnects and re-subscribes', async () => {
    vi.useFakeTimers()
    const events = client()
    const received: unknown[] = []
    const subscription = events.subscribe('/default/t/*', {
      next: (event) => received.push(event),
    })
    await vi.advanceTimersByTimeAsync(0)
    const first = FakeWebSocket.latest()
    first.acceptEvents()
    first.ackSubscribes()
    await subscription.ready
    const id = first.subscribes()[0]!.id

    first.drop()
    await vi.advanceTimersByTimeAsync(1_000)
    const second = FakeWebSocket.latest()
    expect(second).not.toBe(first)
    second.acceptEvents()

    expect(second.subscribes()).toEqual([
      {
        type: 'subscribe',
        id,
        channel: '/default/t/*',
        authorization: { 'x-api-key': 'key', host: HOST },
      },
    ])
    second.ackSubscribes()
    second.receive({ type: 'data', id, event: '"again"' })
    expect(received).toEqual(['again'])
    await expect(subscription.ready).resolves.toBeUndefined()
  })

  it('unsubscribe before success drops later data', async () => {
    const events = client()
    const next = vi.fn()
    const subscription = events.subscribe('/default/t/*', { next })
    await flush()
    const socket = FakeWebSocket.latest()
    socket.acceptEvents()
    const id = socket.subscribes()[0]!.id

    subscription.unsubscribe()
    socket.receive({ type: 'subscribe_success', id })
    socket.receive({ type: 'data', id, event: '1' })

    expect(socket.sent).toContainEqual({ type: 'unsubscribe', id })
    await expect(subscription.ready).rejects.toBeInstanceOf(MbcRealtimeError)
    expect(next).not.toHaveBeenCalled()
    expect(socket.closedWith?.code).toBe(1000)
  })

  it('rejects non-API-key auth without connecting', async () => {
    const events = client({ auth: { type: 'USER_POOL' } as never })
    const error = vi.fn()
    const subscription = events.subscribe('/default/t/*', {
      next: () => {},
      error,
    })

    await expect(subscription.ready).rejects.toBeInstanceOf(MbcRealtimeError)
    await flush()
    expect(error).toHaveBeenCalledWith(expect.any(MbcRealtimeError))
    expect(FakeWebSocket.instances).toHaveLength(0)
  })
})
