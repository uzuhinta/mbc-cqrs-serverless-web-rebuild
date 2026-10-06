import {
  MbcAbortError,
  MbcApiError,
  MbcCommandError,
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

export type CommandOptions = {
  timeoutMs?: number
  signal?: AbortSignal
  onPhase?: (phase: 'sending' | 'waiting') => void
  /**
   * How many `finish:FINISHED` messages complete the command; bulk commands
   * send one per item. Default 1; values below 1 count as 1.
   */
  expectedFinishes?: number
  /** Called on each `finish:FINISHED` with the number finished so far. */
  onProgress?: (done: number, expected: number) => void
}

export type CommandResult<T> = { data: T; requestId: string }

const DEFAULT_TIMEOUT_MS = 60_000
const FINISHED = 'finish:FINISHED'

function statusOf(message: MbcMessage): string | undefined {
  const content = message.content as { status?: unknown } | null
  return typeof content?.status === 'string' ? content.status : undefined
}

export function createCommand(
  http: Http,
  realtime: RealtimeClient | undefined
) {
  return async function command<T extends { requestId?: string }>(
    request: CommandRequest,
    options: CommandOptions = {}
  ): Promise<CommandResult<T>> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const expected = Math.max(1, Math.floor(options.expectedFinishes ?? 1))
    let finished = 0
    const controller = new AbortController()
    const cleanups: (() => void)[] = []

    const outcome = new Promise<CommandResult<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new MbcTimeoutError(timeoutMs))
      }, timeoutMs)
      cleanups.push(() => clearTimeout(timer))

      const onAbort = () =>
        reject(new MbcAbortError({ cause: options.signal?.reason }))
      if (options.signal?.aborted) onAbort()
      options.signal?.addEventListener('abort', onAbort, { once: true })
      cleanups.push(() => options.signal?.removeEventListener('abort', onAbort))

      void (async () => {
        const buffered: MbcMessage[] = []
        // Filled in once the HTTP response arrives; messages before that are buffered.
        const sent: { requestId?: string; data?: T } = {}

        const check = (message: MbcMessage) => {
          const { requestId, data } = sent
          if (requestId === undefined || message.id !== requestId) return
          const status = statusOf(message)
          if (status === FINISHED) {
            finished += 1
            options.onProgress?.(finished, expected)
            if (finished >= expected) resolve({ data: data as T, requestId })
          } else if (status?.endsWith(':FAILED'))
            reject(new MbcCommandError(requestId, status))
        }

        if (realtime) {
          const subscription = realtime.subscribe(
            {
              query: ON_MESSAGE,
              variables: {
                tenantCode: http.resolveTenantCode(),
                action: 'command-status',
              },
            },
            {
              next: (payload) => {
                const message = parseMessage(payload)
                if (!message) return
                if (sent.requestId === undefined) buffered.push(message)
                else check(message)
              },
              error: (error) => reject(error),
            }
          )
          cleanups.push(() => subscription.unsubscribe())
          await subscription.ready
        }

        options.onPhase?.('sending')
        const data = await http.request<T>(request.method, request.path, {
          body: request.body,
          query: request.query,
          signal: controller.signal,
        })
        if (!data?.requestId) {
          throw new MbcApiError(
            200,
            data,
            'The command response has no requestId'
          )
        }
        const requestId = data.requestId
        sent.data = data
        sent.requestId = requestId
        if (!realtime) {
          resolve({ data, requestId })
          return
        }
        options.onPhase?.('waiting')
        for (const message of buffered.splice(0)) check(message)
      })().catch(reject)
    })

    try {
      return await outcome
    } finally {
      controller.abort()
      for (const cleanup of cleanups) cleanup()
    }
  }
}
