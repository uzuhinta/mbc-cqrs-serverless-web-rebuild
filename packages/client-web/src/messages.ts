export const ON_MESSAGE = /* GraphQL */ `
  subscription OnMessage($tenantCode: String!, $action: String, $id: String) {
    onMessage(tenantCode: $tenantCode, action: $action, id: $id) {
      id
      table
      pk
      sk
      tenantCode
      action
      content
    }
  }
`

export type MessageFilter = { tenantCode: string; action?: string; id?: string }

export type MbcMessage = {
  id: string
  table?: string
  pk?: string
  sk?: string
  tenantCode: string
  action?: string
  content: unknown
}

function parseContent(content: unknown): unknown {
  if (typeof content !== 'string') return content
  try {
    return JSON.parse(content)
  } catch {
    return content
  }
}

/** Reads one notification record: an object with a string `id`. */
export function readMessage(value: unknown): MbcMessage | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string') return undefined
  return { ...(record as MbcMessage), content: parseContent(record.content) }
}

/** Reads an `onMessage` subscription payload. */
export function parseMessage(data: unknown): MbcMessage | undefined {
  return readMessage((data as { onMessage?: unknown } | null)?.onMessage)
}
