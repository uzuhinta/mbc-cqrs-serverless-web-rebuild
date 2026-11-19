# Setting up an app

Check each step against the installed README (`node_modules/@mbc-cqrs-serverless/<package>/README.md`) — it has the exact code for that version.

## 1. Install

```bash
pnpm add @mbc-cqrs-serverless/master-web react react-dom   # or survey-web
```

- ui-web and client-web come with it; `MbcProvider` is re-exported from the root entry and the client from `/mbc`. Add them directly only to import from them, at the **same version** (the stylesheet is compiled from the exact ui-web it was built with).
- React `^18.2.0 || ^19.0.0`. ESM only: the app's bundler or Node must load ES modules.
- master-web's rich editors are optional: `pnpm add react-quill-new quill-delta @uiw/react-md-editor jsoneditor` only if you use `/editors`.

## 2. Stylesheet — import one, once

| The app has                            | Import                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| Tailwind v3 (3.4+) or no Tailwind      | `@mbc-cqrs-serverless/<pkg>/styles.css`                         |
| Tailwind v3.0–3.3                      | `styles.css`, loaded **after** the app's own CSS                |
| Tailwind v4, or its own `@layer` order | `styles.layer.css`, imported **before** `@import 'tailwindcss'` |

- survey-web and master-web ship the same stylesheet; an app using both can import either.
- master-web's editors also need `@mbc-cqrs-serverless/master-web/editors.css` (keep `editors-assets/` beside it if you copy files around).
- Every library class is prefixed `mbc:` and there is no global reset, so the app's own styles are untouched. Theme with `--mbc-*` CSS variables (`--mbc-primary`, `--mbc-brand`, `--mbc-radius`…); dark mode under `.dark` or `[data-mbc-theme="dark"]`.
- Plain `tsc` (outside Next/Vite) may need `declare module '*.css'` for the CSS imports on TypeScript 6.

## 3. Providers — in a client component

The tenant usually comes from the request (a cookie, the session, a route segment). Read it on the server — e.g. `(await cookies()).get('tenant')` in a server layout — and pass it to the providers as a prop:

```tsx
'use client'
import { useMemo, type ReactNode } from 'react'
import { MbcProvider } from '@mbc-cqrs-serverless/master-web'
import {
  createMbcClient,
  MbcClientProvider,
} from '@mbc-cqrs-serverless/master-web/mbc'

export function Providers({
  tenant,
  children,
}: {
  tenant: string
  children: ReactNode
}) {
  // One client per tenant, kept across renders. Not at module scope: on the
  // server a module-level client would be shared by every request.
  const client = useMemo(
    () =>
      createMbcClient({
        apiUrl: 'https://api.example.com',
        tenantCode: tenant, // a plain value: the same on server and client
        getAuthToken: async () => getIdToken(), // the app's auth; runs only on requests
        realtime: {
          url: 'https://<appsync-host>/graphql',
          auth: { type: 'API_KEY', apiKey: '…' },
        },
      }),
    [tenant]
  )
  return (
    <MbcClientProvider client={client}>
      <MbcProvider locale="ja">{children}</MbcProvider>
    </MbcClientProvider>
  )
}
```

- **Only connected pages (`/mbc`) need the client.** Prop-driven screens need just `MbcProvider`.
- **`tenantCode` is read during render, on the server too.** Never read `window`, `document.cookie` or `localStorage` there: the server would see no tenant, render the tenant's own items read-only, and the browser's HTML would differ (a hydration warning). A `typeof window` guard or `ssr: false` only hides that; pass the server-read value instead. After the tenant changes (e.g. a new cookie), call `router.refresh()` so the server layout reads it again.
- **`realtime`:** with it, a save waits for the backend's "finished" message, so a page that opens a new item finds it stored. Without it, writes end as soon as the backend accepts them; a new item may not be readable yet.
- **Events instead of GraphQL:** when the backend publishes with `NOTIFICATION_TRANSPORTS=appsync-event`, use `realtime: { transport: 'events', url: '<Events HTTP endpoint>/event', auth: { type: 'API_KEY', apiKey }, namespace }`. API key only; `namespace` = the backend's `APPSYNC_EVENTS_NAMESPACE` (default `default`). Nothing else changes.
- **A module-scope client** is fine only for a single-page app (Vite) or when the tenant never changes per request.
- `MbcProvider`: `locale` `'ja'` (default) or `'en'`; `messages` for text overrides (keep the object stable); `dir`; `portalContainer`.

## 4. Routing — a `MasterRouting` (master-web) or callbacks (survey-web)

The packages have no router. master-web's pages take `routing: { href(target), navigate(target), Link? }`, where a target is `{ screen: 'settings' | 'newSetting' | 'setting' | 'data' | 'newData' | 'dataItem' | 'copyRequest' | 'copyTasks' | 'copyTask', ...ids }`. Build it from the app's router:

- **Next App Router:** `next/link` as `Link`, `useRouter().push` in `navigate`, in a `'use client'` hook (`useMemo`).
- **React Router:** its `Link` and `useNavigate()`.
- Encode ids in `href` (`encodeURIComponent`); route params arrive encoded — decode them before passing `id` / `settingId` to a page. Next allows one slug name per level, so the settings editor's folder is `[settingId]` too and passes it as `id`.

The README has a complete `hrefOf` for Next and React Router — copy it from the installed version and adjust the paths to the app's.

## 5. One page per route

Pages: `MbcMasterSettingListPage`, `MbcMasterSettingEditorPage`, `MbcMasterDataListPage`, `MbcMasterDataEditorPage`, `MbcMasterCopyRequestPage`, `MbcMasterCopyTaskListPage`, `MbcMasterCopyTaskDetailPage` (master-web); `MbcSurveyTemplateListPage`, `MbcSurveyTemplateEditorPage` (survey-web). Each takes `routing` (or navigation callbacks), `onError` and optional `paths` (backend paths) plus its ids. master-web's pages also take `systems` (`{ id, label }[]`, include `shared` to offer it) when the backend has access rules. Pass the same list to every page. The list pages take `includeCommon` to add the common tenant's rows.

## Checklist before calling it done

- [ ] One stylesheet imported, the right one for the Tailwind version.
- [ ] Providers in a `'use client'` file, client created once, `tenantCode` safe on the server.
- [ ] Every page file marked `'use client'`; ids encoded in URLs and decoded from params.
- [ ] Opened in the browser: styles applied, no hydration warning in the console, a save completes.
