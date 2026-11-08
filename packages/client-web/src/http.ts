import {
  MbcAbortError,
  MbcApiError,
  MbcAuthError,
  MbcTimeoutError,
} from './errors'

export type MaybePromise<T> = T | Promise<T>
export type QueryValue = string | number | boolean
export type QueryParams = Record<
  string,
  QueryValue | null | undefined | readonly QueryValue[]
>

export type HttpConfig = {
  apiUrl: string
  tenantCode: string | (() => string)
  getAuthToken?: () => MaybePromise<string | undefined>
  headers?: Record<string, string> | (() => Record<string, string>)
  fetch?: typeof fetch
  timeoutMs?: number
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestOptions = {
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

export type Http = {
  request<T>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions
  ): Promise<T>
  resolveTenantCode(): string
}

const DEFAULT_TIMEOUT_MS = 30_000

export function toQueryString(query?: QueryParams): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) params.append(key, String(item))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** `AbortSignal.any` where available (Safari ≥ 17.4); listener-based fallback elsewhere. */
function anySignal(signals: AbortSignal[]): {
  signal: AbortSignal
  dispose: () => void
} {
  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any(signals), dispose: () => {} }
  }
  const controller = new AbortController()
  const onAbort = (event: Event) =>
    controller.abort((event.target as AbortSignal).reason)
  const dispose = () => {
    for (const signal of signals) signal.removeEventListener('abort', onAbort)
  }
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      dispose()
      return { signal: controller.signal, dispose: () => {} }
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }
  return { signal: controller.signal, dispose }
}

export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('json')) return text
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function createHttp(config: HttpConfig): Http {
  const resolveTenantCode = () =>
    typeof config.tenantCode === 'function'
      ? config.tenantCode()
      : config.tenantCode

  async function buildHeaders(hasBody: boolean): Promise<Headers> {
    const extra =
      typeof config.headers === 'function' ? config.headers() : config.headers
    const headers = new Headers(extra)
    headers.set('accept', 'application/json')
    if (hasBody) headers.set('content-type', 'application/json')
    headers.set('x-tenant-code', resolveTenantCode())

    let token: string | undefined
    try {
      token = await config.getAuthToken?.()
    } catch (cause) {
      throw new MbcAuthError({ cause })
    }
    if (token) headers.set('authorization', `Bearer ${token}`)
    else headers.delete('authorization')
    return headers
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const timeoutMs =
      options.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const timeout = AbortSignal.timeout(timeoutMs)
    const combined = options.signal
      ? anySignal([options.signal, timeout])
      : { signal: timeout, dispose: () => {} }
    try {
      const hasBody = options.body !== undefined
      const headers = await buildHeaders(hasBody)
      // The token lookup is async: the caller may have aborted meanwhile.
      if (options.signal?.aborted) {
        throw new MbcAbortError({ cause: options.signal.reason })
      }
      if (timeout.aborted) throw new MbcTimeoutError(timeoutMs)
      const doFetch = config.fetch ?? globalThis.fetch

      let response: Response
      try {
        response = await doFetch(
          joinUrl(config.apiUrl, path) + toQueryString(options.query),
          {
            method,
            headers,
            body: hasBody ? JSON.stringify(options.body) : undefined,
            signal: combined.signal,
          }
        )
      } catch (cause) {
        if (options.signal?.aborted) throw new MbcAbortError({ cause })
        if (timeout.aborted) throw new MbcTimeoutError(timeoutMs)
        throw new MbcApiError(0, undefined, 'Network request failed', {
          cause,
        })
      }

      const body = await readBody(response)
      if (!response.ok) throw new MbcApiError(response.status, body)
      return body as T
    } finally {
      combined.dispose()
    }
  }

  return { request, resolveTenantCode }
}
