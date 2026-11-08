# client-web AppSync Events transport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a client-web app receive the backend's notifications over AWS AppSync Events as an alternative to the GraphQL subscription, chosen with `realtime.transport`, with everything above the client unchanged.

**Architecture:** The socket lifecycle in `realtime/client.ts` (lazy connect, keep-alive, jittered backoff, re-subscribe, idle close, `ready`) moves into a protocol-neutral `realtime/connection.ts` driven by a small adapter; GraphQL and Events are two adapters. A transport-agnostic `MessageStream` (`subscribe(filter) → MbcMessage`) sits on top of either client; `createMbcClient` and `createCommand` use it. Events channel naming and post-receipt filtering live in `realtime/channel.ts`.

**Tech Stack:** TypeScript, Vitest, pnpm workspace (`packages/client-web`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-appsync-events-design.md`

## Global Constraints

- No new runtime or dev dependencies; no AWS SDK, no Amplify.
- Omitting `realtime.transport` (or `'graphql'`) must behave exactly as today; every existing test in `packages/client-web` keeps passing **unchanged** (except imports in tests of moved internals, if any).
- Existing exports keep their names and signatures (`createRealtimeClient`, `createCommand(http, realtime)`, `ON_MESSAGE`, `parseMessage`, types).
- Events auth: API key only (`{ type: 'API_KEY', apiKey }`).
- Sanitizer order is the server's: empty → `none`; `[^a-zA-Z0-9]` → `-`; truncate to 50; strip leading/trailing `-`; empty → `none`.
- Namespace default `'default'`.
- Nothing connects at import or during render (SSR-safe).
- No consumer-specific names (apps, organisations, endpoints) in code, docs, tests, commits. Example hosts: `abc.appsync-api.ap-northeast-1.amazonaws.com`, `api.example.com`.
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011KPZCcUnsRe8xry6DPcPHW
  ```
- Gate before finishing: `pnpm verify`, `pnpm smoke`, and `pnpm use-react 18 && pnpm test && pnpm use-react 19`.

## Review Focus

1. A tenant with upper case and `_` (`My_Tenant`): `command()` on Events subscribes `/default/My-Tenant/command-status/*` and `/default/my-tenant/command-status/*`, and a finish message with `tenantCode: 'my_tenant'` resolves the command exactly once (Task 4 test `events: resolves under the lowercased tenant, heard once`).
2. A dropped Events socket reconnects and re-sends every live `subscribe` (with fresh `authorization`) after the new `connection_ack`; `ready` is not reset (Task 3 test `reconnects and re-subscribes`).
3. `unsubscribe()` before `subscribe_success`: sends `unsubscribe`, later `data` for that id is not delivered, socket closes when idle (Task 3 test `unsubscribe before success drops later data`).
4. A `data` message whose `event` is an array of several strings, one not JSON: each is delivered in order, the non-JSON one as the raw string (Task 3 test `delivers each event of an array`); the stream drops the non-message one (Task 4 test `drops events that are not messages`).
5. A JavaScript caller passing `transport: 'events'` with `USER_POOL`: subscribe rejects `ready` with `MbcRealtimeError`, calls `error`, opens no socket; `command()` rejects with nothing sent (Task 3 test `rejects non-API-key auth without connecting`, Task 5 test `events with user-pool auth fails before sending`).

---

### Task 1: Channel naming and message reading

**Files:**
- Create: `packages/client-web/src/realtime/channel.ts`
- Modify: `packages/client-web/src/messages.ts` (extract `readMessage`)
- Test: `packages/client-web/src/realtime/channel.test.ts`, `packages/client-web/src/messages.test.ts` (create if absent)

**Interfaces:**
- Produces:
  - `sanitizeSegment(value: string | undefined): string`
  - `eventsChannel(namespace: string, filter: MessageFilter): string`
  - `matchesFilter(message: MbcMessage, filter: MessageFilter): boolean` — `tenantCode` exact; `action`/`id` exact when present in the filter.
  - `readMessage(value: unknown): MbcMessage | undefined` in `messages.ts` — the record rules of today's `parseMessage` (object, string `id`, `content` JSON-parsed when a string). `parseMessage(data)` becomes `readMessage(data?.onMessage)`.

- [ ] **Step 1: Write failing tests**

`channel.test.ts`:
- `sanitizeSegment` table (`it.each`): `undefined`→`none`; `''`→`none`; `'default'`→`default`; `'MBC'`→`MBC` (case kept); `'my_tenant'`→`my-tenant`; `'MASTER#mbc#PRODUCT'`→`MASTER-mbc-PRODUCT`; `'#a@'`→`a`; `'---'`→`none`; `'a'.repeat(49) + '#b'`→`'a'.repeat(49)` (truncate to 50 = 49 a's + `-`, then trim); `'#' + 'a'.repeat(60)`→`'a'.repeat(49)` (replace → `-aaa…`, truncate 50, trim leading dash); `'x'.repeat(60)`→`'x'.repeat(50)`.
- `eventsChannel('default', { tenantCode: 'MBC' })` → `/default/MBC/*`; with `action: 'command-status'` → `/default/MBC/command-status/*`; with action and `id: 'MASTER#MBC#X@1'` → `/default/MBC/command-status/MASTER-MBC-X-1`; with `id` but no action → `/default/MBC/*`; namespace sanitized: `eventsChannel('my_ns', …)` starts `/my-ns/`.
- `matchesFilter`: true for same tenant; false for `tenantCode: 'mbc'` vs filter `'MBC'`; false when filter `id: 'a_b'` and message `id: 'a-b'`; false when filter action `'x'` and message action `'y'`; true when filter has no action.

`messages.test.ts`: `readMessage({ id: '1', tenantCode: 't', content: '{"a":1}' })` → content `{ a: 1 }`; `readMessage({ id: 1 })` → `undefined`; `readMessage('x')` → `undefined`; `parseMessage({ onMessage: { id: '1', tenantCode: 't', content: 'raw' } })` keeps `'raw'`.

- [ ] **Step 2: Run, verify failure**

Run: `pnpm vitest run packages/client-web/src/realtime/channel.test.ts packages/client-web/src/messages.test.ts`
Expected: FAIL — modules/exports not found.

- [ ] **Step 3: Implement** `channel.ts` and `readMessage` per Interfaces.

- [ ] **Step 4: Run, verify pass** (same command) — Expected: PASS. Also `pnpm vitest run packages/client-web` — Expected: all pass.

- [ ] **Step 5: Commit** — `feat(client-web): name AppSync Events channels like the backend`

---

### Task 2: Protocol-neutral connection core

Refactor only: GraphQL behaviour and its tests stay identical.

**Files:**
- Create: `packages/client-web/src/realtime/connection.ts`
- Modify: `packages/client-web/src/realtime/client.ts` (becomes the GraphQL adapter + `createRealtimeClient` on the core)
- Test: existing `packages/client-web/src/realtime/client.test.ts` (unchanged), `command.test.ts` (unchanged)

**Interfaces:**
- Produces (internal, not exported from `index.ts`):
  ```ts
  type ProtocolEvent =
    | { kind: 'ack'; timeoutMs?: number }
    | { kind: 'keepAlive' }
    | { kind: 'started'; id: string }
    | { kind: 'data'; id: string; data: unknown }
    | { kind: 'failed'; id: string; error: MbcRealtimeError }   // one subscription
    | { kind: 'ended'; id: string }                              // server completed it
    | { kind: 'rejected'; error: MbcRealtimeError }              // connection refused: fail all, no reconnect

  type Protocol<Op> = {
    /** URL + subprotocols for a new socket; may throw (auth). */
    connect(): Promise<{ url: string; protocols: string[] }>
    init: unknown
    parse(raw: string, state: { acknowledged: boolean }): ProtocolEvent[]
    /** The subscribe message, or a promise of it (fresh auth); may throw. */
    subscribe(id: string, operation: Op): unknown | Promise<unknown>
    unsubscribe(id: string): unknown
  }

  function createConnection<Op>(protocol: Protocol<Op>, options: {
    WebSocket?: WebSocketConstructor
    reconnect?: { initialDelayMs?: number; maxDelayMs?: number }
    random?: () => number
  }): { subscribe(operation: Op, handlers: SubscriptionHandlers): Subscription; close(): void }
  ```
  Ids stay `String(n)` (valid for both protocols). The core owns: entries, `ready`/settle (with the `ready.catch` guard), lazy connect, `init` on open, keep-alive timer (default 300 000 ms, close code 4000), backoff `min(max, initial·2^attempt)·(0.5 + random/2)`, re-subscribe after each ack, idle shutdown, the "socket changed / no longer subscribed" guard around async subscribe messages, and turning a thrown `connect`/`subscribe` into `MbcRealtimeError('Could not get a real-time auth token', { cause })` unless already an `MbcRealtimeError`.
- `createRealtimeClient(options: RealtimeOptions): RealtimeClient` — unchanged signature; GraphQL adapter maps `connection_ack`(payload.connectionTimeoutMs)→ack, `ka`→keepAlive, `start_ack`→started, `data`→data(payload.data), `error` with id→failed('Subscription failed', { errors }), `error` without id→nothing, `complete`→ended, `connection_error`→rejected('Real-time connection was rejected', { errors }); subprotocols `['graphql-ws']`; `connectUrl` as today; per-start fresh token for `USER_POOL`.

- [ ] **Step 1: Baseline** — Run: `pnpm vitest run packages/client-web` — Expected: all pass (record count).
- [ ] **Step 2: Extract the core and rewrite `client.ts` on it.**
- [ ] **Step 3: Verify** — same command — Expected: same count, all pass, no test file edited (`git diff --stat -- '*.test.ts'` empty). `pnpm --filter @mbc-cqrs-serverless/client-web typecheck` passes.
- [ ] **Step 4: Commit** — `refactor(client-web): share the socket lifecycle between real-time protocols`

---

### Task 3: AppSync Events client

**Files:**
- Create: `packages/client-web/src/realtime/events.ts`, `packages/client-web/src/realtime/events.test.ts`
- Modify: `packages/client-web/test/fake-websocket.ts` (Events helpers)

**Interfaces:**
- Consumes: `createConnection`, `Protocol` (Task 2).
- Produces:
  ```ts
  type EventsAuth = { type: 'API_KEY'; apiKey: string }
  type EventsOptions = {
    url: string            // Events HTTP endpoint, e.g. https://abc.appsync-api.ap-northeast-1.amazonaws.com/event
    auth: EventsAuth
    WebSocket?: WebSocketConstructor
    reconnect?: { initialDelayMs?: number; maxDelayMs?: number }
    random?: () => number
  }
  type EventsHandlers = { next: (event: unknown) => void; error?: (error: MbcRealtimeError) => void }
  type EventsClient = { subscribe(channel: string, handlers: EventsHandlers): Subscription; close(): void }
  function createEventsClient(options: EventsOptions): EventsClient
  function eventsEndpoint(httpUrl: string): { url: string; host: string }
  ```
- `eventsEndpoint`: `…appsync-api…` → `…appsync-realtime-api…`; `https`→`wss`, `http`→`ws`; path `/event/realtime` (regardless of the given path); `host` = the HTTP URL's host. Custom domain: same host, path `/event/realtime`.
- Subprotocols: `['aws-appsync-event-ws', 'header-' + base64url(JSON.stringify({ host, 'x-api-key': apiKey }))]`, base64url = `btoa` with `+`→`-`, `/`→`_`, `=` stripped.
- Messages: init `{ type: 'connection_init' }`; subscribe `{ type: 'subscribe', id, channel, authorization: { 'x-api-key': apiKey, host } }`; unsubscribe `{ type: 'unsubscribe', id }`.
- Parse: `connection_ack` (top-level `connectionTimeoutMs`)→ack; `ka`→keepAlive; `subscribe_success`→started; `subscribe_error`→failed('Subscription failed', { errors }); `data` → one `data` per event: `event` string or array of strings, each `JSON.parse`d, a non-JSON string passed as is; `broadcast_error`, `unsubscribe_success`, `unsubscribe_error`→nothing; `error` with id→failed; `error` without id before ack→rejected('Real-time connection was rejected', { errors }), after ack→nothing.
- Non-`API_KEY` auth (JS callers): `subscribe` returns a `Subscription` whose `ready` rejects with `MbcRealtimeError('AppSync Events supports only API key auth')`, calls `handlers.error` asynchronously (microtask), creates no socket.

- [ ] **Step 1: Extend the fake** — add to `FakeWebSocket`: `acceptEvents(connectionTimeoutMs = 300_000)` (open + `{ type: 'connection_ack', connectionTimeoutMs }`), `subscribes()` (sent messages with `type: 'subscribe'`), `ackSubscribes()` (`subscribe_success` for each). Widen `Sent` with `channel?: string; authorization?: Record<string, string>`.

- [ ] **Step 2: Write failing tests** in `events.test.ts` (fake socket, `random: () => 0`, fake timers where needed):
  - `eventsEndpoint` table: AWS host → `wss://abc.appsync-realtime-api.ap-northeast-1.amazonaws.com/event/realtime`, host `abc.appsync-api.ap-northeast-1.amazonaws.com`; `https://api.example.com/event` → `wss://api.example.com/event/realtime`, host `api.example.com`; `http://localhost:4000/event` → `ws://localhost:4000/event/realtime`.
  - `opens one socket lazily with the events subprotocols`: no socket before subscribe; protocols[0] `aws-appsync-event-ws`; protocols[1] decodes (reverse base64url) to `{ host: 'abc.appsync-api.ap-northeast-1.amazonaws.com', 'x-api-key': 'key' }` and contains no `=`, `+`, `/`; url has no query string; on open sends `connection_init`.
  - `subscribes after the ack and resolves ready on subscribe_success`: subscribe message equals `{ type: 'subscribe', id, channel: '/default/t/*', authorization: { 'x-api-key': 'key', host } }`; `ready` pending until `subscribe_success`.
  - `delivers each event of an array`: `event: ['{"a":1}', 'plain']` → `next` called with `{ a: 1 }` then `'plain'`; string `event: '{"b":2}'` → `{ b: 2 }`.
  - `subscribe_error rejects ready and calls error`; `error with id fails that subscription only` (another stays live).
  - `broadcast_error keeps the subscription`: later data still delivered, `error` not called.
  - `an error before the ack rejects everything without reconnecting`: `error` (no id) before ack → all `ready` reject, socket closed, after advancing 60 s no new socket.
  - `closes after connectionTimeoutMs without ka`: ack with 1 000 → advance 1 000 → closed with code 4000; a `ka` at 900 postpones it.
  - `reconnects and re-subscribes` (Review Focus 2): drop after success → after backoff a new socket; after `acceptEvents` it sends `subscribe` for the live id with `authorization`; `ready` remains resolved; data on the new socket delivered.
  - `unsubscribe before success drops later data` (Review Focus 3): sends `{ type: 'unsubscribe', id }`, `ready` rejects, subsequent `data` for that id not delivered, socket closed (idle).
  - `rejects non-API-key auth without connecting` (Review Focus 5): `auth: { type: 'USER_POOL' } as never` → `ready` rejects `MbcRealtimeError`, `error` called, `FakeWebSocket.instances` empty.

- [ ] **Step 3: Run, verify failure** — Run: `pnpm vitest run packages/client-web/src/realtime/events.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 4: Implement** `events.ts` per Interfaces.
- [ ] **Step 5: Run, verify pass** — same command, then `pnpm vitest run packages/client-web` — Expected: all pass.
- [ ] **Step 6: Commit** — `feat(client-web): add an AppSync Events real-time client`

---

### Task 4: Transport-agnostic message stream; `createCommand` on it

**Files:**
- Create: `packages/client-web/src/realtime/stream.ts`, `packages/client-web/src/realtime/stream.test.ts`
- Modify: `packages/client-web/src/command.ts`, `packages/client-web/src/command.test.ts`

**Interfaces:**
- Consumes: `RealtimeClient` (Task 2), `EventsClient` (Task 3), `eventsChannel`, `matchesFilter`, `readMessage`, `parseMessage`, `ON_MESSAGE`.
- Produces:
  ```ts
  type MessageHandlers = { next: (message: MbcMessage) => void; error?: (error: MbcRealtimeError) => void }
  type MessageStream = {
    readonly transport: 'graphql' | 'events'
    subscribe(filter: MessageFilter, handlers: MessageHandlers): Subscription
    close(): void
  }
  function graphqlMessages(realtime: RealtimeClient): MessageStream     // ON_MESSAGE + parseMessage, as client.ts does today
  function eventsMessages(events: EventsClient, namespace?: string): MessageStream  // default 'default'; eventsChannel + readMessage + matchesFilter
  ```
- `createCommand(http: Http, realtime: RealtimeClient | MessageStream | undefined)` — a value with a `transport` property is a stream; a `RealtimeClient` is wrapped with `graphqlMessages`. The command subscribes `{ tenantCode: tenant, action: 'command-status' }` per tenant spelling via the stream; all other logic unchanged.

- [ ] **Step 1: Write failing tests**
  - `stream.test.ts`: `eventsMessages` subscribes channel `/default/MBC/command-status/*` for `{ tenantCode: 'MBC', action: 'command-status' }` and `/ns-1/MBC/*` with namespace `'ns_1'`; delivers a matching message (content JSON-parsed); `drops events that are not messages` (Review Focus 4: `'plain'`, `{ id: 1 }`); drops `tenantCode: 'mbc'` on an `MBC` subscription; drops an `id: 'a-b'` message on an `id: 'a_b'` filter. `graphqlMessages` sends `ON_MESSAGE` with the filter as variables and delivers `parseMessage` results.
  - `command.test.ts`: add a second `setupEvents()` beside `setup()` (Events client on `FakeWebSocket`, `createCommand(http, eventsMessages(events))`) and an Events `status()` helper sending `{ type: 'data', id, event: JSON.stringify({ id, tenantCode, action: 'command-status', pk, sk, content: { status } }) }` matching what the GraphQL helper sends. Run the core cases on Events: resolves on `finish:FINISHED`; rejects `MbcCommandError` on `:FAILED`; `MbcRealtimeError` with nothing sent when `subscribe_error` arrives; `MbcTimeoutError` after sending; bulk `expectedFinishes` counting each pk+sk once; `events: resolves under the lowercased tenant, heard once` (Review Focus 1: tenant `My_Tenant`, channels `/default/My-Tenant/command-status/*` and `/default/my-tenant/command-status/*`, finish with `tenantCode: 'my_tenant'` delivered on the lowercase subscription resolves once).
  - Existing GraphQL `command.test.ts` cases stay as they are (they pass a `RealtimeClient`).

- [ ] **Step 2: Run, verify failure** — Run: `pnpm vitest run packages/client-web/src/realtime/stream.test.ts packages/client-web/src/command.test.ts` — Expected: FAIL (stream module missing; Events command cases fail).
- [ ] **Step 3: Implement** `stream.ts`; switch `command.ts` to the stream.
- [ ] **Step 4: Run, verify pass** — same command, then `pnpm vitest run packages/client-web` — Expected: all pass.
- [ ] **Step 5: Commit** — `feat(client-web): wait for commands over either real-time transport`

---

### Task 5: `createMbcClient` config and exports

**Files:**
- Modify: `packages/client-web/src/client.ts`, `packages/client-web/src/index.ts`, `packages/client-web/src/client.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  ```ts
  type GraphQLRealtimeConfig = { transport?: 'graphql'; url: string; auth: RealtimeAuth; WebSocket?: WebSocketConstructor }
  type EventsRealtimeConfig = { transport: 'events'; url: string; auth: EventsAuth; namespace?: string; WebSocket?: WebSocketConstructor }
  type MbcClientConfig = HttpConfig & { realtime?: GraphQLRealtimeConfig | EventsRealtimeConfig }
  ```
  `createMbcClient` builds one `MessageStream` (or none) and uses it for `command` and `messages.subscribe(filter, onMessage, onError)`; `close()` closes it. `MbcClient` type unchanged.
- `index.ts` adds: `createEventsClient`, `eventsEndpoint`, types `EventsClient`, `EventsOptions`, `EventsAuth`, `EventsHandlers`; `graphqlMessages`, `eventsMessages`, types `MessageStream`, `MessageHandlers`; `sanitizeSegment`, `eventsChannel`, `matchesFilter`; `readMessage`; types `GraphQLRealtimeConfig`, `EventsRealtimeConfig`.

- [ ] **Step 1: Write failing tests** in `client.test.ts`:
  - `events transport: messages.subscribe listens on the tenant channel`: config `{ transport: 'events', url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/event', auth: { type: 'API_KEY', apiKey: 'k' }, namespace: 'app', WebSocket: FakeWebSocket }`; `messages.subscribe({ tenantCode: 't' }, …)` → subscribe channel `/app/t/*`; a data event reaches `onMessage` as an `MbcMessage`.
  - `events transport: command waits on command-status`: one `command()` round trip resolves on a finish event.
  - `events with user-pool auth fails before sending` (Review Focus 5): `auth: { type: 'USER_POOL' } as never` → `command()` rejects `MbcRealtimeError`, fetch never called.
  - `graphql stays the default`: config without `transport` opens a socket with protocols `['graphql-ws']`.
  - Type test (`expectTypeOf` or `// @ts-expect-error`): `{ transport: 'events', auth: { type: 'USER_POOL' } }` does not type-check.
- [ ] **Step 2: Run, verify failure** — Run: `pnpm vitest run packages/client-web/src/client.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, verify pass** — same command, then `pnpm vitest run packages/client-web` and `pnpm --filter @mbc-cqrs-serverless/client-web typecheck` — Expected: pass.
- [ ] **Step 5: Commit** — `feat(client-web): choose GraphQL or AppSync Events in createMbcClient`

---

### Task 6: Docs, usage skill, smoke, changeset, gate

**Files:**
- Modify: `packages/client-web/README.md`, `packages/master-web/README.md`, `packages/survey-web/README.md` (only where it shows `realtime`, if it does), `skills/mbc-cqrs-serverless-web/references/setup.md`, `skills/mbc-cqrs-serverless-web/references/troubleshooting.md`, `apps/next-smoke/app/client-screens.tsx`, `.changeset/first-release.md`

- [ ] **Step 1: client-web README** — after "Create a client", a `## Real-time: GraphQL or AppSync Events` section: both configs (GraphQL as today; Events `{ transport: 'events', url: 'https://abc.appsync-api.ap-northeast-1.amazonaws.com/event', auth: { type: 'API_KEY', apiKey: '…' }, namespace: 'default' }`); `transport` omitted = GraphQL; pick the one the backend's `NOTIFICATION_TRANSPORTS` publishes to (`appsync-graphql` / `appsync-event`); `namespace` must equal the backend's `APPSYNC_EVENTS_NAMESPACE`; Events supports API key auth only; channel naming `/{namespace}/{tenant}/{action}/{id}` with non-alphanumerics → `-` (`sanitizeSegment`, `eventsChannel` exported for apps that subscribe with `createEventsClient` directly); the tenant-spelling sentence in "Commands" applies to both transports. Update the Options line to mention `realtime.transport`.
- [ ] **Step 2: master-web / survey-web READMEs** — one line beside their `realtime` example: "For AppSync Events, see client-web's README (`transport: 'events'`)."
- [ ] **Step 3: Usage skill** — `setup.md` §3: a bullet "**Events instead of GraphQL:** `realtime: { transport: 'events', url: '<Events HTTP endpoint>/event', auth: { type: 'API_KEY', apiKey }, namespace }` when the backend publishes with `NOTIFICATION_TRANSPORTS=appsync-event`; API key only; `namespace` = `APPSYNC_EVENTS_NAMESPACE`." `troubleshooting.md`: row "Every save times out with `transport: 'events'`" | "namespace differs from `APPSYNC_EVENTS_NAMESPACE`, the backend's `NOTIFICATION_TRANSPORTS` lacks `appsync-event`, or `url` is the GraphQL endpoint" | "match the namespace; enable the transport on the backend; use the Events endpoint (`…/event`)".
- [ ] **Step 4: Smoke** — in `client-screens.tsx` add a second, never-connecting client typed with an Events config (`transport: 'events'`, `url: 'https://example.invalid/event'`, `auth: { type: 'API_KEY', apiKey: 'smoke' }`) passed to one connected page or `MbcClientProvider`, so the build type-checks the Events config through Next.
- [ ] **Step 5: Changeset** — append to `.changeset/first-release.md`: "`client-web` receives notifications over AppSync GraphQL subscriptions or AppSync Events (`realtime.transport`)."
- [ ] **Step 6: Gate** — Run: `pnpm verify` → Expected: all steps pass (format, lint, build, typecheck, test, check:package; the shipped skill copy matches source). Run: `pnpm smoke` → Expected: build succeeds. Run: `pnpm use-react 18 && pnpm test; pnpm use-react 19` → Expected: tests pass on React 18, workspace back on 19.
- [ ] **Step 7: Commit** — `docs: document the AppSync Events transport`
