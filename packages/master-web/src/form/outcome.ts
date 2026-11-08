/**
 * Whether a write may or may not have gone through: client-web's
 * `MbcTimeoutError`, or its network failure (exactly `MbcApiError` with
 * status 0: the connection dropped and the request may have reached the
 * backend). `MbcAuthError`, also status 0, sent nothing.
 * Also when it is the `cause` (a bulk batch). Checked by name, so errors
 * from another copy of client-web count too.
 */
export function isUnknownOutcome(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'MbcTimeoutError') return true
  if (
    error.name === 'MbcApiError' &&
    (error as Error & { status?: unknown }).status === 0
  )
    return true
  return error.cause !== undefined && isUnknownOutcome(error.cause)
}
