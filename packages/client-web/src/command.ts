import {
  MbcAbortError,
  MbcApiError,
  MbcCommandError,
  MbcRealtimeError,
  MbcTimeoutError,
} from './errors'
import type { Http, QueryParams } from './http'
import { ON_MESSAGE, parseMessage, type MbcMessage } from './messages'
import type { RealtimeClient } from './realtime/client'

export type CommandRequest = {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  query?: QueryParams
}

export type CommandOptions<T = unknown> = {
  /**
   * How long to wait without news, in ms (default 60 000). The timer restarts
   * each time an item finishes, so a long bulk command that keeps progressing
   * does not time out.
   */
  timeoutMs?: number
  signal?: AbortSignal
  onPhase?: (phase: 'sending' | 'waiting') => void
  /**
   * Reads the request id from the response. Default: `data.requestId`.
   * Bulk endpoints answer with an array whose changed items share one id.
   */
  requestIdOf?: (data: T) => string | undefined
  /**
   * How many `finish:FINISHED` messages complete the command: a number, or a
   * function of the response (a bulk request finishes once per changed item).
   * 0 resolves on the response. Default 1; a non-finite value counts as 1.
   * Each item (`pk` + `sk`) counts once, even if its message is delivered twice.
   */
  expectedFinishes?: number | ((data: T) => number)
  /**
   * Called once per finished item with the count so far and the item's
   * message (its `pk` / `sk` name the item). An error it throws rejects the command.
   */
  onProgress?: (done: number, expected: number, message: MbcMessage) => void
}

/**
 * `requestId` is undefined only when there was nothing to wait for
 * (`expectedFinishes` came to 0 and the response carried no request id).
 */
export type CommandResult<T> = { data: T; requestId: string | undefined }

const DEFAULT_TIMEOUT_MS = 60_000
const FINISHED = 'finish:FINISHED'

function statusOf(message: MbcMessage): string | undefined {
  const content = message.content as { status?: unknown } | null
  return typeof content?.status === 'string' ? content.status : undefined
}

function defaultRequestId(data: unknown): string | undefined {
  const id = (data as { requestId?: unknown } | null | undefined)?.requestId
  return typeof id === 'string' && id !== '' ? id : undefined
}

function expectedFor<T>(
  option: CommandOptions<T>['expectedFinishes'],
  data: T
): number {
  const value = typeof option === 'function' ? option(data) : (option ?? 1)
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 1
}

export function createCommand(
  http: Http,
  realtime: RealtimeClient | undefined
) {
  return async function command<T = unknown>(
    request: CommandRequest,
    options: CommandOptions<T> = {}
  ): Promise<CommandResult<T>> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const controller = new AbortController()
    const cleanups: (() => void)[] = []

    const outcome = new Promise<CommandResult<T>>(
      (resolvePromise, rejectPromise) => {
        // Nothing counts or reports once the command has settled.
        let settled = false
        const resolve = (result: CommandResult<T>) => {
          settled = true
          resolvePromise(result)
        }
        const reject = (error: unknown) => {
          settled = true
          rejectPromise(error)
        }

        let timer: ReturnType<typeof setTimeout> | undefined
        // Before the request goes out a timeout has a known outcome: nothing
        // was sent because the subscription never started.
        let sending = false
        const arm = () => {
          clearTimeout(timer)
          timer = setTimeout(
            () =>
              reject(
                sending
                  ? new MbcTimeoutError(timeoutMs)
                  : new MbcRealtimeError(
                      `The real-time subscription did not start within ${timeoutMs}ms; nothing was sent`
                    )
              ),
            timeoutMs
          )
        }
        arm()
        cleanups.push(() => clearTimeout(timer))

        const onAbort = () =>
          reject(new MbcAbortError({ cause: options.signal?.reason }))
        if (options.signal?.aborted) onAbort()
        options.signal?.addEventListener('abort', onAbort, { once: true })
        cleanups.push(() =>
          options.signal?.removeEventListener('abort', onAbort)
        )

        void (async () => {
          const buffered: MbcMessage[] = []
          // Filled in once the HTTP response arrives; messages before that are buffered.
          const sent: { requestId?: string; data?: T; expected?: number } = {}
          const finished = new Set<string>()

          const check = (message: MbcMessage) => {
            const { requestId, data, expected } = sent
            if (settled || expected === undefined) return
            if (requestId === undefined || message.id !== requestId) return
            const status = statusOf(message)
            if (status === FINISHED) {
              const item =
                message.pk !== undefined && message.sk !== undefined
                  ? `${message.pk}#${message.sk}`
                  : `#${finished.size}`
              if (finished.has(item)) return
              finished.add(item)
              try {
                options.onProgress?.(finished.size, expected, message)
              } catch (error) {
                reject(error)
                return
              }
              if (finished.size >= expected)
                resolve({ data: data as T, requestId })
              else arm()
            } else if (status?.endsWith(':FAILED'))
              reject(new MbcCommandError(requestId, status))
          }

          if (realtime) {
            // The backend sends a message under the tenant in its keys, which
            // it lowercases (core 1.1.0); earlier backends kept the case. Each
            // message goes out under one of them, so it is heard once.
            const tenantCode = http.resolveTenantCode()
            const tenants = [...new Set([tenantCode, tenantCode.toLowerCase()])]
            const subscriptions = tenants.map((tenant) =>
              realtime.subscribe(
                {
                  query: ON_MESSAGE,
                  variables: { tenantCode: tenant, action: 'command-status' },
                },
                {
                  next: (payload) => {
                    const message = parseMessage(payload)
                    if (!message) return
                    if (sent.expected === undefined) buffered.push(message)
                    else check(message)
                  },
                  error: (error) => reject(error),
                }
              )
            )
            for (const subscription of subscriptions)
              cleanups.push(() => subscription.unsubscribe())
            await Promise.all(
              subscriptions.map((subscription) => subscription.ready)
            )
          }

          if (settled) return
          sending = true
          options.onPhase?.('sending')
          const data = await http.request<T>(request.method, request.path, {
            body: request.body,
            query: request.query,
            signal: controller.signal,
          })
          const requestId = (options.requestIdOf ?? defaultRequestId)(data)
          const expected = expectedFor(options.expectedFinishes, data)
          if (expected === 0) {
            resolve({ data, requestId })
            return
          }
          if (requestId === undefined) {
            throw new MbcApiError(
              200,
              data,
              'The command response has no requestId'
            )
          }
          if (!realtime) {
            resolve({ data, requestId })
            return
          }
          sent.data = data
          sent.requestId = requestId
          sent.expected = expected
          options.onPhase?.('waiting')
          for (const message of buffered.splice(0)) check(message)
        })().catch(reject)
      }
    )

    try {
      return await outcome
    } finally {
      controller.abort()
      for (const cleanup of cleanups) cleanup()
    }
  }
}
