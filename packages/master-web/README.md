# @mbc-cqrs-serverless/master-web

Master settings and master data for MBC CQRS Serverless apps: the setting and data lists and editors, bulk JSON import, copying a setting to other tenants, and the backend integration. React 18 and 19, ESM-only, SSR-safe, Japanese and English. Upgrading from 0.0.x? Read [MIGRATION.md](./MIGRATION.md).

## Install

```bash
pnpm add @mbc-cqrs-serverless/master-web react react-dom
```

`@mbc-cqrs-serverless/ui-web` and `@mbc-cqrs-serverless/client-web` come with it, and everything a master screen needs is re-exported (`MbcProvider` from the root, the client from `/mbc`). Add them yourself only to import them directly, and then at master-web's exact version: the packages are released together, and master-web's stylesheet is compiled from the ui-web it was built with.

```ts
import '@mbc-cqrs-serverless/master-web/styles.css'
```

Next and Vite declare CSS imports for TypeScript; elsewhere (plain `tsc`, some test setups), TypeScript 6 needs a declaration such as `declare module '*.css'` in a `.d.ts` file.

With Tailwind v3, keep `styles.css` (on 3.0–3.3, load it after your own CSS). With Tailwind v4 or your own CSS layers, import `@mbc-cqrs-serverless/master-web/styles.layer.css` instead, before Tailwind (it contains ui-web's styles too). See ui-web's README for layer order and theming. Using survey-web as well? Its stylesheet is the same file as master-web's (each covers both packages), so import either one, or both.

## Entry points

| Import                                                | Contents                                                                                                      | Needs the backend client |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `@mbc-cqrs-serverless/master-web`                     | the screens (data and callbacks only), `MasterLink`, field renderers, messages, `MbcProvider`, all of `/core` | no                       |
| `…/core`                                              | types, parsers, field types, validators, request bodies, the bulk JSON parser — no React, for servers         | no                       |
| `…/editors`                                           | rich editors for HTML, Markdown and JSON fields (opt-in, optional peer dependencies)                          | no                       |
| `…/mbc`                                               | API, hooks and connected pages on `client-web`                                                                | yes                      |
| `…/styles.css`, `…/styles.layer.css`, `…/editors.css` | stylesheets                                                                                                   | —                        |

## With the mbc-cqrs-serverless backend (`/mbc`)

The connected pages load and save through the master backend (`/api/master-setting`, `/api/master-data`, `/api/master-bulk`, the copy task endpoints and the sequence package). Give them a client and your router.

**1. A client, once, in a client component:**

```tsx
'use client'
import type { ReactNode } from 'react'
import { MbcProvider } from '@mbc-cqrs-serverless/master-web'
import {
  createMbcClient,
  MbcClientProvider,
} from '@mbc-cqrs-serverless/master-web/mbc'
import { fetchAuthSession } from 'aws-amplify/auth'

const client = createMbcClient({
  apiUrl: 'https://api.example.com',
  // Read on every request and on every render (also on the server).
  tenantCode: () => 'my-tenant',
  getAuthToken: async () =>
    (await fetchAuthSession()).tokens?.idToken?.toString(),
  realtime: {
    url: 'https://example.appsync-api.ap-northeast-1.amazonaws.com/graphql',
    auth: { type: 'API_KEY', apiKey: 'da2-…' },
  },
})

export function MasterProviders({ children }: { children: ReactNode }) {
  return (
    <MbcClientProvider client={client}>
      <MbcProvider locale="ja">{children}</MbcProvider>
    </MbcClientProvider>
  )
}
```

**2. Your routes, as a `MasterRouting`.** The pages link and navigate through it; the package has no routing of its own. Ids in targets are decoded (`MASTER#tenant#MASTER_SETTING#PRODUCT`); encode them in your URLs. With the Next App Router:

```tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import type {
  MasterRouting,
  MasterTarget,
} from '@mbc-cqrs-serverless/master-web'

const id = encodeURIComponent

export function hrefOf(to: MasterTarget): string {
  switch (to.screen) {
    case 'settings':
      return '/master'
    case 'newSetting':
      return '/master/new'
    case 'setting':
      return `/master/${id(to.id)}`
    case 'data':
      return `/master/${id(to.settingId)}/data`
    case 'newData':
      return `/master/${id(to.settingId)}/data/new`
    case 'dataItem':
      return `/master/${id(to.settingId)}/data/${id(to.id)}`
    case 'copyRequest':
      return `/master/${id(to.settingId)}/copy/new`
    case 'copyTasks':
      return `/master/${id(to.settingId)}/copy`
    case 'copyTask':
      return `/master/${id(to.settingId)}/copy/${id(to.taskId)}`
  }
}

export function useMasterRouting(): MasterRouting {
  const router = useRouter()
  return useMemo<MasterRouting>(
    () => ({ href: hrefOf, navigate: (to) => router.push(hrefOf(to)), Link }),
    [router]
  )
}
```

**3. A page per route:**

```tsx
'use client'
// app/master/[settingId]/data/[id]/page.tsx
import { useParams } from 'next/navigation'
import { MbcMasterDataEditorPage } from '@mbc-cqrs-serverless/master-web/mbc'
import { useMasterRouting } from '@/app/master/routing'

export default function DataItemPage() {
  const params = useParams<{ settingId: string; id: string }>()
  return (
    <MbcMasterDataEditorPage
      routing={useMasterRouting()}
      // Next gives the URL-encoded segment; the page encodes ids itself.
      settingId={decodeURIComponent(params.settingId)}
      id={decodeURIComponent(params.id)}
      onError={(error) => console.error(error)}
    />
  )
}
```

| Page                          | Route (above)                        | Props besides `routing`, `onError`, `paths`                                                                      |
| ----------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `MbcMasterSettingListPage`    | `/master`                            | `state` / `onStateChange` (kept inside without them), `inputSampleJson`, `mapRawItem`, `onBack`                  |
| `MbcMasterSettingEditorPage`  | `/master/new`, `/master/[settingId]` | `id` (none creates), `onSaved(id)`, `onDeleted()`, `canCopy`, `settingOptions`, `formats` or `formatSettingCode` |
| `MbcMasterDataListPage`       | `/master/[settingId]/data`           | `settingId`, `state` / `onStateChange`, `inputSampleJson`, `mapRawItem`                                          |
| `MbcMasterDataEditorPage`     | `…/data/new`, `…/data/[id]`          | `settingId`, `id` (none creates), `onSaved(id)`, `onDeleted()`, `components`                                     |
| `MbcMasterCopyRequestPage`    | `/master/[settingId]/copy/new`       | `settingId`, `loadTenants(): Promise<{ code; name }[]>`, `onRequested()`, `state` / `onStateChange`              |
| `MbcMasterCopyTaskListPage`   | `/master/[settingId]/copy`           | `settingId`, `pollMs`                                                                                            |
| `MbcMasterCopyTaskDetailPage` | `/master/[settingId]/copy/[taskId]`  | `settingId`, `taskId`, `pollMs`                                                                                  |

Next allows one slug name per path level, so the settings editor's folder is `[settingId]` as well: its page passes `params.settingId` as `id`. The data editor in step 3 has no editors' libraries; to add them, see "Rich editors" below.

- **After a write** the pages go on as 0.0.x did: a new setting opens its data list, a new record opens itself, a deleted setting returns to the settings list, a copy request opens the copy results. `onSaved` and `onDeleted` only tell you; do not navigate in them as well.
- **Errors** show on the page, and every failed load or write also reaches `onError` (show a toast there, if your app has them). A write cut short by leaving the page is not reported. A `MbcTimeoutError` means the outcome is unknown: the data editor keeps Save off so that a second save cannot number a duplicate.
- **Ids that change** start the page afresh, also when your router re-uses the page component.
- **Sequences.** The settings editor offers the records of the `sequence_setting` master as the formats an auto-numbered code can use (as 0.0.x did). Pass `formats` to choose them yourself, or `formatSettingCode` to read another master.
- **Copy task results** reload on Refresh; pass `pollMs` to reload that long after each answer.

### Tenants

The current tenant is `client.tenantCode()`. A setting or record belongs to the tenant in its `tenantCode`; another tenant's items, `common` included, open read-only (no Save, Delete, Restore, field reordering or JSON import), and their links still work. `canCopy` on the settings editor shows the copy links; whether a user may copy is your app's decision (0.0.x showed them to one system tenant). Reaching the copy pages is your routing.

`tenantCode` runs during render, on the server too, so it must not need the browser. Compare and pass the tenant exactly as the backend stores it.

### Realtime

Writes are commands: the page waits for the backend's `finish:FINISHED` message over AppSync realtime, so a page that opens a new item finds it stored. Without `realtime`, a write ends as soon as the request is accepted; a newly created item may not be readable yet, and a list reloaded after an import may not show its rows yet (the import dialog says the items were accepted, not imported). Your own `onImport` can resolve `'accepted'` for the same message.

### With React Router

```tsx
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import type { MasterRouting } from '@mbc-cqrs-serverless/master-web'
import { hrefOf } from './routes' // the same hrefOf as above

function RouterLink(props: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={props.href} className={props.className}>
      {props.children}
    </Link>
  )
}

export function useMasterRouting(): MasterRouting {
  const navigate = useNavigate()
  return useMemo<MasterRouting>(
    () => ({
      href: hrefOf,
      navigate: (to) => void navigate(hrefOf(to)),
      Link: RouterLink,
    }),
    [navigate]
  )
}
```

React Router's `useParams()` gives decoded values: pass them to the pages as they are.

### Hooks and the API

For your own pages: `useMasterApi()` (the API on the provider's client), `useMasterSettings(state)`, `useMasterSetting(id)`, `useMasterDataList(settingId, state)`, `useMasterData(id)`, `useCopyTasks(settingCode, { pollMs })`, `useCopyTask(id, { pollMs })`, and `useMasterMutations()`. Each write there has `run` (resolves `undefined` on failure, the error is in `error`) and `runOrThrow` (resolves with the write's result and rejects with the write's own error, which the screens need). A create resolves with the new item's id as the backend wrote it: open that, not an id built from the tenant code, which the backend lowercases (core 1.1.0).

`createMasterApi(client, { paths })` works without React, on a server too. Bulk import sends batches of 100 (the backend's limit); a failed batch rejects with `MasterBulkError` (`done`, `from`, `to`). Every path can be changed:

```ts
import {
  createMasterApi,
  createMbcClient,
} from '@mbc-cqrs-serverless/master-web/mbc'

const api = createMasterApi(
  createMbcClient({
    apiUrl: 'https://api.example.com',
    tenantCode: 'my-tenant',
  }),
  // The defaults are 0.0.x's paths (/api/sequence, /api/sequence/with-provided-setting).
  // For a backend that mounts the sequence package's controller as is, here at /api/seq:
  {
    paths: {
      sequence: '/api/seq',
      sequenceWithSetting: '/api/seq/provided-setting',
    },
  }
)
export const settings = () =>
  api.settings.list({ page: 1, pageSize: 20, code: '', name: '', keyword: '' })
```

## Screens without the backend

The screens take data and callbacks only, so any backend works:

```tsx
'use client'
import {
  MasterSettingList,
  type MasterRouting,
  type MasterSettingListItem,
  type MasterSettingListState,
} from '@mbc-cqrs-serverless/master-web'

export function Settings(props: {
  items: MasterSettingListItem[]
  total: number
  state: MasterSettingListState
  setState: (state: MasterSettingListState) => void
  routing: MasterRouting
}) {
  return (
    <MasterSettingList
      items={props.items}
      total={props.total}
      state={props.state}
      onStateChange={props.setState}
      routing={props.routing}
    />
  )
}
```

| Screen                  | Takes                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MasterSettingList`     | `items`, `total`, `state`, `onStateChange`, `loading`, `error` / `onRetry`, `onImport`, `onImported`, `tenantCode`, `jsonEditor`, `onBack`                      |
| `MasterSettingEditor`   | `mode`, `setting`, `tenantCode`, `checkCodeUnique`, `onSave(body)`, `onDelete`, `canCopy`, `settingOptions`, `formats`, `jsonEditor`, `loading`, `error`        |
| `MasterDataList`        | `setting`, `items`, `total`, `state`, `onStateChange`, `onImport`, `tenantCode`, …                                                                              |
| `MasterDataEditor`      | `mode`, `setting`, `data`, `tenantCode`, `checkCodeUnique`, `generateCode(field, setting)`, `onSave(body)`, `onDelete`, `onRestore`, `components`, `jsonEditor` |
| `BulkImportDialog`      | `screen`, `onImport(items, onProgress)`, `inputSampleJson`, `mapRawItem`, `tenantCode`, `jsonEditor`                                                            |
| `MasterCopyRequestForm` | `setting`, `tenants`, `items`, `total`, `state`, `onStateChange`, `onRequestCopy(request)`                                                                      |
| `MasterCopyTaskList`    | `settingId`, `tasks`, `loading`, `error`, `onRefresh`                                                                                                           |
| `MasterCopyTaskDetail`  | `settingId`, `tasks`, `loading`, `error`, `onRefresh`                                                                                                           |

Every screen also takes `routing`. Async props reject to show a failure on the screen; an error named `MbcTimeoutError` is shown as "outcome unknown". `/core` builds the request bodies the backend expects (`toSettingPayload`, `toDataPayload`, `buildCopyRequest`), which is what `onSave` and `onRequestCopy` receive.

## Field renderers

The data editor renders each field with the built-in for its type (`defaultRenderers`). Replace any of them with `components`:

```tsx
'use client'
import type { FieldRendererProps } from '@mbc-cqrs-serverless/master-web'

export function ColorField(props: FieldRendererProps) {
  return (
    <input
      type="color"
      id={props.id}
      value={typeof props.value === 'string' ? props.value : '#000000'}
      onChange={(event) => props.onChange(event.target.value)}
      onBlur={props.onBlur}
      disabled={props.disabled}
      aria-invalid={props.invalid || undefined}
      aria-describedby={props.describedBy}
    />
  )
}

// <MasterDataEditor components={{ string: ColorField }} … />
```

A renderer gets `field`, `value` (`FieldRendererProps['value']`), `onChange`, `onBlur`, `id` (the label points at it), `labelId` (for a group of inputs), `describedBy`, `invalid` and `disabled`.

## Rich editors (`/editors`)

`text-html`, `text-markdown` and `json` fields are text boxes by default. For 0.0.x's editors, install the libraries and pass `editorRenderers`:

```bash
pnpm add react-quill-new quill-delta @uiw/react-md-editor jsoneditor
```

```tsx
'use client'
import '@mbc-cqrs-serverless/master-web/editors.css'
import {
  editorRenderers,
  JsonEditor,
} from '@mbc-cqrs-serverless/master-web/editors'
import { MbcMasterDataEditorPage } from '@mbc-cqrs-serverless/master-web/mbc'
import { useMasterRouting } from '@/app/master/routing'

export function DataItem(props: { settingId: string; id: string }) {
  return (
    <MbcMasterDataEditorPage
      routing={useMasterRouting()}
      settingId={props.settingId}
      id={props.id}
      components={editorRenderers}
      jsonEditor={JsonEditor}
    />
  )
}
```

`jsonEditor` puts the editor in the JSON dialog (JSONエディタ) as well; the settings list and editor and the data list take it too, for their dialogs. Without it the dialogs are text boxes. Any component that takes `JsonTextEditorProps` (`value`, `onChange`, `labelId`, `describedBy`, `invalid`, `disabled`) works there.

- Each editor shows a plain text box on the server and until its library has loaded (with `import()` after mount), so nothing else waits for them. `RichTextEditor`, `MarkdownEditor` and `JsonEditor` are also exported for your own forms.
- **Styles:** `editors.css` holds Quill's and jsoneditor's styles, scoped to their own classes. Keep `editors-assets/` (jsoneditor's icon sprite and the libraries' licences, `THIRD_PARTY_NOTICES.txt`) beside it if you copy the file. The Markdown editor imports its own CSS from JavaScript; if your bundler drops CSS imported that way, add `import '@uiw/react-md-editor/markdown-editor.css'`.
- **CSP:** Ace (inside jsoneditor) adds `<style>` elements, so `style-src` needs `'unsafe-inline'`. It also starts its JSON worker from a `blob:` URL that loads a `data:` script, so `worker-src` needs `blob:` and `script-src` needs `data:`. Where that cannot be allowed, leave `json` out of `components` and `jsonEditor` unset.
- **Size:** jsoneditor with Ace is about 1 MB minified. It loads only when `JsonEditor` renders: for a JSON field, or when a JSON dialog with it opens.
- The editors stay light in dark mode, and their own toolbar text is the libraries' English.

## On a server (`/core`)

```ts
import {
  dataFields,
  parseBulkJson,
  parseMasterData,
  parseMasterSetting,
  toFormValues,
  validateMasterData,
} from '@mbc-cqrs-serverless/master-web/core'

export function checkImport(json: string) {
  // The import dialog's rules; each error carries its entry's index.
  return parseBulkJson(json, { screen: 'settings' })
}

export function checkRecord(storedSetting: unknown, storedRecord: unknown) {
  const setting = parseMasterSetting(storedSetting)
  const record = parseMasterData(storedRecord)
  if (!setting.success) throw setting.error
  if (!record.success) throw record.error
  const fields = dataFields(setting.data)
  // The data editor's rules: required, length, pattern, min, max, valid JSON.
  return validateMasterData(fields, toFormValues(fields, record.data), {
    mode: 'update',
  })
}
```

`/core` imports only zod, so it loads fast and needs no React.

## Text

Japanese by default; `<MbcProvider locale="en">` switches every screen. Override any string through `messages`, in the namespaces `master` (field types, tables, bulk import, JSON dialog), `masterSetting`, `masterData` and `masterCopy`, plus ui-web's `ui`. For example, to call tenants something else:

```tsx
import type { ReactNode } from 'react'
import { MbcProvider } from '@mbc-cqrs-serverless/master-web'

// Defined once, outside the component: a new object each render makes every
// translated component re-render.
const messages = {
  masterCopy: {
    request: { allTenants: '全拠点', chosenTenants: '指定した拠点' },
  },
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MbcProvider locale="ja" messages={messages}>
      {children}
    </MbcProvider>
  )
}
```

## Data

- Settings and records keep 0.0.x's stored shapes, and keys this package does not know survive a load and a save.
- Values 0.0.x stored as another type (a number as text, `'true'`) load, show and save unchanged when not edited.
- Ids are passed decoded and URL-encoded in requests; they contain `#`.

## Next.js

The screens and pages are client components: render them from files marked `'use client'`. `/core` is safe in Server Components and route handlers. The rich editors load after mount, and copy task times show in the browser's time zone after hydration, so server and browser render the same HTML.
