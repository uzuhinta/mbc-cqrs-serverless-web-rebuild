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
3. The screens keep v0's look (shadcn/slate) and Japanese text.
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

- `master-web` depends on `ui-web` and `client-web` (same version, `workspace:^`), `react-hook-form`, `zod` 4, `@tanstack/react-table`, `@dnd-kit/*`, `lucide-react`. Peer: `react`, `react-dom` `^18.2 || ^19`.
- Optional peers (only `/editors` imports them): `react-quill-new`, `@uiw/react-md-editor`, `jsoneditor`.
- Not used: axios, `@apollo/client`, aws-amplify, `aws-appsync-*`, mobx, swr, nuqs, `next-usequerystate`, next, `react-draggable`, `react-resizable`, `patch-package`, `usehooks-ts`.
- The TanStack `DataTable` lives in master-web (its only user); ui-web gains only the plain `Table` primitives.
- The survey spec's library rules apply: no env vars, no `window` during render, no global CSS outside the `mbc:` prefix, `'use client'` on client modules only, ESM only.

### ui-web additions (ship in 1.0.0)

| Component                                                                                                | Notes                                                                                                |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | shadcn markup and classes (v0's `components/ui/table.tsx`)                                           |
| `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`                                     | Radix accordion; caret range like the other Radix packages                                           |
| `Command` family                                                                                         | `cmdk`                                                                                               |
| `MultiSelect`                                                                                            | v0's `multi-select-combobox` behaviour: search, chips, select all; keyboard and screen-reader tested |

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
| `…/editors.css`                      | the three editors' CSS, scoped (section 3.3)                                                                              |

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
- `validateMasterData(setting, values)` → `Record<string, { key, params }>` over all fields.
- `toDataPayload(setting, values, mode: 'create' | 'update')` — v0's request bodies: with a `code` field, `code` and `name` come from `attributes`; empty `seq` → `undefined` on create, `0` on update; JSON fields parsed.
- `validateFieldDefinition(field, siblings)` — `physicalName` required, unique, not reserved; default value fits the type (v0's checks); `auto_number` only on `code`.
- `defaultSettingFields` — v0's fixed `code`, `name`, `seq` fields.
- `parseBulkJson(text, { kind: 'setting' | 'data', mapRawItem? })` → `{ items: BulkJsonItem[]; errors: { index: number; key: string }[] }`. Keeps v0's `MapResult`, `MappedSetting`, `MappedData`, `mapResultToBulkItem` and the `mapRawItem` hook.
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

| Screen                 | Behaviour (v0 parity unless noted)                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MasterSettingList`    | search by code, name, keyword; clear; table (code → data list, name, description) with sorting and paging; "own tenant" ◯ column unless `canCopy`; Create; bulk import                                                                                                                                                                                  |
| `MasterSettingEditor`  | code (unique check), name, description, `settingOptions` toggles; fields table: drag to reorder, add/edit dialog with per-type options, delete (not `code`, `name`, `seq`); view/edit mode; Save, Cancel, Delete (confirm); JSON dialog (edit, import, download the whole setting); copy buttons when `canCopy`; read-only for another tenant's setting |
| `MasterDataList`       | setting header (name, description, link to edit the setting); search by code, keyword, "show deleted"; columns from `isShowedOnList` fields, formatted per type; Create; bulk import                                                                                                                                                                    |
| `MasterDataEditor`     | form built from the setting's fields through the renderer registry; view/edit mode; code locked after create; `auto_number` generated on save; Delete and Restore (soft delete, confirm); JSON dialog; read-only for another tenant's record                                                                                                            |
| `BulkImportDialog`     | paste or load a JSON file, download the sample (`inputSampleJson`), per-item errors from `parseBulkJson`, submit with progress (`done / total`). **Change:** a normal large dialog instead of v0's drag-and-resize window                                                                                                                               |
| `MasterCopyRequest`    | destinations: all tenants or chosen ones (`MultiSelect` over `tenants`); content: setting + all data, setting only, or chosen data rows (selectable data table)                                                                                                                                                                                         |
| `MasterCopyTaskList`   | the setting's copy tasks with status; links to detail; Refresh                                                                                                                                                                                                                                                                                          |
| `MasterCopyTaskDetail` | per-tenant results of one copy task; Refresh                                                                                                                                                                                                                                                                                                            |

Backend-dependent behaviour enters as async props: `checkCodeUnique(code)`, `generateCode(field)`, `onSave`, `onDelete`, `onRestore`, `onImport(items, onProgress)`, `onRequestCopy`.

**Host-specific behaviour as props** (all optional, default off): `canCopy` (v0 hard-codes a system tenant code), `tenants: { code: string; name: string }[]` (v0 reads a host-specific endpoint), `settingOptions: { key: string; label: string }[]` (extra boolean flags stored in `attributes`, for hosts whose backend reads such flags). Every string is a message, so a host can replace "テナント" with its own term by override.

**Field renderers.** `MasterDataEditor` renders each field with `renderers[field.dataType]`; `components={{ [dataType]: Renderer }}` replaces any of them (`FieldRendererProps`: `field`, `value`, `onChange`, `onBlur`, `disabled`, `invalid`, `describedBy`, `id`). Built-ins: input (`string`, `auto_number` read-only), number input, switch (`boolean`), date picker (ui-web `Calendar`), list input (`array`), textarea with JSON check (`json`), textarea with `maxRow` (`text-area`), textarea + preview (`text-html`, `text-markdown`).

### 3.3 Editors (`/editors`)

- `RichTextEditor` (react-quill-new), `MarkdownEditor` (`@uiw/react-md-editor`), `JsonEditor` (`jsoneditor`), each a client component that loads its library with `React.lazy` / dynamic `import()` after mount, so SSR renders the built-in fallback.
- `editorRenderers = { 'text-html': …, 'text-markdown': …, json: … }` to pass as `components`. Opt-in by design: a bundler fails at build time on an import of a package that is not installed, so nothing detects them automatically.
- `editors.css` is built from the three libraries' CSS by a script that keeps only rules whose selectors contain the library's own root class (`.ql-`, `.w-md-editor` / `.wmde-markdown`, `.jsoneditor`) and drops element, `:root` and `body` rules; a build test asserts it. Colours map to ui-web tokens where the libraries use variables.
- Each editor is verified on React 18 and 19 in sub-plan M6. An editor that cannot run on one version is documented in the README, and its renderer falls back to the built-in on that version.

### 3.4 Backend integration (`/mbc`)

`createMasterApi(client, { paths? })` — every path overridable (a host whose backend wraps an endpoint points at its own path):

| Group    | Methods → endpoints                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| settings | `list(query)` → `GET /api/master-setting/list` (`code`, `name`, `keyword`, `page`, `pageSize`, `orderBys`); `get(id)` → `/detail/:id`; `create`, `update(id)`, `delete(id)`; `checkCode(code)`                                                                                                                                                                                                                                     |
| data     | `list(query)` → `GET /api/master-data/list` (`settingCode`, `code`, `keyword`, `isDeleted`, paging); `get(id)`; `create` → `/create`; `update(id)`; `delete(id)`; `restore(id)` (`PUT` `{ isDeleted: false }`); `checkCode(settingCode, code)`                                                                                                                                                                                     |
| bulk     | `importItems(items, onProgress)` → `POST /api/master-bulk`, in batches of 100 (the backend's limit). **Change:** v0 sent one request and failed above 100 items                                                                                                                                                                                                                                                                    |
| sequence | `generateCode(field, setting)` → `POST /api/sequence/with-provided-setting` when `formatCode` is set, else `POST /api/sequence` (v0's two branches, paths and bodies). The sequence package mounts nowhere by itself and names its route `provided-setting`, so these defaults are v0's host paths; hosts on the plain package set `paths.sequence` / `paths.sequenceWithSetting`. M5 confirms the bodies against the package DTOs |
| copy     | `request(body)` → `POST /api/master-setting/copy`; `tasks(settingCode)` → `GET /api/tasks/sfn-task-parent?masterSettingCode=`; `task(id)` → `GET /api/tasks/:id` (the copy task's per-tenant child tasks)                                                                                                                                                                                                                          |

- Ids are passed decoded and URL-encoded in paths.
- Writes (create, update, delete, restore, bulk) use `client.command()`: request → `finish:FINISHED` over AppSync; `<step>:FAILED` → `MbcCommandError`; timeout → `MbcTimeoutError` (outcome unknown). Bulk uses `expectedFinishes` per batch and reports overall progress.
- Copy is a Step Functions job: `request` is a plain HTTP call; the task screens fetch status (Refresh button, optional `pollMs`).
- Hooks: `useMasterSettings(state)`, `useMasterSetting(id)`, `useMasterDataList(settingId, state)`, `useMasterData(id)`, `useMasterMutations()`, `useCopyTasks(settingCode)`, `useCopyTask(id)` — built on client-web's query and command helpers like survey-web's hooks.
- Connected pages: `MbcMasterSettingListPage`, `MbcMasterSettingEditorPage` (`id?`), `MbcMasterDataListPage` (`settingId`), `MbcMasterDataEditorPage` (`settingId`, `id?`), `MbcMasterCopyRequestPage`, `MbcMasterCopyTaskListPage`, `MbcMasterCopyTaskDetailPage`. Common props: `routing`, `onSaved`, `onDeleted`, `onError`, `components`; list pages: `state` / `onStateChange` (internal state when omitted); copy pages and the settings editor: `canCopy`, `loadTenants(): Promise<{ code: string; name: string }[]>`; settings list: `inputSampleJson`, `mapRawItem`.

**Tenant rules (v0's):** the current tenant is `client.tenantCode()` (resolved per request). An item belongs to the tenant in its `tenantCode`; other tenants' items, `common` included, open read-only. `canCopy` is the host's decision.

### 3.5 Messages

Namespaces (module augmentation of `MbcMessageRegistry`, as survey-web): `master` (field types, shared buttons, validation, bulk import, JSON dialog), `masterSetting`, `masterData`, `masterCopy`. Japanese text is v0's; English is added.

## 4. Internals

- **Data table:** `DataTable` on TanStack Table v8 in manual mode (server paging and sorting); sortable column headers are buttons with `aria-sort`; page size and page links from ui-web `Pagination`; row selection (copy request) with labelled checkboxes. Column sizes follow v0's `meta.size`.
- **Forms:** react-hook-form with resolvers built from `/core` validators; async code-uniqueness runs on submit (v0 ran it in `validate`); errors are linked to inputs (`aria-invalid`, `aria-describedby`) and focus moves to the first error on submit.
- **Fields table:** dnd-kit sortable with keyboard sensor and translated announcements (survey creator's pattern); `code`, `name`, `seq` rows not removable.
- **State:** list state (page, page size, ordering, filters) internal or host-controlled; no URL access in the package.
- **Error handling:** every request failure reaches `onError` with the client error class; screens show an inline error with Retry for loads and a form-level alert for saves; an `MbcTimeoutError` on create says the outcome is unknown.
- **Accessibility:** axe-clean screens; labelled inputs; confirm dialogs for Delete and Restore; keyboard-operable table sorting, row selection, drag handles and editors' fallbacks.
- **SSR:** every screen renders with `renderToString`; dates format after hydration (survey's `useHydrated`); the rich editors load after mount.

## 5. Behaviour changes from v0

- Navigation through `routing`; no `next/navigation`.
- Outcomes through `onSaved` / `onDeleted` / `onError`; no toasts.
- No health-check request, no global loading overlay, no `MsLayout`.
- `tenantRole` dropped (unused in v0); system-tenant features behind `canCopy`.
- Copy posts to the framework's `/api/master-setting/copy` and takes tenants from `loadTenants` (v0 called host-specific endpoints for both).
- Bulk import sends batches of 100 and reports progress per item.
- The JSON import dialog is a normal dialog (no drag or resize).
- Rich editors are opt-in through `/editors`; without them the built-in textarea renderers apply.
- `auto_number` without `formatCode` sends the setting's `MASTER_SETTING#<code>` type code as v0 does (its outer variable); M5 confirms against the sequence backend and documents the result.

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
