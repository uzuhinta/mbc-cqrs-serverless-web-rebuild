import type { WebSocketLike } from '../src/realtime/client'

type Sent = { type: string; id?: string; payload?: { data?: string } }

/** Browser-like WebSocket double; tests drive the "server" side. */
export class FakeWebSocket implements WebSocketLike {
  static instances: FakeWebSocket[] = []

  readyState = 0
  sent: Sent[] = []
  closedWith: { code: number; reason: string } | undefined
  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null

  constructor(
    readonly url: string,
    readonly protocols?: string | string[]
  ) {
    FakeWebSocket.instances.push(this)
  }

  static reset(): void {
    FakeWebSocket.instances = []
  }

  static latest(): FakeWebSocket {
    const socket = FakeWebSocket.instances.at(-1)
    if (!socket) throw new Error('no socket was opened')
    return socket
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as Sent)
  }

  close(code = 1000, reason = ''): void {
    this.readyState = 3
    this.closedWith = { code, reason }
    this.onclose?.({ code, reason })
  }

  // ---- server side ----

  open(): void {
    this.readyState = 1
    this.onopen?.({})
  }

  receive(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) })
  }

  /** Opens and acknowledges the connection. */
  accept(connectionTimeoutMs = 300_000): void {
    this.open()
    this.receive({ type: 'connection_ack', payload: { connectionTimeoutMs } })
  }

  starts(): Sent[] {
    return this.sent.filter((message) => message.type === 'start')
  }

  ackAll(): void {
    for (const start of this.starts())
      this.receive({ type: 'start_ack', id: start.id })
  }

  drop(): void {
    this.readyState = 3
    this.onclose?.({ code: 1006, reason: 'dropped' })
  }
}
