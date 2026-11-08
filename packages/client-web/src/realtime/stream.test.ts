import { beforeEach, describe, expect, it } from 'vitest'

import { FakeWebSocket } from '../../test/fake-websocket'
import { ON_MESSAGE, type MbcMessage } from '../messages'
import { createRealtimeClient } from './client'
import { createEventsClient } from './events'
import { eventsMessages, graphqlMessages } from './stream'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function events(namespace?: string) {
  return eventsMessages(
    createEventsClient({
      url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/event',
      auth: { type: 'API_KEY', apiKey: 'k' },
      WebSocket: FakeWebSocket,
    }),
    namespace
  )
}

async function eventsSocket() {
  await flush()
  const socket = FakeWebSocket.latest()
  socket.acceptEvents()
  socket.ackSubscribes()
  return socket
}

function publish(socket: FakeWebSocket, event: unknown, index = 0) {
  socket.receive({
    type: 'data',
    id: socket.subscribes()[index]?.id,
    event: typeof event === 'string' ? event : JSON.stringify(event),
  })
}

beforeEach(() => {
  FakeWebSocket.reset()
})

describe('eventsMessages', () => {
  it('subscribes the channel the backend publishes the filter to', async () => {
    const stream = events()
    expect(stream.transport).toBe('events')
    stream.subscribe(
      { tenantCode: 'MBC', action: 'command-status' },
      { next: () => {} }
    )
    const socket = await eventsSocket()
    expect(socket.subscribes()[0]?.channel).toBe(
      '/default/MBC/command-status/*'
    )
  })

  it('uses the namespace, sanitized', async () => {
    events('ns_1').subscribe({ tenantCode: 'MBC' }, { next: () => {} })
    const socket = await eventsSocket()
    expect(socket.subscribes()[0]?.channel).toBe('/ns-1/MBC/*')
  })

  it('delivers a matching message with its content parsed', async () => {
    const received: MbcMessage[] = []
    events().subscribe(
      { tenantCode: 'MBC' },
      { next: (message) => received.push(message) }
    )
    const socket = await eventsSocket()
    publish(socket, {
      id: 'r1',
      tenantCode: 'MBC',
      action: 'command-status',
      content: '{"status":"finish:FINISHED"}',
    })
    expect(received).toEqual([
      {
        id: 'r1',
        tenantCode: 'MBC',
        action: 'command-status',
        content: { status: 'finish:FINISHED' },
      },
    ])
  })

  it('drops events that are not messages', async () => {
    const received: MbcMessage[] = []
    events().subscribe(
      { tenantCode: 'MBC' },
      { next: (message) => received.push(message) }
    )
    const socket = await eventsSocket()
    publish(socket, 'plain')
    publish(socket, { id: 1, tenantCode: 'MBC' })
    expect(received).toEqual([])
  })

  it('drops another spelling of the tenant', async () => {
    const received: MbcMessage[] = []
    events().subscribe(
      { tenantCode: 'MBC' },
      { next: (message) => received.push(message) }
    )
    const socket = await eventsSocket()
    publish(socket, { id: 'r1', tenantCode: 'mbc', content: null })
    expect(received).toEqual([])
  })

  it('drops an id that only shares the sanitized channel', async () => {
    const received: MbcMessage[] = []
    events().subscribe(
      { tenantCode: 'MBC', action: 'x', id: 'a_b' },
      { next: (message) => received.push(message) }
    )
    const socket = await eventsSocket()
    expect(socket.subscribes()[0]?.channel).toBe('/default/MBC/x/a-b')
    publish(socket, { id: 'a-b', tenantCode: 'MBC', action: 'x', content: 1 })
    expect(received).toEqual([])
  })
})

describe('graphqlMessages', () => {
  it('subscribes onMessage with the filter and delivers parsed messages', async () => {
    const stream = graphqlMessages(
      createRealtimeClient({
        url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql',
        auth: { type: 'API_KEY', apiKey: 'k' },
        WebSocket: FakeWebSocket,
      })
    )
    expect(stream.transport).toBe('graphql')
    const received: MbcMessage[] = []
    stream.subscribe(
      { tenantCode: 't', action: 'a' },
      { next: (message) => received.push(message) }
    )
    await flush()
    const socket = FakeWebSocket.latest()
    socket.accept()
    const start = socket.starts()[0]
    expect(JSON.parse(start?.payload?.data ?? '{}')).toEqual({
      query: ON_MESSAGE,
      variables: { tenantCode: 't', action: 'a' },
    })
    socket.receive({
      type: 'data',
      id: start?.id,
      payload: {
        data: { onMessage: { id: 'm', tenantCode: 't', content: '2' } },
      },
    })
    expect(received).toEqual([{ id: 'm', tenantCode: 't', content: 2 }])
  })
})
