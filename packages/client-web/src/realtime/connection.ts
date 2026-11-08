import { MbcRealtimeError } from '../errors'

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

export type SubscriptionHandlers<T = unknown> = {
  next: (data: T) => void
  error?: (error: MbcRealtimeError) => void
}

export type Subscription = { ready: Promise<void>; unsubscribe(): void }

/** What a protocol tells the connection a server message means. */
export type ProtocolEvent =
  | { kind: 'ack'; timeoutMs?: number }
  | { kind: 'keepAlive' }
  | { kind: 'started'; id: string }
  | { kind: 'data'; id: string; data: unknown }
  /** One subscription failed. */
  | { kind: 'failed'; id: string; error: MbcRealtimeError }
  /** The server completed one subscription. */
  | { kind: 'ended'; id: string }
  /** The server refused the connection: fail everything, don't reconnect. */
  | { kind: 'rejected'; error: MbcRealtimeError }

/** The wire format of one real-time protocol; the connection does the rest. */
export type Protocol<Op> = {
  /** URL and subprotocols for a new socket. May throw (auth). */
  connect(): Promise<{ url: string; protocols: string[] }>
  init: unknown
  parse(raw: string, state: { acknowledged: boolean }): ProtocolEvent[]
  /** The subscribe message, or a promise of it (fresh auth). May throw. */
  subscribe(id: string, operation: Op): unknown
  unsubscribe(id: string): unknown
}

export type ConnectionOptions = {
  WebSocket?: WebSocketConstructor
  reconnect?: { initialDelayMs?: number; maxDelayMs?: number }
  random?: () => number
}

export type Connection<Op> = {
  subscribe(operation: Op, handlers: SubscriptionHandlers): Subscription
  close(): void
}

type Entry<Op> = {
  operation: Op
  handlers: SubscriptionHandlers
  resolveReady: () => void
  rejectReady: (error: MbcRealtimeError) => void
  settled: boolean
}

const OPEN = 1
const DEFAULT_CONNECTION_TIMEOUT_MS = 300_000
const KEEP_ALIVE_TIMEOUT_CODE = 4000

function authError(cause: unknown): MbcRealtimeError {
  return cause instanceof MbcRealtimeError
    ? cause
    : new MbcRealtimeError('Could not get a real-time auth token', { cause })
}

function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

/**
 * One socket shared by every subscription: opened on the first, closed when
 * the last ends, kept alive, and reopened with jittered backoff, sending each
 * live subscription again after the new acknowledgement.
 */
export function createConnection<Op>(
  protocol: Protocol<Op>,
  options: ConnectionOptions = {}
): Connection<Op> {
  const initialDelayMs = options.reconnect?.initialDelayMs ?? 1_000
  const maxDelayMs = options.reconnect?.maxDelayMs ?? 30_000
  const random = options.random ?? Math.random
  const entries = new Map<string, Entry<Op>>()

  let nextId = 0
  let socket: WebSocketLike | undefined
  let acknowledged = false
  let connecting = false
  let attempt = 0
  let keepAliveTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let keepAliveMs = DEFAULT_CONNECTION_TIMEOUT_MS

  function settle(entry: Entry<Op>, error?: MbcRealtimeError): void {
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
    if (message === undefined) return
    if (socket?.readyState === OPEN) socket.send(JSON.stringify(message))
  }

  function sendSubscribe(id: string, entry: Entry<Op>): void {
    let message: unknown
    try {
      message = protocol.subscribe(id, entry.operation)
    } catch (cause) {
      fail(id, authError(cause))
      return
    }
    if (!isPromise(message)) {
      send(message)
      return
    }
    const ws = socket
    message.then(
      (resolved) => {
        // A reconnect sends every subscription again after its own ack.
        if (socket !== ws || !acknowledged || entries.get(id) !== entry) return
        send(resolved)
      },
      (cause: unknown) => fail(id, authError(cause))
    )
  }

  function handle(event: ProtocolEvent): void {
    switch (event.kind) {
      case 'ack':
        acknowledged = true
        attempt = 0
        keepAliveMs = event.timeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
        armKeepAlive()
        for (const [id, entry] of entries) sendSubscribe(id, entry)
        return
      case 'keepAlive':
        armKeepAlive()
        return
      case 'started': {
        const entry = entries.get(event.id)
        if (entry) settle(entry)
        return
      }
      case 'data':
        entries.get(event.id)?.handlers.next(event.data)
        return
      case 'failed':
        fail(event.id, event.error)
        return
      case 'ended':
        entries.delete(event.id)
        releaseIfIdle()
        return
      case 'rejected':
        failAll(event.error)
        shutdown()
        return
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
    let target: { url: string; protocols: string[] }
    try {
      target = await protocol.connect()
    } catch (cause) {
      connecting = false
      failAll(authError(cause))
      return
    }
    connecting = false
    if (entries.size === 0) return

    const Ctor =
      options.WebSocket ??
      (globalThis.WebSocket as unknown as WebSocketConstructor)
    const ws = new Ctor(target.url, target.protocols)
    socket = ws
    acknowledged = false
    ws.onopen = () => send(protocol.init)
    ws.onmessage = (message) => {
      if (typeof message.data !== 'string' || socket !== ws) return
      for (const event of protocol.parse(message.data, { acknowledged }))
        handle(event)
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
    operation: Op,
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
    const entry: Entry<Op> = {
      operation,
      handlers,
      resolveReady,
      rejectReady,
      settled: false,
    }
    entries.set(id, entry)

    if (socket && acknowledged) sendSubscribe(id, entry)
    else void connect()

    return {
      ready,
      unsubscribe() {
        if (!entries.delete(id)) return
        settle(
          entry,
          new MbcRealtimeError('Unsubscribed before the subscription started')
        )
        send(protocol.unsubscribe(id))
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
