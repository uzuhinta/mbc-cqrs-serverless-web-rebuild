import { MbcRealtimeError } from '../errors'
import {
  createConnection,
  type Protocol,
  type ProtocolEvent,
  type Subscription,
  type WebSocketConstructor,
} from './connection'

/** AppSync Events authorization. Only API keys are supported. */
export type EventsAuth = { type: 'API_KEY'; apiKey: string }

export type EventsOptions = {
  /** The Events HTTP endpoint, e.g. `https://<id>.appsync-api.<region>.amazonaws.com/event`. */
  url: string
  auth: EventsAuth
  WebSocket?: WebSocketConstructor
  reconnect?: { initialDelayMs?: number; maxDelayMs?: number }
  random?: () => number
}

export type EventsHandlers = {
  /** Each event, JSON-parsed (a string that is not JSON as it is). */
  next: (event: unknown) => void
  error?: (error: MbcRealtimeError) => void
}

export type EventsClient = {
  subscribe(channel: string, handlers: EventsHandlers): Subscription
  close(): void
}

type ServerMessage = {
  type?: unknown
  id?: unknown
  connectionTimeoutMs?: unknown
  event?: unknown
  errors?: unknown
}

/** The real-time URL and the auth `host` for an Events HTTP endpoint. */
export function eventsEndpoint(httpUrl: string): { url: string; host: string } {
  const url = new URL(httpUrl)
  const host = url.host
  if (url.hostname.includes('.appsync-api.')) {
    url.hostname = url.hostname.replace(
      '.appsync-api.',
      '.appsync-realtime-api.'
    )
  }
  url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
  url.pathname = '/event/realtime'
  url.search = ''
  url.hash = ''
  return { url: url.toString(), host }
}

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeEvent(event: unknown): unknown {
  if (typeof event !== 'string') return event
  try {
    return JSON.parse(event) as unknown
  } catch {
    return event
  }
}

/** AppSync Events subscriptions over `aws-appsync-event-ws`. */
export function createEventsClient(options: EventsOptions): EventsClient {
  const endpoint = eventsEndpoint(options.url)
  const supported = options.auth.type === 'API_KEY'
  const authorization = {
    'x-api-key': options.auth.apiKey,
    host: endpoint.host,
  }

  const protocol: Protocol<string> = {
    connect() {
      const header = base64Url(
        JSON.stringify({
          host: endpoint.host,
          'x-api-key': options.auth.apiKey,
        })
      )
      return Promise.resolve({
        url: endpoint.url,
        protocols: ['aws-appsync-event-ws', `header-${header}`],
      })
    },
    init: { type: 'connection_init' },
    parse(raw, state) {
      let message: ServerMessage
      try {
        message = JSON.parse(raw) as ServerMessage
      } catch {
        return []
      }
      if (typeof message !== 'object' || message === null) return []
      return toEvents(message, state.acknowledged)
    },
    subscribe: (id, channel) => ({
      type: 'subscribe',
      id,
      channel,
      authorization,
    }),
    unsubscribe: (id) => ({ type: 'unsubscribe', id }),
  }

  const connection = createConnection(protocol, options)

  return {
    subscribe(channel, handlers) {
      if (!supported) return unsupported(handlers)
      return connection.subscribe(channel, handlers)
    },
    close: () => connection.close(),
  }
}

function unsupported(handlers: EventsHandlers): Subscription {
  const error = new MbcRealtimeError(
    'AppSync Events supports only API key auth'
  )
  const ready = Promise.reject(error)
  ready.catch(() => {})
  queueMicrotask(() => handlers.error?.(error))
  return { ready, unsubscribe() {} }
}

function toEvents(
  message: ServerMessage,
  acknowledged: boolean
): ProtocolEvent[] {
  const id = typeof message.id === 'string' ? message.id : undefined
  const failure = (text: string) =>
    new MbcRealtimeError(text, { errors: message.errors })
  switch (message.type) {
    case 'connection_ack':
      return [
        {
          kind: 'ack',
          timeoutMs:
            typeof message.connectionTimeoutMs === 'number'
              ? message.connectionTimeoutMs
              : undefined,
        },
      ]
    case 'ka':
      return [{ kind: 'keepAlive' }]
    case 'subscribe_success':
      return id ? [{ kind: 'started', id }] : []
    case 'subscribe_error':
      return id
        ? [{ kind: 'failed', id, error: failure('Subscription failed') }]
        : []
    case 'data': {
      if (!id) return []
      const events = Array.isArray(message.event)
        ? (message.event as unknown[])
        : [message.event]
      return events.map((event) => ({
        kind: 'data',
        id,
        data: decodeEvent(event),
      }))
    }
    case 'error':
      if (id)
        return [{ kind: 'failed', id, error: failure('Subscription failed') }]
      return acknowledged
        ? []
        : [
            {
              kind: 'rejected',
              error: failure('Real-time connection was rejected'),
            },
          ]
    // broadcast_error: one event failed to reach this subscriber; the
    // subscription stays live. unsubscribe_*: nothing to do.
    default:
      return []
  }
}
