# Migrating from master-web 0.0.x to 1.0

1.0 is a rewrite that loads and saves the same settings and records. Most changes are in how you set it up: no providers with your own axios and Apollo clients, no URL provider, and no Next.js inside the package. A host that needed workarounds for 0.0.x can drop all of them: `dynamic(…, { ssr: false })`, a script that confined the package's CSS, a body class that kept dialogs themed, `patch-package`, and a mock Apollo client.

## 1. Install and styles

```bash
pnpm add @mbc-cqrs-serverless/master-web react react-dom
pnpm remove @apollo/client next-usequerystate # if only master-web needed them
```

React 18 and 19 are supported, and `next` is no longer a peer dependency. axios, `@apollo/client`, `aws-amplify`, the AppSync SDKs, mobx and `nuqs` are not needed by this package.

```ts
import '@mbc-cqrs-serverless/master-web/styles.css'
```

The stylesheet changes nothing outside the package's own elements: every class has the `mbc:` prefix, there is no reset of your page, and dialogs keep the theme because their elements carry `data-mbc`. Use `styles.layer.css` if your app orders CSS layers. The `./styles` JS subpath is gone.

## 2. `AppProviders` → a client

```tsx v0
'use client'
const AppProviders = dynamic(
  () =>
    import('@mbc-cqrs-serverless/master-web/AppProviders').then(
      (mod) => mod.AppProviders
    ),
  { ssr: false }
)

export default function MasterLayout({ children }) {
  const { tenant } = useParams()
  const httpClient = useMemo(() => {
    const instance = axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api`,
      headers: { 'x-tenant-code': tenant },
    })
    instance.interceptors.request.use(async (config) => {
      const session = await fetchAuthSession()
      config.headers.Authorization = `Bearer ${session.tokens?.idToken}`
      return config
    })
    return instance
  }, [tenant])
  return (
    <AppProviders
      user={{ tenantCode: tenant, tenantRole: 'admin' }}
      urlProvider={new MasterUrlProvider(tenant)}
      httpClient={httpClient}
    >
      {children}
    </AppProviders>
  )
}
```

```tsx
'use client'
import type { ReactNode } from 'react'
import { MbcProvider } from '@mbc-cqrs-serverless/master-web'
import {
  createMbcClient,
  MbcClientProvider,
} from '@mbc-cqrs-serverless/master-web/mbc'
import { fetchAuthSession } from 'aws-amplify/auth'

let tenant = 'common'
/** Call from your layout when the tenant in the URL changes. */
export const setTenant = (code: string) => {
  tenant = code
}

const client = createMbcClient({
  // The origin: the API paths include /api.
  apiUrl: process.env.NEXT_PUBLIC_API_ENDPOINT!,
  tenantCode: () => tenant,
  getAuthToken: async () =>
    (await fetchAuthSession()).tokens?.idToken?.toString(),
  realtime: {
    url: process.env.NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT!,
    auth: {
      type: 'API_KEY',
      apiKey: process.env.NEXT_PUBLIC_AWS_APPSYNC_APIKEY!,
    },
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

- `httpClient` → `apiUrl`, `getAuthToken` and `tenantCode`. The client sends the `x-tenant-code` header and the token itself.
- `apolloClient` (and the AppSync endpoint it needed) → `realtime`. The pages wait for each change's completion message over it (README, "Realtime").
- `user.tenantCode` → `tenantCode`. A function is read on every request and every render, so it can follow the URL; it must also work on the server. `user.tenantRole` is gone: 0.0.x did not use it.
- `urlProvider` → the `routing` prop of each page (section 3).
- The package reads no environment variables; your app does.

## 3. `IUrlProvider` → `MasterRouting`

Each page takes `routing: { href(target), navigate(target), Link? }`. A target names a screen and its decoded ids.

| `IUrlProvider`                                            | Target                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| `SETTINGS_PAGE_URL`                                       | `{ screen: 'settings' }`                          |
| `ADD_SETTINGS_PAGE_URL`                                   | `{ screen: 'newSetting' }`                        |
| `EDIT_SETTINGS_PAGE_URL` + `/<pk>/<sk>`                   | `{ screen: 'setting', id }`                       |
| `DATA_PAGE_URL` + `?typeCode=…&typeCodeId=…`              | `{ screen: 'data', settingId }`                   |
| `ADD_DATA_PAGE_URL`                                       | `{ screen: 'newData', settingId }`                |
| `EDIT_DATA_PAGE_URL` + `/<pk>/<sk>`                       | `{ screen: 'dataItem', settingId, id }`           |
| `getCopySettingPageUrl(id)`                               | `{ screen: 'copyRequest', settingId }`            |
| `getDetailedCopySettingPageUrl(id)`                       | `{ screen: 'copyTasks', settingId }`              |
| `getDetailedCopySettingPageUrl(id)` + `/<task id>`        | `{ screen: 'copyTask', settingId, taskId }`       |
| the host-specific entries (a category page, the top page) | none; the settings list's back button is `onBack` |

An id is `<pk>#<sk>`, and `settingId` is the setting's id (0.0.x's `typeCodeId`). To keep 0.0.x's URLs, so that bookmarks still work:

```tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import type {
  MasterRouting,
  MasterTarget,
} from '@mbc-cqrs-serverless/master-web'

const base = '/admin/master' // where your master pages live
const enc = encodeURIComponent

/** 0.0.x's two segments: `MASTER#<tenant>` and the rest. */
function keys(id: string) {
  const at = id.indexOf('#', id.indexOf('#') + 1)
  return `${enc(id.slice(0, at))}/${enc(id.slice(at + 1))}`
}

const setting = (settingId: string) =>
  `typeCode=${enc(settingId.slice(settingId.indexOf('MASTER_SETTING#')))}&typeCodeId=${enc(settingId)}`

export function hrefOf(to: MasterTarget): string {
  switch (to.screen) {
    case 'settings':
      return `${base}/master-setting`
    case 'newSetting':
      return `${base}/master-setting/new`
    case 'setting':
      return `${base}/master-setting/${keys(to.id)}`
    case 'data':
      return `${base}/master-data?${setting(to.settingId)}`
    case 'newData':
      return `${base}/master-data/new?${setting(to.settingId)}`
    case 'dataItem':
      return `${base}/master-data/${keys(to.id)}?${setting(to.settingId)}`
    case 'copyRequest':
      return `${base}/master-setting/${keys(to.settingId)}/copy/new`
    case 'copyTasks':
      return `${base}/master-setting/${keys(to.settingId)}/copy`
    case 'copyTask':
      return `${base}/master-setting/${keys(to.settingId)}/copy/${enc(to.taskId)}`
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

## 4. Pages and exports

| 0.0.x                                                                | 1.0                                                                                                   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `MasterSetting` (`/MasterSetting`)                                   | `MbcMasterSettingListPage`                                                                            |
| `EditMasterSettings` (`/EditMasterSettings`, reads `pk`, `sk`)       | `MbcMasterSettingEditorPage` with `id` (none creates)                                                 |
| `MasterData` (`/MasterData`, reads `typeCodeId`)                     | `MbcMasterDataListPage` with `settingId`                                                              |
| `EditMasterData` (`/EditMasterData`, reads `pk`, `sk`, `typeCodeId`) | `MbcMasterDataEditorPage` with `settingId` and `id` (none creates)                                    |
| `NewCopyMasterSettings`                                              | `MbcMasterCopyRequestPage` with `settingId` and `loadTenants`                                         |
| `CopyMasterSettings`                                                 | `MbcMasterCopyTaskListPage` with `settingId`                                                          |
| `DetailCopy`                                                         | `MbcMasterCopyTaskDetailPage` with `settingId` and `taskId`                                           |
| `MsLayout` (`/MsLayout`, `useLoading`)                               | nothing: each page shows its own loading state and errors                                             |
| `JsonEditor`, `RichTextEditor`                                       | `/editors`: `JsonEditor`, `RichTextEditor`, `MarkdownEditor` (`value`, `onChange`), `editorRenderers` |
| `AppProviders` (`/AppProviders`), `useAppServices`                   | `MbcClientProvider` with a client (section 2)                                                         |
| `useHttpClient`, `useApolloClient`                                   | `useMbcClient()`, or `useMasterApi()` for the master endpoints                                        |
| `useUrlProvider`, `IUrlProvider` (`/UrlProvider`)                    | the `routing` prop, `MasterRouting`                                                                   |
| `useUserContext`                                                     | `useMbcClient().tenantCode()`                                                                         |
| `useLoadingStore`                                                    | nothing (no global loading overlay)                                                                   |

The pages read nothing from the URL; pass them the ids. With the URLs of section 3:

```tsx v0
'use client'
const EditMasterData = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/EditMasterData'),
  { ssr: false }
)
export default function Page() {
  return (
    <MsLayout useLoading>
      <EditMasterData />
    </MsLayout>
  )
}
```

```tsx
'use client'
// app/admin/master/master-data/[pk]/[sk]/page.tsx
import { useParams, useSearchParams } from 'next/navigation'
import { MbcMasterDataEditorPage } from '@mbc-cqrs-serverless/master-web/mbc'
import { useMasterRouting } from '@/app/admin/master/routing'

export default function DataItemPage() {
  const { pk, sk } = useParams<{ pk: string; sk: string }>()
  const settingId = useSearchParams().get('typeCodeId') ?? ''
  return (
    <MbcMasterDataEditorPage
      routing={useMasterRouting()}
      settingId={settingId}
      // Next gives the URL-encoded segments.
      id={`${decodeURIComponent(pk)}#${decodeURIComponent(sk)}`}
      onError={(error) => console.error(error)}
    />
  )
}
```

The package no longer navigates with Next's router or shows toasts: `onSaved`, `onDeleted` and `onError` tell you what happened, and the pages move on through `routing` as 0.0.x did.

## 5. Tenants, copying and host-specific parts

0.0.x had one app's rules built in. They are props now, off by default:

- **Who may copy** (0.0.x: one system tenant code) → `canCopy` on the settings editor page.
- **The copy destinations** (0.0.x: a host-specific endpoint read by fixed column names) → `loadTenants(): Promise<{ code: string; name: string }[]>` on the copy request page.
- **The copy request** (0.0.x: a host-specific endpoint) → the framework's `POST /api/master-setting/copy`. Change it with `paths.copy`.
- **Extra setting flags** (0.0.x: labels for two host-specific flags) → `settingOptions: { key: string; label: string }[]`, stored in `attributes` as before.
- **The word for a tenant** in the copy screens is now "テナント"; override it through `messages` (README, "Text").

## 6. Rich editors

0.0.x bundled Quill, the Markdown editor and jsoneditor, and needed `ssr: false` and the CSS workaround. They are opt-in now:

```bash
pnpm add react-quill-new quill-delta @uiw/react-md-editor jsoneditor
```

Then `import '@mbc-cqrs-serverless/master-web/editors.css'` and pass `components={editorRenderers}` (from `/editors`) to the data editor page. Without them, HTML, Markdown and JSON fields are text boxes. HTML that 0.0.x saved with `<div>` blocks loads unchanged; new edits are saved with `<p>` blocks (0.0.x changed Quill's blocks for every Quill on the page).

## 7. Behaviour changes

Stored settings and records keep their shapes. What behaves differently:

**Saving**

- Writes go through `client.command()`: each waits for the backend's completion message, and a `<step>:FAILED` message is reported as a failure.
- Saving unchanged data succeeds quietly.
- A save that timed out says the outcome is unknown. After a create, Save stays off so that a second save cannot number a duplicate record.
- Ids are URL-encoded in request paths.

**Bulk import**

- Items are sent in batches of 100 (0.0.x sent one request and failed above 100), with progress per item. A failed batch stops the import and the dialog says how many went in.
- The JSON dialog is a normal dialog; it no longer drags or resizes.

**Copying**

- Choosing "specified tenants" with none chosen asks for a tenant (0.0.x copied to every tenant).
- "Chosen data only" with no row ticked copies all the data, as before, and now says so.
- A tenant's result says the copy succeeded once its task has completed (0.0.x said so for every task without an error).
- Copy task times show in the browser's time zone after the page has loaded.

**Pages and screens**

- No health-check request, no global loading overlay, no toasts.
- List state (filters, page, sort) is kept inside a page unless you pass `state` and `onStateChange`, for example to keep it in the URL as 0.0.x did.
- Another tenant's setting or record opens read-only, `common` included, as before; the tenant is `client.tenantCode()`.
- Auto-numbered codes use 0.0.x's two sequence requests and their paths (`/api/sequence`, `/api/sequence/with-provided-setting`). The sequence package's own route is `provided-setting`: set `paths` if your backend mounts it as is.

**Editors**

- Tab moves on from the rich editors instead of indenting.
- The Markdown preview does not render raw HTML or script links.
- The editors load after the page has rendered; until then their fields are text boxes.
