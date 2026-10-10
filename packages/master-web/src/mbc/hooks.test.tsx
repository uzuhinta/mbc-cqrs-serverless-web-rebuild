import { MbcTimeoutError } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { initialDataListState, initialSettingListState } from '../core/list'
import {
  useCopyTasks,
  useMasterApi,
  useMasterDataList,
  useMasterMutations,
  useMasterSetting,
  useMasterSettings,
} from './hooks'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'

const wrap = (client: ReturnType<typeof createFakeClient>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <MbcClientProvider client={client}>{children}</MbcClientProvider>
      </StrictMode>
    )
  }

const task = (key: string, status: string) => ({
  id: `SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#${key}`,
  pk: 'SFN_TASK#tenant-a',
  sk: `MASTER_COPY_PRODUCT#${key}`,
  status,
})

afterEach(() => {
  vi.useRealTimers()
})

describe('master hooks', () => {
  it('loads a list page, and again when its state changes', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [], total: 3 })
    const { result, rerender } = renderHook(
      ({ page }) => useMasterSettings({ ...initialSettingListState(), page }),
      { wrapper: wrap(client), initialProps: { page: 1 } }
    )
    await waitFor(() =>
      expect(result.current.data).toEqual({ items: [], total: 3 })
    )
    rerender({ page: 2 })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(client.get.mock.calls.at(-1)?.[1].query.page).toBe(2)
  })

  it('loads a setting, and nothing without an id', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(V0_SETTING)
    const idle = renderHook(() => useMasterSetting(undefined), {
      wrapper: wrap(client),
    })
    expect(idle.result.current.loading).toBe(false)
    expect(client.get).not.toHaveBeenCalled()
    const { result } = renderHook(() => useMasterSetting(SETTING_ID), {
      wrapper: wrap(client),
    })
    await waitFor(() => expect(result.current.data?.code).toBe('PRODUCT'))
  })

  it('lists a setting’s data under the code its id names', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [], total: 0 })
    const { result } = renderHook(
      () => useMasterDataList(SETTING_ID, initialDataListState()),
      { wrapper: wrap(client) }
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(client.get.mock.calls.at(-1)?.[1].query.settingCode).toBe('PRODUCT')
  })

  it('keeps the copy results on screen while it polls for new ones', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const client = createFakeClient()
    // StrictMode loads twice on mount: answer by state, not by call.
    let status = 'PROCESSING'
    client.get.mockImplementation(async () => [task('01J9B', status)])
    const { result } = renderHook(
      () => useCopyTasks('PRODUCT', { pollMs: 5000 }),
      { wrapper: wrap(client) }
    )
    await waitFor(() =>
      expect(result.current.data?.[0]?.status).toBe('PROCESSING')
    )
    status = 'COMPLETED'
    const loads = client.get.mock.calls.length
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.data?.[0]?.status).toBe('PROCESSING')
    await waitFor(() =>
      expect(result.current.data?.[0]?.status).toBe('COMPLETED')
    )
    expect(client.get.mock.calls.length).toBeGreaterThan(loads)
  })

  it('waits for each answer before it polls again', async () => {
    vi.useFakeTimers()
    const client = createFakeClient()
    // Every answer is slower than the poll interval.
    client.get.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve([task('01J9B', 'PROCESSING')]), 3000)
        )
    )
    const { result } = renderHook(
      () => useCopyTasks('PRODUCT', { pollMs: 2000 }),
      { wrapper: wrap(client) }
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(result.current.data?.[0]?.status).toBe('PROCESSING')
  })

  it('loads again when the tenant changes', async () => {
    let tenant = 'tenant-a'
    const client = createFakeClient()
    client.tenantCode = () => tenant
    client.get.mockResolvedValue({ items: [], total: 0 })
    const { result, rerender } = renderHook(
      () => useMasterSettings(initialSettingListState()),
      { wrapper: wrap(client) }
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    const loads = client.get.mock.calls.length
    tenant = 'tenant-b'
    rerender()
    await waitFor(() =>
      expect(client.get.mock.calls.length).toBeGreaterThan(loads)
    )
  })

  it('does not poll without pollMs', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const client = createFakeClient()
    client.get.mockResolvedValue([])
    const { result } = renderHook(() => useCopyTasks('PRODUCT'), {
      wrapper: wrap(client),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const loads = client.get.mock.calls.length
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(client.get.mock.calls.length).toBe(loads)
  })

  it('runs writes as commands, with their status', async () => {
    const client = createFakeClient()
    const { result } = renderHook(() => useMasterMutations(), {
      wrapper: wrap(client),
    })
    let ok: true | undefined
    await act(async () => {
      ok = await result.current.restoreData.run('MASTER#tenant-a#PRODUCT#P-001')
    })
    expect(ok).toBe(true)
    expect(result.current.restoreData.status).toBe('done')
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'PUT',
      body: { isDeleted: false },
    })
  })

  it('lets a page get at a failed write’s own error', async () => {
    const timeout = new MbcTimeoutError(60_000)
    let fail = true
    const client = createFakeClient(() =>
      fail ? timeout : { requestId: 'req-1' }
    )
    const { result } = renderHook(() => useMasterMutations(), {
      wrapper: wrap(client),
    })
    const body = {
      settingCode: 'PRODUCT',
      code: 'P-9',
      name: '商品 9',
      attributes: {},
    }
    let caught: unknown
    await act(async () => {
      caught = await result.current.createData
        .runOrThrow(body)
        .catch((reason: unknown) => reason)
    })
    expect(caught).toBe(timeout)
    expect(result.current.createData.status).toBe('error')
    fail = false
    await act(async () => {
      await expect(
        result.current.createData.runOrThrow(body)
      ).resolves.toBeUndefined()
    })
    expect(result.current.createData.status).toBe('done')
  })

  it('uses the paths a host gives, kept across renders', () => {
    const client = createFakeClient()
    const { result, rerender } = renderHook(
      () => useMasterApi({ paths: { data: '/x/data' } }),
      { wrapper: wrap(client) }
    )
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
