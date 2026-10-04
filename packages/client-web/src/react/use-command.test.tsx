// @vitest-environment jsdom
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { StrictMode, useEffect, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { FakeWebSocket } from '../../test/fake-websocket'
import { createMbcClient, type MbcClient } from '../client'
import { MbcClientProvider, useMbcClient } from './provider'
import { useCommand } from './use-command'

const client = { tenantCode: () => 't' } as unknown as MbcClient

function wrapper({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <MbcClientProvider client={client}>{children}</MbcClientProvider>
    </StrictMode>
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useMbcClient', () => {
  it('returns the provided client and explains a missing provider', () => {
    const { result } = renderHook(() => useMbcClient(), { wrapper })
    expect(result.current).toBe(client)
    expect(() => renderHook(() => useMbcClient())).toThrow(
      'useMbcClient must be used inside <MbcClientProvider>'
    )
  })
})

describe('useCommand', () => {
  it('reports sending, waiting and done', async () => {
    const gate = deferred<string>()
    const { result } = renderHook(
      () =>
        useCommand(async ({ onPhase }, name: string) => {
          onPhase('sending')
          onPhase('waiting')
          return `${name}:${await gate.promise}`
        }),
      { wrapper }
    )
    expect(result.current.status).toBe('idle')

    let pending!: Promise<string | undefined>
    act(() => {
      pending = result.current.run('save')
    })
    await waitFor(() => expect(result.current.status).toBe('waiting'))

    await act(async () => {
      gate.resolve('ok')
      await pending
    })
    expect(result.current.status).toBe('done')
    expect(result.current.data).toBe('save:ok')
  })

  it('reports errors and resets', async () => {
    const failure = new Error('boom')
    const { result } = renderHook(
      () => useCommand(async () => Promise.reject(failure)),
      {
        wrapper,
      }
    )
    await act(async () => {
      await result.current.run()
    })
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe(failure)

    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeUndefined()
  })

  it('aborts the previous run when run is called again', async () => {
    const signals: AbortSignal[] = []
    const { result } = renderHook(
      () =>
        useCommand(({ signal }) => {
          signals.push(signal)
          return new Promise<never>(() => {})
        }),
      { wrapper }
    )
    act(() => {
      void result.current.run()
    })
    act(() => {
      void result.current.run()
    })

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
  })

  it('aborts on unmount and never updates state afterwards', async () => {
    const gate = deferred<string>()
    const seen: AbortSignal[] = []
    const errors = vi.spyOn(console, 'error')
    function Saver() {
      const { run, status } = useCommand(async ({ signal }) => {
        seen.push(signal)
        return gate.promise
      })
      useEffect(() => {
        void run()
      }, [run])
      return <p>{status}</p>
    }
    const { unmount } = render(<Saver />, { wrapper })
    await waitFor(() => expect(screen.getByText('sending')).toBeInTheDocument())

    unmount()
    await act(async () => {
      gate.resolve('late')
      await gate.promise
    })

    expect(seen.at(-1)?.aborted).toBe(true)
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  it('ignores a superseded run that settles late', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const gates = [first, second]
    const { result } = renderHook(
      () => useCommand(async () => (gates.shift() ?? first).promise),
      { wrapper }
    )
    act(() => {
      void result.current.run()
    })
    act(() => {
      void result.current.run()
    })

    await act(async () => {
      first.resolve('stale')
      await first.promise
    })
    expect(result.current.status).toBe('sending')
    expect(result.current.data).toBeUndefined()

    await act(async () => {
      second.resolve('fresh')
      await second.promise
    })
    expect(result.current.data).toBe('fresh')
  })

  it('releases the command subscription when the component unmounts', async () => {
    FakeWebSocket.reset()
    const real = createMbcClient({
      apiUrl: 'https://api',
      tenantCode: 't',
      fetch: (() => new Promise<Response>(() => {})) as typeof fetch,
      realtime: {
        url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql',
        auth: { type: 'API_KEY', apiKey: 'k' },
        WebSocket: FakeWebSocket,
      },
    })
    function Saver() {
      const { run } = useCommand(({ client, signal }) =>
        client.command({ method: 'POST', path: '/x' }, { signal })
      )
      useEffect(() => {
        void run()
      }, [run])
      return null
    }
    const { unmount } = render(
      <MbcClientProvider client={real}>
        <Saver />
      </MbcClientProvider>
    )
    await waitFor(() =>
      expect(FakeWebSocket.instances.length).toBeGreaterThan(0)
    )
    const socket = FakeWebSocket.latest()
    socket.accept()
    socket.ackAll()

    unmount()
    await waitFor(() => expect(socket.closedWith?.code).toBe(1000))
  })
})
