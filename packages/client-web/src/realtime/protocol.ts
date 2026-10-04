import { MbcRealtimeError } from '../errors'

export type RealtimeAuth =
  { type: 'API_KEY'; apiKey: string } | { type: 'USER_POOL' }

export type GraphQLOperation = {
  query: string
  variables?: Record<string, unknown>
}

export type ServerMessage =
  | { type: 'connection_ack'; payload?: { connectionTimeoutMs?: number } }
  | { type: 'ka' }
  | { type: 'start_ack'; id: string }
  | { type: 'data'; id: string; payload: { data?: unknown } }
  | { type: 'error'; id?: string; payload?: { errors?: unknown } }
  | { type: 'complete'; id: string }
  | { type: 'connection_error'; payload?: { errors?: unknown } }

export const CONNECTION_INIT = { type: 'connection_init' } as const

export function realtimeEndpoint(httpUrl: string): {
  url: string
  host: string
} {
  const url = new URL(httpUrl)
  const host = url.host
  if (url.hostname.includes('.appsync-api.')) {
    url.hostname = url.hostname.replace(
      '.appsync-api.',
      '.appsync-realtime-api.'
    )
    url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
    return { url: url.toString(), host }
  }
  url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/realtime`
  return { url: url.toString(), host }
}

export function authHeader(
  auth: RealtimeAuth,
  host: string,
  token: string | undefined
): Record<string, string> {
  if (auth.type === 'API_KEY') return { host, 'x-api-key': auth.apiKey }
  if (!token) {
    throw new MbcRealtimeError(
      'USER_POOL real-time auth needs getAuthToken to return a token'
    )
  }
  return { host, Authorization: token }
}

export function connectUrl(
  url: string,
  header: Record<string, string>
): string {
  const encoded = btoa(JSON.stringify(header))
  return `${url}?header=${encodeURIComponent(encoded)}&payload=e30=`
}

export function startMessage(
  id: string,
  operation: GraphQLOperation,
  header: Record<string, string>
) {
  return {
    id,
    type: 'start',
    payload: {
      data: JSON.stringify(operation),
      extensions: { authorization: header },
    },
  } as const
}

export function stopMessage(id: string) {
  return { id, type: 'stop' } as const
}

export function parseServerMessage(raw: string): ServerMessage | undefined {
  try {
    const message: unknown = JSON.parse(raw)
    if (
      typeof message === 'object' &&
      message !== null &&
      typeof (message as { type?: unknown }).type === 'string'
    ) {
      return message as ServerMessage
    }
  } catch {
    return undefined
  }
  return undefined
}
