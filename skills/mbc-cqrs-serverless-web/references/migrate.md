# Migrating from 0.0.x

The installed `MIGRATION.md` is the guide; work through it section by section rather than from memory:

```
node_modules/@mbc-cqrs-serverless/master-web/MIGRATION.md
node_modules/@mbc-cqrs-serverless/survey-web/MIGRATION.md
```

## The shape of the change

| 0.0.x                                                                                                     | 1.0                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| global CSS workaround, `./styles` JS import                                                               | one stylesheet import (`styles.css`, or `styles.layer.css` with Tailwind v4)                                        |
| `AppProviders` (master) / environment variables (survey), axios or Apollo, AWS Amplify inside the package | `createMbcClient({ apiUrl, tenantCode, getAuthToken, realtime })` + `MbcClientProvider`; the app keeps its own auth |
| `IUrlProvider` and `next/navigation` inside the package                                                   | a `MasterRouting` the app builds from its router                                                                    |
| page components bound to Next                                                                             | connected pages from `/mbc` in the app's own route files (`'use client'`)                                           |
| bundled Quill, Markdown editor, jsoneditor (`ssr: false`)                                                 | opt-in `/editors`: install the peers, import `editors.css`, pass `editorRenderers` / `JsonEditor`                   |
| host-specific constants inside the package (a system tenant, a tenant endpoint, extra flags)              | props: `canCopy`, `loadTenants`, `settingOptions`                                                                   |

## How to work through it

1. Inventory what the app uses from 0.0.x: imports, `AppProviders` / env setup, URL provider, which pages, editors, CSS workarounds.
2. Install 1.0 and remove the 0.0.x workarounds (CSS hacks, `ssr: false` wrappers, patches).
3. Follow MIGRATION.md's sections in order: install and styles → client → routing → pages and exports → tenants and host-specific parts → editors.
4. Keep old URLs working if users have bookmarks: MIGRATION.md has a router that writes 0.0.x's query strings.
5. Read the **behaviour changes** section and tell the developer which ones their users will notice (focus, read-only for other tenants, outcome-unknown after timeouts, text that is now translated…).
6. Stored data needs no migration: settings, records and surveys keep their shapes, and unknown keys survive.

Don't port host-specific logic into the library's props wholesale: keep the app's rules (who may copy, which tenant is special) in the app, passing only the result (`canCopy={…}`).
