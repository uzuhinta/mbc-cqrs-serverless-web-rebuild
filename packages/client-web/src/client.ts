import {
  createCommand,
  type CommandOptions,
  type CommandRequest,
  type CommandResult,
} from './command'
import type { MbcRealtimeError } from './errors'
import { createHttp, type HttpConfig, type RequestOptions } from './http'
import {
  ON_MESSAGE,
  parseMessage,
  type MbcMessage,
  type MessageFilter,
} from './messages'
import {
  createRealtimeClient,
  type Subscription,
  type WebSocketConstructor,
} from './realtime/client'
import type { RealtimeAuth } from './realtime/protocol'

export type MbcClientConfig = HttpConfig & {
  realtime?: {
    url: string
    auth: RealtimeAuth
    WebSocket?: WebSocketConstructor
  }
}

type VerbOptions = Omit<RequestOptions, 'body'>

export type MbcClient = {
  get<T>(path: string, options?: VerbOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: VerbOptions): Promise<T>
  put<T>(path: string, body?: unknown, options?: VerbOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: VerbOptions): Promise<T>
  delete<T>(path: string, options?: VerbOptions): Promise<T>
  command<T extends { requestId?: string }>(
    request: CommandRequest,
    options?: CommandOptions
  ): Promise<CommandResult<T>>
  messages:
    | {
        subscribe(
          filter: MessageFilter,
          onMessage: (message: MbcMessage) => void,
          onError?: (error: MbcRealtimeError) => void
        ): Subscription
      }
    | undefined
  tenantCode(): string
  close(): void
}

export function createMbcClient(config: MbcClientConfig): MbcClient {
  const http = createHttp(config)
  const realtime = config.realtime
    ? createRealtimeClient({
        ...config.realtime,
        getAuthToken: config.getAuthToken,
      })
    : undefined

  return {
    get: (path, options) => http.request('GET', path, options),
    post: (path, body, options) =>
      http.request('POST', path, { ...options, body }),
    put: (path, body, options) =>
      http.request('PUT', path, { ...options, body }),
    patch: (path, body, options) =>
      http.request('PATCH', path, { ...options, body }),
    delete: (path, options) => http.request('DELETE', path, options),
    command: createCommand(http, realtime),
    messages: realtime && {
      subscribe(filter, onMessage, onError) {
        return realtime.subscribe(
          { query: ON_MESSAGE, variables: filter },
          {
            next: (payload) => {
              const message = parseMessage(payload)
              if (message) onMessage(message)
            },
            error: onError,
          }
        )
      },
    },
    tenantCode: http.resolveTenantCode,
    close: () => realtime?.close(),
  }
}
