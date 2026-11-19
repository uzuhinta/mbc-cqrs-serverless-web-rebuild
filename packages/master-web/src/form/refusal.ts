/** What the editors need to explain a refusal: whether access is on, and the permission text. */
export type RefusalTexts = { enabled: boolean; permissionDenied: string }

/** The HTTP status of client-web's `MbcApiError`, also as a bulk batch's `cause`; read by name. */
function apiErrorOf(
  error: unknown
): (Error & { status: number; body?: unknown }) | undefined {
  if (!(error instanceof Error)) return undefined
  if (
    error.name === 'MbcApiError' &&
    typeof (error as Error & { status?: unknown }).status === 'number'
  )
    return error as Error & { status: number; body?: unknown }
  return apiErrorOf(error.cause)
}

/** A NestJS error body's `message`: a text, or a list of texts. */
function serverMessageOf(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null | undefined)?.message
  if (typeof message === 'string' && message.trim() !== '') return message
  if (Array.isArray(message)) {
    const texts = message.filter(
      (text): text is string => typeof text === 'string' && text.trim() !== ''
    )
    if (texts.length > 0) return texts.join(' ')
  }
  return undefined
}

/**
 * Why the backend refused a write, with access enabled: no permission
 * (HTTP 403), or the backend's own reason (HTTP 400, when it sent one).
 * `undefined` keeps the screen's usual text.
 */
export function refusalOf(
  reason: unknown,
  texts: RefusalTexts | undefined
): string | undefined {
  if (!texts?.enabled) return undefined
  const error = apiErrorOf(reason)
  if (error?.status === 403) return texts.permissionDenied
  if (error?.status === 400) return serverMessageOf(error.body)
  return undefined
}
