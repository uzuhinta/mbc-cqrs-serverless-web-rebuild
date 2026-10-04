# Survey Web Rebuild — Design

- **Date:** 2026-10-04
- **Status:** Approved in conversation; awaiting written-spec review
- **Replaces:** `mbc-cqrs-serverless-web/packages/survey` (`@mbc-cqrs-serverless/survey-web@0.0.42`)
- **Backend:** `mbc-cqrs-serverless/packages/survey-template` (`/api/survey-template`, `/api/survey-answer`)

## 1. Goal

Rewrite the survey package as a real UI library that works in any React 18 or React 19 app, and extract the parts that `master-web` will later share into their own packages.

### Success criteria

1. `survey-web` runs in a React 18 app and a React 19 app (Vite and Next.js App Router + Turbopack) with no build workarounds.
2. Using the core (`SurveyForm`, `SurveyCreator`) requires no backend, env vars, router, or toast library.
3. Library styles never leak into a host app, never conflict with the host's Tailwind (v3, v4, or none), and can be overridden by host CSS without `!important`.
4. Every UI string is translatable; Japanese (default) and English ship built in.
5. Survey JSON saved by v0 parses and renders identically in v1.
6. The mbc-cqrs-serverless integration stays available, configured by code, not by env vars.

### What the user decided (2026-10-04 brainstorm)

| Topic            | Decision                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Scope            | Pure UI core + prop-driven page components + separate `/mbc` backend entry                                                     |
| Styling          | Pre-compiled, prefixed Tailwind v4 CSS, no preflight, CSS-variable theming; unlayered `styles.css` + opt-in `styles.layer.css` |
| i18n             | Built-in `ja` + `en`, typed messages, partial overrides                                                                        |
| Backend deps     | No AWS SDKs: host supplies `getAuthToken`; built-in `fetch` + AppSync realtime WebSocket                                       |
| Location         | `rebuild/` standalone monorepo; publishes `survey-web@1.0.0` (breaking major)                                                  |
| Shared code      | Published `ui-web` and `client-web` packages, consumed as normal dependencies                                                  |
| Look             | Keep the current shadcn/slate look; refactor internals only (evon `/ui-ux` in "refactor, keep the look" mode)                  |
| Toolchain        | pnpm + tsdown (unbundled, ESM-only) + Tailwind v4 CLI + Vitest + Changesets                                                    |
| Behaviour change | Answers from sections abandoned by branching are submitted as `undefined`                                                      |

### Problems in v0 this design removes

- Reads `process.env.NEXT_PUBLIC_*`; ships its own axios + Amplify auth and Apollo + AppSync links.
- Hard-codes `/admin/survey-management` routes; depends on `next/navigation`, `nuqs`, `sonner`.
- Classic JSX with an injected `import React` banner plus a `postbuild.js` regex pass to dedupe React imports and force `"use client"` on every file.
- `strict: false`, `as any` casts, `console.log` left in components.
- Unprefixed global Tailwind output; ~35 copied shadcn primitives of which 22 are used.
- Japanese strings hard-coded across 41 files.
- Command status subscribes _after_ the HTTP call (lost-message race) with no default timeout.
- Abandoned-branch answers are submitted.

## 2. Repository layout

```
rebuild/
├─ pnpm-workspace.yaml, package.json (private root)
├─ tsconfig.base.json      strict, noUncheckedIndexedAccess, verbatimModuleSyntax
├─ eslint.config.js, .prettierrc, .changeset/
├─ scripts/use-react.mjs   switches react/react-dom/@types to 18 or 19 via pnpm overrides
├─ .github/workflows/ci.yml
├─ docs/superpowers/specs/
├─ packages/
│  ├─ ui-web/       @mbc-cqrs-serverless/ui-web
│  ├─ client-web/   @mbc-cqrs-serverless/client-web
│  └─ survey-web/   @mbc-cqrs-serverless/survey-web
└─ apps/
   ├─ playground/   Vite demo app (private)
   └─ next-smoke/   Next.js 16 App Router + Turbopack build check (private)
```

### Package boundaries

Dependencies point one way: `survey-web → ui-web`, `survey-web/mbc → client-web`. No cycles.

| Package      | Dependencies                                                                                                                                                                    | Peer dependencies                     | Entry points                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `client-web` | none                                                                                                                                                                            | `react` (optional; only for `/react`) | `.` framework-agnostic client · `/react` hooks                                                                      |
| `ui-web`     | `@radix-ui/react-*` (one per primitive), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `react-day-picker` (v9)                                          | `react`, `react-dom`                  | `.` primitives, provider, i18n · `/styles.css` · `/styles.layer.css`                                                |
| `survey-web` | `ui-web`, `client-web`, `react-hook-form`, `@hookform/resolvers`, `zod` (v4), `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities`, `date-fns` (v4) | `react`, `react-dom`                  | `.` core · `/templates` · `/mbc` · `/styles.css` · `/styles.layer.css` · deprecated `/SurveyForm`, `/SurveyCreator` |

All React peer ranges: `^18.2.0 || ^19.0.0`.

### Library rules (enforced by lint or build-output tests)

- No `process.env`, `next/*`, `nuqs`, `sonner`, or hard-coded routes in any package.
- `"use client"` appears only in modules that need it, and is preserved in output.
- `survey-web` core (`.`) and `/templates` never import `client-web`. Only `/mbc` does.
- Each feature package's `styles.css` is self-contained; hosts never import `ui-web/styles.css` separately when using a feature package.
- No `console.*` calls.
- No React-19-only APIs: `use`, `useActionState`, `useOptimistic`, `ref` as a plain prop, `<Context>` as provider. Use `forwardRef` and `Context.Provider`.

## 3. `ui-web`

### 3.1 Styling

- Tailwind v4, compiled per package by the Tailwind CLI with `prefix(mbc)`. Classes are written `mbc:flex`, `mbc:hover:bg-primary`.
- No preflight. A zero-specificity scoped base (a subset of Tailwind's preflight: box-sizing, margin/padding/border reset, font and form-control resets) applies to library roots and their descendants: `:where([data-mbc], [data-mbc] *)`. It lives in a cascade layer (see below), so host resets and host utilities always beat it.
- Every root element and every portal content element renders `data-mbc`.
- Two stylesheets per package, same rules, different cascade placement (decided 2026-10-04 after review — a layered-only file is broken by Tailwind v3's unlayered preflight):
  - `styles.css` (default) — utilities and theme variables **unlayered**; the scoped base and tokens in the host's `@layer base`. Library class selectors (0,1,0) beat host element resets (0,0,1) in Tailwind v3, v4, or no-Tailwind hosts, and host Tailwind v4 utilities on library elements (e.g. `ml-auto`) are not overridden by the library's reset (SP1 review). Hosts override library utilities with their own CSS loaded after `styles.css`. `mbc:`-prefixed classes passed via `className` replace a conflicting library class (tailwind-merge), but they only take effect for classes the library already ships — hosts cannot compile new `mbc:` classes.
  - `styles.layer.css` (opt-in) — the same rules inside `@layer mbc`, preceded by `@layer theme, base, mbc, components, utilities;` so it sits above the host's preflight and below the host's utilities. For Tailwind v4 hosts that want host utilities to win. **Host requirement:** import it before the host's `@import "tailwindcss"` (or declare that layer order first in the host CSS); a layer's position is fixed where its name first appears.
- Host requirements and library rules from the SP1 review:
  - Tailwind v3 hosts need ≥ 3.4 (3.0–3.3 preflight's `[type='button']` ties with library classes), or must load the library CSS after their own.
  - Library source never uses zero-specificity utilities (`space-*`, `divide-*`); use `gap-*`. Enforced by a CSS build-output test.
  - Keyframes are named `mbc-*` (Tailwind's `spin`/`ping`/`pulse`/`bounce` are re-registered under that prefix), since keyframe names are global. Exception: tw-animate-css's `enter`/`exit`, identical wherever tw-animate is used.
  - Test files are excluded from the Tailwind source scan.
  - Variant helpers (`buttonVariants`, …) live in modules without `"use client"`, so Server Components can call them.

### 3.2 Theme tokens

- Semantic CSS variables, shadcn-compatible names: `--mbc-background`, `--mbc-foreground`, `--mbc-card(-foreground)`, `--mbc-popover(-foreground)`, `--mbc-primary(-foreground)`, `--mbc-secondary(-foreground)`, `--mbc-muted(-foreground)`, `--mbc-accent(-foreground)`, `--mbc-destructive(-foreground)`, `--mbc-border`, `--mbc-input`, `--mbc-ring`, `--mbc-radius`, plus `--mbc-brand` (`#417E96`) and `--mbc-brand-accent` (`#369CA3`), which v0 hard-coded in the outline button.
- Defaults equal v0's slate palette (same look). Values are complete colours (`hsl(222.2 47.4% 11.2%)`), not bare HSL triplets, so hosts can override with any colour format.
- Declared on `:where(:root)` so Radix portals in `<body>` are themed.
- Dark values apply under an ancestor `.dark` or `[data-mbc-theme="dark"]`. No dependency on `next-themes`.
- Hosts override by setting variables on `:root` or any wrapper.

### 3.3 Provider and i18n

- `<MbcProvider locale? messages? portalContainer? dir?>` — optional. Without it: `locale="ja"`, portals into `document.body`.
- Messages are typed dictionaries, namespaced per package: `ui` (owned by `ui-web`), `survey` (owned by `survey-web`). Built-in `ja` and `en`.
- A message value is a string or a function of typed params: `({ count }) => \`${count}件\``.
- Overrides are deep-partial: `messages={{ survey: { form: { submit: '送信' } } }}`. Overrides apply on top of the active locale.
- Exports for feature packages: `defineMessages()`, `useMessages(namespace)`, `MessagesFor<T>` type.

### 3.4 Primitives

Only the primitives survey uses: `Button`, `Input`, `Textarea`, `Label`, `Checkbox`, `RadioGroup`, `Select`, `Switch`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Popover`, `Calendar`, `Tabs`, `Card`, `Badge`, `Alert`, `Separator`, `Skeleton`, `Pagination`.

- Field helpers `Field`, `FieldLabel`, `FieldDescription`, `FieldError` wire ids and `aria-describedby` via `useId`. They replace shadcn's react-hook-form `Form` glue, so `ui-web` has no react-hook-form dependency.
- Each primitive: `forwardRef`, `className` merged with `cn()` (tailwind-merge configured with `prefix: 'mbc'`), `asChild` where Radix supports it.
- Not ported: `Icon`, `Container`, sidebar, sheet, toast/sonner, command, table, tooltip, accordion, avatar, breadcrumb, collapsible, scroll-area, multi-select, select-table, input-table.
- New primitives are added when `master-web` is rebuilt, not before.

## 4. `client-web`

### 4.1 Core client (`.`)

```ts
const client = createMbcClient({
  apiUrl: string,
  tenantCode: string | (() => string),
  getAuthToken?: () => string | undefined | Promise<string | undefined>,
  headers?: Record<string, string> | (() => Record<string, string>),
  fetch?: typeof fetch,
  timeoutMs?: number,            // HTTP timeout, default 30_000
  realtime?: {
    url: string,                 // AppSync GraphQL endpoint (https)
    auth: { type: 'API_KEY'; apiKey: string } | { type: 'USER_POOL' },
  },
})

client.get<T>(path, { query?, signal? }): Promise<T>
client.post<T>(path, body, { signal? }) / put / delete
client.command<T>(request, { timeoutMs = 60_000, signal? }): Promise<{ data: T; requestId: string }>
client.messages?.subscribe(filter, onMessage, onError?): { ready: Promise<void>; unsubscribe(): void }   // undefined without `realtime`
```

- HTTP: JSON in/out; sends `x-tenant-code`; sends `Authorization: Bearer <token>` only when `getAuthToken` returns a value; `AbortSignal` supported; HTTP timeout via `AbortSignal.timeout` composition.
- `query` arrays serialise as repeated keys (`orderBys=a&orderBys=b`), matching the backend `SearchDto`.
- Errors are classes: `MbcApiError { status, body }`, `MbcTimeoutError`, `MbcRealtimeError`, `MbcAbortError`. No logging, no toasts. Also `MbcCommandError { requestId, status }` when the backend reports a `<step>:FAILED` command status (v0 waited forever), and `MbcApiError.status` is `0` when no response arrived (network failure or `getAuthToken` failure).
- `USER_POOL` realtime auth uses the token from `getAuthToken`.

### 4.2 AppSync realtime

Implements AWS's documented AppSync real-time WebSocket protocol:

- Realtime URL derived from `url`: `appsync-api` → `appsync-realtime-api`, `https` → `wss`; custom domains use `<url>/realtime`.
- Subprotocol `graphql-ws`; auth header base64-encoded into the `header` query param, `payload=e30=`.
- `connection_init` → `connection_ack` (reads `connectionTimeoutMs`) → `start` / `start_ack` / `data` / `error` / `complete` / `stop`; `ka` keep-alive watchdog closes and reconnects when keep-alives stop.
- One shared socket per client, multiplexing subscriptions; opened lazily, closed when the last subscription ends.
- Reconnect with exponential backoff and jitter; re-sends `start` for live subscriptions.
- Subscription document is v0's `onMessage(tenantCode, action, id)`; `content` is JSON-parsed when possible.

### 4.3 `command()` — no lost messages

The backend derives `requestId` from `x-amz-cf-id` / `x-amzn-trace-id` / `x-request-id`, so the client cannot choose it in advance. Therefore:

1. Subscribe to `{ tenantCode, action: 'command-status' }` (no `id` filter) and wait for `start_ack`.
2. Send the HTTP request; read `requestId` from the response.
3. Resolve when a buffered or live message has `id === requestId` and `content.status === 'finish:FINISHED'`.
4. Reject with `MbcTimeoutError` after `timeoutMs`, `MbcAbortError` on abort, `MbcApiError` if the HTTP call fails or returns no `requestId`.
5. Unsubscribe in all cases.

Without `realtime` config, `command()` resolves right after the HTTP response (documented).

### 4.4 React (`/react`)

- `<MbcClientProvider client>` and `useMbcClient()` (throws a clear error outside the provider).
- `useCommand(fn)` → `{ run, status: 'idle' | 'sending' | 'waiting' | 'done' | 'error', error, reset }`. Aborts on unmount; StrictMode-safe in React 18 and 19.
- No caching layer. Hosts that want TanStack Query wrap the plain client.

## 5. `survey-web` public API

### 5.1 Core (`.`)

- Schema: `SurveySchema` (zod 4) with the same JSON shape as v0, including the duplicate-id refinement. `parseSurvey(json)` returns a safe-parse result.
- Types: `Survey`, `SurveyItem`, `SectionHeader`, `SurveyQuestion`, one type per question kind, `SurveyAnswers`, `SurveyAnswerMeta`.
- Deprecated aliases through 1.x: `SurveySchemaType`, `SurveyItemType`, `SectionHeaderType`, `SurveyQuestionItemType`, the `*QuestionType` names, `validateSurveyJson`.
- `validateAnswers(survey, answers)` — pure, usable on the server; returns per-question error keys and params.

**`<SurveyForm>`**

| Prop              | Type                                                                  | Notes                                              |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| `schema`          | `Survey`                                                              | unchanged                                          |
| `onSubmit`        | `(answers, meta) => void \| Promise<void>`                            | Promise → submitting state                         |
| `onSubmitError`   | `(error: unknown) => void`                                            | optional                                           |
| `defaultValues`   | `SurveyAnswers`                                                       | read once on mount (unchanged)                     |
| `disabled`        | `boolean`                                                             | unchanged                                          |
| `submitLabel`     | `ReactNode`                                                           | unchanged; falls back to messages                  |
| `children`        | `ReactNode`                                                           | rendered above the section's questions (unchanged) |
| `onSectionChange` | `(sectionId: string) => void`                                         | new                                                |
| `components`      | `Partial<Record<QuestionKind, ComponentType<QuestionRendererProps>>>` | new; replace a renderer                            |
| `className`       | `string`                                                              | new                                                |

**`<SurveyCreator>`**

| Prop           | Type                                     | Notes                                                                                                         |
| -------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `defaultValue` | `Survey`                                 | replaces `initialSchema`                                                                                      |
| `onChange`     | `(survey, { isValid, isDirty }) => void` | replaces `onSchemaChange`                                                                                     |
| `onSubmit`     | `(survey) => void \| Promise<void>`      |                                                                                                               |
| `disabled`     | `boolean`                                |                                                                                                               |
| `className`    | `string`                                 |                                                                                                               |
| `ref`          | `SurveyCreatorHandle`                    | `{ submit(): Promise<boolean>; reset(next?: Survey): void; getValue(): Survey }` — replaces `submitButtonRef` |

### 5.2 `/templates` (prop-driven, current look)

- `<SurveyTemplateList>` — `items`, `total`, `page`, `pageSize`, `keyword`, `loading`, `error`; `onPageChange`, `onPageSizeChange`, `onKeywordChange`, `onCreate`, `onSelect(item)`, `onRetry`.
- `<SurveyTemplateEditor>` — `mode: 'create' | 'edit'`, `defaultValue`, `loading`, `error`, `saving`, `deleting`; `onSave(survey)`, `onDelete()`, `onCancel()`, `onRetry()`. Includes the save/delete bar, delete confirmation, and save disabled while unchanged in edit mode.
- Item type: `SurveyTemplateSummary { id, name, description?, updatedAt?, version }` — the editor and list do not depend on backend entity shapes.

### 5.3 `/mbc` (mbc-cqrs-serverless integration)

Requires `<MbcClientProvider>` from `client-web/react`.

- `createSurveyTemplateApi(client)`:
  - `list({ page, pageSize, keyword?, orderBy?, orderType? })` → `GET /api/survey-template` (`orderBys: ['<field>:<asc|desc>']`) → `{ items: SurveyTemplateSummary[], total }`
  - `get(id)` → `GET /api/survey-template/:id` → `{ summary, survey }`
  - `create(survey)` → `POST` body `{ name: survey.title, attributes: { surveyTemplate: survey, description: survey.description } }` via `command()`
  - `update(id, survey)` → `PUT /api/survey-template/:id`, same body, via `command()`
  - `remove(id)` → `DELETE /api/survey-template/:id` via `command()`
- `submitSurveyAnswer(client, { surveyId, answer, email? })` → `POST /api/survey-answer` body `{ attributes: { surveyId, email, answer } }` via `command()`.
- Hooks: `useSurveyTemplates(params)`, `useSurveyTemplate(id)`, `useSurveyTemplateMutations()`, `useSubmitSurveyAnswer()`.
- Connected pages:
  - `<MbcSurveyTemplateListPage onCreate onSelect state? onStateChange? />` — page/pageSize/keyword internal by default; controllable for URL sync.
  - `<MbcSurveyTemplateEditorPage id? onSaved onDeleted onCancel onError />` — no `id` = create mode. Host navigates and shows toasts.

### 5.4 Migration (v0 → v1)

| v0                                                               | v1                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| `SurveyTemplatePage`                                             | `MbcSurveyTemplateListPage` + `onCreate` / `onSelect` |
| `EditSurveyTemplatePage` (reads `useParams`)                     | `MbcSurveyTemplateEditorPage id={…}` + callbacks      |
| `NEXT_PUBLIC_*` env vars                                         | `createMbcClient({...})` + `<MbcClientProvider>`      |
| `SurveyCreator initialSchema / onSchemaChange / submitButtonRef` | `defaultValue / onChange / ref.submit()`              |
| `/SurveyForm`, `/SurveyCreator` subpaths                         | root import (subpaths kept as deprecated aliases)     |
| `import '…/styles.css'`                                          | unchanged                                             |
| Abandoned-branch answers submitted                               | submitted as `undefined`                              |

`MIGRATION.md` gives before/after code for each row.

## 6. `survey-web` internals

### 6.1 Question-type registry

One folder per kind (`short-text`, `long-text`, `single-choice`, `multiple-choice`, `dropdown`, `linear-scale`, `rating`, `date`, `time`), each with `renderer.tsx`, `editor.tsx`, `validate.ts`, `defaults.ts`. A `registry` maps kind → `{ renderer, editor, create, validate, icon, labelKey }`. Adding a kind is a one-folder change. Target: no file over ~300 lines.

### 6.2 Form engine (pure)

- `buildPages(survey)` — groups items into sections; synthesises a first section when the survey does not start with a header (as v0).
- `resolveNext(page, answers, pages)` — section `action` (`submit` / `jump`) first, then the first answered `single-choice` / `dropdown` option with `nextSectionId`, then the next section in order. A missing target falls back to the next section in order.
- `validateAnswer(question, value)` — required + custom rules (number, text, length, regex, choice count) → `{ key, params } | null`. Text is resolved from messages at render time.
- `collectAnswers(pages, visitedPath, values)` — builds `answers` and `meta` for every question; questions outside the visited path get `undefined`.
- The form uses a react-hook-form resolver built on `validateAnswer`, scoped to the current section's fields. Only branching questions of the current section are watched (`useWatch`), not the whole form.
- Option shuffling (`shuffleOptions`) runs once after mount, so order is stable across re-renders and SSR hydration matches.

### 6.3 Creator state

- `creatorReducer(state, action)` — pure. Actions: `addQuestion`, `addSection`, `duplicate`, `remove`, `move`, `changeType`, `updateItem`, `mergeSection`, `reorderSections`, `select`.
- Lock rules (v0 behaviour, from README) live only in the reducer's guards: `canEdit`, `canDelete`, `canDuplicate`, `canDrag`, `canInsertInto`, `canMerge`. Locked question: no edit/delete/duplicate/drag. Locked section: no title/description edit, no delete, no merge in either direction, nothing added into it, floating bar hidden when it or its question is selected, questions cannot be dragged in or out; it can still be moved; duplicating it yields an unlocked copy. A section containing a locked question cannot be deleted. Adding a section _after_ a locked section is allowed.
- Store: a small `useSyncExternalStore` store with per-item selectors so editing one card re-renders only that card.
- Validation: `SurveySchema.safeParse` on change (debounced) and on submit; issues mapped to item cards by path. Dangling `nextSectionId` / `targetSectionId` show a warning, not an error.
- Ids: `createId()` (`crypto.randomUUID` with fallback), stable for the item's life.
- Drag and drop: dnd-kit with pointer + keyboard sensors and translated screen-reader announcements.

### 6.4 Error handling

- `SurveyForm`: a rejected `onSubmit` keeps values, shows a translated generic error, calls `onSubmitError`.
- `/templates`, `/mbc`: inline error states with Retry; mutations surface errors through hook state and the `onError` callback.
- No built-in React error boundaries; render errors reach the host's boundary.

### 6.5 Accessibility

- Choice groups use `fieldset` / `legend`; fields wire label, description, and error through `useId`; invalid fields set `aria-invalid`.
- On Next / Submit with errors, focus moves to the first invalid field. On section change, focus moves to the section heading.
- Rating and linear scale are radio groups with arrow-key navigation.

### 6.6 SSR

- No `window` / `document` access at module scope or during render.
- `useId` for all generated DOM ids.

## 7. Testing

- **Unit (Vitest):** form engine (branching, jumps, dangling targets, abandoned-branch clearing); every `validateAnswer` rule; `creatorReducer` incl. every lock rule; `client-web` HTTP with mocked `fetch` (headers, auth, query arrays, errors, timeout, abort).
- **Realtime:** against a fake WebSocket server — handshake, `ka` watchdog, reconnect + re-subscribe, race (finish message arrives before the HTTP response), timeout, abort, unsubscribe.
- **Component (Testing Library + user-event, jsdom):** `SurveyForm` flows (branching, Back, required, `defaultValues` edit, focus management); creator (add, duplicate, change type, lock rules, keyboard drag); `/templates` components; `vitest-axe` on key screens.
- **Ported behaviours:** the 10 v0 behaviour test files (`schema`, `locked-question`, `section-locked`, `section-locked-question`, `question-creator-id`, `survey-form`, `get-pagination-item`, `subscribe`, `cn`, `id`) are rewritten against the new code. v0's `dependencies` test becomes the build-output checks below.
- **Schema compatibility:** v0 sample surveys and v0 `schema.test.ts` cases as fixtures; v1 parse output must equal v0's.
- **Build-output tests (on `dist/`):** modules using client-only code start with `"use client"`; no `process.env` or `next/` references; every class selector in `styles.css` and `styles.layer.css` carries the `mbc` prefix (except `:where([data-mbc])` base and `:root` variables); `styles.css` has no `@layer` blocks; every rule in `styles.layer.css` is inside `@layer mbc`; importing `SurveyForm` does not pull in `client-web` (esbuild metafile).

## 8. CI, tooling, release

- **CI:** lint → typecheck ×2 (`@types/react` 18 / 19) → test ×2 (`react` 18 / 19 via `scripts/use-react.mjs`) → build → `publint` + `attw --profile esm-only` → `apps/next-smoke` `next build` (Turbopack) importing every entry point.
- **Toolchain versions (verified 2026-10-04):** Node 24 (≥ 24.13; tsdown needs ≥ 22.18), pnpm 10.29, TypeScript ~6.0 (typescript-eslint supports < 6.1, so not TS 7), Vitest 5, jsdom 29 (jsdom 30 needs Node ≥ 24.15), react-day-picker 9, Next 16 for `next-smoke`.
- **Build:** tsdown `unbundle: true`, ESM-only, `.d.ts`, automatic JSX runtime; Tailwind v4 CLI per package for `styles.css` and `styles.layer.css`. `sideEffects: ["**/*.css"]`.
- **Playground:** Vite, React 19 by default, `pnpm playground:react18`. Pages: form with sample surveys, creator, `/templates` with mock data, `/mbc` with a mock client (optional real backend through a playground-only `.env.local`), and a "host with Tailwind v3 preflight" fixture page. Theme, locale, and dark-mode toggles.
- **Release:** Changesets, independent versions, all three packages start at `1.0.0`. Publishing is manual until `rebuild/` moves into the GitHub repo; the CI workflow is ready but inert until then.
- **Docs:** README per package; `packages/survey-web/MIGRATION.md`.
- **Runtime:** Node 20+, pnpm 10 via corepack.

## 9. Out of scope

- Rebuilding `master-web` (own brainstorm → spec → plan; it will extend `ui-web` and reuse `client-web`).
- The long-term home of the monorepo.
- Any visual redesign.
- CommonJS output.
- A data-caching layer.
