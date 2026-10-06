import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { useSurveyTemplate, useSurveyTemplates } from './hooks'

const wrap = (client: ReturnType<typeof createFakeClient>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <MbcClientProvider client={client}>{children}</MbcClientProvider>
      </StrictMode>
    )
  }

describe('useSurveyTemplates', () => {
  it('loads, refetches and aborts the previous request', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [], total: 0 })
    const { result, rerender } = renderHook(
      ({ page }) => useSurveyTemplates({ page, pageSize: 10 }),
      {
        wrapper: wrap(client),
        initialProps: { page: 1 },
      }
    )
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ items: [], total: 0 })

    rerender({ page: 2 })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    const signals = client.get.mock.calls.map(
      ([, options]) => (options as { signal: AbortSignal }).signal
    )
    expect(signals.slice(0, -1).every((signal) => signal.aborted)).toBe(true)
    expect(signals.at(-1)?.aborted).toBe(false)

    act(() => result.current.refetch())
    await waitFor(() =>
      expect(client.get).toHaveBeenCalledTimes(signals.length + 1)
    )
  })

  it('reports errors', async () => {
    const client = createFakeClient()
    client.get.mockRejectedValue(new Error('down'))
    const { result } = renderHook(
      () => useSurveyTemplates({ page: 1, pageSize: 10 }),
      { wrapper: wrap(client) }
    )
    await waitFor(() => expect(result.current.error).toEqual(new Error('down')))
    expect(result.current.loading).toBe(false)
  })
})

describe('useSurveyTemplate', () => {
  it('stays idle without an id and aborts on unmount', async () => {
    const client = createFakeClient()
    const idle = renderHook(() => useSurveyTemplate(undefined), {
      wrapper: wrap(client),
    })
    expect(idle.result.current).toMatchObject({
      loading: false,
      data: undefined,
    })
    expect(client.get).not.toHaveBeenCalled()

    client.get.mockReturnValue(new Promise(() => {}))
    const pending = renderHook(() => useSurveyTemplate('t1'), {
      wrapper: wrap(client),
    })
    pending.unmount()
    const signal = (
      client.get.mock.calls.at(-1)?.[1] as { signal: AbortSignal }
    ).signal
    expect(signal.aborted).toBe(true)
  })
})
