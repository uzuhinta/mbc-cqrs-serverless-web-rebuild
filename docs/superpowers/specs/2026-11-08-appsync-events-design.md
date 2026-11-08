# client-web: AppSync Events transport — design

Status: draft, 2026-11-08. Calls marked "my call" were settled during the design check.

## Why

The mbc-cqrs-serverless backend (core, PR #433 "AppSync Events API support for CQRS notification flow") can publish its notifications — the messages `command()` waits on — through **AWS AppSync Events** as well as the GraphQL `onMessage` subscription client-web uses today. A deployment picks with `NOTIFICATION_TRANSPORTS` (`appsync-graphql` default, `appsync-event`, or both).

client-web must let an app listen through either one. **Both are first-class and long-lived**: an app chooses one in config and may stay on it indefinitely; neither is a legacy path.

## Goals

- An app selects the transport in `createMbcClient({ realtime: { … } })`. Leaving the selector out keeps GraphQL: existing configs are unchanged and behave identically.
- Everything above the client is transport-agnostic: `client.command()`, `client.messages.subscribe(filter, onMessage, onError)`, the React bindings, and survey-web / master-web connected pages work the same on both, with the same outcomes (finished, `MbcCommandError`, `MbcTimeoutError`, `MbcRealtimeError` when the subscription never starts, nothing sent in that case).
- Same robustness as the GraphQL client: one socket shared by all subscriptions, opened lazily and closed when idle, keep-alive timeout, jittered exponential reconnect that re-subscribes, `ready` resolving only on the server's subscribe confirmation, no unhandled rejections.
- No new dependencies (no Amplify, no AWS SDK). SSR-safe as today (nothing connects during render or at import).

## Non-goals

- Events authorization other than **API key** (no Cognito user pool, OIDC, Lambda or IAM for Events — later, if asked). GraphQL keeps its current API key and user-pool support.
- Listening on both transports at once. When the backend dual-publishes, the app picks one.
- Publishing from the browser.
- Changing survey-web or master-web code, beyond docs.

## Anti-goals

- A GraphQL app having to change anything, or behaving differently.
- An Events app silently waiting until timeout because the channel name it subscribed to differs from the one the backend publishes to.
- Any consumer-specific name (app, organisation, endpoint) in code, docs, tests or commits.

## Backend facts this relies on (PR #433, `AppSyncEventsService`)

- Channel: `/{namespace}/{tenantCode}/{action}/{id}`, every segment passed through `sanitizeSegment`:
  1. empty/undefined → `none`;
  2. replace every `[^a-zA-Z0-9]` with `-`;
  3. truncate to 50 characters;
  4. strip leading/trailing `-`;
  5. empty → `none`.
  Order matters: truncate **before** trimming. (The PR's example client trims first and has no final `none` fallback — it is wrong for ids longer than 50 characters whose 50th character is non-alphanumeric. client-web follows the server.)
- `namespace` comes from the backend's `APPSYNC_EVENTS_NAMESPACE`, default `default`.
- The published event is `JSON.stringify(notification)`, where the notification has the same fields as the GraphQL `onMessage` payload (`id`, `table`, `pk`, `sk`, `tenantCode`, `action`, `content`). `content` may be an object or a JSON string; `parseMessage`'s content handling applies to both.
- Tenant case: the backend uses the tenant from the item keys, which core ≥ 1.1.0 lowercases. Channels are **case-sensitive**, so the existing "listen under the configured tenant and its lowercase form" rule in `command()` still applies.

## AppSync Events WebSocket protocol (AWS docs, "Understanding the Event API WebSocket protocol")

- Endpoints: HTTP `https://<id>.appsync-api.<region>.amazonaws.com/event`, realtime `wss://<id>.appsync-realtime-api.<region>.amazonaws.com/event/realtime`. With a custom domain: `https://api.example.com/event` and `wss://api.example.com/event/realtime`.
- Connect with subprotocols `['aws-appsync-event-ws', 'header-' + base64url(JSON.stringify({ host, 'x-api-key' }))]` (base64url: `+`→`-`, `/`→`_`, no `=` padding). `host` is the **HTTP** endpoint's host.
- Client sends `{ type: 'connection_init' }`; server replies `{ type: 'connection_ack', connectionTimeoutMs }` (top-level field, not under `payload`). Server sends `{ type: 'ka' }` about every 60 s; close if none within `connectionTimeoutMs`.
- Subscribe: `{ type: 'subscribe', id, channel, authorization: { 'x-api-key', host } }`. `id` must match `/^[a-zA-Z0-9-_+]{1,128}$/` and be unique per connection. Replies: `subscribe_success { id }` or `subscribe_error { id, errors }`.
- Data: `{ type: 'data', id, event }` — `event` is a stringified JSON value; the docs also show it as an array of such strings. Accept both (each string is one event).
- `broadcast_error { id, errors }`; `unsubscribe { id }` → `unsubscribe_success` / `unsubscribe_error`; also a generic `error` message.
- Channel: 1–5 segments of `[A-Za-z0-9-]`, ≤ 50 chars each, case-sensitive; `/*` wildcard as the last segment.

## Decided

- **Config.** `realtime` gains a `transport` selector. `'graphql'` (default when omitted) is today's shape. `'events'` takes `url` (the Events **HTTP** endpoint, as shown in the console — mirrors how GraphQL takes its HTTP URL and derives the realtime one), `auth: { type: 'API_KEY', apiKey }`, optional `namespace` (default `'default'`), optional `WebSocket`. The types make `USER_POOL` with `'events'` a compile error; JavaScript callers get an `MbcRealtimeError` on subscribe for the same mistake (nothing sent).
- **Endpoint derivation for Events.** `…appsync-api…` host → `…appsync-realtime-api…`, scheme `wss` (`ws` for `http`), path `/event/realtime`. Other hosts (custom domain): same host, `wss`, path `/event/realtime`. `host` in auth = the HTTP URL's host.
- **Filter → channel.** `{ tenantCode }` → `/{ns}/{tenant}/*`; `+ action` → `/{ns}/{tenant}/{action}/*`; `+ id` → `/{ns}/{tenant}/{action}/{id}`. An `id` without `action` subscribes `/{ns}/{tenant}/*`. Every segment — namespace included — goes through a sanitizer identical to the server's.
- **Exact matching after receipt.** Sanitizing can merge distinct values (`a_b` and `a-b`, long ids sharing 50 characters). Received messages are filtered against the original filter so subscribers see what the GraphQL filter would deliver: `action` and `id` compared exactly when given; the message's `tenantCode` compared exactly with the tenant subscribed under. This is safe because the backend builds the channel from `notification.tenantCode` and publishes `JSON.stringify(notification)` — the payload field and the channel's tenant come from the same value (`resolveChannel` in `AppSyncEventsService`).
- **Message shape.** Events messages are handed on as `MbcMessage`, parsed with the same rules as `parseMessage` (string `id` required, `content` JSON-parsed when it is a string). Malformed events are dropped, as today.
- **`command()` on Events** subscribes `/{ns}/{tenant}/command-status/*` under each tenant spelling before sending, exactly as it does with GraphQL. Its timing, buffering, expected-finishes and error rules do not change.
- **Server error messages** (my call):
  - `subscribe_error { id }` fails that subscription: `ready` rejects with `MbcRealtimeError` (carrying `errors`), `onError` is called, the entry is removed. This is what makes `command()` reject promptly with nothing sent.
  - `broadcast_error { id }` is one event that failed to reach this subscriber; the subscription stays live and the error is ignored. A lost finish message then ends `command()` in `MbcTimeoutError` (outcome unknown), which is the truthful result.
  - `error` without an `id`, received **before** `connection_ack`, means the handshake was rejected (e.g. a wrong API key): fail every subscription with `MbcRealtimeError` and shut the socket down without reconnecting — the GraphQL client's `connection_error` rule. After `connection_ack`, an `error` with an `id` fails that subscription; without an `id` it is ignored.
  - `unsubscribe_error` / `unsubscribe_success` are ignored.
  - A socket that closes before any `connection_ack` reconnects with backoff, as GraphQL does; `command()` then ends with its existing "did not start within `timeoutMs`" `MbcRealtimeError`, nothing sent.
- **Public shape of the Events client** (my call): a low-level `createEventsClient(options)` mirroring `createRealtimeClient` — `subscribe(channel: string, { next(event: unknown), error? }): Subscription` (same `Subscription` type, `ready` + `unsubscribe`) and `close()`; `next` receives each event JSON-parsed (a string that is not JSON is passed as is). Channel building, sanitizing and exact-match filtering live above it, in one transport-agnostic message stream (`subscribe(filter, { next(message: MbcMessage), error? }): Subscription`) that `createMbcClient`'s `messages` and `command()` both use. `createCommand(http, realtime)` keeps accepting a GraphQL `RealtimeClient` and also accepts that message stream; exported helpers: the sanitizer and the filter→channel function.
- **Public API stays additive.** Existing exports keep their names and signatures. New exports for the Events pieces (the Events realtime client factory, its options type, the channel/sanitize helpers useful for apps that subscribe themselves).
- **Docs.** client-web README: a "Realtime: GraphQL or Events" section (config for both, the namespace must match `APPSYNC_EVENTS_NAMESPACE`, API key only for Events). survey-web/master-web READMEs: one line pointing to it where they show `realtime`. Usage skill (`skills/mbc-cqrs-serverless-web`): `setup.md` shows the selector; `troubleshooting.md` adds "every save times out on Events: namespace differs from `APPSYNC_EVENTS_NAMESPACE`, or the backend's `NOTIFICATION_TRANSPORTS` lacks `appsync-event`".
- **Tests.** Unit tests with a fake WebSocket, as the GraphQL client has: handshake and subprotocols, subscribe/ready, data (string and array `event`), errors (`subscribe_error`, `broadcast_error`, `error`), keep-alive close, reconnect re-subscribes, idle close, unsubscribe before/after success, sanitizer parity against a table of server cases (including >50 chars with a dash at position 50, `#`/`@` ids, empty values), exact-match filtering. `command()` tests run on both transports. Smoke covers an Events config.

## Left to the builder

- Whether the Events socket shares a connection core with the GraphQL client (a protocol adapter) or is its own module. Prefer sharing the lifecycle (lazy connect, keep-alive, backoff, idle close) if the seam is clean; don't fork the reconnect logic by copy if avoidable.
- Internal names and file layout under `packages/client-web/src/realtime/`.
- How `command()` receives the transport-agnostic message stream internally, as long as `createCommand`'s existing signature keeps working.
