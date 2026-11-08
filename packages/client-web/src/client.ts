import {
  createCommand,
  type CommandOptions,
  type CommandRequest,
  type CommandResult,
} from './command'
import type { MbcRealtimeError } from './errors'
import { createHttp, type HttpConfig, type RequestOptions } from './http'
import type { MbcMessage, MessageFilter } from './messages'
import {
  createRealtimeClient,
  type Subscription,
  type WebSocketConstructor,
} from './realtime/client'
import { createEventsClient, type EventsAuth } from './realtime/events'
import type { RealtimeAuth } from './realtime/protocol'
import {
  eventsMessages,
  graphqlMessages,
  type MessageStream,
} from './realtime/stream'

/** AppSync GraphQL subscriptions (the default transport). */
export type GraphQLRealtimeConfig = {
  transport?: 'graphql'
  /** The GraphQL endpoint, e.g. `https://<id>.appsync-api.<region>.amazonaws.com/graphql`. */
  url: string
  auth: RealtimeAuth
  WebSocket?: WebSocketConstructor
}

/** AppSync Events channels (backend `NOTIFICATION_TRANSPORTS=appsync-event`). */
export type EventsRealtimeConfig = {
  transport: 'events'
  /** The Events HTTP endpoint, e.g. `https://<id>.appsync-api.<region>.amazonaws.com/event`. */
  url: string
  auth: EventsAuth
  /** The backend's `APPSYNC_EVENTS_NAMESPACE` (default `default`). */
  namespace?: string
  WebSocket?: WebSocketConstructor
}

export type MbcClientConfig = HttpConfig & {
  realtime?: GraphQLRealtimeConfig | EventsRealtimeConfig
}

type VerbOptions = Omit<RequestOptions, 'body'>

export type MbcClient = {
  get<T>(path: string, options?: VerbOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: VerbOptions): Promise<T>
  put<T>(path: string, body?: unknown, options?: VerbOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: VerbOptions): Promise<T>
  delete<T>(path: string, options?: VerbOptions): Promise<T>
  command<T = unknown>(
    request: CommandRequest,
    options?: CommandOptions<T>
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
  const messages = createMessages(config)
  return {
    get: (path, options) => http.request('GET', path, options),
    post: (path, body, options) =>
      http.request('POST', path, { ...options, body }),
    put: (path, body, options) =>
      http.request('PUT', path, { ...options, body }),
    patch: (path, body, options) =>
      http.request('PATCH', path, { ...options, body }),
    delete: (path, options) => http.request('DELETE', path, options),
    command: createCommand(http, messages),
    messages: messages && {
      subscribe: (filter, onMessage, onError) =>
        messages.subscribe(filter, { next: onMessage, error: onError }),
    },
    tenantCode: http.resolveTenantCode,
    close: () => messages?.close(),
  }
}

function createMessages(config: MbcClientConfig): MessageStream | undefined {
  const realtime = config.realtime
  if (!realtime) return undefined
  if (realtime.transport === 'events') {
    return eventsMessages(
      createEventsClient({
        url: realtime.url,
        auth: realtime.auth,
        WebSocket: realtime.WebSocket,
      }),
      realtime.namespace
    )
  }
  return graphqlMessages(
    createRealtimeClient({
      url: realtime.url,
      auth: realtime.auth,
      WebSocket: realtime.WebSocket,
      getAuthToken: config.getAuthToken,
    })
  )
}
