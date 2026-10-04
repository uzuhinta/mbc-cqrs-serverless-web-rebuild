import { MbcRealtimeError } from '../errors'
import type { MaybePromise } from '../http'
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
  type ServerMessage,
} from './protocol'

export type WebSocketLike = {
  readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  onerror: ((event: unknown) => void) | null
}

export type WebSocketConstructor = new (
  url: string,
  protocols?: string | string[]
) => WebSocketLike

export type RealtimeOptions = {
  url: string
  auth: RealtimeAuth
  getAuthToken?: () => MaybePromise<string | undefined>
  WebSocket?: WebSocketConstructor
  reconnect?: { initialDelayMs?: number; maxDelayMs?: number }
  random?: () => number
}

export type SubscriptionHandlers = {
  next: (data: unknown) => void
  error?: (error: MbcRealtimeError) => void
}

export type Subscription = { ready: Promise<void>; unsubscribe(): void }

export type RealtimeClient = {
  subscribe(
    operation: GraphQLOperation,
    handlers: SubscriptionHandlers
  ): Subscription
  close(): void
}

type Entry = {
  operation: GraphQLOperation
  handlers: SubscriptionHandlers
  resolveReady: () => void
  rejectReady: (error: MbcRealtimeError) => void
  settled: boolean
}

const OPEN = 1
const DEFAULT_CONNECTION_TIMEOUT_MS = 300_000
const KEEP_ALIVE_TIMEOUT_CODE = 4000

export function createRealtimeClient(options: RealtimeOptions): RealtimeClient {
  const endpoint = realtimeEndpoint(options.url)
  const initialDelayMs = options.reconnect?.initialDelayMs ?? 1_000
  const maxDelayMs = options.reconnect?.maxDelayMs ?? 30_000
  const random = options.random ?? Math.random
  const entries = new Map<string, Entry>()

  let nextId = 0
  let socket: WebSocketLike | undefined
  let header: Record<string, string> | undefined
  let acknowledged = false
  let connecting = false
  let attempt = 0
  let keepAliveTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let keepAliveMs = DEFAULT_CONNECTION_TIMEOUT_MS

  function settle(entry: Entry, error?: MbcRealtimeError): void {
    if (entry.settled) return
    entry.settled = true
    if (error) entry.rejectReady(error)
    else entry.resolveReady()
  }

  function fail(id: string, error: MbcRealtimeError): void {
    const entry = entries.get(id)
    if (!entry) return
    entries.delete(id)
    settle(entry, error)
    entry.handlers.error?.(error)
    releaseIfIdle()
  }

  /** The socket lives only while a subscription needs it. */
  function releaseIfIdle(): void {
    if (entries.size === 0) shutdown()
  }

  function failAll(error: MbcRealtimeError): void {
    for (const id of [...entries.keys()]) fail(id, error)
  }

  function clearTimers(): void {
    clearTimeout(keepAliveTimer)
    clearTimeout(reconnectTimer)
    keepAliveTimer = undefined
    reconnectTimer = undefined
  }

  function armKeepAlive(): void {
    clearTimeout(keepAliveTimer)
    keepAliveTimer = setTimeout(() => {
      socket?.close(KEEP_ALIVE_TIMEOUT_CODE, 'keep-alive timeout')
    }, keepAliveMs)
  }

  function send(message: unknown): void {
    if (socket?.readyState === OPEN) socket.send(JSON.stringify(message))
  }

  function sendStart(id: string, entry: Entry): void {
    if (options.auth.type === 'API_KEY') {
      if (header) send(startMessage(id, entry.operation, header))
      return
    }
    // AppSync checks the authorization of every start: user-pool tokens
    // expire, so each start gets a fresh one, not the one from connect time.
    const ws = socket
    void (async () => {
      let fresh: Record<string, string>
      try {
        fresh = authHeader(
          options.auth,
          endpoint.host,
          await options.getAuthToken?.()
        )
      } catch (cause) {
        fail(
          id,
          cause instanceof MbcRealtimeError
            ? cause
            : new MbcRealtimeError('Could not get a real-time auth token', {
                cause,
              })
        )
        return
      }
      // A reconnect re-sends every start after its own connection_ack.
      if (socket !== ws || !acknowledged || entries.get(id) !== entry) return
      send(startMessage(id, entry.operation, fresh))
    })()
  }

  function handle(message: ServerMessage): void {
    switch (message.type) {
      case 'connection_ack':
        acknowledged = true
        attempt = 0
        keepAliveMs =
          message.payload?.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
        armKeepAlive()
        for (const [id, entry] of entries) sendStart(id, entry)
        return
      case 'ka':
        armKeepAlive()
        return
      case 'start_ack': {
        const entry = entries.get(message.id)
        if (entry) settle(entry)
        return
      }
      case 'data':
        entries.get(message.id)?.handlers.next(message.payload.data)
        return
      case 'error':
        if (message.id) {
          fail(
            message.id,
            new MbcRealtimeError('Subscription failed', {
              errors: message.payload?.errors,
            })
          )
        }
        return
      case 'complete':
        entries.delete(message.id)
        releaseIfIdle()
        return
      case 'connection_error': {
        const error = new MbcRealtimeError(
          'Real-time connection was rejected',
          {
            errors: message.payload?.errors,
          }
        )
        failAll(error)
        shutdown()
        return
      }
    }
  }

  function scheduleReconnect(): void {
    if (entries.size === 0 || reconnectTimer) return
    const delay =
      Math.min(maxDelayMs, initialDelayMs * 2 ** attempt) * (0.5 + random() / 2)
    attempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      void connect()
    }, delay)
  }

  async function connect(): Promise<void> {
    if (socket || connecting || entries.size === 0) return
    connecting = true
    let token: string | undefined
    try {
      token =
        options.auth.type === 'USER_POOL'
          ? await options.getAuthToken?.()
          : undefined
      header = authHeader(options.auth, endpoint.host, token)
    } catch (cause) {
      connecting = false
      failAll(
        cause instanceof MbcRealtimeError
          ? cause
          : new MbcRealtimeError('Could not get a real-time auth token', {
              cause,
            })
      )
      return
    }
    connecting = false
    if (entries.size === 0) return

    const Ctor =
      options.WebSocket ??
      (globalThis.WebSocket as unknown as WebSocketConstructor)
    const ws = new Ctor(connectUrl(endpoint.url, header), ['graphql-ws'])
    socket = ws
    acknowledged = false
    ws.onopen = () => send(CONNECTION_INIT)
    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return
      const message = parseServerMessage(event.data)
      if (message) handle(message)
    }
    ws.onerror = () => {}
    ws.onclose = () => {
      if (socket !== ws) return
      socket = undefined
      acknowledged = false
      clearTimeout(keepAliveTimer)
      scheduleReconnect()
    }
  }

  function shutdown(): void {
    clearTimers()
    const ws = socket
    socket = undefined
    acknowledged = false
    if (ws && ws.readyState <= OPEN) ws.close(1000, 'done')
  }

  function subscribe(
    operation: GraphQLOperation,
    handlers: SubscriptionHandlers
  ): Subscription {
    const id = String((nextId += 1))
    let resolveReady!: () => void
    let rejectReady!: (error: MbcRealtimeError) => void
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })
    // Callers that never await `ready` must not see an unhandled rejection.
    ready.catch(() => {})
    const entry: Entry = {
      operation,
      handlers,
      resolveReady,
      rejectReady,
      settled: false,
    }
    entries.set(id, entry)

    if (socket && acknowledged) sendStart(id, entry)
    else void connect()

    return {
      ready,
      unsubscribe() {
        if (!entries.delete(id)) return
        settle(
          entry,
          new MbcRealtimeError('Unsubscribed before the subscription started')
        )
        send(stopMessage(id))
        if (entries.size === 0) shutdown()
      },
    }
  }

  return {
    subscribe,
    close() {
      for (const id of [...entries.keys()]) entries.delete(id)
      shutdown()
    },
  }
}
