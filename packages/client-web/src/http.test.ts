import { describe, expect, it, vi } from 'vitest'

import { MbcAbortError, MbcApiError, MbcTimeoutError } from './errors'
import { createHttp, joinUrl, toQueryString } from './http'

type Call = { url: string; init: RequestInit }

function fakeFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fetch = vi.fn(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const call = { url: String(input), init }
      calls.push(call)
      return respond(call)
    }
  ) as unknown as typeof globalThis.fetch
  return { fetch, calls }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('toQueryString', () => {
  it('repeats array keys and skips empty values', () => {
    expect(
      toQueryString({
        page: 2,
        keyword: 'a b',
        orderBys: ['name:asc', 'updatedAt:desc'],
        active: true,
        empty: undefined,
        none: null,
      })
    ).toBe(
      '?page=2&keyword=a+b&orderBys=name%3Aasc&orderBys=updatedAt%3Adesc&active=true'
    )
  })

  it('returns an empty string without parameters', () => {
    expect(toQueryString()).toBe('')
    expect(toQueryString({ a: undefined })).toBe('')
  })
})

describe('joinUrl', () => {
  it('joins with exactly one slash', () => {
    expect(joinUrl('https://api.example.com/', '/api/x')).toBe(
      'https://api.example.com/api/x'
    )
    expect(joinUrl('https://api.example.com', 'api/x')).toBe(
      'https://api.example.com/api/x'
    )
  })
})

describe('createHttp', () => {
  it('sends tenant, auth and JSON, and parses JSON', async () => {
    const { fetch, calls } = fakeFetch(() => json({ id: 'x' }))
    const http = createHttp({
      apiUrl: 'https://api.example.com',
      tenantCode: () => 'tenant-a',
      getAuthToken: async () => 'token-1',
      headers: { 'x-app': 'survey' },
      fetch,
    })

    const result = await http.request<{ id: string }>(
      'POST',
      '/api/survey-template',
      {
        body: { name: 'A' },
        query: { draft: true },
      }
    )

    expect(result).toEqual({ id: 'x' })
    const [call] = calls
    expect(call?.url).toBe(
      'https://api.example.com/api/survey-template?draft=true'
    )
    expect(call?.init.method).toBe('POST')
    expect(call?.init.body).toBe('{"name":"A"}')
    const headers = new Headers(call?.init.headers)
    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('accept')).toBe('application/json')
    expect(headers.get('x-tenant-code')).toBe('tenant-a')
    expect(headers.get('authorization')).toBe('Bearer token-1')
    expect(headers.get('x-app')).toBe('survey')
  })

  it('resolves the tenant on every request (v0 0.0.50 tenant resolver)', async () => {
    const { fetch, calls } = fakeFetch(() => json({}))
    let tenant = 'tenant-a'
    const http = createHttp({
      apiUrl: 'https://api.example.com',
      tenantCode: () => tenant,
      fetch,
    })
    await http.request('GET', '/a')
    tenant = 'tenant-b'
    await http.request('GET', '/b')
    expect(
      calls.map((call) => new Headers(call.init.headers).get('x-tenant-code'))
    ).toEqual(['tenant-a', 'tenant-b'])
  })

  it('omits authorization without a token and content-type without a body', async () => {
    const { fetch, calls } = fakeFetch(() => json([]))
    const http = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      getAuthToken: () => '',
      fetch,
    })
    await http.request('GET', '/x')

    const headers = new Headers(calls[0]?.init.headers)
    expect(headers.has('authorization')).toBe(false)
    expect(headers.has('content-type')).toBe(false)
  })

  it('does not let extra headers replace tenant or auth', async () => {
    const { fetch, calls } = fakeFetch(() => json({}))
    const http = createHttp({
      apiUrl: 'https://a',
      tenantCode: 'real',
      getAuthToken: () => 'real-token',
      headers: () => ({ 'x-tenant-code': 'spoof', authorization: 'spoof' }),
      fetch,
    })
    await http.request('GET', '/x')

    const headers = new Headers(calls[0]?.init.headers)
    expect(headers.get('x-tenant-code')).toBe('real')
    expect(headers.get('authorization')).toBe('Bearer real-token')
  })

  it('returns undefined for 204 and text for non-JSON', async () => {
    const http204 = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      fetch: fakeFetch(() => new Response(null, { status: 204 })).fetch,
    })
    expect(await http204.request('DELETE', '/x')).toBeUndefined()

    const httpText = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      fetch: fakeFetch(
        () => new Response('ok', { headers: { 'content-type': 'text/plain' } })
      ).fetch,
    })
    expect(await httpText.request('GET', '/x')).toBe('ok')
  })

  it('rejects non-2xx with the parsed body', async () => {
    const http = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      fetch: fakeFetch(() => json({ message: 'Bad' }, 400)).fetch,
    })
    const error = await http.request('GET', '/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(MbcApiError)
    expect(error).toMatchObject({ status: 400, body: { message: 'Bad' } })
  })

  it('maps network and token failures to status 0', async () => {
    const network = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      fetch: fakeFetch(() => Promise.reject(new TypeError('fetch failed')))
        .fetch,
    })
    await expect(network.request('GET', '/x')).rejects.toMatchObject({
      name: 'MbcApiError',
      status: 0,
    })

    const tokenCause = new Error('session expired')
    const token = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      getAuthToken: () => Promise.reject(tokenCause),
      fetch: fakeFetch(() => json({})).fetch,
    })
    const error = await token.request('GET', '/x').catch((e: unknown) => e)
    expect(error).toMatchObject({
      name: 'MbcApiError',
      status: 0,
      cause: tokenCause,
    })
  })

  it('rejects with MbcAbortError when the caller aborts', async () => {
    const controller = new AbortController()
    const http = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      fetch: fakeFetch(
        (call) =>
          new Promise<Response>((_, reject) => {
            call.init.signal?.addEventListener('abort', () =>
              reject(call.init.signal?.reason)
            )
          })
      ).fetch,
    })
    const pending = http.request('GET', '/x', { signal: controller.signal })
    controller.abort()

    await expect(pending).rejects.toBeInstanceOf(MbcAbortError)
  })

  it('rejects with MbcTimeoutError after timeoutMs', async () => {
    const http = createHttp({
      apiUrl: 'https://a',
      tenantCode: 't',
      timeoutMs: 20,
      fetch: fakeFetch(
        (call) =>
          new Promise<Response>((_, reject) => {
            call.init.signal?.addEventListener('abort', () =>
              reject(call.init.signal?.reason)
            )
          })
      ).fetch,
    })

    await expect(http.request('GET', '/x')).rejects.toBeInstanceOf(
      MbcTimeoutError
    )
  })

  it('works on browsers without AbortSignal.any', async () => {
    const original = AbortSignal.any
    Reflect.deleteProperty(AbortSignal, 'any')
    try {
      const ok = createHttp({
        apiUrl: 'https://a',
        tenantCode: 't',
        fetch: fakeFetch(() => json({ ok: true })).fetch,
      })
      await expect(
        ok.request('GET', '/x', { signal: new AbortController().signal })
      ).resolves.toEqual({ ok: true })

      const controller = new AbortController()
      const hanging = createHttp({
        apiUrl: 'https://a',
        tenantCode: 't',
        fetch: fakeFetch(
          (call) =>
            new Promise<Response>((_, reject) => {
              call.init.signal?.addEventListener('abort', () =>
                reject(call.init.signal?.reason)
              )
            })
        ).fetch,
      })
      const pending = hanging.request('GET', '/x', {
        signal: controller.signal,
      })
      await Promise.resolve()
      controller.abort()
      await expect(pending).rejects.toBeInstanceOf(MbcAbortError)
    } finally {
      AbortSignal.any = original
    }
  })
})
