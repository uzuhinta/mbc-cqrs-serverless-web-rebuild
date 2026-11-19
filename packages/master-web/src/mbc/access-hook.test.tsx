import { MbcApiError } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { useMasterAccess } from './hooks'

const SYSTEMS = [
  { id: 'app-a', label: 'App A' },
  { id: 'shared', label: '共通' },
]
const GRANTS = {
  enabled: true,
  grants: [{ systemId: 'app-a', settingCode: '*', read: true, write: true }],
}

const wrap = (client: ReturnType<typeof createFakeClient>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MbcClientProvider client={client}>{children}</MbcClientProvider>
  }

describe('useMasterAccess', () => {
  it('asks nothing and gives no access without systems', () => {
    const client = createFakeClient()
    const { result } = renderHook(() => useMasterAccess(undefined), {
      wrapper: wrap(client),
    })
    expect(result.current.access).toBeUndefined()
    expect(client.get).not.toHaveBeenCalled()
  })

  it('is loading, not enabled, until the grants arrive', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(GRANTS)
    const { result } = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    expect(result.current.access).toMatchObject({
      enabled: false,
      loading: true,
      systems: SYSTEMS,
    })
    await waitFor(() => expect(result.current.access?.enabled).toBe(true))
    expect(result.current.access?.loading).toBe(false)
    expect(result.current.access?.writableSystems).toEqual([SYSTEMS[0]])
    expect(client.get).toHaveBeenCalledWith('/api/master-access', {
      signal: undefined,
    })
  })

  it('shares one request between pages of the same client and tenant', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(GRANTS)
    const first = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() => expect(first.result.current.access?.enabled).toBe(true))
    first.unmount()
    const second = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() =>
      expect(second.result.current.access?.enabled).toBe(true)
    )
    expect(client.get).toHaveBeenCalledTimes(1)
  })

  it('gives the error and an access that is not enabled when the request fails, and asks again later', async () => {
    const client = createFakeClient()
    const failure = new MbcApiError(500, null)
    client.get.mockRejectedValueOnce(failure).mockResolvedValueOnce(GRANTS)
    const first = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() => expect(first.result.current.error).toBe(failure))
    expect(first.result.current.access).toMatchObject({
      enabled: false,
      loading: false,
    })
    expect(first.result.current.access?.canWrite('app-b', 'X')).toBe(true)
    first.unmount()
    const second = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() =>
      expect(second.result.current.access?.enabled).toBe(true)
    )
    expect(client.get).toHaveBeenCalledTimes(2)
  })
})
