# M7c — Connected Pages Implementation Plan

> **For agentic workers:** Implement this plan task by task, in order. Every task is test-first: write the test, run it and watch it fail for the stated reason, write the code, run it and watch it pass, commit. If your harness has the superpowers skills, use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/mbc` entry's seven connected pages. Each one puts a screen on the master backend through M7b's hooks, so a host renders a page with an id and its routing, and nothing else. This completes v0's features.

| Page                          | Screen                  |
| ----------------------------- | ----------------------- |
| `MbcMasterSettingListPage`    | `MasterSettingList`     |
| `MbcMasterSettingEditorPage`  | `MasterSettingEditor`   |
| `MbcMasterDataListPage`       | `MasterDataList`        |
| `MbcMasterDataEditorPage`     | `MasterDataEditor`      |
| `MbcMasterCopyRequestPage`    | `MasterCopyRequestForm` |
| `MbcMasterCopyTaskListPage`   | `MasterCopyTaskList`    |
| `MbcMasterCopyTaskDetailPage` | `MasterCopyTaskDetail`  |

**Architecture:**

- **What each page does.** It loads with M7b's query hooks and passes the current tenant (`client.tenantCode()`) to its screen for the ownership rules.
- **Writes.** They go through `runOrThrow`, so the screens get the real error. A failed load or write also reaches the host's `onError`.
- **After a write**, the pages go on as v0 did:
  - a new setting opens its data list;
  - a new record opens itself;
  - a deleted setting returns to the settings list;
  - a copy request opens the copy results.
- **Shared parts** (`mbc/page-parts.tsx`): the props every page takes, error reporting, list state that is the host's or the page's own, and a placeholder for screens that need a setting before they can render.
- **The playground** gains a fake master backend: a real `MbcClient` over a fake `fetch`, without realtime. It also gets `#mbc/…` pages on that backend.
- **The Next smoke app** renders a connected page.

**Tech Stack:** TypeScript ~6.0, React 18/19, master-web's screens and M7b's `/mbc` hooks (`useMasterSettings`, `useMasterMutations` with `runOrThrow`, …), client-web (`MbcClientProvider`, `useQuery`), Vitest + jsdom + Testing Library, pnpm 10 workspace, Node 24.13 via fnm.

**Spec:** `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` §3.4 (connected pages, tenant rules), §1 (success criterion 1), §4 (error handling). Orchestrator: `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, sub-plan M7c.

## Orientation (read once)

- **Repository:** `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`, a pnpm monorepo:
  - `packages/ui-web`, `packages/client-web`, `packages/survey-web` (finished);
  - `packages/master-web`: this work;
  - `apps/playground` (Vite) and `apps/next-smoke` (Next).
- **Start** from an up-to-date `main` (M7b merged): `git switch main && git switch -c m7c-mbc-pages`. Check that `packages/master-web/src/mbc/hooks.ts` exists.
- **Commands:** run every command from the repository root, prefixed with `fnm exec --using=v24.13.0 --`.
  - Install and build once: `fnm exec --using=v24.13.0 -- pnpm install && fnm exec --using=v24.13.0 -- pnpm build`.
  - Packages import each other through their built `dist/`.
- **Tests:**
  - `pnpm vitest run <paths>` runs files; `pnpm vitest run --project master-web` runs a package.
  - Page tests render under StrictMode with M7b's `createFakeClient` (`packages/master-web/test/fake-mbc-client.ts`), whose `get`, `post` and `command` are mocks.
- **What exists already:**
  - **The screens and their props** (M3–M7a). Each takes `routing`; the list screens take `state` / `onStateChange`; the editors take `tenantCode`, `checkCodeUnique`, `onSave(body)`, `onDelete` and `onRestore`; the data editor also takes `generateCode`; the copy form takes `tenants` and `onRequestCopy`; the task screens take `onRefresh`.
    - The editors show a rejected save, keeping its error. The data editor locks Save after a create rejected with an error named `MbcTimeoutError`.
    - `MasterDataList` and `MasterCopyRequestForm` need a loaded `setting`.
  - **M7b's `/mbc`:**
    - `createMasterApi`, and `settingCodeOfId(id)`;
    - `useMasterApi`, `useMasterSettings`, `useMasterSetting`, `useMasterDataList(settingId, state)` and `useMasterData`;
    - `useCopyTasks(settingCode, { pollMs })` and `useCopyTask(id, { pollMs })`;
    - `useMasterMutations()`, whose writes have `run` and `runOrThrow`;
    - the re-exported `MbcClientProvider`, `useMbcClient` and `createMbcClient`.
  - **v0's behaviour this follows** (master v0's templates):
    - **After a create:** a new setting opens its data list, and a new record opens itself.
    - **After a delete:** a deleted setting returns to the settings list; a record stays open.
    - **The settings editor's sequence choices** are the records of the `sequence_setting` master, first 100: the option's code is the record's `sk`, its name the record's name, its format `attributes.format`.
  - **The backend's ids:**
    - a setting's is `MASTER#<tenant>#MASTER_SETTING#<code>`;
    - a record's is `MASTER#<tenant>#<setting code>#<code>`;
    - the create bodies carry the codes (`settingCode` is the setting's own code).
- **The code in this plan has been run:**
  - every task passes on its own, in order;
  - the full gate is green on the result on React 19 and 18;
  - the playground's `#mbc` pages were used in a real browser: list, open a setting's data, create a numbered record, request a copy, follow its progress. There were no console errors.

  Type it exactly. If a step's output differs from its `Expected:` line, stop and find out why before changing anything.

- **Edit steps** say "In `<file>`, replace:" followed by two code blocks. Find the first block's text in the file (it occurs exactly once) and replace it with the second. The `<!-- prettier-ignore -->` line above each of those blocks keeps the formatter from changing them; it is not part of the text. Every other code block headed by a file path is the whole file: create it, or replace it entirely.

## Global Constraints

- No `process.env`, `console.*`, `any`, `next` or other host libraries in `packages/*/src`. No React-19-only APIs. No reading or writing a ref during render (`react-hooks/refs`), no component created during render (`react-hooks/static-components`).
- `'use client'` on every module that uses React hooks or renders (a build test checks it).
- client-web is imported only under `packages/master-web/src/mbc/` (a build test checks the root, `/core` and `/editors`).
- No consumer-specific names in code, tests, fixtures, docs or commit messages.
- Change only the files each task lists.
- Commits follow Conventional Commits, one per task, with the messages given. Append your tool's co-author trailer if it adds one.

## Review Focus

Each item is pinned by a test in the task that owns it:

1. **Another tenant's setting or record**, `common` included, opens read-only on the connected pages. The tenant comes from `client.tenantCode()` on every render. _Task 1: "opens another tenant’s setting read-only"; Task 2: "opens another tenant’s record read-only"._
2. **Ids and codes with `#`, `/` and spaces.** They are encoded in every request, and the id of a newly created setting or record is the backend's. _Task 1: "creates a setting whose code is free, then opens its data list (v0)", "updates a stored setting by its encoded id"; Task 2: "numbers a new record from the sequence API, then opens it (v0)", "checks a typed code against the setting’s records", "edits, deletes and restores a stored record by its encoded id"._
3. **A create whose outcome is unknown.** A timed-out save reaches the screen as the real `MbcTimeoutError`. The data editor keeps Save off, so a second save cannot number a duplicate, and the settings editor says the outcome is unknown. The host's `onError` gets the error too. _Task 2: "keeps Save off after a create that timed out, as the editor does"; Task 1: "says the outcome is unknown when a save timed out, and reports it"._
4. **Loads that are slow or fail.** A page that needs the setting shows a loading state until it arrives. A failure reaches `onError` and offers Reload, which loads again. _Task 1: "reports a failed load and loads again on Reload"; Task 2: "waits for the setting, then lists its records by its code", "reports a setting that failed to load and loads it again on Reload"; Task 3: "reports tenants that failed to load and loads them again on Reload"._
5. **The copy flow.** The tenants and the setting load before the form. The setting's records load up front for "chosen data only". A request opens the copy results, and a refused one stays with v0's failure text. The detail asks through a child's key (v0). _Task 3: all six tests._

## Rulings already made (do not undo)

- **After a write the pages go on as v0 did** (see Orientation). `onSaved(id)` and `onDeleted()` only tell the host, so a host should not navigate in them as well.
- **The copy pages take no `canCopy`.** Reaching them is the host's routing. `canCopy` on the settings editor shows or hides the links to them, as v0 showed them to its system tenant only. Task 4 updates the spec, which listed `canCopy` for the copy pages too.
- **The settings editor's sequences come from the `sequence_setting` master**, as in v0: the first 100 records, `sk` as the code, `attributes.format` as the format. A host's `formats` skips that request, and `formatSettingCode` names another master.
- **No reload after an update, a delete or a restore.** The editors show the saved state themselves (the data editor swaps Delete and Restore), and the update bodies carry no version.
- **A page whose screen needs the setting** (the data list, the copy request) shows a loading or failure placeholder until it arrives. The copy request also waits for the tenants, so the form never offers an empty tenant list while they load.
- **`onError` gets every failed load and write.** The screens still show them as before.
- **The smoke app renders the connected settings list** with a client for `https://example.invalid`. The server renders its loading table (`aria-busy="true"`); nothing is fetched at build time.
- **The playground's connected pages have their own fake backend.** The prop-driven `#master` pages keep their in-memory data. Each task read advances the fake copies by one tenant, so polling shows progress.

---

### Task 1: Shared page parts and the settings pages

**Files:**

- Create: `packages/master-web/src/mbc/page-parts.tsx`, `packages/master-web/src/mbc/setting-pages.tsx`
- Test: `packages/master-web/src/mbc/setting-pages.test.tsx`, with the test helper `packages/master-web/test/render-page.tsx`

**Interfaces:**

- Consumes: M7b's hooks (`useMasterApi`, `useMasterSettings`, `useMasterSetting`, `useMasterMutations`) and `createFakeClient`; client-web's `useQuery` and `useMbcClient`; `MasterSettingList`, `MasterSettingEditor`, `ListError`; ui-web's `Skeleton`.
- Produces:
  - `page-parts.tsx`:
    - `type MbcPageProps = { routing; onError?(error); paths? }`;
    - `useTenantCode()`, `useReport(error, onError)` and `reported(promise, onError)`;
    - `useListState(state, onStateChange, initial)`: the host's state when it passes one, the page's own otherwise;
    - `PageState({ error, loadFailed, retry, onRetry })`: a loading skeleton, or the failure with Reload;
    - `settingIdOf(tenantCode, code)` and `dataIdOf(tenantCode, settingCode, code)`. Task 2 and Task 3 use them.
  - `setting-pages.tsx`:
    - `SEQUENCE_SETTING_CODE = 'sequence_setting'`;
    - `MbcMasterSettingListPage` (`state?`, `onStateChange?`, `inputSampleJson?`, `mapRawItem?`, `onBack?`);
    - `MbcMasterSettingEditorPage` (`id?`, `onSaved?(id)`, `onDeleted?()`, `canCopy?`, `settingOptions?`, `formats?`, `formatSettingCode?`);
    - both also take `MbcPageProps`, and both props types are exported.
  - Test helper `render-page.tsx`: `createRouting()` (hrefs of encoded parts; `navigate` is a mock), `serveGets(client, routes)` and `renderPage(client, page)` (StrictMode with `MbcClientProvider`). Task 2 and Task 3 use it.
- The `/mbc` entry exports the pages in Task 4.

- [ ] **Step 1: Write the failing tests**

The test helper:

`packages/master-web/test/render-page.tsx`:

```tsx
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { render } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { vi } from 'vitest'

import type { MasterRouting, MasterTarget } from '../src/routing/routing'
import type { createFakeClient } from './fake-mbc-client'

export type FakeClient = ReturnType<typeof createFakeClient>

/** Each target as a path of its encoded parts, e.g. `data/<setting id>`. */
export function createRouting(): MasterRouting & {
  navigate: ReturnType<typeof vi.fn<(to: MasterTarget) => void>>
} {
  return {
    href: (to) =>
      [
        to.screen,
        'settingId' in to ? to.settingId : '',
        'id' in to ? to.id : '',
        'taskId' in to ? to.taskId : '',
      ]
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/'),
    navigate: vi.fn<(to: MasterTarget) => void>(),
  }
}

/**
 * Answers the client's `get` by path: `routes[path]` is the answer, or a
 * function of the request's query. A path it does not know rejects.
 */
export function serveGets(
  client: FakeClient,
  routes: Record<
    string,
    unknown | ((query: Record<string, unknown>) => unknown)
  >
) {
  client.get.mockImplementation(
    async (path: string, options?: { query?: Record<string, unknown> }) => {
      if (!(path in routes)) throw new Error(`no route for GET ${path}`)
      const route = routes[path]
      return typeof route === 'function'
        ? (route as (query: Record<string, unknown>) => unknown)(
            options?.query ?? {}
          )
        : route
    }
  )
}

/** Renders a connected page under StrictMode with the client. */
export function renderPage(client: FakeClient, page: ReactElement) {
  return render(
    <StrictMode>
      <MbcClientProvider client={client}>{page}</MbcClientProvider>
    </StrictMode>
  )
}
```

`packages/master-web/src/mbc/setting-pages.test.tsx`:

```tsx
import { MbcTimeoutError } from '@mbc-cqrs-serverless/client-web'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { SETTING_ROWS } from '../../test/fixtures/v0-lists'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { createRouting, renderPage, serveGets } from '../../test/render-page'
import {
  MbcMasterSettingEditorPage,
  MbcMasterSettingListPage,
} from './setting-pages'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'
const detail = `/api/master-setting/detail/${encodeURIComponent(SETTING_ID)}`
const sequences = {
  items: [
    {
      id: 'MASTER#tenant-a#sequence_setting#ORDER',
      pk: 'MASTER#tenant-a',
      sk: 'sequence_setting#ORDER',
      name: '注文番号',
      attributes: { format: 'O-%%no%%' },
    },
  ],
  total: 1,
}

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })

describe('MbcMasterSettingListPage', () => {
  it('lists the tenant’s settings, keeping its own state', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(client, <MbcMasterSettingListPage routing={createRouting()} />)
    expect(await screen.findByRole('link', { name: 'PRODUCT' })).toBeVisible()
    await userEvent.type(input('コード'), 'PRO')
    await userEvent.click(button('検索'))
    await waitFor(() =>
      expect(client.get.mock.calls.at(-1)?.[1].query.code).toBe('PRO')
    )
  })

  it('follows the host’s state when it passes one', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: [], total: 0 }),
    })
    const onStateChange = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingListPage
        routing={createRouting()}
        state={{
          page: 3,
          pageSize: 20,
          code: 'X',
          name: '',
          keyword: '',
        }}
        onStateChange={onStateChange}
      />
    )
    await waitFor(() =>
      expect(client.get.mock.calls.at(-1)?.[1].query).toMatchObject({
        page: 3,
        code: 'X',
      })
    )
    await userEvent.click(button('クリア'))
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: '', page: 1 })
    )
  })

  it('reports a failed load and loads again on Reload', async () => {
    const client = createFakeClient()
    const down = new Error('down')
    client.get.mockRejectedValueOnce(down).mockRejectedValueOnce(down)
    client.get.mockResolvedValue({ items: SETTING_ROWS, total: 2 })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingListPage routing={createRouting()} onError={onError} />
    )
    const alert = await screen.findByRole('alert')
    expect(onError).toHaveBeenCalledWith(down)
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(await screen.findByRole('link', { name: 'PRODUCT' })).toBeVisible()
  })

  it('imports through the bulk command, then loads the list again', async () => {
    const client = createFakeClient(() => [{ requestId: 'req-1' }])
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(client, <MbcMasterSettingListPage routing={createRouting()} />)
    await screen.findByRole('link', { name: 'PRODUCT' })
    const loads = client.get.mock.calls.length
    await userEvent.click(button('JSONエディタ'))
    const editor = screen.getByRole('textbox', { name: 'JSON' })
    await userEvent.clear(editor)
    editor.focus()
    await userEvent.paste(
      JSON.stringify([{ code: 'NEW', name: '新規', attributes: {} }])
    )
    await userEvent.click(button('データ反映'))
    await waitFor(() =>
      expect(client.command.mock.calls[0]?.[0]).toMatchObject({
        method: 'POST',
        path: '/api/master-bulk',
        body: { items: [{ code: 'NEW', name: '新規' }] },
      })
    )
    await waitFor(() =>
      expect(client.get.mock.calls.length).toBeGreaterThan(loads)
    )
  })
})

describe('MbcMasterSettingEditorPage', () => {
  it('creates a setting whose code is free, then opens its data list (v0)', async () => {
    const client = createFakeClient()
    serveGets(client, { '/api/master-data/list': sequences })
    client.post.mockResolvedValue(false)
    const routing = createRouting()
    const onSaved = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage routing={routing} onSaved={onSaved} />
    )
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({
        screen: 'data',
        settingId: 'MASTER#tenant-a#MASTER_SETTING#NEW',
      })
    )
    expect(client.post).toHaveBeenCalledWith(
      '/api/master-setting/check-exist/NEW',
      undefined,
      { signal: undefined }
    )
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/api/master-setting',
      body: { code: 'NEW', name: '新規' },
    })
    expect(onSaved).toHaveBeenCalledWith('MASTER#tenant-a#MASTER_SETTING#NEW')
  })

  it('refuses a code that is taken', async () => {
    const client = createFakeClient()
    serveGets(client, { '/api/master-data/list': sequences })
    client.post.mockResolvedValue(true)
    renderPage(client, <MbcMasterSettingEditorPage routing={createRouting()} />)
    await userEvent.type(input('コード'), 'USED')
    await userEvent.type(input('名称'), '名前')
    await userEvent.click(button('保存'))
    expect(
      await screen.findByText('既にこのコードは登録されています。')
    ).toBeVisible()
    expect(client.command).not.toHaveBeenCalled()
  })

  it('updates a stored setting by its encoded id', async () => {
    const client = createFakeClient()
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    const onSaved = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={createRouting()}
        id={SETTING_ID}
        onSaved={onSaved}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(SETTING_ID))
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'PUT',
      path: `/api/master-setting/${encodeURIComponent(SETTING_ID)}`,
    })
  })

  it('deletes a setting, then goes to the settings list (v0)', async () => {
    const client = createFakeClient()
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    const routing = createRouting()
    const onDeleted = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={routing}
        id={SETTING_ID}
        onDeleted={onDeleted}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '削除' }))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '削除',
      })
    )
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({ screen: 'settings' })
    )
    expect(onDeleted).toHaveBeenCalled()
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'DELETE',
    })
  })

  it('says the outcome is unknown when a save timed out, and reports it', async () => {
    const timeout = new MbcTimeoutError(60_000)
    const client = createFakeClient(() => timeout)
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={createRouting()}
        id={SETTING_ID}
        onError={onError}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '時間内に結果を確認できませんでした。'
    )
    expect(onError).toHaveBeenCalledWith(timeout)
  })

  it('opens another tenant’s setting read-only', async () => {
    const client = createFakeClient()
    client.tenantCode = () => 'tenant-b'
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    renderPage(
      client,
      <MbcMasterSettingEditorPage routing={createRouting()} id={SETTING_ID} />
    )
    await screen.findByText('商品マスタ')
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })

  it('reads the sequences from the sequence master, unless the host gives them', async () => {
    const client = createFakeClient()
    serveGets(client, { '/api/master-data/list': sequences })
    const view = renderPage(
      client,
      <MbcMasterSettingEditorPage routing={createRouting()} />
    )
    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/api/master-data/list', {
        query: expect.objectContaining({
          settingCode: 'sequence_setting',
          page: 1,
          pageSize: 100,
        }),
        signal: expect.any(AbortSignal),
      })
    )
    view.unmount()
    client.get.mockClear()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={createRouting()}
        formats={[{ code: 'SEQ#A', name: 'A', format: '%%no%%' }]}
      />
    )
    expect(client.get).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/mbc/setting-pages.test.tsx`
Expected: FAIL: `Failed to resolve import "./setting-pages"`; no tests run.

- [ ] **Step 3: Implement**

`packages/master-web/src/mbc/page-parts.tsx`:

```tsx
'use client'

import { useMbcClient } from '@mbc-cqrs-serverless/client-web/react'
import { Skeleton, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { useEffect, useRef, useState } from 'react'

import { masterMessages } from '../i18n/master-messages'
import { ListError } from '../list/list-error'
import type { MasterRouting } from '../routing/routing'
import type { MasterApiPaths } from './api'

/** What every connected page takes. */
export type MbcPageProps = {
  routing: MasterRouting
  /** Every failed load or write, with client-web's error (also shown on the page). */
  onError?(error: unknown): void
  /** Where the requests go (`createMasterApi`'s `paths`). */
  paths?: Partial<MasterApiPaths>
}

/** The current tenant, read on every render (`client.tenantCode()`). */
export function useTenantCode(): string {
  return useMbcClient().tenantCode()
}

/** Reports each new load failure to `onError`. */
export function useReport(
  error: unknown,
  onError: ((error: unknown) => void) | undefined
) {
  const latest = useRef(onError)
  useEffect(() => {
    latest.current = onError
  })
  useEffect(() => {
    if (error !== undefined && error !== null) latest.current?.(error)
  }, [error])
}

/** A write that reports its failure to `onError`, then rejects as before. */
export async function reported<T>(
  work: Promise<T>,
  onError: ((error: unknown) => void) | undefined
): Promise<T> {
  try {
    return await work
  } catch (error) {
    onError?.(error)
    throw error
  }
}

/** A list's state: the host's when it passes one, the page's own otherwise. */
export function useListState<S>(
  state: S | undefined,
  onStateChange: ((state: S) => void) | undefined,
  initial: () => S
): [S, (state: S) => void] {
  const [own, setOwn] = useState(initial)
  const change = (next: S) => {
    if (state === undefined) setOwn(next)
    onStateChange?.(next)
  }
  return [state ?? own, change]
}

/** A page whose screen needs data that has not arrived: loading, or the failure. */
export function PageState({
  error,
  loadFailed,
  retry,
  onRetry,
}: {
  error: unknown
  loadFailed: string
  retry: string
  onRetry(): void
}) {
  const t = useMessages(masterMessages)
  return (
    <div data-mbc="" className="mbc:p-4">
      {error !== undefined && error !== null ? (
        <ListError message={loadFailed} retry={retry} onRetry={onRetry} />
      ) : (
        <div
          role="status"
          aria-label={t.table.loading}
          className="mbc:flex mbc:flex-col mbc:gap-3"
        >
          <Skeleton className="mbc:h-6 mbc:w-1/3" />
          <Skeleton className="mbc:h-4 mbc:w-full" />
          <Skeleton className="mbc:h-4 mbc:w-2/3" />
        </div>
      )}
    </div>
  )
}

/** The id the backend gives a setting: `MASTER#<tenant>#MASTER_SETTING#<code>`. */
export const settingIdOf = (tenantCode: string, code: string) =>
  `MASTER#${tenantCode}#MASTER_SETTING#${code}`

/** The id the backend gives a record: `MASTER#<tenant>#<setting code>#<code>`. */
export const dataIdOf = (
  tenantCode: string,
  settingCode: string,
  code: string
) => `MASTER#${tenantCode}#${settingCode}#${code}`
```

`packages/master-web/src/mbc/setting-pages.tsx`:

```tsx
'use client'

import { useQuery } from '@mbc-cqrs-serverless/client-web/react'

import type { BulkMapper } from '../core/bulk'
import {
  initialDataListState,
  initialSettingListState,
  type MasterSettingListState,
} from '../core/list'
import type { SequenceFormat, SettingOption } from '../core/setting-form'
import { MasterSettingEditor } from '../settings/master-setting-editor'
import { MasterSettingList } from '../settings/master-setting-list'
import {
  useMasterApi,
  useMasterMutations,
  useMasterSetting,
  useMasterSettings,
} from './hooks'
import {
  reported,
  settingIdOf,
  useListState,
  useReport,
  useTenantCode,
  type MbcPageProps,
} from './page-parts'

/** The master v0 setting whose records are the sequences a code can use. */
export const SEQUENCE_SETTING_CODE = 'sequence_setting'

/** v0 read the first 100 sequences. */
const FORMATS_STATE = { ...initialDataListState(), pageSize: 100 }

export type MbcMasterSettingListPageProps = MbcPageProps & {
  /** The list's filters, sort and page; the page keeps its own without it. */
  state?: MasterSettingListState
  onStateChange?(state: MasterSettingListState): void
  inputSampleJson?: string
  mapRawItem?: BulkMapper
  /** The back button; hidden without it. */
  onBack?(): void
}

/** v0's settings list on the mbc backend, with bulk import. */
export function MbcMasterSettingListPage({
  routing,
  onError,
  paths,
  state,
  onStateChange,
  inputSampleJson,
  mapRawItem,
  onBack,
}: MbcMasterSettingListPageProps) {
  const [current, change] = useListState(
    state,
    onStateChange,
    initialSettingListState
  )
  const list = useMasterSettings(current, { paths })
  const { importItems } = useMasterMutations({ paths })
  const tenantCode = useTenantCode()
  useReport(list.error, onError)
  return (
    <MasterSettingList
      items={list.data?.items ?? []}
      total={list.data?.total ?? 0}
      state={current}
      onStateChange={change}
      routing={routing}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      onImport={(items, onProgress) =>
        reported(importItems.runOrThrow(items, onProgress), onError)
      }
      onImported={list.refetch}
      tenantCode={tenantCode}
      inputSampleJson={inputSampleJson}
      mapRawItem={mapRawItem}
      onBack={onBack}
    />
  )
}

export type MbcMasterSettingEditorPageProps = MbcPageProps & {
  /** The setting to open; without it the page creates one. */
  id?: string
  /** After a save, with the setting's id. The page then goes on as v0 did. */
  onSaved?(id: string): void
  /** After a delete. The page then goes to the settings list. */
  onDeleted?(): void
  /** Shows the copy links (v0 showed them to its system tenant only). */
  canCopy?: boolean
  settingOptions?: readonly SettingOption[]
  /** The sequences a code can use; read from the sequence master without it. */
  formats?: readonly SequenceFormat[]
  /** The master whose records are the sequences (v0: `sequence_setting`). */
  formatSettingCode?: string
}

/**
 * v0's settings editor on the mbc backend. A create goes to the new
 * setting's data list, a delete to the settings list (v0).
 */
export function MbcMasterSettingEditorPage({
  routing,
  onError,
  paths,
  id,
  onSaved,
  onDeleted,
  canCopy,
  settingOptions,
  formats,
  formatSettingCode = SEQUENCE_SETTING_CODE,
}: MbcMasterSettingEditorPageProps) {
  const api = useMasterApi({ paths })
  const tenantCode = useTenantCode()
  const setting = useMasterSetting(id, { paths })
  const { createSetting, updateSetting, deleteSetting } = useMasterMutations({
    paths,
  })
  // v0's sequences: the records of the sequence master, their key as the code.
  const sequences = useQuery(
    `${tenantCode}\u0000${formatSettingCode}`,
    formats
      ? null
      : (signal) => api.data.list(formatSettingCode, FORMATS_STATE, { signal })
  )
  useReport(setting.error, onError)
  useReport(sequences.error, onError)
  const loaded: SequenceFormat[] = (sequences.data?.items ?? []).map((row) => ({
    code: row.sk,
    name: row.name,
    format: String(row.attributes?.format ?? ''),
  }))
  return (
    <MasterSettingEditor
      mode={id ? 'edit' : 'create'}
      setting={setting.data}
      routing={routing}
      tenantCode={tenantCode}
      loading={setting.loading}
      error={setting.error}
      onRetry={setting.refetch}
      checkCodeUnique={async (code) =>
        !(await reported(api.settings.codeExists(code), onError))
      }
      onSave={async (body) => {
        if (id) {
          await reported(updateSetting.runOrThrow(id, body), onError)
          onSaved?.(id)
          return
        }
        // A create's body carries settingValue (v0).
        if (!('settingValue' in body)) return
        await reported(createSetting.runOrThrow(body), onError)
        const created = settingIdOf(tenantCode, body.code)
        onSaved?.(created)
        routing.navigate({ screen: 'data', settingId: created })
      }}
      onDelete={
        id
          ? async () => {
              await reported(deleteSetting.runOrThrow(id), onError)
              onDeleted?.()
              routing.navigate({ screen: 'settings' })
            }
          : undefined
      }
      canCopy={canCopy}
      settingOptions={settingOptions}
      formats={formats ?? loaded}
    />
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (293 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): connected settings pages"
```

---

### Task 2: The data pages

**Files:**

- Create: `packages/master-web/src/mbc/data-pages.tsx`
- Test: `packages/master-web/src/mbc/data-pages.test.tsx`

**Interfaces:**

- Consumes: Task 1's page parts and test helper; M7b's `settingCodeOfId`, `useMasterApi`, `useMasterSetting`, `useMasterDataList`, `useMasterData` and `useMasterMutations`; `MasterDataList`, `MasterDataEditor`, `masterDataMessages`.
- Produces:
  - `MbcMasterDataListPage` (`settingId`, `state?`, `onStateChange?`, `inputSampleJson?`, `mapRawItem?`);
  - `MbcMasterDataEditorPage` (`settingId`, `id?`, `onSaved?(id)`, `onDeleted?()`, `components?`). It numbers auto-numbered codes through `api.sequence.generateCode` and checks typed codes with `api.data.codeExists`;
  - both also take `MbcPageProps`, and both props types are exported.

- [ ] **Step 1: Write the failing tests**

`packages/master-web/src/mbc/data-pages.test.tsx`:

```tsx
import { MbcTimeoutError } from '@mbc-cqrs-serverless/client-web'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { DATA_ROWS } from '../../test/fixtures/v0-lists'
import { V0_DATA, V0_SETTING } from '../../test/fixtures/v0-master'
import { createRouting, renderPage, serveGets } from '../../test/render-page'
import { MbcMasterDataEditorPage, MbcMasterDataListPage } from './data-pages'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'
const DATA_ID = 'MASTER#tenant-a#PRODUCT#P-001'
const settingPath = `/api/master-setting/detail/${encodeURIComponent(SETTING_ID)}`
const dataPath = `/api/master-data/detail/${encodeURIComponent(DATA_ID)}`

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })

describe('MbcMasterDataListPage', () => {
  it('waits for the setting, then lists its records by its code', async () => {
    const client = createFakeClient()
    let release = () => {}
    const settingLoaded = new Promise<void>((resolve) => (release = resolve))
    client.get.mockImplementation(async (path: string) => {
      if (path === settingPath) {
        await settingLoaded
        return V0_SETTING
      }
      return { items: DATA_ROWS, total: 2 }
    })
    renderPage(
      client,
      <MbcMasterDataListPage routing={createRouting()} settingId={SETTING_ID} />
    )
    expect(screen.getByRole('status', { name: '読み込み中' })).toBeVisible()
    release()
    expect(await screen.findByRole('link', { name: 'P-001' })).toBeVisible()
    expect(
      client.get.mock.calls.find(
        ([path]) => path === '/api/master-data/list'
      )?.[1].query.settingCode
    ).toBe('PRODUCT')
  })

  it('reports a setting that failed to load and loads it again on Reload', async () => {
    const client = createFakeClient()
    const down = new Error('down')
    let failing = true
    client.get.mockImplementation(async (path: string) => {
      if (path === settingPath) {
        if (failing) throw down
        return V0_SETTING
      }
      return { items: DATA_ROWS, total: 2 }
    })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterDataListPage
        routing={createRouting()}
        settingId={SETTING_ID}
        onError={onError}
      />
    )
    const alert = await screen.findByRole('alert')
    expect(onError).toHaveBeenCalledWith(down)
    failing = false
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(await screen.findByRole('link', { name: 'P-001' })).toBeVisible()
  })
})

describe('MbcMasterDataEditorPage', () => {
  it('numbers a new record from the sequence API, then opens it (v0)', async () => {
    const client = createFakeClient()
    serveGets(client, { [settingPath]: V0_SETTING })
    client.post.mockResolvedValue({ formattedNo: 'P-100' })
    const routing = createRouting()
    const onSaved = vi.fn()
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={routing}
        settingId={SETTING_ID}
        onSaved={onSaved}
      />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: '名称' }),
      'なし'
    )
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    const created = 'MASTER#tenant-a#PRODUCT#P-100'
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({
        screen: 'dataItem',
        settingId: SETTING_ID,
        id: created,
      })
    )
    expect(client.post.mock.calls[0]?.[0]).toBe(
      '/api/sequence/with-provided-setting'
    )
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/api/master-data/create',
      body: { settingCode: 'PRODUCT', code: 'P-100', name: 'なし' },
    })
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('keeps Save off after a create that timed out, as the editor does', async () => {
    const timeout = new MbcTimeoutError(60_000)
    const client = createFakeClient(() => timeout)
    serveGets(client, { [settingPath]: V0_SETTING })
    client.post.mockResolvedValue({ formattedNo: 'P-100' })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        onError={onError}
      />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: '名称' }),
      'なし'
    )
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '時間内に結果を確認できませんでした。'
    )
    expect(button('登録')).toBeDisabled()
    expect(client.post).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(timeout)
  })

  it('edits, deletes and restores a stored record by its encoded id', async () => {
    const client = createFakeClient()
    serveGets(client, { [settingPath]: V0_SETTING, [dataPath]: V0_DATA })
    const onSaved = vi.fn()
    const onDeleted = vi.fn()
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        id={DATA_ID}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.clear(input('価格'))
    await userEvent.type(input('価格'), '1300')
    await userEvent.click(button('登録'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(DATA_ID))
    const confirm = async (trigger: string) => {
      await userEvent.click(
        await screen.findByRole('button', { name: trigger })
      )
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', {
          name: trigger,
        })
      )
    }
    await confirm('削除')
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    await confirm('復旧')
    const path = `/api/master-data/${encodeURIComponent(DATA_ID)}`
    await waitFor(() =>
      expect(client.command.mock.calls.map(([request]) => request)).toEqual([
        expect.objectContaining({ method: 'PUT', path }),
        { method: 'DELETE', path },
        { method: 'PUT', path, body: { isDeleted: false } },
      ])
    )
  })

  it('checks a typed code against the setting’s records', async () => {
    const client = createFakeClient()
    const typed = structuredClone(V0_SETTING) as {
      attributes: { fields: { physicalName: string; dataType: string }[] }
    }
    typed.attributes.fields[0]!.dataType = 'string'
    serveGets(client, { [settingPath]: typed })
    client.post.mockResolvedValue(true)
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
      />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'コード' }),
      'P/9'
    )
    await userEvent.type(input('名称'), 'なし')
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        '/api/master-data/check-exist/PRODUCT/P%2F9',
        undefined,
        { signal: undefined }
      )
    )
    expect(client.command).not.toHaveBeenCalled()
  })

  it('opens another tenant’s record read-only', async () => {
    const client = createFakeClient()
    client.tenantCode = () => 'tenant-b'
    serveGets(client, { [settingPath]: V0_SETTING, [dataPath]: V0_DATA })
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        id={DATA_ID}
      />
    )
    await screen.findByRole('textbox', { name: '価格' })
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/mbc/data-pages.test.tsx`
Expected: FAIL: `Failed to resolve import "./data-pages"`; no tests run.

- [ ] **Step 3: Implement**

`packages/master-web/src/mbc/data-pages.tsx`:

```tsx
'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import type { BulkMapper } from '../core/bulk'
import { initialDataListState, type MasterDataListState } from '../core/list'
import { MasterDataEditor } from '../data/master-data-editor'
import { MasterDataList } from '../data/master-data-list'
import { masterDataMessages } from '../i18n/master-data-messages'
import type { FieldRenderers } from '../renderers/registry'
import { settingCodeOfId } from './api'
import {
  useMasterApi,
  useMasterData,
  useMasterDataList,
  useMasterMutations,
  useMasterSetting,
} from './hooks'
import {
  dataIdOf,
  PageState,
  reported,
  useListState,
  useReport,
  useTenantCode,
  type MbcPageProps,
} from './page-parts'

export type MbcMasterDataListPageProps = MbcPageProps & {
  /** The setting whose records are listed. */
  settingId: string
  /** The list's filters, sort and page; the page keeps its own without it. */
  state?: MasterDataListState
  onStateChange?(state: MasterDataListState): void
  inputSampleJson?: string
  mapRawItem?: BulkMapper
}

/** v0's data list of one setting on the mbc backend, with bulk import. */
export function MbcMasterDataListPage({
  routing,
  onError,
  paths,
  settingId,
  state,
  onStateChange,
  inputSampleJson,
  mapRawItem,
}: MbcMasterDataListPageProps) {
  const t = useMessages(masterDataMessages).list
  const [current, change] = useListState(
    state,
    onStateChange,
    initialDataListState
  )
  const setting = useMasterSetting(settingId, { paths })
  const list = useMasterDataList(settingId, current, { paths })
  const { importItems } = useMasterMutations({ paths })
  const tenantCode = useTenantCode()
  useReport(setting.error, onError)
  useReport(list.error, onError)
  if (!setting.data)
    return (
      <PageState
        error={setting.error}
        loadFailed={t.loadFailed}
        retry={t.retry}
        onRetry={setting.refetch}
      />
    )
  return (
    <MasterDataList
      setting={setting.data}
      items={list.data?.items ?? []}
      total={list.data?.total ?? 0}
      state={current}
      onStateChange={change}
      routing={routing}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      onImport={(items, onProgress) =>
        reported(importItems.runOrThrow(items, onProgress), onError)
      }
      onImported={list.refetch}
      tenantCode={tenantCode}
      inputSampleJson={inputSampleJson}
      mapRawItem={mapRawItem}
    />
  )
}

export type MbcMasterDataEditorPageProps = MbcPageProps & {
  /** The record's setting. */
  settingId: string
  /** The record to open; without it the page creates one. */
  id?: string
  /** After a save, with the record's id. A create then opens the record (v0). */
  onSaved?(id: string): void
  /** After a delete; the record stays open, deleted, with Restore (v0). */
  onDeleted?(): void
  /** Renderers that replace the built-ins, by field type (e.g. `/editors`). */
  components?: FieldRenderers
}

/** v0's data editor on the mbc backend, numbering auto-numbered codes from the sequence API. */
export function MbcMasterDataEditorPage({
  routing,
  onError,
  paths,
  settingId,
  id,
  onSaved,
  onDeleted,
  components,
}: MbcMasterDataEditorPageProps) {
  const api = useMasterApi({ paths })
  const tenantCode = useTenantCode()
  const setting = useMasterSetting(settingId, { paths })
  const data = useMasterData(id, { paths })
  const { createData, updateData, deleteData, restoreData } =
    useMasterMutations({ paths })
  useReport(setting.error, onError)
  useReport(data.error, onError)
  const settingCode = settingCodeOfId(settingId)
  return (
    <MasterDataEditor
      mode={id ? 'edit' : 'create'}
      setting={setting.data}
      data={data.data}
      routing={routing}
      tenantCode={tenantCode}
      loading={setting.loading || data.loading}
      error={setting.error ?? data.error}
      onRetry={() => {
        setting.refetch()
        data.refetch()
      }}
      checkCodeUnique={async (code) =>
        !(await reported(api.data.codeExists(settingCode, code), onError))
      }
      generateCode={(field, loaded) =>
        reported(api.sequence.generateCode(field, loaded), onError)
      }
      onSave={async (body) => {
        // A create's body carries the setting and the record's codes.
        if ('settingCode' in body) {
          await reported(createData.runOrThrow(body), onError)
          const created = dataIdOf(tenantCode, body.settingCode, body.code)
          onSaved?.(created)
          routing.navigate({ screen: 'dataItem', settingId, id: created })
          return
        }
        if (!id) return
        await reported(updateData.runOrThrow(id, body), onError)
        onSaved?.(id)
      }}
      onDelete={
        id
          ? async () => {
              await reported(deleteData.runOrThrow(id), onError)
              onDeleted?.()
            }
          : undefined
      }
      onRestore={
        id
          ? async () => {
              await reported(restoreData.runOrThrow(id), onError)
            }
          : undefined
      }
      components={components}
    />
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (300 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): connected data pages"
```

---

### Task 3: The copy pages

**Files:**

- Create: `packages/master-web/src/mbc/copy-pages.tsx`
- Test: `packages/master-web/src/mbc/copy-pages.test.tsx`

**Interfaces:**

- Consumes: Task 1's page parts and test helper; M7b's `settingCodeOfId`, `useMasterSetting`, `useMasterDataList`, `useMasterMutations`, `useCopyTasks` and `useCopyTask`; client-web's `useQuery`; M7a's three copy screens, `masterCopyMessages` and its fixture `test/fixtures/v0-copy.ts`.
- Produces:
  - `MbcMasterCopyRequestPage` (`settingId`, `loadTenants(): Promise<MasterTenant[]>`, `onRequested?()`, `state?`, `onStateChange?`). It is keyed by `settingId`, so a new setting starts a fresh form;
  - `MbcMasterCopyTaskListPage` (`settingId`, `pollMs?`);
  - `MbcMasterCopyTaskDetailPage` (`settingId`, `taskId`, `pollMs?`);
  - each also takes `MbcPageProps`, and each props type is exported.

- [ ] **Step 1: Write the failing tests**

`packages/master-web/src/mbc/copy-pages.test.tsx`:

```tsx
import { MbcApiError } from '@mbc-cqrs-serverless/client-web'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { COPY_REQUESTS, COPY_TENANT_TASKS } from '../../test/fixtures/v0-copy'
import { DATA_ROWS } from '../../test/fixtures/v0-lists'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { createRouting, renderPage, serveGets } from '../../test/render-page'
import type { MasterTenant } from '../core/copy'
import {
  MbcMasterCopyRequestPage,
  MbcMasterCopyTaskDetailPage,
  MbcMasterCopyTaskListPage,
} from './copy-pages'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'
const settingPath = `/api/master-setting/detail/${encodeURIComponent(SETTING_ID)}`
const TENANTS: MasterTenant[] = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
]

const button = (name: string) => screen.getByRole('button', { name })

function serveSetting(client: ReturnType<typeof createFakeClient>) {
  serveGets(client, {
    [settingPath]: V0_SETTING,
    '/api/master-data/list': { items: DATA_ROWS, total: 2 },
  })
}

describe('MbcMasterCopyRequestPage', () => {
  it('requests a copy to every tenant, then opens the copy results', async () => {
    const client = createFakeClient()
    serveSetting(client)
    client.post.mockResolvedValue({})
    const routing = createRouting()
    const onRequested = vi.fn()
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={routing}
        settingId={SETTING_ID}
        loadTenants={async () => TENANTS}
        onRequested={onRequested}
      />
    )
    expect(screen.getByRole('status', { name: '読み込み中' })).toBeVisible()
    await userEvent.click(
      await screen.findByRole('button', { name: 'コピー登録' })
    )
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({
        screen: 'copyTasks',
        settingId: SETTING_ID,
      })
    )
    expect(client.post).toHaveBeenCalledWith(
      '/api/master-setting/copy',
      {
        masterSettingId: SETTING_ID,
        targetTenants: ['tenant-b', 'tenant-c'],
        copyType: 'BOTH',
      },
      { signal: expect.any(AbortSignal) }
    )
    expect(onRequested).toHaveBeenCalled()
  })

  it('loads the setting’s records up front for "chosen data only"', async () => {
    const client = createFakeClient()
    serveSetting(client)
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={createRouting()}
        settingId={SETTING_ID}
        loadTenants={async () => TENANTS}
      />
    )
    await screen.findByRole('button', { name: 'コピー登録' })
    expect(
      client.get.mock.calls.find(
        ([path]) => path === '/api/master-data/list'
      )?.[1].query.settingCode
    ).toBe('PRODUCT')
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    expect(
      within(screen.getByRole('table', { name: 'マスタデータ一覧' })).getByText(
        'P-001'
      )
    ).toBeVisible()
  })

  it('reports tenants that failed to load and loads them again on Reload', async () => {
    const client = createFakeClient()
    serveSetting(client)
    const down = new Error('down')
    const loadTenants = vi
      .fn<() => Promise<MasterTenant[]>>()
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockResolvedValue(TENANTS)
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={createRouting()}
        settingId={SETTING_ID}
        loadTenants={loadTenants}
        onError={onError}
      />
    )
    const alert = await screen.findByRole('alert')
    expect(onError).toHaveBeenCalledWith(down)
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(
      await screen.findByRole('button', { name: 'コピー登録' })
    ).toBeVisible()
  })

  it('says when the request failed, stays, and reports it', async () => {
    const client = createFakeClient()
    serveSetting(client)
    const refused = new MbcApiError(400, { message: 'Bad request' })
    client.post.mockRejectedValue(refused)
    const routing = createRouting()
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={routing}
        settingId={SETTING_ID}
        loadTenants={async () => TENANTS}
        onError={onError}
      />
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'コピー登録' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '汎用マスタコピーの登録に失敗しました。'
    )
    expect(onError).toHaveBeenCalledWith(refused)
    expect(routing.navigate).not.toHaveBeenCalled()
  })
})

describe('MbcMasterCopyTaskListPage', () => {
  it('lists the setting’s copy requests and refreshes them', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/tasks/sfn-task-parent': () => COPY_REQUESTS,
    })
    renderPage(
      client,
      <MbcMasterCopyTaskListPage
        routing={createRouting()}
        settingId={SETTING_ID}
      />
    )
    expect(
      await screen.findByRole('link', { name: 'PRODUCT#01J9B' })
    ).toBeVisible()
    expect(client.get.mock.calls[0]?.[1].query).toEqual({
      masterSettingCode: 'PRODUCT',
    })
    const loads = client.get.mock.calls.length
    await userEvent.click(button('最新の状態に更新'))
    await waitFor(() =>
      expect(client.get.mock.calls.length).toBeGreaterThan(loads)
    )
  })
})

describe('MbcMasterCopyTaskDetailPage', () => {
  it('shows one request’s result per tenant, through a child’s key (v0)', async () => {
    const client = createFakeClient()
    const taskId = COPY_REQUESTS[0]!.id
    serveGets(client, {
      [`/api/tasks/${encodeURIComponent(`${taskId}#0`)}`]: COPY_TENANT_TASKS,
    })
    renderPage(
      client,
      <MbcMasterCopyTaskDetailPage
        routing={createRouting()}
        settingId={SETTING_ID}
        taskId={taskId}
      />
    )
    expect(await screen.findByText('tenant-c')).toBeVisible()
    expect(
      screen.getByText('Error: Master setting does not exist')
    ).toBeVisible()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/mbc/copy-pages.test.tsx`
Expected: FAIL: `Failed to resolve import "./copy-pages"`; no tests run.

- [ ] **Step 3: Implement**

`packages/master-web/src/mbc/copy-pages.tsx`:

```tsx
'use client'

import { useQuery } from '@mbc-cqrs-serverless/client-web/react'
import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterTenant } from '../core/copy'
import { initialDataListState, type MasterDataListState } from '../core/list'
import { MasterCopyRequestForm } from '../copy/master-copy-request-form'
import { MasterCopyTaskDetail } from '../copy/master-copy-task-detail'
import { MasterCopyTaskList } from '../copy/master-copy-task-list'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { settingCodeOfId } from './api'
import {
  useCopyTask,
  useCopyTasks,
  useMasterDataList,
  useMasterMutations,
  useMasterSetting,
} from './hooks'
import {
  PageState,
  reported,
  useListState,
  useReport,
  useTenantCode,
  type MbcPageProps,
} from './page-parts'

export type MbcMasterCopyRequestPageProps = MbcPageProps & {
  /** The setting to copy. */
  settingId: string
  /** The tenants it can be copied to (v0 read a host endpoint). */
  loadTenants(): Promise<MasterTenant[]>
  /** After a copy is requested. The page then goes to the setting's copy results. */
  onRequested?(): void
  /** The data search's state; the page keeps its own without it. */
  state?: MasterDataListState
  onStateChange?(state: MasterDataListState): void
}

/**
 * v0's copy request on the mbc backend. A new setting starts a fresh form;
 * a request goes on to the setting's copy results.
 */
export function MbcMasterCopyRequestPage(props: MbcMasterCopyRequestPageProps) {
  return <CopyRequest key={props.settingId} {...props} />
}

function CopyRequest({
  routing,
  onError,
  paths,
  settingId,
  loadTenants,
  onRequested,
  state,
  onStateChange,
}: MbcMasterCopyRequestPageProps) {
  const t = useMessages(masterCopyMessages).request
  const [current, change] = useListState(
    state,
    onStateChange,
    initialDataListState
  )
  const tenantCode = useTenantCode()
  const setting = useMasterSetting(settingId, { paths })
  // The form does not say when "chosen data" is picked: load the rows now.
  const list = useMasterDataList(settingId, current, { paths })
  const tenants = useQuery(tenantCode, () => loadTenants())
  const { requestCopy } = useMasterMutations({ paths })
  useReport(setting.error, onError)
  useReport(tenants.error, onError)
  useReport(list.error, onError)
  if (!setting.data || !tenants.data)
    return (
      <PageState
        error={setting.error ?? tenants.error}
        loadFailed={t.loadFailed}
        retry={t.retry}
        onRetry={() => {
          setting.refetch()
          tenants.refetch()
        }}
      />
    )
  return (
    <MasterCopyRequestForm
      setting={setting.data}
      tenants={tenants.data}
      items={list.data?.items ?? []}
      total={list.data?.total ?? 0}
      state={current}
      onStateChange={change}
      routing={routing}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      onRequestCopy={async (request) => {
        await reported(requestCopy.runOrThrow(request), onError)
        onRequested?.()
        routing.navigate({ screen: 'copyTasks', settingId })
      }}
    />
  )
}

export type MbcMasterCopyTaskListPageProps = MbcPageProps & {
  /** The setting whose copies are listed. */
  settingId: string
  /** Load again every `pollMs` ms after each answer (off without it). */
  pollMs?: number
}

/** v0's copy results of one setting on the mbc backend. */
export function MbcMasterCopyTaskListPage({
  routing,
  onError,
  paths,
  settingId,
  pollMs,
}: MbcMasterCopyTaskListPageProps) {
  const tasks = useCopyTasks(settingCodeOfId(settingId), { paths, pollMs })
  useReport(tasks.error, onError)
  return (
    <MasterCopyTaskList
      settingId={settingId}
      tasks={tasks.data ?? []}
      routing={routing}
      loading={tasks.loading}
      error={tasks.error}
      onRefresh={tasks.refetch}
    />
  )
}

export type MbcMasterCopyTaskDetailPageProps = MbcPageProps & {
  /** The setting that was copied. */
  settingId: string
  /** The copy request (a row of the copy results). */
  taskId: string
  /** Load again every `pollMs` ms after each answer (off without it). */
  pollMs?: number
}

/** v0's result of one copy request, per destination tenant, on the mbc backend. */
export function MbcMasterCopyTaskDetailPage({
  routing,
  onError,
  paths,
  settingId,
  taskId,
  pollMs,
}: MbcMasterCopyTaskDetailPageProps) {
  const tasks = useCopyTask(taskId, { paths, pollMs })
  useReport(tasks.error, onError)
  return (
    <MasterCopyTaskDetail
      settingId={settingId}
      tasks={tasks.data ?? []}
      routing={routing}
      loading={tasks.loading}
      error={tasks.error}
      onRefresh={tasks.refetch}
    />
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (306 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): connected copy pages"
```

---

### Task 4: Exports, playground pages, smoke app, docs

**Files:**

- Modify: `packages/master-web/src/mbc/index.ts`, `packages/master-web/test/exports.test.tsx`
- Create: `apps/playground/src/fake-master-backend.ts`, `apps/playground/src/mbc-pages.tsx`
- Modify: `apps/playground/src/main.tsx`, `apps/playground/src/toolbar.tsx`, `apps/next-smoke/app/master-screens.tsx`, `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`

**Interfaces:**

- `/mbc` exports the seven pages and their props types, `MbcPageProps` and `SEQUENCE_SETTING_CODE`.
- The playground:
  - `createFakeMasterBackend()` is an `MbcClient` over a fake `fetch` that answers every endpoint `createMasterApi` calls, from in-memory settings, records, sequences and copy tasks. A `PRODUCT` master has an auto-numbered code; the `sequence_setting` master gives its formats.
  - `#mbc/…` routes render the connected pages on it, and the toolbar links to `#mbc`.
- The Next smoke app renders `MbcMasterSettingListPage` inside `MbcClientProvider`. Its server HTML has the page's loading table.

- [ ] **Step 1: Write the failing test**

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
        'MbcRealtimeError',
        'MbcTimeoutError',
```

with:

<!-- prettier-ignore -->
```tsx
        'MbcMasterCopyRequestPage',
        'MbcMasterCopyTaskDetailPage',
        'MbcMasterCopyTaskListPage',
        'MbcMasterDataEditorPage',
        'MbcMasterDataListPage',
        'MbcMasterSettingEditorPage',
        'MbcMasterSettingListPage',
        'MbcRealtimeError',
        'MbcTimeoutError',
        'SEQUENCE_SETTING_CODE',
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/test/exports.test.tsx`
Expected: FAIL in "exports the backend integration and client-web’s parts from /mbc only": `/mbc` does not export the pages yet. The other 3 tests pass.

- [ ] **Step 3: Export the pages**

In `packages/master-web/src/mbc/index.ts`, replace:

<!-- prettier-ignore -->
```ts
} from './bulk'
export {
```

with:

<!-- prettier-ignore -->
```ts
} from './bulk'
export {
  MbcMasterCopyRequestPage,
  MbcMasterCopyTaskDetailPage,
  MbcMasterCopyTaskListPage,
  type MbcMasterCopyRequestPageProps,
  type MbcMasterCopyTaskDetailPageProps,
  type MbcMasterCopyTaskListPageProps,
} from './copy-pages'
export {
  MbcMasterDataEditorPage,
  MbcMasterDataListPage,
  type MbcMasterDataEditorPageProps,
  type MbcMasterDataListPageProps,
} from './data-pages'
export {
```

In `packages/master-web/src/mbc/index.ts`, replace:

<!-- prettier-ignore -->
```ts
} from './hooks'
```

with:

<!-- prettier-ignore -->
```ts
} from './hooks'
export type { MbcPageProps } from './page-parts'
export {
  MbcMasterSettingEditorPage,
  MbcMasterSettingListPage,
  SEQUENCE_SETTING_CODE,
  type MbcMasterSettingEditorPageProps,
  type MbcMasterSettingListPageProps,
} from './setting-pages'
```

- [ ] **Step 4: Add the playground's fake backend and connected pages**

`apps/playground/src/fake-master-backend.ts`:

```ts
import {
  createMbcClient,
  type MbcClient,
} from '@mbc-cqrs-serverless/client-web'

const TENANT = 'tenant-a'
const PK = `MASTER#${TENANT}`

type Entity = {
  id: string
  pk: string
  sk: string
  code: string
  name: string
  version: number
  tenantCode: string
  seq?: number
  isDeleted: boolean
  attributes: Record<string, unknown>
}

type Task = {
  id: string
  pk: string
  sk: string
  status: string
  createdAt: string
  updatedAt: string
  input?: unknown
  attributes?: Record<string, unknown>
}

const field = (
  physicalName: string,
  name: string,
  dataType: string,
  extra: Record<string, unknown> = {}
) => ({
  physicalName,
  name,
  dataType,
  isRequired: physicalName === 'code' || physicalName === 'name',
  isShowedOnList: true,
  ...extra,
})

/**
 * An in-memory master backend behind a real MbcClient: settings, data, bulk,
 * sequences, copies and their tasks. No realtime, so commands resolve on the
 * HTTP answer. Each task read finishes one more tenant of each copy.
 */
export function createFakeMasterBackend(): MbcClient {
  const settings = new Map<string, Entity>()
  const records = new Map<string, Entity>()
  const counters = new Map<string, number>()
  const parents: Task[] = []
  const children = new Map<string, Task[]>()
  const now = () => new Date().toISOString()

  const putSetting = (
    code: string,
    name: string,
    attributes: Record<string, unknown>
  ) => {
    const sk = `MASTER_SETTING#${code}`
    const old = settings.get(`${PK}#${sk}`)
    settings.set(`${PK}#${sk}`, {
      id: `${PK}#${sk}`,
      pk: PK,
      sk,
      code,
      name,
      version: (old?.version ?? 0) + 1,
      tenantCode: TENANT,
      isDeleted: false,
      attributes,
    })
  }
  const putRecord = (
    settingCode: string,
    body: { code: string; name: string; seq?: number; attributes?: object }
  ) => {
    const sk = `${settingCode}#${body.code}`
    const old = records.get(`${PK}#${sk}`)
    records.set(`${PK}#${sk}`, {
      id: `${PK}#${sk}`,
      pk: PK,
      sk,
      code: body.code,
      name: body.name,
      version: (old?.version ?? 0) + 1,
      tenantCode: TENANT,
      seq: body.seq,
      isDeleted: false,
      attributes: { ...(body.attributes as Record<string, unknown>) },
    })
  }

  putSetting('PRODUCT', '商品', {
    description: '商品のマスタ',
    fields: [
      field('code', 'コード', 'auto_number', {
        formatCode: 'sequence_setting#PRODUCT',
        dataFormat: 'P-%%no%%',
        formatName: '商品番号',
      }),
      field('name', '名称', 'string', { length: '255' }),
      field('seq', '並び順', 'number'),
      field('price', '価格', 'number', { min: '0' }),
    ],
  })
  putSetting('sequence_setting', '採番設定', {
    description: '自動採番の書式',
    fields: [
      field('code', 'コード', 'string'),
      field('name', '名称', 'string'),
      field('seq', '並び順', 'number'),
      field('format', '書式', 'string'),
    ],
  })
  for (let n = 1; n <= 12; n++)
    putRecord('PRODUCT', {
      code: `P-${String(n).padStart(4, '0')}`,
      name: `商品 ${n}`,
      seq: n,
      attributes: { price: String(n * 120) },
    })
  counters.set('sequence_setting#PRODUCT', 12)
  putRecord('sequence_setting', {
    code: 'PRODUCT',
    name: '商品番号',
    attributes: { format: 'P-%%no%%' },
  })
  putRecord('sequence_setting', {
    code: 'ORDER',
    name: '注文番号',
    attributes: { format: 'O-%%no%%' },
  })

  const listRow = (record: Entity) => {
    const settingCode = record.sk.slice(0, record.sk.indexOf('#'))
    return {
      ...record,
      code: `${settingCode}#${record.code}`,
      masterCode: record.code,
    }
  }
  const sortPage = <T extends Record<string, unknown>>(
    rows: T[],
    query: URLSearchParams
  ) => {
    const order = query.get('orderBys')
    if (order) {
      const desc = order.startsWith('-')
      const column = desc ? order.slice(1) : order
      rows.sort((a, b) => {
        const x = String(a[column] ?? '')
        const y = String(b[column] ?? '')
        return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1)
      })
    }
    const page = Number(query.get('page') ?? 1)
    const pageSize = Number(query.get('pageSize') ?? 10)
    return {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
    }
  }
  /** One more tenant of each copy finishes; the last of several fails. */
  const advance = () => {
    for (const parent of parents) {
      const tasks = children.get(parent.id) ?? []
      const next = tasks.find((task) => task.status === 'QUEUED')
      if (next) {
        const fails = tasks.length > 1 && next === tasks.at(-1)
        next.status = fails ? 'FAILED' : 'COMPLETED'
        next.updatedAt = now()
        if (fails)
          next.attributes = {
            error: 'Error: the tenant is not ready\n    at copy (playground)',
          }
      }
      const of = (status: string) =>
        tasks.filter((task) => task.status === status).length
      parent.attributes = {
        subTaskCount: tasks.length,
        subTaskRunningCount: of('QUEUED'),
        subTaskSucceedCount: of('COMPLETED'),
        subTaskFailedCount: of('FAILED'),
      }
      if (of('QUEUED') === 0 && parent.status !== 'COMPLETED') {
        parent.status = 'COMPLETED'
        parent.updatedAt = now()
      }
    }
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  const accepted = () => json({ requestId: `req-${Date.now()}` })

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    )
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const query = url.searchParams
    const path = url.pathname
    await new Promise((resolve) => setTimeout(resolve, 250))
    const part = (prefix: string) =>
      decodeURIComponent(path.slice(prefix.length))

    // Settings
    if (method === 'GET' && path === '/api/master-setting/list') {
      const rows = [...settings.values()]
        .filter((entity) => !entity.isDeleted)
        .filter((entity) => entity.code.includes(query.get('code') ?? ''))
        .filter((entity) => entity.name.includes(query.get('name') ?? ''))
        .filter((entity) =>
          String(entity.attributes.description ?? '').includes(
            query.get('keyword') ?? ''
          )
        )
        .map((entity) => ({ ...entity, code: entity.sk }))
      return json(sortPage(rows, query))
    }
    if (method === 'GET' && path.startsWith('/api/master-setting/detail/')) {
      const entity = settings.get(part('/api/master-setting/detail/'))
      return entity ? json(entity) : json({ message: 'not found' }, 404)
    }
    if (
      method === 'POST' &&
      path.startsWith('/api/master-setting/check-exist/')
    ) {
      const code = part('/api/master-setting/check-exist/')
      const entity = settings.get(`${PK}#MASTER_SETTING#${code}`)
      return json(Boolean(entity && !entity.isDeleted))
    }
    if (method === 'POST' && path === '/api/master-setting/copy') {
      const code = String(body.masterSettingId).split('#').at(-1)
      const sk = `MASTER_COPY_${code}#${Date.now().toString(36).toUpperCase()}`
      const parent: Task = {
        id: `SFN_TASK#${TENANT}#${sk}`,
        pk: `SFN_TASK#${TENANT}`,
        sk,
        status: 'PROCESSING',
        createdAt: now(),
        updatedAt: now(),
      }
      children.set(
        parent.id,
        (body.targetTenants as string[]).map((tenant, n) => ({
          id: `${parent.id}#${n}`,
          pk: parent.pk,
          sk: `${sk}#${n}`,
          status: 'QUEUED',
          createdAt: now(),
          updatedAt: now(),
          input: { ...body, targetTenants: [tenant] },
        }))
      )
      parents.unshift(parent)
      return json(parent)
    }
    if (method === 'POST' && path === '/api/master-setting') {
      putSetting(body.code, body.name, body.settingValue)
      return accepted()
    }
    if (path.startsWith('/api/master-setting/')) {
      const entity = settings.get(part('/api/master-setting/'))
      if (!entity) return json({ message: 'not found' }, 404)
      if (method === 'PUT') putSetting(entity.code, body.name, body.attributes)
      if (method === 'DELETE') entity.isDeleted = true
      return accepted()
    }

    // Data
    if (method === 'GET' && path === '/api/master-data/list') {
      const settingCode = query.get('settingCode') ?? ''
      const rows = [...records.values()]
        .filter((record) => record.sk.startsWith(`${settingCode}#`))
        .filter(
          (record) => query.get('isDeleted') === 'true' || !record.isDeleted
        )
        .filter((record) => record.code.includes(query.get('code') ?? ''))
        .filter((record) => record.name.includes(query.get('keyword') ?? ''))
        .map(listRow)
      return json(sortPage(rows, query))
    }
    if (method === 'GET' && path.startsWith('/api/master-data/detail/')) {
      const record = records.get(part('/api/master-data/detail/'))
      return record ? json(record) : json({ message: 'not found' }, 404)
    }
    if (method === 'POST' && path.startsWith('/api/master-data/check-exist/')) {
      const [settingCode, code] = path
        .slice('/api/master-data/check-exist/'.length)
        .split('/')
        .map(decodeURIComponent)
      const record = records.get(`${PK}#${settingCode}#${code}`)
      return json(Boolean(record && !record.isDeleted))
    }
    if (method === 'POST' && path === '/api/master-data/create') {
      putRecord(body.settingCode, body)
      return accepted()
    }
    if (path.startsWith('/api/master-data/')) {
      const record = records.get(part('/api/master-data/'))
      if (!record) return json({ message: 'not found' }, 404)
      if (method === 'DELETE') record.isDeleted = true
      else if (body.isDeleted === false) record.isDeleted = false
      else
        Object.assign(record, {
          name: body.name,
          seq: body.seq,
          attributes: body.attributes,
          version: record.version + 1,
        })
      return accepted()
    }

    // Bulk, sequences, tasks
    if (method === 'POST' && path === '/api/master-bulk') {
      const requestId = `req-${Date.now()}`
      for (const item of body.items as Record<string, unknown>[]) {
        if (item.settingCode) putRecord(String(item.settingCode), item as never)
        else
          putSetting(
            String(item.code),
            String(item.name),
            item.attributes as Record<string, unknown>
          )
      }
      return json((body.items as unknown[]).map(() => ({ requestId })))
    }
    if (method === 'POST' && path.startsWith('/api/sequence')) {
      const next = (counters.get(body.typeCode) ?? 0) + 1
      counters.set(body.typeCode, next)
      const number = String(next).padStart(4, '0')
      const formatted = body.format
        ? String(body.format).replace('%%no%%', number)
        : number
      return json({
        formattedNo: `${body.prefix ?? ''}${formatted}${body.postfix ?? ''}`,
      })
    }
    if (method === 'GET' && path === '/api/tasks/sfn-task-parent') {
      advance()
      const prefix = `MASTER_COPY_${query.get('masterSettingCode') ?? ''}`
      return json(parents.filter((task) => task.sk.startsWith(prefix)))
    }
    if (method === 'GET' && path.startsWith('/api/tasks/')) {
      advance()
      const id = part('/api/tasks/').replace(/#0$/, '')
      return json(children.get(id) ?? [])
    }
    return json({ message: `no route for ${method} ${path}` }, 404)
  }

  return createMbcClient({
    apiUrl: 'https://fake.local',
    tenantCode: TENANT,
    fetch,
  })
}
```

`apps/playground/src/mbc-pages.tsx`:

```tsx
import type {
  MasterRouting,
  MasterTarget,
} from '@mbc-cqrs-serverless/master-web'
import { editorRenderers } from '@mbc-cqrs-serverless/master-web/editors'
import {
  MbcClientProvider,
  MbcMasterCopyRequestPage,
  MbcMasterCopyTaskDetailPage,
  MbcMasterCopyTaskListPage,
  MbcMasterDataEditorPage,
  MbcMasterDataListPage,
  MbcMasterSettingEditorPage,
  MbcMasterSettingListPage,
} from '@mbc-cqrs-serverless/master-web/mbc'

import { createFakeMasterBackend } from './fake-master-backend'

const backend = createFakeMasterBackend()

const TENANTS = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
  { code: 'tenant-d', name: 'テナントD' },
]

const href = (to: MasterTarget) => {
  const id = encodeURIComponent
  switch (to.screen) {
    case 'setting':
      return `#mbc/setting/${id(to.id)}`
    case 'dataItem':
      return `#mbc/dataItem/${id(to.settingId)}/${id(to.id)}`
    case 'copyTask':
      return `#mbc/copyTask/${id(to.settingId)}/${id(to.taskId)}`
    case 'data':
    case 'newData':
    case 'copyRequest':
    case 'copyTasks':
      return `#mbc/${to.screen}/${id(to.settingId)}`
    default:
      return `#mbc/${to.screen}`
  }
}

const routing: MasterRouting = {
  href,
  navigate: (to) => {
    location.hash = href(to)
  },
}

/**
 * The connected pages on a fake master backend: `#mbc` (settings list),
 * `#mbc/newSetting`, `#mbc/setting/<id>`, `#mbc/data/<setting id>`,
 * `#mbc/newData/<setting id>`, `#mbc/dataItem/<setting id>/<id>`,
 * `#mbc/copyRequest/<setting id>`, `#mbc/copyTasks/<setting id>` and
 * `#mbc/copyTask/<setting id>/<task id>`.
 */
export function MbcMasterPage({ route }: { route: string }) {
  const [, screen, first, second] = route.split('/')
  const a = first === undefined ? undefined : decodeURIComponent(first)
  const b = second === undefined ? undefined : decodeURIComponent(second)
  const common = { routing }
  return (
    <MbcClientProvider client={backend}>
      <div style={{ padding: 16 }}>
        {screen === 'newSetting' ? (
          <MbcMasterSettingEditorPage key="new" {...common} canCopy />
        ) : screen === 'setting' && a ? (
          <MbcMasterSettingEditorPage key={a} {...common} id={a} canCopy />
        ) : screen === 'data' && a ? (
          <MbcMasterDataListPage key={a} {...common} settingId={a} />
        ) : screen === 'newData' && a ? (
          <MbcMasterDataEditorPage
            key={`new:${a}`}
            {...common}
            settingId={a}
            components={editorRenderers}
          />
        ) : screen === 'dataItem' && a && b ? (
          <MbcMasterDataEditorPage
            key={b}
            {...common}
            settingId={a}
            id={b}
            components={editorRenderers}
          />
        ) : screen === 'copyRequest' && a ? (
          <MbcMasterCopyRequestPage
            {...common}
            settingId={a}
            loadTenants={async () => TENANTS}
          />
        ) : screen === 'copyTasks' && a ? (
          <MbcMasterCopyTaskListPage
            key={a}
            {...common}
            settingId={a}
            pollMs={3000}
          />
        ) : screen === 'copyTask' && a && b ? (
          <MbcMasterCopyTaskDetailPage
            key={b}
            {...common}
            settingId={a}
            taskId={b}
            pollMs={3000}
          />
        ) : (
          <MbcMasterSettingListPage {...common} />
        )}
      </div>
    </MbcClientProvider>
  )
}
```

In `apps/playground/src/main.tsx`, replace:

<!-- prettier-ignore -->
```tsx
import { MasterPage } from './master-pages'
```

with:

<!-- prettier-ignore -->
```tsx
import { MasterPage } from './master-pages'
import { MbcMasterPage } from './mbc-pages'
```

In `apps/playground/src/main.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      {hash.startsWith('#master') ? (
```

with:

<!-- prettier-ignore -->
```tsx
      {hash.startsWith('#mbc') ? (
        <MbcMasterPage route={hash.slice(1)} />
      ) : hash.startsWith('#master') ? (
```

In `apps/playground/src/toolbar.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      <a href="#master">Master lists</a>
```

with:

<!-- prettier-ignore -->
```tsx
      <a href="#master">Master lists</a>
      <a href="#mbc">Master (backend)</a>
```

- [ ] **Step 5: Render a connected page in the smoke app**

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
import { editorRenderers } from '@mbc-cqrs-serverless/master-web/editors'
```

with:

<!-- prettier-ignore -->
```tsx
import { editorRenderers } from '@mbc-cqrs-serverless/master-web/editors'
import {
  createMbcClient,
  MbcClientProvider,
  MbcMasterSettingListPage,
} from '@mbc-cqrs-serverless/master-web/mbc'
```

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
const copyTask = {
```

with:

<!-- prettier-ignore -->
```tsx
// The connected page renders its loading state on the server; it loads
// after hydration (this smoke app has no backend).
const client = createMbcClient({
  apiUrl: 'https://example.invalid',
  tenantCode: 'tenant-a',
})

const copyTask = {
```

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
```

with:

<!-- prettier-ignore -->
```tsx
      <MbcClientProvider client={client}>
        <MbcMasterSettingListPage routing={routing} />
      </MbcClientProvider>
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
```

- [ ] **Step 6: Update the spec**

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
- Connected pages: `MbcMasterSettingListPage`, `MbcMasterSettingEditorPage` (`id?`), `MbcMasterDataListPage` (`settingId`), `MbcMasterDataEditorPage` (`settingId`, `id?`), `MbcMasterCopyRequestPage`, `MbcMasterCopyTaskListPage`, `MbcMasterCopyTaskDetailPage`. Common props: `routing`, `onSaved`, `onDeleted`, `onError`, `components`; list pages: `state` / `onStateChange` (internal state when omitted); copy pages and the settings editor: `canCopy`, `loadTenants(): Promise<{ code: string; name: string }[]>`; settings editor: `settingOptions`, and `formats` loaded from the `sequence_setting` master's data (v0's source; the code is overridable); settings list: `inputSampleJson`, `mapRawItem`.
```

with:

<!-- prettier-ignore -->
```md
- Connected pages: `MbcMasterSettingListPage`, `MbcMasterSettingEditorPage` (`id?`), `MbcMasterDataListPage` (`settingId`), `MbcMasterDataEditorPage` (`settingId`, `id?`), `MbcMasterCopyRequestPage` (`settingId`, `loadTenants(): Promise<{ code: string; name: string }[]>`), `MbcMasterCopyTaskListPage` (`settingId`, `pollMs?`), `MbcMasterCopyTaskDetailPage` (`settingId`, `taskId`, `pollMs?`). Common props: `routing`, `onError` (every failed load or write, also shown on the page), `paths`; list pages: `state` / `onStateChange` (internal state when omitted), `inputSampleJson`, `mapRawItem`; editors: `onSaved(id)`, `onDeleted()`; data editor: `components`; settings editor: `canCopy`, `settingOptions`, and `formats`, read from the `sequence_setting` master's records when not given (`formatSettingCode` names another master). After a write the pages go on as v0 did: a new setting opens its data list, a new record opens itself, a deleted setting returns to the settings list, a copy request opens the copy results. They write through `runOrThrow`, so a screen gets the real error (the data editor locks Save after a timed-out create). Reaching the copy pages is the host's routing: `canCopy` on the settings editor shows or hides the links to them (v0 showed them to its system tenant only).
```

- [ ] **Step 7: Run the checks**

Run: `fnm exec --using=v24.13.0 -- pnpm build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm typecheck && fnm exec --using=v24.13.0 -- pnpm smoke && grep -c 'aria-busy="true"' apps/next-smoke/.next/server/app/index.html`
Expected: PASS (master-web 306 tests); typecheck and the smoke build exit 0; the grep prints `1` (the connected page's loading table; `main` has none).

- [ ] **Step 8: Check the pages in a browser**

Optional, and not checked by the replay. Start the playground (`pnpm --filter @mbc-cqrs-serverless/playground dev`) and open Master (backend). Then:

1. Open PRODUCT's data and press 新規登録.
2. Fill 名称 and 価格, then press 登録. The new record should open with the next code.
3. Open the PRODUCT setting, follow テナントへコピー, and press コピー登録.
4. The copy results should progress every few seconds, and the request's detail should show one row per tenant.

There should be no errors in the console.

- [ ] **Step 9: Commit**

```bash
git add packages/master-web apps docs
git commit -m "feat(master-web): connected pages in the playground and the smoke app; docs for M7c"
```

---

### Task 5: Gate and hand-back

**Files:** none (verification only).

- [ ] **Step 1: Format and lint**

Run: `fnm exec --using=v24.13.0 -- pnpm format:check && fnm exec --using=v24.13.0 -- pnpm lint`
Expected: both exit 0. If `format:check` lists files, run `fnm exec --using=v24.13.0 -- pnpm format`, check the diff is whitespace only, and commit it as `style: format`.

- [ ] **Step 2: Full gate on React 19**

Run: `fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke`
Expected: both exit 0; every test passes (899 in all after this plan).

- [ ] **Step 3: Full gate on React 18, then restore**

```bash
fnm exec --using=v24.13.0 -- pnpm use-react 18
fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke
fnm exec --using=v24.13.0 -- pnpm use-react 19
git status --porcelain
```

Expected: `verify` and `smoke` exit 0 on React 18; `git status --porcelain` prints nothing after the restore.

- [ ] **Step 4: Hand back**

Do not merge `m7c-mbc-pages` into `main` and do not tick M7c in the orchestrator — an independent review comes first. Report: the branch name, the commit range (`git log --oneline main..m7c-mbc-pages`), the gate results from Steps 2–3, and any step whose output did not match its `Expected:` line together with what you did about it.
