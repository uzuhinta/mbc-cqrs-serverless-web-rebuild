# @mbc-cqrs-serverless/client-web

A small client for MBC CQRS Serverless backends: JSON over HTTP with tenant and auth headers, AppSync real-time messages over a WebSocket, and `command()`, which sends a command and waits for its `finish:FINISHED` status. No AWS SDK. ESM-only; the React bindings work with React 18 and 19.

## Install

```bash
pnpm add @mbc-cqrs-serverless/client-web
```

## Create a client

```ts
import { createMbcClient } from '@mbc-cqrs-serverless/client-web'

export const client = createMbcClient({
  apiUrl: 'https://api.example.com',
  tenantCode: 'my-tenant',
  // Any token source: Amplify, NextAuth, your own. Return undefined to send no Authorization header.
  getAuthToken: async () => localStorage.getItem('idToken') ?? undefined,
  realtime: {
    url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql',
    auth: { type: 'USER_POOL' }, // or { type: 'API_KEY', apiKey: '…' }
  },
})
```

Options: `apiUrl`, `tenantCode` (string or function), `getAuthToken`, `headers`, `fetch`, `timeoutMs` (HTTP, default 30 000), `realtime` (omit it and `command()` resolves right after the HTTP response).

## HTTP

```ts
const page = await client.get<{ items: unknown[]; total: number }>(
  '/api/survey-template',
  {
    query: { page: 1, pageSize: 10, orderBys: ['createdAt:desc'] }, // arrays repeat the key
  }
)
await client.post('/api/item', { name: 'A' })
```

Every call accepts `signal` (an `AbortSignal`). Failures are classes, never logs or toasts:

```ts
import {
  MbcAbortError,
  MbcApiError,
  MbcCommandError,
  MbcTimeoutError,
} from '@mbc-cqrs-serverless/client-web'
```

- `MbcApiError` — `status` and `body`; `status` is `0` when no response arrived (network failure, or `getAuthToken` threw).
- `MbcTimeoutError`, `MbcAbortError`, `MbcRealtimeError`.
- `MbcCommandError` — the backend reported `<step>:FAILED` for a command (`requestId`, `status`).

## Commands

```ts
const { data, requestId } = await client.command<{ requestId: string }>(
  {
    method: 'PUT',
    path: '/api/survey-template/abc',
    body: { name: 'New name' },
  },
  { timeoutMs: 60_000 }
)
```

`command()` subscribes to command-status messages before sending, so a fast `finish:FINISHED` is never missed. A response without `requestId` rejects with `MbcApiError` (status 2xx); the mbc backend returns that when an update changed nothing. Without `realtime`, a command resolves as soon as the backend accepts it. It listens under the configured tenant and, when different, its lowercase form, which backends from core 1.1.0 send under. If the subscription does not start within `timeoutMs`, it rejects with `MbcRealtimeError` and sends nothing; a timeout after sending is `MbcTimeoutError` (the outcome is unknown).

A request that changes several items (a bulk import) finishes once per changed item:

```ts
await client.command<{ requestId?: string }[]>(
  { method: 'POST', path: '/api/master-bulk', body: { items } },
  {
    // Changed items share one request id; unchanged ones carry none.
    requestIdOf: (data) => data.find((item) => item.requestId)?.requestId,
    expectedFinishes: (data) => data.filter((item) => item.requestId).length,
    onProgress: (done, expected) => console.info(`${done}/${expected}`),
  }
)
```

- `requestIdOf(data)` — reads the request id from the response (default `data.requestId`).
- `expectedFinishes` — how many `finish:FINISHED` messages complete the command: a number, or a function of the response; `0` resolves on the response. Each item (`pk` + `sk`) counts once.
- `onProgress(done, expected, message)` — called once per finished item; an error it throws rejects the command.

## Real-time messages

```ts
const subscription = client.messages?.subscribe(
  { tenantCode: 'my-tenant', action: 'command-status' },
  (message) => console.info(message.id, message.content),
  (error) => console.error(error)
)
await subscription?.ready
subscription?.unsubscribe()
```

One WebSocket per client, opened on the first subscription and closed after the last; it keeps alive, reconnects with backoff and re-subscribes.

## React

```tsx
import {
  MbcClientProvider,
  useCommand,
  useMbcClient,
} from '@mbc-cqrs-serverless/client-web/react'

export function SaveButton({ body }: { body: unknown }) {
  const save = useCommand(({ client, signal, onPhase }, payload: unknown) =>
    client.command(
      { method: 'POST', path: '/api/item', body: payload },
      { signal, onPhase }
    )
  )
  return (
    <button
      disabled={save.status === 'sending' || save.status === 'waiting'}
      onClick={() => save.run(body)}
    >
      {save.status === 'error' ? 'Retry' : 'Save'}
    </button>
  )
}
```

Wrap the tree in `<MbcClientProvider client={client}>`; `useMbcClient()` returns the client. `useCommand` aborts on unmount and reports `idle | sending | waiting | done | error`.

`useQuery(key, load)` fetches with `load(signal)` whenever `key` changes, aborting the previous request and dropping an answer for an old key; pass `null` as `load` to stay idle. It returns `{ data, loading, error, refetch }`:

```tsx
import { useMbcClient, useQuery } from '@mbc-cqrs-serverless/client-web/react'

export function Item({ id }: { id: string }) {
  const client = useMbcClient()
  const item = useQuery(id, (signal) =>
    client.get<{ name: string }>(`/api/item/${encodeURIComponent(id)}`, {
      signal,
    })
  )
  if (item.error) return <button onClick={item.refetch}>Retry</button>
  return <p>{item.loading ? '…' : item.data?.name}</p>
}
```
