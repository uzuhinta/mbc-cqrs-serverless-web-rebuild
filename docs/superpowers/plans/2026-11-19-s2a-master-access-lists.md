# S2a: master-web access in the list pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a host passes `systems`, the two list pages read the caller's grants. The settings list gets a system filter and column, the data list gets a system column, and both offer create and import only where the grants allow. A shared helper explains refused writes. Without `systems`, nothing changes.

**Architecture:** One hook, `useMasterAccess(systems)`, in `mbc/hooks.ts` turns `GET /api/master-access` into S1's `MasterAccess`. The request is shared across pages through a per-client cache. The list screens take an optional `access` prop, which defaults to `OPEN_ACCESS`. `form/refusal.ts` maps a 403 or 400 to a hint, which `failureOf` uses. S2b uses that helper in the editors.

**Tech Stack:** TypeScript, React 18/19, ui-web (`Select`), client-web `useQuery`, Vitest with Testing Library and axe. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-master-system-scoping-design.md` (sections "/mbc pages", "Screens": settings list and data list rows, "Error messages").

## Orientation

- **Prerequisite:** S1 (`docs/superpowers/plans/2026-11-19-s1-master-access-core.md`) is merged. This plan uses its `masterAccess`, `OPEN_ACCESS`, `systemLabel`, `MasterAccess`, `SystemOption`, `MasterAccessAnswer`, the `access.get` API method, `ListOptions` and `MasterSettingListState.systemId`.
- Repo `lib-web/rebuild`. Work on a branch from `main`, e.g. `feat/master-access-lists`, in a worktree.
- Toolchain: `eval "$(fnm env)"; fnm use 24.13.0`, then `pnpm install --frozen-lockfile` and `pnpm build`. On "Cannot find native binding", delete `node_modules` (root, `packages/*`, `apps/*`) and install again under Node 24.
- Tests of one file: `pnpm vitest run <path>`. Page tests use `test/render-page.tsx` (`renderPage`, `serveGets`, `createRouting`) and `test/fake-mbc-client.ts`.
- Screens take props only (no context). `/mbc` pages connect them. Every public export name is pinned in `test/exports.test.tsx`.

## Global Constraints

- No `systems` means no request to `/api/master-access`, and every screen renders and behaves exactly as before. A screen without `access` must not add `systemId` to the state it reports.
- While the grants load, the page passes `{ ...OPEN_ACCESS, loading: true, systems }`. No system UI appears, and create and import are **disabled**, not hidden.
- With access enabled, an action the grants do not allow is **hidden**.
- A failed grants request is reported to `onError`, and the page then behaves as not enabled.
- Labels come from a new `master` messages block `access`:
  - `system`: `システム` / `System`
  - `allSystems`: `すべて` / `All`
  - `chooseSystem`: `システムを選択してください` / `Choose a system`
  - `common`: `共通` / `Common`
  - `permissionDenied`: `この操作を行う権限がありません。` / `You do not have permission to do this.`
- No product, client or host names (use `app-a`, `shared`).
- Commit trailer on every commit:
  ```
  Co-Authored-By: <your agent identity>
  Claude-Session: https://claude.ai/code/session_011KPZCcUnsRe8xry6DPcPHW
  ```
- Gate before hand-back: `pnpm verify`.

## Review Focus

1. A host keeps its own settings-list state, written before `systemId` existed, and passes no access. Searching reports a state with no `systemId` key (Task 3 test `…keeps the state’s shape`).
2. Moving from the settings list to a data list sends one grants request, not one per page. A failed request is not cached, so the next page asks again (Task 2 tests `shares one request…` and `…asks again later`).
3. Grants still loading must not flash the system column for a backend that then answers `enabled: false` (Task 2 `is loading, not enabled…`, Task 3 `disables create and import while the grants load`).
4. A setting with no `systemId` is checked as `shared` on the data list. A grant on `app-a` alone hides create (Task 4 test `checks a setting with no system as shared`).
5. A 400 whose body `message` is a list of texts (NestJS validation) is shown joined, not as `[object Object]` (Task 1 test `shows the backend’s reason for a 400`).

---

### Task 1: Refusal text for failed writes

**Files:**

- Create: `packages/master-web/src/form/refusal.ts`, `packages/master-web/src/form/refusal.test.ts`
- Modify: `packages/master-web/src/form/failure.tsx`, `packages/master-web/src/i18n/master-messages.ts`

**Interfaces:**

- Produces:
  - `type RefusalTexts = { enabled: boolean; permissionDenied: string }`
  - `refusalOf(reason: unknown, texts: RefusalTexts | undefined): string | undefined`:
    - It returns `undefined` unless `texts?.enabled`.
    - It finds the `MbcApiError`, either `reason` itself or one down its `cause` chain. Match by `name === 'MbcApiError'` and a numeric `status`, as `form/outcome.ts` does.
    - 403 returns `texts.permissionDenied`.
    - 400 returns the body's `message` when it is a non-blank string, or its non-blank strings joined by one space when it is an array. Otherwise `undefined`.
  - `failureOf(reason, title, t, refusal?: RefusalTexts)`: a new optional 4th parameter. The hint becomes `refusalOf(reason, refusal) ?? t.failedHint`. The timeout case does not change.
  - `MasterMessages['access']`: `{ system; allSystems; chooseSystem; common; permissionDenied }`, all `string`, with the texts from Global Constraints. It is the first key of the type and of `ja` and `en`.

- [ ] **Step 1: Write the failing test** `packages/master-web/src/form/refusal.test.ts`:

<!-- prettier-ignore -->
```tsx
import { MbcApiError, MbcTimeoutError } from '@mbc-cqrs-serverless/client-web'
import { describe, expect, it } from 'vitest'

import { MasterBulkError } from '../mbc/bulk'
import { failureOf } from './failure'
import { refusalOf } from './refusal'

const on = { enabled: true, permissionDenied: 'no permission' }
const off = { enabled: false, permissionDenied: 'no permission' }
const t = { failedHint: 'check and retry', timeout: 'unknown outcome' }

describe('refusalOf', () => {
  it('explains a 403 as no permission', () => {
    expect(refusalOf(new MbcApiError(403, {}), on)).toBe('no permission')
  })

  it('shows the backend’s reason for a 400', () => {
    expect(
      refusalOf(new MbcApiError(400, { message: 'systemId conflicts' }), on)
    ).toBe('systemId conflicts')
    expect(
      refusalOf(new MbcApiError(400, { message: ['a is bad', 'b is bad'] }), on)
    ).toBe('a is bad b is bad')
    expect(refusalOf(new MbcApiError(400, {}), on)).toBeUndefined()
  })

  it('says nothing for other errors or with access off', () => {
    expect(
      refusalOf(new MbcApiError(500, { message: 'x' }), on)
    ).toBeUndefined()
    expect(refusalOf(new MbcApiError(403, {}), off)).toBeUndefined()
    expect(refusalOf(new MbcApiError(403, {}), undefined)).toBeUndefined()
    expect(refusalOf(new Error('x'), on)).toBeUndefined()
  })

  it('reads a bulk batch’s cause', () => {
    const batch = new MasterBulkError(new MbcApiError(403, {}), {
      done: 0,
      from: 1,
      to: 100,
    })
    expect(refusalOf(batch, on)).toBe('no permission')
  })
})

describe('failureOf with a refusal', () => {
  it('puts the refusal in the hint', () => {
    expect(failureOf(new MbcApiError(403, {}), 'Save failed', t, on)).toEqual({
      title: 'Save failed',
      hint: 'no permission',
    })
  })

  it('keeps the usual hint and the timeout text', () => {
    expect(failureOf(new MbcApiError(403, {}), 'Save failed', t, off)).toEqual({
      title: 'Save failed',
      hint: 'check and retry',
    })
    expect(failureOf(new MbcTimeoutError(1000), 'Save failed', t, on)).toEqual({
      title: 'unknown outcome',
    })
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run packages/master-web/src/form/refusal.test.ts`
Expected: FAIL, `Failed to resolve import "./refusal"`.

- [ ] **Step 3: Implement** `form/refusal.ts`, the `failureOf` parameter (mention it in the doc comment), and the `access` message block.

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run packages/master-web/src/form packages/master-web/src/i18n`
Expected: PASS (6 tests in `refusal.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): explain a refused write with access enabled"
```

### Task 2: `useMasterAccess` and `includeCommon` in the list hooks

**Files:**

- Modify: `packages/master-web/src/mbc/hooks.ts`, `packages/master-web/src/mbc/index.ts`, `packages/master-web/test/exports.test.tsx`
- Create test: `packages/master-web/src/mbc/access-hook.test.tsx`

**Interfaces:**

- Consumes: `masterAccess`, `OPEN_ACCESS`, `MasterAccess`, `MasterAccessAnswer`, `SystemOption` (S1, `core/access`), and `api.access.get` (S1).
- Produces:
  - `type MasterListQueryOptions = MasterApiOptions & { includeCommon?: boolean }`
  - `useMasterSettings(state, options?: MasterListQueryOptions)` and `useMasterDataList(settingId, state, options?: MasterListQueryOptions)`. They pass `includeCommon` to `api.*.list`, and the query key includes it.
  - `useMasterAccess(systems: readonly SystemOption[] | undefined, options?: MasterApiOptions): { access: MasterAccess | undefined; error: unknown }`:
    - No `systems`: `access` is `undefined`, and nothing is requested (`useQuery` with `null`).
    - While loading: `{ ...OPEN_ACCESS, systems, loading: true }`.
    - Answered: `masterAccess(answer, systems)`.
    - Failed: `{ ...OPEN_ACCESS, systems, loading: false }`, with `error` set.
    - The query key is the scope from `useMasterScope` plus `\u0000access`.
  - The request goes through a module-level `WeakMap<MbcClient, Map<string, Promise<MasterAccessAnswer>>>` keyed by that scope. The first caller starts `api.access.get()` without a signal, because other pages may wait on it. Later callers reuse the promise, and a rejected promise is removed from the map.
  - Exported from `mbc/index.ts`: `useMasterAccess`, `type MasterListQueryOptions`, `type ListOptions` (from `./api`). Add `'useMasterAccess'` to the `mbc` names in `test/exports.test.tsx`.

- [ ] **Step 1: Write the failing test** `packages/master-web/src/mbc/access-hook.test.tsx`:

<!-- prettier-ignore -->
```tsx
import { MbcApiError } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { useMasterAccess } from './hooks'

const SYSTEMS = [
  { id: 'app-a', label: 'App A' },
  { id: 'shared', label: '共通' },
]
const GRANTS = {
  enabled: true,
  grants: [{ systemId: 'app-a', settingCode: '*', read: true, write: true }],
}

const wrap = (client: ReturnType<typeof createFakeClient>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MbcClientProvider client={client}>{children}</MbcClientProvider>
  }

describe('useMasterAccess', () => {
  it('asks nothing and gives no access without systems', () => {
    const client = createFakeClient()
    const { result } = renderHook(() => useMasterAccess(undefined), {
      wrapper: wrap(client),
    })
    expect(result.current.access).toBeUndefined()
    expect(client.get).not.toHaveBeenCalled()
  })

  it('is loading, not enabled, until the grants arrive', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(GRANTS)
    const { result } = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    expect(result.current.access).toMatchObject({
      enabled: false,
      loading: true,
      systems: SYSTEMS,
    })
    await waitFor(() => expect(result.current.access?.enabled).toBe(true))
    expect(result.current.access?.loading).toBe(false)
    expect(result.current.access?.writableSystems).toEqual([SYSTEMS[0]])
    expect(client.get).toHaveBeenCalledWith('/api/master-access', {
      signal: undefined,
    })
  })

  it('shares one request between pages of the same client and tenant', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(GRANTS)
    const first = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() => expect(first.result.current.access?.enabled).toBe(true))
    first.unmount()
    const second = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() =>
      expect(second.result.current.access?.enabled).toBe(true)
    )
    expect(client.get).toHaveBeenCalledTimes(1)
  })

  it('gives the error and an access that is not enabled when the request fails, and asks again later', async () => {
    const client = createFakeClient()
    const failure = new MbcApiError(500, null)
    client.get.mockRejectedValueOnce(failure).mockResolvedValueOnce(GRANTS)
    const first = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() => expect(first.result.current.error).toBe(failure))
    expect(first.result.current.access).toMatchObject({
      enabled: false,
      loading: false,
    })
    expect(first.result.current.access?.canWrite('app-b', 'X')).toBe(true)
    first.unmount()
    const second = renderHook(() => useMasterAccess(SYSTEMS), {
      wrapper: wrap(client),
    })
    await waitFor(() =>
      expect(second.result.current.access?.enabled).toBe(true)
    )
    expect(client.get).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run packages/master-web/src/mbc/access-hook.test.tsx`
Expected: FAIL, because `useMasterAccess` is not exported (`is not a function`).

- [ ] **Step 3: Implement** as in Interfaces. Memoise the returned access on `JSON.stringify(systems ?? null)`, the answer and the error, so a host passing a new array literal on each render does not change it.

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run packages/master-web/src/mbc packages/master-web/test/exports.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): read the caller's grants once for the pages"
```

### Task 3: Settings list: system filter, column and create

**Files:**

- Create: `packages/master-web/src/list/system-column.tsx`
- Modify: `packages/master-web/src/settings/master-setting-list.tsx`
- Test: `packages/master-web/src/settings/master-setting-list.test.tsx`

**Interfaces:**

- Consumes: `MasterAccess`, `OPEN_ACCESS`, `systemLabel` (S1); `masterMessages.access` (Task 1).
- Produces:
  - `systemColumn<T extends { systemId?: string }>(access: MasterAccess, header: string): DataTableColumn<T>`, with id `'systemId'`, width `'15%'`, and a cell of `<div className="mbc:px-4">{systemLabel(access.systems, row.systemId)}</div>`.
  - `MasterSettingListProps.access?: MasterAccess`, default `OPEN_ACCESS`.
- Behaviour with `access.enabled`:
  - A fourth search row: a `Label` "システム" for `${id}-system`, and a `Select` whose `SelectTrigger` has that id. It offers "すべて" followed by `access.systems`. Radix `Select` takes no empty value, so "すべて" uses the sentinel value `'\u0000all'` and maps to `''`.
  - The filter is kept in the draft filters with the other inputs, and it applies on 検索.
  - The system column comes last.
  - Search and clear report `systemId` **only** when enabled. Without access, the reported state has exactly the keys it had before.
  - Create and the import dialog are shown only when `!access.enabled || access.writableSystems.length > 0`.
  - While `access.loading`, create is a disabled `<Button type="button" disabled>` with the same label, and the import dialog gets `disabled`.

- [ ] **Step 1: Write the failing tests.** In `master-setting-list.test.tsx`, add `import { masterAccess, OPEN_ACCESS } from '../core/access'` and append:

<!-- prettier-ignore -->
```tsx
describe('MasterSettingList with access', () => {
  const systems = [
    { id: 'app-a', label: 'App A' },
    { id: 'shared', label: '共通' },
  ]
  const grant = (systemId: string, write: boolean) => ({
    systemId,
    settingCode: '*',
    read: true,
    write,
  })
  const rows = [
    { ...SETTING_ROWS[0]!, systemId: 'app-a' },
    { ...SETTING_ROWS[1]! },
  ]

  it('shows no system filter or column without access, and keeps the state’s shape', async () => {
    // A host's own state, written before systemId existed.
    const { onStateChange, props } = setup({
      access: OPEN_ACCESS,
      state: { page: 1, pageSize: 20, code: '', name: '', keyword: '' },
    })
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'システム' })).toBeNull()
    await userEvent.type(screen.getByLabelText('コード'), 'P{Enter}')
    expect(last(onStateChange)).toEqual({ ...props.state, code: 'P', page: 1 })
    expect(last(onStateChange)).not.toHaveProperty('systemId')
  })

  it('filters by system and shows each row’s system, shared when it has none', async () => {
    const { onStateChange, props } = setup({
      items: rows,
      access: masterAccess(
        { enabled: true, grants: [grant('*', true)] },
        systems
      ),
    })
    const table = screen.getByRole('table', { name: 'マスター設定一覧' })
    expect(
      within(table).getByRole('columnheader', { name: 'システム' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: 'App A' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: '共通' })
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'システム' }))
    await userEvent.click(await screen.findByRole('option', { name: 'App A' }))
    await userEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(last(onStateChange)).toEqual({
      ...props.state,
      systemId: 'app-a',
      page: 1,
    })
    await userEvent.click(screen.getByRole('button', { name: 'クリア' }))
    expect(last(onStateChange)).toEqual({
      ...props.state,
      systemId: '',
      page: 1,
    })
  })

  it('hides create and import when no system is writable', () => {
    setup({
      onImport: async () => {},
      access: masterAccess(
        { enabled: true, grants: [grant('*', false)] },
        systems
      ),
    })
    expect(screen.queryByRole('link', { name: '新規作成' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'JSONエディタ' })).toBeNull()
  })

  it('disables create and import while the grants load', () => {
    setup({
      onImport: async () => {},
      access: { ...OPEN_ACCESS, loading: true, systems },
    })
    expect(screen.getByRole('button', { name: '新規作成' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'JSONエディタ' })).toBeDisabled()
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
  })
})

it('has no axe violations with access and renders on the server', async () => {
  const props: MasterSettingListProps = {
    items: [{ ...SETTING_ROWS[0]!, systemId: 'app-a' }],
    total: 1,
    state: initialSettingListState(),
    onStateChange: () => {},
    routing,
    onImport: async () => {},
    access: masterAccess(
      {
        enabled: true,
        grants: [{ systemId: '*', settingCode: '*', read: true, write: true }],
      },
      [{ id: 'app-a', label: 'App A' }]
    ),
  }
  render(
    <main>
      <MasterSettingList {...props} />
    </main>
  )
  const result = await axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  })
  expect(result.violations.map((violation) => violation.id)).toEqual([])
  expect(renderToString(<MasterSettingList {...props} />)).toContain('App A')
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/settings/master-setting-list.test.tsx`
Expected: FAIL. There is no `システム` combobox or column, create is shown without a writable system, and the loading state is not disabled.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run to see them pass**

Run: `pnpm vitest run packages/master-web/src/settings/master-setting-list.test.tsx`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): filter settings by system and offer create by access"
```

### Task 4: Data list: system column and create

**Files:**

- Modify: `packages/master-web/src/data/master-data-list.tsx`
- Test: `packages/master-web/src/data/master-data-list.test.tsx`

**Interfaces:**

- Consumes: `systemColumn` (Task 3), `MasterAccess`, `OPEN_ACCESS` (S1).
- Produces: `MasterDataListProps.access?: MasterAccess`, default `OPEN_ACCESS`.
- Behaviour:
  - Build the columns once: today's `dataColumns(...)` call moves out of the JSX into a `columns` constant. With `access.enabled`, push `systemColumn(access, m.access.system)`.
  - There is no system filter (owner's decision).
  - Create and import need `access.canWrite(setting.systemId, settingCodeOf(setting))`, because a record's system is its setting's. While loading they are disabled, as in Task 3.

- [ ] **Step 1: Write the failing tests.** Add `import { masterAccess, OPEN_ACCESS } from '../core/access'` and append:

<!-- prettier-ignore -->
```tsx
describe('MasterDataList with access', () => {
  const systems = [
    { id: 'app-a', label: 'App A' },
    { id: 'shared', label: '共通' },
  ]
  const owned = (): MasterSetting => ({ ...setting(), systemId: 'app-a' })
  const access = (write: boolean) =>
    masterAccess(
      {
        enabled: true,
        grants: [
          { systemId: 'app-a', settingCode: 'PRODUCT', read: true, write },
        ],
      },
      systems
    )

  it('shows no system column without access', () => {
    setup({ access: OPEN_ACCESS })
    expect(screen.queryByRole('columnheader', { name: 'システム' })).toBeNull()
  })

  it('shows each record’s system, shared when it has none', () => {
    setup({
      setting: owned(),
      items: [{ ...DATA_ROWS[0]!, systemId: 'app-a' }, DATA_ROWS[1]!],
      access: access(true),
    })
    const table = screen.getByRole('table')
    expect(
      within(table).getByRole('columnheader', { name: 'システム' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: 'App A' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: '共通' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
  })

  it('offers create and import only with write access to the setting', () => {
    const { unmount } = setup({
      setting: owned(),
      onImport: async () => {},
      access: access(true),
    })
    expect(screen.getByRole('link', { name: '新規登録' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'JSONエディタ' })).toBeEnabled()
    unmount()
    setup({ setting: owned(), onImport: async () => {}, access: access(false) })
    expect(screen.queryByRole('link', { name: '新規登録' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'JSONエディタ' })).toBeNull()
  })

  it('checks a setting with no system as shared', () => {
    setup({ onImport: async () => {}, access: access(true) })
    expect(screen.queryByRole('link', { name: '新規登録' })).toBeNull()
  })

  it('disables create and import while the grants load', () => {
    setup({
      onImport: async () => {},
      access: { ...OPEN_ACCESS, loading: true, systems },
    })
    expect(screen.getByRole('button', { name: '新規登録' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'JSONエディタ' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/data/master-data-list.test.tsx`
Expected: FAIL. There is no system column, and create is shown without write access.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run to see them pass**

Run: `pnpm vitest run packages/master-web/src/data/master-data-list.test.tsx`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): show a record's system and offer create by access"
```

### Task 5: `systems` and `includeCommon` on the list pages

**Files:**

- Modify: `packages/master-web/src/mbc/page-parts.tsx`, `mbc/setting-pages.tsx`, `mbc/data-pages.tsx`, `mbc/index.ts`
- Test: `packages/master-web/src/mbc/setting-pages.test.tsx`, `packages/master-web/src/mbc/data-pages.test.tsx`

**Interfaces:**

- Consumes: `useMasterAccess`, `MasterListQueryOptions` (Task 2); the screens' `access` (Tasks 3–4).
- Produces:
  - `MbcPageProps.systems?: readonly SystemOption[]`. Doc comment: include `shared` to offer it; passing it turns on system scoping (backend v1.7+); without it nothing is asked. S2b reads it on the editors and copy pages.
  - `type MbcListPageProps = { includeCommon?: boolean }`, exported (type) from `mbc/index.ts`.
  - `MbcMasterSettingListPageProps` and `MbcMasterDataListPageProps` become `MbcPageProps & MbcListPageProps & { … }`.
  - Both list pages:
    - call `useMasterAccess(systems, { paths })`;
    - pass `access` to the screen;
    - report the access `error` with `useReport(error, onError)`;
    - pass `{ paths, includeCommon }` to their list hook.

- [ ] **Step 1: Write the failing tests.** Append to `mbc/setting-pages.test.tsx`:

<!-- prettier-ignore -->
```tsx
describe('MbcMasterSettingListPage with systems', () => {
  const systems = [{ id: 'app-a', label: 'App A' }]

  it('asks for no grants without systems', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(client, <MbcMasterSettingListPage routing={createRouting()} />)
    expect(await screen.findByRole('link', { name: 'PRODUCT' })).toBeVisible()
    expect(client.get.mock.calls.map(([path]) => path)).not.toContain(
      '/api/master-access'
    )
  })

  it('reads the grants and filters by system', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-access': {
        enabled: true,
        grants: [
          { systemId: 'app-a', settingCode: '*', read: true, write: true },
        ],
      },
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(
      client,
      <MbcMasterSettingListPage routing={createRouting()} systems={systems} />
    )
    await userEvent.click(
      await screen.findByRole('combobox', { name: 'システム' })
    )
    await userEvent.click(await screen.findByRole('option', { name: 'App A' }))
    await userEvent.click(button('検索'))
    await waitFor(() =>
      expect(client.get.mock.calls.at(-1)?.[1].query.systemId).toBe('app-a')
    )
    expect(screen.getByRole('link', { name: '新規作成' })).toBeVisible()
  })

  it('reports a failed grants request and works as before', async () => {
    const client = createFakeClient()
    const onError = vi.fn()
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(
      client,
      <MbcMasterSettingListPage
        routing={createRouting()}
        systems={systems}
        onError={onError}
      />
    )
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(await screen.findByRole('link', { name: '新規作成' })).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
  })

  it('includes the common tenant’s rows when asked', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(
      client,
      <MbcMasterSettingListPage routing={createRouting()} includeCommon />
    )
    await waitFor(() =>
      expect(client.get.mock.calls.at(-1)?.[1].query.includeCommon).toBe(true)
    )
  })
})
```

Append to `mbc/data-pages.test.tsx`:

<!-- prettier-ignore -->
```tsx
describe('MbcMasterDataListPage with systems', () => {
  it('offers create only with write access to the setting, and includes common rows when asked', async () => {
    const client = createFakeClient()
    serveGets(client, {
      [settingPath]: { ...(V0_SETTING as object), systemId: 'app-a' },
      '/api/master-access': {
        enabled: true,
        grants: [
          { systemId: 'app-a', settingCode: '*', read: true, write: false },
        ],
      },
      '/api/master-data/list': () => ({ items: DATA_ROWS, total: 2 }),
    })
    renderPage(
      client,
      <MbcMasterDataListPage
        routing={createRouting()}
        settingId={SETTING_ID}
        systems={[{ id: 'app-a', label: 'App A' }]}
        includeCommon
      />
    )
    expect(
      await screen.findByRole('columnheader', { name: 'システム' })
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: '新規登録' })).toBeNull()
    expect(
      client.get.mock.calls.find(
        ([path]) => path === '/api/master-data/list'
      )?.[1].query.includeCommon
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/mbc/setting-pages.test.tsx packages/master-web/src/mbc/data-pages.test.tsx`
Expected: FAIL. The pages ignore `systems` and `includeCommon`, so there is no `システム` combobox or column and no `includeCommon` in the query.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run the gate**

Run: `pnpm verify`
Expected: exit 0. The prototype of S1 plus this plan ends with 1117 tests passing repo-wide.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): take systems and includeCommon on the list pages"
```

### Hand-back

Do not merge. Report the branch name, `git log --oneline main..`, and the last lines of `pnpm verify`. List anything you did differently from this plan, and why.
