// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useQuery } from './use-query'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const strict = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
)

describe('useQuery', () => {
  it('loads by key and reloads on refetch', async () => {
    const load = vi.fn(async () => 'A')
    const { result } = renderHook(() => useQuery('a', load), {
      wrapper: strict,
    })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('A'))
    expect(result.current.loading).toBe(false)

    const calls = load.mock.calls.length
    act(() => result.current.refetch())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(load.mock.calls.length).toBeGreaterThan(calls)
  })

  it('ignores a late result for a key that changed', async () => {
    const pending = { a: deferred<string>(), b: deferred<string>() }
    const { result, rerender } = renderHook(
      ({ id }: { id: 'a' | 'b' }) => useQuery(id, () => pending[id].promise),
      { initialProps: { id: 'a' } }
    )
    rerender({ id: 'b' })
    await act(async () => pending.a.resolve('A'))
    expect(result.current.data).toBeUndefined()
    expect(result.current.loading).toBe(true)

    await act(async () => pending.b.resolve('B'))
    expect(result.current.data).toBe('B')
  })

  it('aborts the previous request', () => {
    const signals: AbortSignal[] = []
    const { rerender } = renderHook(
      ({ id }: { id: string }) =>
        useQuery(id, (signal) => {
          signals.push(signal)
          return new Promise<string>(() => {})
        }),
      { initialProps: { id: 'a' } }
    )
    rerender({ id: 'b' })
    expect(signals[0]?.aborted).toBe(true)
    expect(signals.at(-1)?.aborted).toBe(false)
  })

  it('is idle without a loader', () => {
    const { result } = renderHook(() => useQuery<string>('x', null))
    expect(result.current).toMatchObject({
      data: undefined,
      loading: false,
      error: undefined,
    })
  })

  it('reports a failed load', async () => {
    const { result } = renderHook(() =>
      useQuery('e', async () => {
        throw new Error('boom')
      })
    )
    await waitFor(() => expect(result.current.error).toEqual(new Error('boom')))
    expect(result.current.loading).toBe(false)
  })
})
