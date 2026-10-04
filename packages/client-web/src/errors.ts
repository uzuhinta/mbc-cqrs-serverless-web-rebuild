export class MbcError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = new.target.name
  }
}

/** The server answered with a non-2xx status, or no response arrived (`status: 0`). */
export class MbcApiError extends MbcError {
  readonly status: number
  readonly body: unknown

  constructor(
    status: number,
    body: unknown,
    message = `Request failed with status ${status}`,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.status = status
    this.body = body
  }
}

export class MbcTimeoutError extends MbcError {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Timed out after ${timeoutMs}ms`)
    this.timeoutMs = timeoutMs
  }
}

export class MbcAbortError extends MbcError {
  constructor(options?: { cause?: unknown }) {
    super('The operation was aborted', options)
  }
}

export class MbcRealtimeError extends MbcError {
  readonly errors: unknown

  constructor(
    message: string,
    options?: { cause?: unknown; errors?: unknown }
  ) {
    super(message, options)
    this.errors = options?.errors
  }
}

/** The backend reported a `<step>:FAILED` command status. */
export class MbcCommandError extends MbcError {
  readonly requestId: string
  readonly status: string

  constructor(requestId: string, status: string) {
    super(`Command ${requestId} failed (${status})`)
    this.requestId = requestId
    this.status = status
  }
}
