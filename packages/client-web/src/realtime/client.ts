import { MbcRealtimeError } from '../errors'
import type { MaybePromise } from '../http'
import {
  createConnection,
  type Protocol,
  type ProtocolEvent,
  type Subscription,
  type SubscriptionHandlers,
  type WebSocketConstructor,
} from './connection'
import {
  authHeader,
  CONNECTION_INIT,
  connectUrl,
  parseServerMessage,
  realtimeEndpoint,
  startMessage,
  stopMessage,
  type GraphQLOperation,
  type RealtimeAuth,
} from './protocol'

export type {
  Subscription,
  SubscriptionHandlers,
  WebSocketConstructor,
  WebSocketLike,
} from './connection'

export type RealtimeOptions = {
  url: string
  auth: RealtimeAuth
  getAuthToken?: () => MaybePromise<string | undefined>
  WebSocket?: WebSocketConstructor
  reconnect?: { initialDelayMs?: number; maxDelayMs?: number }
  random?: () => number
}

export type RealtimeClient = {
  subscribe(
    operation: GraphQLOperation,
    handlers: SubscriptionHandlers
  ): Subscription
  close(): void
}

/** AppSync GraphQL subscriptions over `graphql-ws`. */
export function createRealtimeClient(options: RealtimeOptions): RealtimeClient {
  const endpoint = realtimeEndpoint(options.url)
  let header: Record<string, string> | undefined

  const protocol: Protocol<GraphQLOperation> = {
    async connect() {
      const token =
        options.auth.type === 'USER_POOL'
          ? await options.getAuthToken?.()
          : undefined
      header = authHeader(options.auth, endpoint.host, token)
      return {
        url: connectUrl(endpoint.url, header),
        protocols: ['graphql-ws'],
      }
    },
    init: CONNECTION_INIT,
    parse(raw) {
      const message = parseServerMessage(raw)
      if (!message) return []
      const event = toEvent(message)
      return event ? [event] : []
    },
    subscribe(id, operation) {
      if (options.auth.type === 'API_KEY')
        return header && startMessage(id, operation, header)
      // AppSync checks the authorization of every start: user-pool tokens
      // expire, so each start gets a fresh one, not the one from connect time.
      return (async () =>
        startMessage(
          id,
          operation,
          authHeader(
            options.auth,
            endpoint.host,
            await options.getAuthToken?.()
          )
        ))()
    },
    unsubscribe: stopMessage,
  }

  return createConnection(protocol, options)
}

function toEvent(
  message: NonNullable<ReturnType<typeof parseServerMessage>>
): ProtocolEvent | undefined {
  switch (message.type) {
    case 'connection_ack':
      return { kind: 'ack', timeoutMs: message.payload?.connectionTimeoutMs }
    case 'ka':
      return { kind: 'keepAlive' }
    case 'start_ack':
      return { kind: 'started', id: message.id }
    case 'data':
      return { kind: 'data', id: message.id, data: message.payload.data }
    case 'error':
      return message.id
        ? {
            kind: 'failed',
            id: message.id,
            error: new MbcRealtimeError('Subscription failed', {
              errors: message.payload?.errors,
            }),
          }
        : undefined
    case 'complete':
      return { kind: 'ended', id: message.id }
    case 'connection_error':
      return {
        kind: 'rejected',
        error: new MbcRealtimeError('Real-time connection was rejected', {
          errors: message.payload?.errors,
        }),
      }
  }
}
