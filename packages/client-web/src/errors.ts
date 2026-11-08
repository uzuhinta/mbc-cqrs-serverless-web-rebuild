// Names are literals: minifiers rename classes, and `error.name` checks or
// telemetry grouping must behave the same in production builds.
export class MbcError extends Error {
  override name = 'MbcError'

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
  }
}

/** The server answered with a non-2xx status, or no response arrived (`status: 0`). */
export class MbcApiError extends MbcError {
  override name = 'MbcApiError'

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

/**
 * `getAuthToken` failed, so nothing was sent. An `MbcApiError` with status 0
 * like a network failure, but the request never left: retrying is safe.
 */
export class MbcAuthError extends MbcApiError {
  override name = 'MbcAuthError'

  constructor(options?: { cause?: unknown }) {
    super(0, undefined, 'Could not get an auth token', options)
  }
}

export class MbcTimeoutError extends MbcError {
  override name = 'MbcTimeoutError'

  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Timed out after ${timeoutMs}ms`)
    this.timeoutMs = timeoutMs
  }
}

export class MbcAbortError extends MbcError {
  override name = 'MbcAbortError'

  constructor(options?: { cause?: unknown }) {
    super('The operation was aborted', options)
  }
}

export class MbcRealtimeError extends MbcError {
  override name = 'MbcRealtimeError'

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
  override name = 'MbcCommandError'

  readonly requestId: string
  readonly status: string

  constructor(requestId: string, status: string) {
    super(`Command ${requestId} failed (${status})`)
    this.requestId = requestId
    this.status = status
  }
}
