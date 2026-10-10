# Master Web Rebuild — Design

- **Date:** 2026-10-06
- **Status:** Approved in conversation section by section; awaiting written-spec review
- **Replaces:** `mbc-cqrs-serverless-web/packages/master` (`@mbc-cqrs-serverless/master-web`; the repo's 0.0.42 sources are byte-identical to npm `0.0.50`, checked against the 0.0.50 tarball's source maps — 98/98 files)
- **Backend:** `mbc-cqrs-serverless/packages/master` (`/api/master-setting`, `/api/master-data`, `/api/master-bulk`, and its custom task controller `/api/tasks/sfn-task-parent`, `/api/tasks/:id`), `packages/sequence` (controller without a fixed mount; the host app chooses the path)
- **Builds on:** `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md` — its library rules, styling, i18n, client and release decisions apply here unless this spec says otherwise.

## 1. Goal

Rewrite master-web as a real UI library on top of `ui-web` and `client-web`, with every v0 feature, so a host renders master-setting and master-data screens without build or runtime workarounds.

### Success criteria

1. Every v0 0.0.50 feature is reachable through the `/mbc` connected pages: settings list and editor, data list and editor, bulk JSON import, copy to tenants with task status.
2. Settings and data saved by v0 load and save unchanged (unknown attribute keys included).
3. The screens keep v0's layouts, section structure, colour roles and Japanese text; their controls use ui-web's shared look, so survey and master screens match (user decision, 2026-10-07).
4. React 18 and 19, SSR (`renderToString`) and a Next 16 App Router build pass.
5. A host needs none of today's workarounds: no `dynamic(…, { ssr: false })`, no CSS-scoping script, no body-class theme trick, no `patch-package`, no Apollo client, no axios instance.

### What the user decided (2026-10-06 brainstorm)

| Topic   | Decision                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope   | Full parity, including bulk import and copy to tenants; v0's app-specific parts become props                                                  |
| Editors | Pluggable: field-renderer registry with plain built-ins; v0's rich editors in an opt-in `/editors` entry as lazy optional peer dependencies   |
| Release | The four packages release together as 1.0.0 (ui-web, client-web and survey-web stay unpublished until master-web is done)                     |
| Shape   | Mirror survey-web: `/core` + prop-driven screens + `/editors` + `/mbc`                                                                        |
| Carried | From the survey spec: no env vars / routing / toasts in the package; `mbc:`-prefixed CSS; ja (default) + en; client-web for HTTP and realtime |

### Problems in v0 this design removes

Seen in a production host's integration of v0:

- Unscoped Tailwind build (`* { margin; padding }`, `a { color }`, `:root`, `body`) — the host runs a postcss script to confine it.
- Radix portals lose the theme — the host toggles a body class while the widget is mounted.
- The React context breaks unless every entry is loaded with `ssr: false`.
- The default Apollo client does not know the host's AppSync endpoint — the host must pass its own (or a mock).
- `next/navigation` inside the package; a fixed URL scheme (`IUrlProvider`, including entries for one particular app such as `FAQ_CATEGORY_PAGE_URL` and `TOP_URL`).
- One app's constants inside the library: a hard-coded system tenant code, a host-specific tenant-list endpoint read by fixed Japanese column names, a host-specific copy endpoint, and labels for two host-specific setting flags.
- A health-check request to `/` on every page; a global loading overlay (mobx); toasts for every outcome.
- Bulk import sends all items in one request; the backend rejects more than 100.

## 2. Repository layout

```
rebuild/
  packages/
    ui-web/        + Table, Accordion, Command, MultiSelect
    client-web/    + command({ expectedFinishes, onProgress })
    survey-web/    unchanged
    master-web/    new: @mbc-cqrs-serverless/master-web
  apps/
    playground/    + master pages on a fake master backend
    next-smoke/    + every master-web entry in server and client components
```

### Package boundaries

- `master-web` depends on `ui-web` and `client-web` (same version, `workspace:^`), `zod` 4, `@dnd-kit/*`, `lucide-react`. Peer: `react`, `react-dom` `^18.2 || ^19`.
- Optional peers (only `/editors` imports them): `react-quill-new` (with its peer `quill-delta`), `@uiw/react-md-editor`, `jsoneditor`.
- Not used: axios, `@apollo/client`, aws-amplify, `aws-appsync-*`, mobx, swr, nuqs, `next-usequerystate`, next, `react-draggable`, `react-resizable`, `patch-package`, `usehooks-ts`.
- master-web's `DataTable` is a small internal component (fixed columns, server-side sorting and paging, checkbox selection; no TanStack, ruling in M3a); ui-web gains the plain `Table` primitives and the `PaginationBar` both lists share.
- The survey spec's library rules apply: no env vars, no `window` during render, no global CSS outside the `mbc:` prefix, `'use client'` on client modules only, ESM only.

### ui-web additions (ship in 1.0.0)

| Component                                                                                                | Notes                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | shadcn markup and classes (v0's `components/ui/table.tsx`)                                                                                               |
| `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`                                     | Radix accordion; caret range like the other Radix packages                                                                                               |
| `Command` family                                                                                         | `cmdk`                                                                                                                                                   |
| `MultiSelect`                                                                                            | v0's `multi-select-combobox` behaviour: search, chips, a check list; keyboard and screen-reader tested                                                   |
| `PaginationBar`                                                                                          | survey-web's template pagination moved to ui-web; `variant="table"` adds master v0's result count, page size after the pages and a page-number box (M3a) |

`Combobox` (single choice) was dropped in M1: no v0 master screen uses one.

Each gets the ui-web standard: `ui` messages for its built-in text, axe test, SSR test, v0 class parity where v0 had it.

### client-web addition

`command(request, { expectedFinishes?: number, onProgress?: (done: number, expected: number) => void })`: resolves after `expectedFinishes` (default 1) `finish:FINISHED` messages for the request id; `onProgress` fires on each. A `<step>:FAILED` still rejects at once. Needed by bulk import, which gets one finish message per item.

## 3. `master-web` public API

| Import                               | Contents                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `@mbc-cqrs-serverless/master-web`    | prop-driven screens, field-renderer registry, `MasterRouting` types, messages, `MbcProvider` re-export, `/core` re-export |
| `…/core`                             | React-free model, parsers, field types, validators, payload builders, bulk parser, copy types                             |
| `…/editors`                          | `RichTextEditor`, `MarkdownEditor`, `JsonEditor`, `editorRenderers`                                                       |
| `…/mbc`                              | `createMasterApi`, hooks, connected pages, re-exports of `createMbcClient`, `MbcClientProvider`, client errors            |
| `…/styles.css`, `…/styles.layer.css` | as survey-web (contains ui-web's styles)                                                                                  |
| `…/editors.css`                      | the rich-text and JSON editors' CSS, scoped (section 3.3)                                                                 |

Entries ship with their content: `.` and `/core` from M1, `/editors` and `editors.css` from M6, `/mbc` from M7.

v0's subpaths (`/MasterSetting`, `/MasterData`, `/EditMasterSettings`, `/EditMasterData`, `/AppProviders`, `/UrlProvider`, `/MsLayout`, `/styles`) are not kept: they read Next's router params, so the same import cannot keep its meaning. `MIGRATION.md` maps each one.

### 3.1 Core (`/core`)

Types match the backend's stored shapes:

```ts
type MasterFieldType =
  | 'string'
  | 'number'
  | 'auto_number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'json'
  | 'text-area'
  | 'text-html'
  | 'text-markdown'

type MasterField = {
  physicalName: string
  name: string
  description?: string
  dataType: MasterFieldType
  isRequired: boolean
  isShowedOnList: boolean
  defaultValue?: unknown
  length?: string // string; v0 stores numbers as strings
  pattern?: string // string
  min?: string // number
  max?: string // number
  maxRow?: number // text-area
  dataFormat?: string // auto_number
  formatCode?: string // auto_number
  formatName?: string // auto_number
  prefix?: string // auto_number
  postfix?: string // auto_number
}

type MasterSetting = {
  id: string
  pk: string
  sk: string
  code: string
  name: string
  version: number
  tenantCode?: string
  isDeleted?: boolean
  attributes: {
    description: string
    fields: MasterField[]
    [key: string]: unknown
  }
}

type MasterData = {
  id: string
  pk: string
  sk: string
  code: string
  name: string
  version: number
  tenantCode?: string
  seq?: number
  isDeleted?: boolean
  attributes: Record<string, unknown>
}
```

- `parseMasterSetting(input: unknown)` / `parseMasterData(input: unknown)` → zod `safeParse` result. Tolerant like v0: numbers stored as strings or numbers, missing `fields` → `[]`, unknown keys kept (`passthrough`) everywhere so a load-and-save keeps them.
- `fieldTypes: Record<MasterFieldType, FieldTypeDefinition>` — the one place a type is defined:
  - `options`: which definition inputs the settings editor shows (`length`, `pattern`, `min`, `max`, `maxRow`, auto-number format);
  - `defaultValue`: v0's per-type empty value (`number` → `0`, `boolean` → `false`, `array` → `[]`, others → `''`);
  - `toFormValue(stored)` / `fromFormValue(form)`: JSON object ↔ text, number ↔ text, array ↔ list, boolean, ISO date;
  - `validate(value, field)` → `{ key, params } | null` (required, max length, pattern, whole number, min, max, valid JSON).
- Untouched inputs keep the stored value exactly; an empty input adds no key; number inputs are saved as strings (v0) unless the stored value was a number; boolean values keep their stored representation (`true` or `'true'`).
- `validateMasterData(fields, values, { mode })` → `Record<string, MasterError>`, one error per field; `fields` is `dataFields(setting)` (adds v0's record-level code / name inputs when the setting has no such fields).
- `toDataPayload(setting, values, { mode: 'create', generatedCode? } | { mode: 'update', previous })` — v0's request bodies: with a `code` field, `code` and `name` come from `attributes`; empty `seq` → `undefined` on create, `0` on update; JSON fields parsed.
- `validateFieldDefinition(field, siblings)` — `physicalName` required, unique, not reserved; default value fits the type (v0's checks); `auto_number` only on `code`.
- `defaultSettingFields` — v0's fixed `code`, `name`, `seq` fields.
- `parseBulkJson(text, { screen: 'settings' | 'data', mapRawItem? })` → `{ items, errors }` — the settings list accepts settings and data (v0), a setting's data list accepts data only; errors carry the entry's index. Keeps v0's `MapResult`, `MappedSetting`, `MappedData`, `mapResultToBulkItem` and the `mapRawItem` hook.
- `MasterCopyRequest` — `{ masterSettingId, targetTenants, copyType: 'SETTING_ONLY' | 'DATA_ONLY' | 'BOTH', dataCopyOption?: { mode: 'ALL' | 'PARTIAL'; id?: string[] } }`, the backend DTO.

`/core` imports only zod: usable on a server, e.g. to validate a bulk import.

### 3.2 Screens (root entry)

Prop-driven: data in, callbacks out; each has its own loading, empty, error-with-retry and saving states. Layout, classes and Japanese text follow v0.

**Navigation without routing** — every screen and page takes one `routing` object:

```ts
type MasterTarget =
  | { screen: 'settings' }
  | { screen: 'newSetting' }
  | { screen: 'setting'; id: string }
  | { screen: 'data'; settingId: string }
  | { screen: 'newData'; settingId: string }
  | { screen: 'dataItem'; settingId: string; id: string }
  | { screen: 'copyRequest'; settingId: string }
  | { screen: 'copyTasks'; settingId: string }
  | { screen: 'copyTask'; settingId: string; taskId: string }

type MasterRouting = {
  href(target: MasterTarget): string
  navigate(target: MasterTarget): void
  Link?: ComponentType<{
    href: string
    className?: string
    children: ReactNode
  }>
}
```

Ids in targets are decoded (`pk#sk`); the host encodes them in its URLs. Links render as real anchors (through `Link` when given).

| Screen                  | Behaviour (v0 parity unless noted)                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MasterSettingList`     | search by code, name, keyword; clear; table (code → data list, name, description) with sorting and paging; Create; bulk import                                                                                                                                                                                                                          |
| `MasterSettingEditor`   | code (unique check), name, description, `settingOptions` toggles; fields table: drag to reorder, add/edit dialog with per-type options, delete (not `code`, `name`, `seq`); view/edit mode; Save, Cancel, Delete (confirm); JSON dialog (edit, import, download the whole setting); copy buttons when `canCopy`; read-only for another tenant's setting |
| `MasterDataList`        | setting header (name, description, link to edit the setting); search by code, keyword, "show deleted"; columns from `isShowedOnList` fields, formatted per type; Create; bulk import                                                                                                                                                                    |
| `MasterDataEditor`      | form built from the setting's fields through the renderer registry; view/edit mode; code locked after create; `auto_number` generated on save; Delete and Restore (soft delete, confirm); JSON dialog; read-only for another tenant's record                                                                                                            |
| `BulkImportDialog`      | paste or load a JSON file, download the sample (`inputSampleJson`), per-item errors from `parseBulkJson`, submit with progress (`done / total`). **Change:** a normal large dialog instead of v0's drag-and-resize window                                                                                                                               |
| `MasterCopyRequestForm` | destinations: all tenants or chosen ones (`MultiSelect` over `tenants`; with none chosen it asks for one); content: setting + all data, setting only, or chosen data rows (v0's search and a selectable data table; the choice is kept across pages). Named `…Form` because `/core` exports the request body as `MasterCopyRequest`                     |
| `MasterCopyTaskList`    | the setting's copy requests (v0's columns: name, start and end time, total, running, succeeded and failed counts, status badge in v0's colours), ten a page; links to detail; Refresh                                                                                                                                                                   |
| `MasterCopyTaskDetail`  | one copy request's result per destination tenant (tenant, status, times, the error's first line, task id); Refresh                                                                                                                                                                                                                                      |

Backend-dependent behaviour enters as async props: `checkCodeUnique(code)`, `generateCode(field, setting)`, `onSave`, `onDelete`, `onRestore`, `onImport(items, onProgress)`, `onRequestCopy`. The settings editor also takes `formats`: the sequences an auto-numbered code can use (`{ code, name, format }`; v0 read them from the records of the `sequence_setting` master).

**Host-specific behaviour as props** (all optional, default off): `canCopy` (v0 hard-codes a system tenant code), `tenants: { code: string; name: string }[]` (v0 reads a host-specific endpoint), `settingOptions: { key: string; label: string }[]` (extra boolean flags stored in `attributes`, for hosts whose backend reads such flags). Every string is a message, so a host can replace "テナント" with its own term by override.

**Field renderers.** `MasterDataEditor` renders each field with `defaultRenderers[field.dataType]`; `components={{ [dataType]: Renderer }}` replaces any of them (`FieldRendererProps`: `field`, `value`, `onChange`, `onBlur`, `disabled`, `invalid`, `describedBy`, `id`, and `labelId` for a control that is a group). Built-ins: input (`string`; a text area when `maxRow` > 1), read-only input naming its sequence (`auto_number`), number input, switch (`boolean`), date picker (ui-web `Calendar`), list input (`array`), monospace textarea (`json`), textarea (`text-area`, `text-html`, `text-markdown`; previews and rich editing come with `/editors`, M6, as an HTML preview needs a sanitizer). Unknown types render as `string`.

### 3.3 Editors (`/editors`)

- `RichTextEditor` (react-quill-new), `MarkdownEditor` (`@uiw/react-md-editor`), `JsonEditor` (`jsoneditor`), each a client component that loads its library with a dynamic `import()` after mount, so SSR renders a plain text box (the built-in fallback) until it arrives. They report only the user's edits: Quill normalises the HTML it loads without reporting it, and `setText` does not call jsoneditor's `onChangeText`. They label the library's own input (Quill's editing area, the Markdown text box, Ace's input) and keep that label when the library rebuilds it.
- `editorRenderers = { 'text-html': …, 'text-markdown': …, json: … }` to pass as `components`. Opt-in by design: a bundler fails at build time on an import of a package that is not installed, so nothing detects them automatically.
- `editors.css` is built from Quill's snow CSS and jsoneditor's CSS by a script that keeps only selectors containing `ql-` or `jsoneditor` and none of `:root`, `html` or `body`, drops at-rules left empty and keyframes no kept rule uses, and copies the files the CSS points at (jsoneditor's icon sprite) to `editors-assets/` beside it; a build test asserts it. `@uiw/react-md-editor` is not in it: its JavaScript imports its own CSS, already scoped to `.w-md-editor` / `.wmde-markdown`. The libraries use fixed colours, not variables, so no colour is mapped to ui-web tokens; the Markdown editor stays light (`data-color-mode="light"`).
- Each editor is verified on React 18 and 19 in sub-plan M6: the real libraries run in the unit tests (jsdom), which the standard gate runs on both versions, and in a browser through the playground's editors toggle. All three work on both, so no fallback is needed.

### 3.4 Backend integration (`/mbc`)

`createMasterApi(client, { paths? })` — every path overridable (a host whose backend wraps an endpoint points at its own path):

| Group    | Methods → endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| settings | `list(state)` → `GET /api/master-setting/list` (`code`, `name`, `keyword`, `page`, `pageSize`, `orderBys` as v0's `-column` for descending); `get(id)` → `/detail/:id`; `create`, `update(id)`, `delete(id)`; `codeExists(code)` → `POST …/check-exist/:code` (true when the code is taken)                                                                                                                                                                                                                                                                                                     |
| data     | `list(settingCode, state)` → `GET /api/master-data/list` (`settingCode`, `code`, `keyword`, `isDeleted`, paging, `orderBys`); `get(id)`; `create` → `/create`; `update(id)`; `delete(id)`; `restore(id)` (`PUT` `{ isDeleted: false }`); `codeExists(settingCode, code)`                                                                                                                                                                                                                                                                                                                        |
| bulk     | `importItems(items, onProgress)` → `POST /api/master-bulk`, in batches of 100 (the backend's limit), one after another; each batch waits for its changed items, and progress counts across batches. A failed batch rejects with `MasterBulkError` (`done`, `from`, `to`, and the batch's own error as `message` and `cause`). **Change:** v0 sent one request and failed above 100 items                                                                                                                                                                                                        |
| sequence | `generateCode(field, setting)` → `POST /api/sequence/with-provided-setting` when `formatCode` is set, else `POST /api/sequence` (v0's two branches, paths and bodies). Checked against the sequence package in M7b: both bodies are `{ tenantCode, typeCode, rotateBy: 'none', params: { code1 }, prefix, postfix }`, the one with a format adds `format`, and both answer `{ formattedNo }`. The package mounts nowhere by itself and names its route `provided-setting`, so these defaults are v0's host paths; hosts on the plain package set `paths.sequence` / `paths.sequenceWithSetting` |
| copy     | `request(body)` → `POST /api/master-setting/copy`; `tasks(settingCode)` → `GET /api/tasks/sfn-task-parent?masterSettingCode=`, keeping the setting's own requests (the backend matches the code as a prefix); `task(id)` → `GET /api/tasks/:id` with the request's id plus `#0`, as v0 sent it (the backend lists the tasks under the key's parent)                                                                                                                                                                                                                                             |

- Ids are passed decoded and URL-encoded in paths.
- Writes (create, update, delete, restore, bulk) use `client.command()`: request → `finish:FINISHED` over AppSync; `<step>:FAILED` → `MbcCommandError`; timeout → `MbcTimeoutError` (outcome unknown). Bulk uses `expectedFinishes` per batch and reports overall progress.
- Copy is a Step Functions job: `request` is a plain HTTP call; the task screens fetch status (Refresh button, optional `pollMs`).
- Hooks: `useMasterApi(options)`, `useMasterSettings(state)`, `useMasterSetting(id)`, `useMasterDataList(settingId, state)`, `useMasterData(id)`, `useMasterMutations()`, `useCopyTasks(settingCode, { pollMs })`, `useCopyTask(id, { pollMs })` — built on client-web's `useQuery` and `useCommand` like survey-web's hooks; each takes the API's `paths`, and the queries load again when the tenant (`client.tenantCode()`) changes. The copy hooks poll `pollMs` after each answer and keep their rows on screen while they reload. Each write in `useMasterMutations()` has `run` and `runOrThrow`, which rejects with the write's own error (a screen tells a timeout from a refusal by it).
- Connected pages: `MbcMasterSettingListPage`, `MbcMasterSettingEditorPage` (`id?`), `MbcMasterDataListPage` (`settingId`), `MbcMasterDataEditorPage` (`settingId`, `id?`), `MbcMasterCopyRequestPage`, `MbcMasterCopyTaskListPage`, `MbcMasterCopyTaskDetailPage`. Common props: `routing`, `onSaved`, `onDeleted`, `onError`, `components`; list pages: `state` / `onStateChange` (internal state when omitted); copy pages and the settings editor: `canCopy`, `loadTenants(): Promise<{ code: string; name: string }[]>`; settings editor: `settingOptions`, and `formats` loaded from the `sequence_setting` master's data (v0's source; the code is overridable); settings list: `inputSampleJson`, `mapRawItem`.

**Tenant rules (v0's):** the current tenant is `client.tenantCode()` (resolved per request). An item belongs to the tenant in its `tenantCode`; other tenants' items, `common` included, open read-only. `canCopy` is the host's decision.

### 3.5 Messages

Namespaces (module augmentation of `MbcMessageRegistry`, as survey-web): `master` (field types, shared buttons, validation, bulk import, JSON dialog), `masterSetting`, `masterData`, `masterCopy`. Japanese text is v0's; English is added.

## 4. Internals

- **Data table:** `DataTable`, a small component (server paging and sorting); sortable column headers are buttons with `aria-sort`; page size, page links, result count and page-number box from ui-web `PaginationBar` (`table` variant); row selection (copy request) with labelled checkboxes. Column sizes follow v0's `meta.size`. Header text uses the foreground colour (muted text on the muted header is under 4.5:1); below 6.5rem per column the table scrolls sideways instead of squeezing its columns (M3b).
- **Forms:** validation from `/core` on submit; async code-uniqueness runs on submit (v0 ran it in `validate`); errors are linked to inputs (`aria-invalid`, `aria-describedby`) and focus moves to the first error on submit. Both editors keep their values in component state: the renderers are controlled (`value` / `onChange`), so react-hook-form would add a dependency without simplifying anything (rulings in M4 and M5).
- **Fields table:** dnd-kit sortable with keyboard sensor and translated announcements (survey creator's pattern); `code`, `name`, `seq` rows not removable.
- **State:** list state (page, page size, ordering, filters) internal or host-controlled; no URL access in the package.
- **Error handling:** every request failure reaches `onError` with the client error class; screens show an inline error with Retry for loads and a form-level alert for saves; an `MbcTimeoutError` on create says the outcome is unknown.
- **Accessibility:** axe-clean screens; labelled inputs; confirm dialogs for Delete and Restore; keyboard-operable table sorting, row selection, drag handles and editors' fallbacks. ui-web's destructive red is `#dc2626`: 4.83:1 with white text and on white (shadcn's `#ef4444` measured 3.76:1; M4).
- **SSR:** every screen renders with `renderToString`; dates format after hydration (survey's `useHydrated`); the rich editors load after mount.

## 5. Behaviour changes from v0

- Navigation through `routing`; no `next/navigation`.
- Outcomes through `onSaved` / `onDeleted` / `onError`; no toasts.
- No health-check request, no global loading overlay, no `MsLayout`.
- `tenantRole` dropped (unused in v0); system-tenant features behind `canCopy`.
- Copy posts to the framework's `/api/master-setting/copy` and takes tenants from `loadTenants` (v0 called host-specific endpoints for both).
- Bulk import sends batches of 100 and reports progress per item.
- A copy to "chosen tenants" with none chosen asks for a tenant; v0 copied to every tenant. A tenant's copy result says "succeeded" once its task has completed; v0 said so for every task without an error, finished or not.
- Copy task times show in the browser's time zone, after hydration (v0 formatted them in the browser too).
- The JSON import dialog is a normal dialog (no drag or resize).
- Rich editors are opt-in through `/editors`; without them the built-in textarea renderers apply.
- `auto_number` without `formatCode` sends the setting's `MASTER_SETTING#<code>` type code as v0 does (its outer variable). The data editor asks the host's `generateCode(field, setting)` once per save (M5); M7b's `createMasterApi` builds v0's two sequence requests; their bodies match the sequence package's DTOs (§3.4).

## 6. Testing

- Vitest + Testing Library + axe for every screen and every new ui-web component; React 18 and 19 via `pnpm use-react`.
- `renderToString` SSR tests for every entry; build-output tests for the new entries (`/core` has no React import, `/editors` is the only importer of the optional peers, `'use client'` banners).
- v0 class parity for the screens (survey's `v0c` approach).
- `/core` fixtures: settings with all ten field types and unknown extra attribute keys, data records of each; parse → form → payload round trips.
- `/mbc` against client-web's fake fetch and fake WebSocket, including bulk batching and progress, `FAILED` and timeout.
- Playground master pages on a fake master backend; `apps/next-smoke` imports every master-web entry.

## 7. Delivery and release

Sub-plans, each with its own detailed plan, executed in order:

| #   | Sub-plan        | Delivers                                                                                                                                                                                                 |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Foundations     | ui-web `Table`, `Accordion`, `Command`, `MultiSelect`; client-web `expectedFinishes` / `onProgress`; master-web scaffold, CSS build, test projects, playground and smoke wiring                          |
| M2  | `/core`         | types, parsers, `fieldTypes`, validators, payload builders, `parseBulkJson`, copy types, fixtures                                                                                                        |
| M3  | Lists           | `DataTable`, `MasterSettingList`, `MasterDataList`, `BulkImportDialog`                                                                                                                                   |
| M4  | Settings editor | fields table with reordering, field dialog, JSON dialog, view/edit, delete                                                                                                                               |
| M5  | Data editor     | renderer registry and built-ins, view/edit, auto-number, delete and restore, JSON dialog                                                                                                                 |
| M6  | `/editors`      | the three editors, lazy loading, `editors.css`, React 18/19 verification                                                                                                                                 |
| M7  | Copy + `/mbc`   | copy screens, `createMasterApi`, hooks, connected pages, playground fake backend                                                                                                                         |
| M8  | Release         | READMEs, `MIGRATION.md` (including a worked rewrite of a typical v0 host setup: providers, URL provider, axios and Apollo clients, CSS workarounds), smoke pages, CI, changeset, final whole-repo review |

Release: master-web joins the Changesets `fixed` group; one changeset releases all four packages as 1.0.0. ui-web, client-web and survey-web are not published before then.

## 8. Out of scope

- Changes to the backend packages or to any host app.
- Field types beyond v0's ten.
- CommonJS builds (as the survey spec).
- A routing adapter for a specific router; hosts write `routing` (the README shows Next App Router and React Router versions).
