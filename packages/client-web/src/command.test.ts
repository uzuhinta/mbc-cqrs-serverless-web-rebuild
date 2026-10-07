import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeWebSocket } from '../test/fake-websocket'
import { createCommand } from './command'
import {
  MbcAbortError,
  MbcApiError,
  MbcCommandError,
  MbcTimeoutError,
} from './errors'
import { createHttp } from './http'
import { createRealtimeClient } from './realtime/client'

type Deferred = {
  resolve: (body: unknown) => void
  reject: (error: unknown) => void
}

function setup(tenantCode: string | (() => string) = 'tenant-a') {
  const responses: Deferred[] = []
  const fetch = vi.fn(
    () =>
      new Promise<Response>((resolve, reject) => {
        responses.push({
          resolve: (body) =>
            resolve(
              new Response(JSON.stringify(body), {
                headers: { 'content-type': 'application/json' },
              })
            ),
          reject,
        })
      })
  ) as unknown as typeof globalThis.fetch
  const http = createHttp({
    apiUrl: 'https://api',
    tenantCode,
    fetch,
  })
  const realtime = createRealtimeClient({
    url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql',
    auth: { type: 'API_KEY', apiKey: 'k' },
    WebSocket: FakeWebSocket,
    random: () => 0,
  })
  return { http, realtime, responses, command: createCommand(http, realtime) }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function status(
  socket: FakeWebSocket,
  requestId: string,
  value: string,
  sk?: string
) {
  const start = socket.starts()[0]
  socket.receive({
    type: 'data',
    id: start?.id,
    payload: {
      data: {
        onMessage: {
          id: requestId,
          tenantCode: 'tenant-a',
          action: 'command-status',
          content: JSON.stringify({ status: value }),
          ...(sk && { pk: 'MASTER#tenant-a', sk }),
        },
      },
    },
  })
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function connected() {
  await flush()
  const socket = FakeWebSocket.latest()
  socket.accept()
  socket.ackAll()
  await flush()
  return socket
}

beforeEach(() => {
  FakeWebSocket.reset()
})

describe('command', () => {
  it('subscribes with the tenant current at each command (v0 0.0.50)', async () => {
    let tenant = 'tenant-a'
    const { command } = setup(() => tenant)
    void command({ method: 'POST', path: '/a' }).catch(() => {})
    const socket = await connected()
    tenant = 'tenant-b'
    void command({ method: 'POST', path: '/b' }).catch(() => {})
    await flush()
    socket.ackAll()
    await flush()
    expect(
      socket
        .starts()
        .map(
          (start) =>
            JSON.parse(start.payload?.data ?? '{}').variables.tenantCode
        )
    ).toEqual(['tenant-a', 'tenant-b'])
  })

  it('subscribes before sending, then resolves on finish:FINISHED', async () => {
    const { command, responses } = setup()
    const phases: string[] = []
    const pending = command<{ requestId: string; id: string }>(
      { method: 'POST', path: '/api/survey-template', body: { name: 'A' } },
      { onPhase: (phase) => phases.push(phase) }
    )
    const socket = await connected()

    expect(responses).toHaveLength(1)
    const variables = JSON.parse(
      socket.starts()[0]?.payload?.data ?? '{}'
    ).variables
    expect(variables).toEqual({
      tenantCode: 'tenant-a',
      action: 'command-status',
    })

    responses[0]?.resolve({ requestId: 'req-1', id: 'x' })
    await flush()
    status(socket, 'req-1', 'sync_data:FINISHED')
    status(socket, 'req-1', 'finish:FINISHED')

    await expect(pending).resolves.toEqual({
      data: { requestId: 'req-1', id: 'x' },
      requestId: 'req-1',
    })
    expect(phases).toEqual(['sending', 'waiting'])
    expect(socket.closedWith?.code).toBe(1000)
  })

  it('does not lose a finish message that arrives before the HTTP response', async () => {
    const { command, responses } = setup()
    const pending = command({ method: 'PUT', path: '/x' })
    const socket = await connected()

    status(socket, 'req-early', 'finish:FINISHED')
    responses[0]?.resolve({ requestId: 'req-early' })

    await expect(pending).resolves.toMatchObject({ requestId: 'req-early' })
  })

  it('ignores other commands’ messages and resolves each on its own id', async () => {
    const { command, responses } = setup()
    const first = command({ method: 'POST', path: '/a' })
    const second = command({ method: 'POST', path: '/b' })
    const socket = await connected()
    responses[0]?.resolve({ requestId: 'req-a' })
    responses[1]?.resolve({ requestId: 'req-b' })
    await flush()

    expect(FakeWebSocket.instances).toHaveLength(1)
    // AppSync delivers each message to every subscription with a matching
    // filter, so each command also sees the other command's id.
    const settled: string[] = []
    void first.then(() => settled.push('a'))
    void second.then(() => settled.push('b'))
    const [startA, startB] = socket.starts()
    const deliver = (id: string) => {
      for (const start of [startA, startB]) {
        socket.receive({
          type: 'data',
          id: start?.id,
          payload: {
            data: {
              onMessage: {
                id,
                tenantCode: 'tenant-a',
                content: '{"status":"finish:FINISHED"}',
              },
            },
          },
        })
      }
    }

    deliver('req-b')
    await flush()
    expect(settled).toEqual(['b'])
    deliver('req-a')

    await expect(first).resolves.toMatchObject({ requestId: 'req-a' })
    await expect(second).resolves.toMatchObject({ requestId: 'req-b' })
  })

  it('rejects with MbcCommandError on a FAILED status', async () => {
    const { command, responses } = setup()
    const pending = command({ method: 'DELETE', path: '/x' })
    const socket = await connected()
    responses[0]?.resolve({ requestId: 'req-f' })
    await flush()
    status(socket, 'req-f', 'sync_data:FAILED')

    const error = await pending.catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MbcCommandError)
    expect(error).toMatchObject({
      requestId: 'req-f',
      status: 'sync_data:FAILED',
    })
  })

  it('rejects when the response has no requestId, and unsubscribes', async () => {
    const { command, responses } = setup()
    const pending = command({ method: 'POST', path: '/x' })
    const socket = await connected()
    responses[0]?.resolve({ id: 'no-request-id' })

    await expect(pending).rejects.toBeInstanceOf(MbcApiError)
    expect(socket.closedWith?.code).toBe(1000)
  })

  it('times out across the whole command', async () => {
    vi.useFakeTimers()
    try {
      const { command } = setup()
      const pending = command(
        { method: 'POST', path: '/x' },
        { timeoutMs: 5_000 }
      )
      const rejection = expect(pending).rejects.toBeInstanceOf(MbcTimeoutError)
      await vi.advanceTimersByTimeAsync(0)
      FakeWebSocket.latest().accept()
      FakeWebSocket.latest().ackAll()
      await vi.advanceTimersByTimeAsync(5_000)
      await rejection
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects with MbcAbortError and releases the subscription on abort', async () => {
    const { command } = setup()
    const controller = new AbortController()
    const pending = command(
      { method: 'POST', path: '/x' },
      { signal: controller.signal }
    )
    const socket = await connected()
    controller.abort()

    await expect(pending).rejects.toBeInstanceOf(MbcAbortError)
    expect(socket.closedWith?.code).toBe(1000)
  })

  it('survives a dropped socket while waiting', async () => {
    vi.useFakeTimers()
    try {
      const { command, responses } = setup()
      const pending = command({ method: 'POST', path: '/x' })
      await vi.advanceTimersByTimeAsync(0)
      FakeWebSocket.latest().accept()
      FakeWebSocket.latest().ackAll()
      await vi.advanceTimersByTimeAsync(0)
      responses[0]?.resolve({ requestId: 'req-d' })
      await vi.advanceTimersByTimeAsync(0)

      FakeWebSocket.latest().drop()
      await vi.advanceTimersByTimeAsync(1_000)
      const second = FakeWebSocket.latest()
      expect(FakeWebSocket.instances).toHaveLength(2)
      second.accept()
      second.ackAll()
      status(second, 'req-d', 'finish:FINISHED')

      await expect(pending).resolves.toMatchObject({ requestId: 'req-d' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('resolves right after the HTTP call without real-time', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('{"requestId":"r"}', {
          headers: { 'content-type': 'application/json' },
        })
    ) as unknown as typeof globalThis.fetch
    const http = createHttp({ apiUrl: 'https://api', tenantCode: 't', fetch })
    const command = createCommand(http, undefined)

    await expect(command({ method: 'POST', path: '/x' })).resolves.toEqual({
      data: { requestId: 'r' },
      requestId: 'r',
    })
  })

  it('waits for expectedFinishes finish messages and reports progress', async () => {
    const { command, responses } = setup()
    const progress: [number, number][] = []
    let settled = false
    const pending = command<{ requestId: string }>(
      { method: 'POST', path: '/api/master-bulk', body: { items: [] } },
      {
        expectedFinishes: 3,
        onProgress: (done, expected) => progress.push([done, expected]),
      }
    )
    void pending.then(() => {
      settled = true
    })
    const socket = await connected()

    status(socket, 'req-other', 'finish:FINISHED')
    status(socket, 'req-1', 'finish:FINISHED') // before the HTTP response: buffered
    responses[0]?.resolve({ requestId: 'req-1' })
    await flush()
    status(socket, 'req-1', 'finish:FINISHED')
    await flush()
    expect(settled).toBe(false)

    status(socket, 'req-1', 'finish:FINISHED')
    await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('rejects on a FAILED status after some items finished', async () => {
    const { command, responses } = setup()
    const pending = command(
      { method: 'POST', path: '/api/master-bulk' },
      { expectedFinishes: 2 }
    )
    const socket = await connected()
    responses[0]?.resolve({ requestId: 'req-1' })
    await flush()
    status(socket, 'req-1', 'finish:FINISHED')
    status(socket, 'req-1', 'import:FAILED')
    await expect(pending).rejects.toBeInstanceOf(MbcCommandError)
  })

  it('resolves on the HTTP response when expectedFinishes is 0', async () => {
    const { command, responses } = setup()
    const pending = command(
      { method: 'POST', path: '/api/x' },
      { expectedFinishes: 0 }
    )
    await connected()
    responses[0]?.resolve({ requestId: 'req-1' })
    await expect(pending).resolves.toEqual({
      data: { requestId: 'req-1' },
      requestId: 'req-1',
    })
  })

  it('treats a non-finite expectedFinishes as 1', async () => {
    const { command, responses } = setup()
    const pending = command(
      { method: 'POST', path: '/api/x' },
      { expectedFinishes: Number.NaN }
    )
    const socket = await connected()
    responses[0]?.resolve({ requestId: 'req-1' })
    await flush()
    status(socket, 'req-1', 'finish:FINISHED')
    await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
  })

  it('waits for one finish per changed item of a bulk (array) response', async () => {
    const { command, responses } = setup()
    type Item = { sk: string; requestId?: string }
    const progress: string[] = []
    const pending = command<Item[]>(
      { method: 'POST', path: '/api/master-bulk', body: { items: [] } },
      {
        requestIdOf: (items) => items.find((item) => item.requestId)?.requestId,
        expectedFinishes: (items) =>
          items.filter((item) => item.requestId).length,
        onProgress: (done, expected, message) =>
          progress.push(`${done}/${expected} ${message.sk}`),
      }
    )
    const socket = await connected()
    responses[0]?.resolve([
      { sk: 'S#a', requestId: 'req-1' },
      { sk: 'S#b' },
      { sk: 'S#c', requestId: 'req-1' },
    ])
    await flush()
    status(socket, 'req-1', 'finish:FINISHED', 'S#a')
    status(socket, 'req-1', 'finish:FINISHED', 'S#a') // redelivered: counted once
    status(socket, 'req-1', 'finish:FINISHED', 'S#c')
    await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
    expect(progress).toEqual(['1/2 S#a', '2/2 S#c'])
  })

  it('resolves at once when nothing in a bulk request changed', async () => {
    const { command, responses } = setup()
    const pending = command<{ sk: string; requestId?: string }[]>(
      { method: 'POST', path: '/api/master-bulk' },
      {
        requestIdOf: (items) => items.find((item) => item.requestId)?.requestId,
        expectedFinishes: (items) =>
          items.filter((item) => item.requestId).length,
      }
    )
    await connected()
    responses[0]?.resolve([{ sk: 'S#a' }])
    await expect(pending).resolves.toEqual({
      data: [{ sk: 'S#a' }],
      requestId: undefined,
    })
  })

  it('never reports more progress than expected, nor any after a failure', async () => {
    const { command, responses } = setup()
    const progress: number[] = []
    const pending = command(
      { method: 'POST', path: '/api/master-bulk' },
      { expectedFinishes: 2, onProgress: (done) => progress.push(done) }
    )
    const socket = await connected()
    for (const sk of ['S#a', 'S#b', 'S#c'])
      status(socket, 'req-1', 'finish:FINISHED', sk) // all buffered
    responses[0]?.resolve({ requestId: 'req-1' })
    await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
    expect(progress).toEqual([1, 2])

    const second = setup()
    const failed: number[] = []
    const failing = second.command(
      { method: 'POST', path: '/api/master-bulk' },
      { expectedFinishes: 3, onProgress: (done) => failed.push(done) }
    )
    const socket2 = await connected()
    second.responses[0]?.resolve({ requestId: 'req-2' })
    await flush()
    status(socket2, 'req-2', 'finish:FINISHED', 'S#a')
    status(socket2, 'req-2', 'import:FAILED', 'S#b')
    status(socket2, 'req-2', 'finish:FINISHED', 'S#c')
    await expect(failing).rejects.toBeInstanceOf(MbcCommandError)
    expect(failed).toEqual([1])
  })

  it('rejects with the error an onProgress callback throws', async () => {
    const { command, responses } = setup()
    const pending = command(
      { method: 'POST', path: '/api/master-bulk' },
      {
        expectedFinishes: 2,
        onProgress: () => {
          throw new Error('host bug')
        },
      }
    )
    const socket = await connected()
    responses[0]?.resolve({ requestId: 'req-1' })
    await flush()
    status(socket, 'req-1', 'finish:FINISHED', 'S#a')
    await expect(pending).rejects.toThrow('host bug')
  })

  it('restarts the timeout whenever an item finishes', async () => {
    const { command, responses } = setup()
    const pending = command(
      { method: 'POST', path: '/api/master-bulk' },
      { expectedFinishes: 3, timeoutMs: 150 }
    )
    const socket = await connected()
    responses[0]?.resolve({ requestId: 'req-1' })
    for (const sk of ['S#a', 'S#b', 'S#c']) {
      await wait(100) // 300 ms in all, never 150 ms without progress
      status(socket, 'req-1', 'finish:FINISHED', sk)
    }
    await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
  })

  it('resolves after the HTTP response without realtime, with no progress', async () => {
    const { http, responses } = setup()
    const command = createCommand(http, undefined)
    const onProgress = vi.fn()
    const pending = command(
      { method: 'POST', path: '/api/master-bulk' },
      { expectedFinishes: 5, onProgress }
    )
    await flush()
    responses[0]?.resolve({ requestId: 'req-1' })
    await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
    expect(onProgress).not.toHaveBeenCalled()
  })
})
