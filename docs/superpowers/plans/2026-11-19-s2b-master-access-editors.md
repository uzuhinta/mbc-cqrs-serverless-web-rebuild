# S2b: master-web access in the editors, copy and common rows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** With access enabled:

- A new setting chooses its system, and a stored one shows it.
- The editors and the copy request form offer writes only where the grants allow, and they explain refusals.
- With `includeCommon`, the list pages mark common-tenant rows "共通".

Without `systems`, nothing changes. The one exception is that a refused copy now says "no permission".

**Architecture:** The settings editor, data editor and copy request form each take an optional `access` prop, which defaults to `OPEN_ACCESS`, and gate their actions with it. They use S2a's `refusalOf` hint through `failureOf`. The `/mbc` editor and copy request pages call S2a's `useMasterAccess(systems)`. A small `CommonMark` badge marks rows of another tenant.

**Tech Stack:** TypeScript, React 18/19, ui-web (`Select`, `Badge`, `Field`), Vitest with Testing Library and axe. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-master-system-scoping-design.md` (sections "Screens": the editor and copy rows, "Common rows with includeCommon", and "Error messages").

## Orientation

- **Prerequisites:** S1 and S2a are merged:
  - `docs/superpowers/plans/2026-11-19-s1-master-access-core.md`
  - `docs/superpowers/plans/2026-11-19-s2a-master-access-lists.md`

  This plan uses:
  - `masterAccess`, `OPEN_ACCESS`, `systemLabel`, `MasterAccess` (`core/access`)
  - `settingCodeOf` (`core/payload`)
  - `MasterSetting.systemId`, `MasterData.systemId`, and `MasterDataListItem.tenantCode` (S1)
  - `failureOf(reason, title, t, refusal?)` (`form/failure`)
  - the `masterMessages.access` block
  - `useMasterAccess` and `MbcPageProps.systems` (S2a)
  - `MbcListPageProps.includeCommon` (S2a)

- Repo `lib-web/rebuild`. Work on a branch from `main`, e.g. `feat/master-access-editors`, in a worktree.
- Toolchain: `eval "$(fnm env)"; fnm use 24.13.0`, then `pnpm install --frozen-lockfile` and `pnpm build`. On "Cannot find native binding", delete `node_modules` (root, `packages/*`, `apps/*`) and install again under Node 24.
- Both editors already open **another tenant's** row read-only. They compare `tenantCode` through `isSameTenant`, show `t.readOnly` and a way back, and hide every action. The common rows of `includeCommon` go through that path unchanged. This plan adds a second reason for read-only: no write grant.

## Global Constraints

- Without `access` (or with `OPEN_ACCESS`), every screen renders, sends and validates exactly as before. A create body has no `systemId` key.
- Read-only for lack of a grant shows `m.access.permissionDenied` in place of `t.readOnly`. Another tenant's row keeps `t.readOnly`, even when grants would allow it.
- While `access.loading`, these are **disabled**: Edit, Save, Delete, Restore and the copy request's submit. The copy request link and the stored setting's system label are not shown yet.
- The copy request (link and submit) needs `access.canCopyAll`, and also `access.canWrite(setting.systemId, settingCodeOf(setting))`. The copy results link stays under `canCopy` alone, even when the setting is read-only for lack of a grant.
- A copy failure always uses `{ enabled: true, permissionDenied }` as its refusal texts. Copy needs `system_admin` with or without access rules.
- No product, client or host names (use `app-a`, `app-b`, `shared`).
- Commit trailer on every commit:
  ```
  Co-Authored-By: <your agent identity>
  Claude-Session: https://claude.ai/code/session_011KPZCcUnsRe8xry6DPcPHW
  ```
- Gate before hand-back: `pnpm verify`.

## Review Focus

1. The grants arrive after the create form opened, and exactly one system is writable. It is preselected then, not only when known at mount (Task 1: the editor derives the choice as `chosen || onlySystem` on each render; the Task 5 page test `creates a setting in the only writable system` covers the late arrival).
2. Without access, a create sends no `systemId` key at all, not `systemId: ''` (Task 1 `sends no systemId without access`).
3. A user who may read but not write a setting still reaches its copy results (Task 1 `opens a setting it may not write read-only, keeping the copy results`).
4. A record whose own `systemId` differs from what the setting would give is checked against the record's system when editing. A new record is checked against the setting's (Task 2 `checks a new record against its setting’s system`, `checks a record with no system as shared`).
5. A refused copy from a host that never passed `systems` still says "no permission", not the generic hint (Task 3 `explains a refused copy even without access`).

---

### Task 1: Settings editor: system, write grant, copy link

**Files:**

- Modify: `packages/master-web/src/settings/master-setting-editor.tsx`
- Test: `packages/master-web/src/settings/master-setting-editor.test.tsx`

**Interfaces:**

- Produces: `MasterSettingEditorProps.access?: MasterAccess`, default `OPEN_ACCESS`.
- Behaviour in `EditorBody`:
  - `ownTenant`: today's `owned` expression, renamed.
  - `permitted`:
    - on create: `!access.enabled || access.writableSystems.length > 0`;
    - on edit: `access.canWrite(setting?.systemId, setting ? settingCodeOf(setting) : '')`.
  - `owned = ownTenant && permitted`. Every existing use of `owned` stays.
  - `waiting = access.loading`. It disables Edit, Save and Delete, and `save` returns early while it is true.
  - System choice, on create with `access.enabled` only:
    - State `systemId` starts at `''`.
    - `onlySystem` is the id when `writableSystems` has exactly one entry, else `''`.
    - `chosenSystem = systemId || onlySystem`.
    - The field is a `Field` (`invalid` when `errors.systemId` is set) with `FieldLabel` "システム" plus `RequiredMark`. Inside it goes a `Select` with `value={chosenSystem || undefined}`, `SelectTrigger aria-required`, `SelectValue placeholder={m.access.chooseSystem}`, and one `SelectItem` per writable system. A `FieldError` follows.
    - The field goes right after the name field.
    - On submit, a missing choice gives `errors.systemId = m.validation.required`. It counts as a refused submit: the existing `attempts` focus logic runs, and the code check and save are skipped.
    - The body is `{ ...toSettingPayload(…create…), systemId: chosenSystem }`.
  - On edit with `access.enabled`, the system label shows instead: a `div` holding a `span` ("システム") and a `p` with `systemLabel(access.systems, setting?.systemId)`. It has no label element and no control.
  - The JSON dialog does not touch the system choice, because the setting JSON has no `systemId`. This is a deliberate simplification of the spec's JSON line; note it in the hand-back.
  - Copy request link: shown only when `canCopy && setting && access.canCopyAll && !waiting`. The results link stays under `canCopy && setting`.
  - In the read-only branch, when `ownTenant && canCopy && setting`, show the copy results link before the text. The text is `ownTenant ? m.access.permissionDenied : t.readOnly`.
  - `fail` passes `{ enabled: access.enabled, permissionDenied: m.access.permissionDenied }` to `failureOf`.

- [ ] **Step 1: Write the failing tests.** Add the imports `MbcApiError` (`@mbc-cqrs-serverless/client-web`) and `masterAccess, OPEN_ACCESS` (`../core/access`), then append:

<!-- prettier-ignore -->
```tsx
describe('MasterSettingEditor with access', () => {
  const systems = [
    { id: 'app-a', label: 'App A' },
    { id: 'app-b', label: 'App B' },
    { id: 'shared', label: '共通' },
  ]
  const access = (
    grants: { systemId: string; settingCode: string; write: boolean }[]
  ) =>
    masterAccess(
      {
        enabled: true,
        grants: grants.map((grant) => ({ ...grant, read: true })),
      },
      systems
    )
  const owned = (): MasterSetting => ({ ...stored(), systemId: 'app-a' })

  it('creates with a chosen system, offering only writable ones', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      access: access([
        { systemId: 'app-a', settingCode: '*', write: true },
        { systemId: 'app-b', settingCode: 'ONE', write: true },
        { systemId: 'shared', settingCode: '*', write: false },
      ]),
    })
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'システム' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'システム' }))
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['App A', 'App B'])
    await userEvent.click(screen.getByRole('option', { name: 'App B' }))
    await userEvent.click(button('保存'))
    expect(lastBody(onSave)).toMatchObject({ code: 'NEW', systemId: 'app-b' })
  })

  it('preselects the only writable system', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      access: access([{ systemId: 'app-a', settingCode: '*', write: true }]),
    })
    expect(
      screen.getByRole('combobox', { name: 'システム' })
    ).toHaveTextContent('App A')
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(lastBody(onSave)).toMatchObject({ systemId: 'app-a' })
  })

  it('sends no systemId without access', async () => {
    const { onSave } = setup({ mode: 'create', setting: undefined })
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(lastBody(onSave)).not.toHaveProperty('systemId')
  })

  it('shows a stored setting’s system and edits it with its write grant', () => {
    setup({
      setting: owned(),
      onDelete: async () => {},
      canCopy: true,
      access: access([{ systemId: '*', settingCode: '*', write: true }]),
    })
    expect(screen.getByText('App A')).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
    expect(button('編集')).toBeEnabled()
    expect(button('削除')).toBeEnabled()
    expect(screen.getByRole('link', { name: 'テナントへコピー' })).toBeVisible()
  })

  it('opens a setting it may not write read-only, keeping the copy results', () => {
    setup({
      setting: owned(),
      onDelete: async () => {},
      canCopy: true,
      access: access([{ systemId: 'app-b', settingCode: '*', write: true }]),
    })
    expect(screen.getByText('この操作を行う権限がありません。')).toBeVisible()
    for (const name of ['編集', '削除', '項目追加'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.queryByRole('link', { name: 'テナントへコピー' })).toBeNull()
    expect(screen.getByRole('link', { name: 'コピー結果を確認' })).toBeVisible()
  })

  it('still opens another tenant’s setting read-only for its tenant', () => {
    setup({
      setting: { ...owned(), tenantCode: 'common' },
      access: access([{ systemId: '*', settingCode: '*', write: true }]),
    })
    expect(
      screen.getByText('他のテナントの設定のため、編集できません。')
    ).toBeVisible()
  })

  it('offers the copy request only with a */* write grant', () => {
    setup({
      setting: owned(),
      canCopy: true,
      access: access([{ systemId: 'app-a', settingCode: '*', write: true }]),
    })
    expect(button('編集')).toBeEnabled()
    expect(screen.queryByRole('link', { name: 'テナントへコピー' })).toBeNull()
    expect(screen.getByRole('link', { name: 'コピー結果を確認' })).toBeVisible()
  })

  it('waits for the grants before editing', () => {
    setup({
      setting: owned(),
      onDelete: async () => {},
      canCopy: true,
      access: { ...OPEN_ACCESS, loading: true, systems },
    })
    expect(button('編集')).toBeDisabled()
    expect(button('削除')).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'テナントへコピー' })).toBeNull()
    expect(screen.queryByText('App A')).toBeNull()
  })

  it('explains a refused save', async () => {
    const onSave = vi
      .fn<MasterSettingEditorProps['onSave']>()
      .mockRejectedValueOnce(new MbcApiError(403, {}))
      .mockRejectedValueOnce(
        new MbcApiError(400, { message: 'systemId conflicts' })
      )
    setup({
      setting: owned(),
      onSave,
      access: access([{ systemId: 'app-a', settingCode: '*', write: true }]),
    })
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'この操作を行う権限がありません。'
    )
    await userEvent.click(button('保存'))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('systemId conflicts')
    )
  })

  it('has no axe violations when creating with access', async () => {
    setup({
      mode: 'create',
      setting: undefined,
      access: access([{ systemId: '*', settingCode: '*', write: true }]),
    })
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/master-web/src/settings/master-setting-editor.test.tsx`
Expected: FAIL. There is no `システム` combobox or system label, the editor is not read-only without a grant, and the refusal hint is not shown.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run packages/master-web/src/settings`
Expected: PASS (30 tests in the editor file).

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): choose and respect a setting's system in the editor"
```

### Task 2: Data editor: write grant

**Files:**

- Modify: `packages/master-web/src/data/master-data-editor.tsx`
- Test: `packages/master-web/src/data/master-data-editor.test.tsx`

**Interfaces:**

- Produces: `MasterDataEditorProps.access?: MasterAccess`, default `OPEN_ACCESS`.
- Behaviour:
  - `ownTenant` is today's `owned`, renamed.
  - `permitted = access.canWrite(mode === 'edit' ? data?.systemId : setting.systemId, settingCodeOf(setting))`.
  - `owned = ownTenant && permitted`.
  - `waiting = access.loading` disables Edit, Save (登録), Delete and Restore, and makes `save` return early.
  - Both `failureOf` calls pass `{ enabled: access.enabled, permissionDenied: m.access.permissionDenied }`.
  - The read-only text is `ownTenant ? m.access.permissionDenied : t.readOnly`.
  - There is no system field (spec).

- [ ] **Step 1: Write the failing tests.** Import `MbcApiError` next to `createMbcClient`, and add `import { masterAccess, OPEN_ACCESS } from '../core/access'`. Then append:

<!-- prettier-ignore -->
```tsx
describe('MasterDataEditor with access', () => {
  const systems = [{ id: 'app-a', label: 'App A' }]
  const access = (systemId: string, write: boolean) =>
    masterAccess(
      {
        enabled: true,
        grants: [{ systemId, settingCode: 'PRODUCT', read: true, write }],
      },
      systems
    )
  const ownedRecord = (): MasterData => ({ ...record(), systemId: 'app-a' })

  it('edits, deletes and restores a record with its system’s write grant', () => {
    setup({
      data: ownedRecord(),
      onDelete: async () => {},
      access: access('app-a', true),
    })
    expect(button('編集')).toBeEnabled()
    expect(button('削除')).toBeEnabled()
  })

  it('opens a record it may not write read-only with the permission text', () => {
    setup({
      data: ownedRecord(),
      onDelete: async () => {},
      access: access('app-a', false),
    })
    expect(screen.getByText('この操作を行う権限がありません。')).toBeVisible()
    for (const name of ['編集', '削除'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(input('価格')).toBeDisabled()
  })

  it('checks a new record against its setting’s system', () => {
    setup({
      mode: 'create',
      data: undefined,
      setting: { ...setting(), systemId: 'app-a' },
      access: access('app-a', true),
    })
    expect(button('登録')).toBeEnabled()
  })

  it('checks a record with no system as shared', () => {
    setup({ access: access('app-a', true) })
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })

  it('waits for the grants before editing', () => {
    setup({
      data: ownedRecord(),
      onDelete: async () => {},
      access: { ...OPEN_ACCESS, loading: true, systems },
    })
    expect(button('編集')).toBeDisabled()
    expect(button('削除')).toBeDisabled()
  })

  it('explains a refused delete', async () => {
    const onDelete = vi.fn(async () => {
      throw new MbcApiError(403, {})
    })
    setup({ data: ownedRecord(), onDelete, access: access('app-a', true) })
    await userEvent.click(button('削除'))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '削除',
      })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'この操作を行う権限がありません。'
    )
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/data/master-data-editor.test.tsx`
Expected: FAIL. Edit is offered without a grant, and nothing waits for the grants.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run to see them pass**

Run: `pnpm vitest run packages/master-web/src/data/master-data-editor.test.tsx`
Expected: PASS (31 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): write a record only with its system's grant"
```

### Task 3: Copy request form: copy grant and refusals

**Files:**

- Modify: `packages/master-web/src/copy/master-copy-request-form.tsx`
- Test: `packages/master-web/src/copy/copy-request-form.test.tsx`

**Interfaces:**

- Produces: `MasterCopyRequestFormProps.access?: MasterAccess`, default `OPEN_ACCESS`.
- Behaviour:
  - `allowed = access.canCopyAll && access.canWrite(setting.systemId, settingCodeOf(setting))`.
  - When `allowed`, the submit button shows as today, with `disabled={access.loading}`.
  - Otherwise it is replaced by `<p className="mbc:text-muted-foreground mbc:text-sm">{m.access.permissionDenied}</p>`.
  - The failure uses `failureOf(reason, t.failed, t, { enabled: true, permissionDenied: m.access.permissionDenied })`, with a comment saying why it is always on.

- [ ] **Step 1: Write the failing tests.** Import `MbcApiError` from `@mbc-cqrs-serverless/client-web`, and `masterAccess, OPEN_ACCESS` from `../core/access`. Then append:

<!-- prettier-ignore -->
```tsx
describe('MasterCopyRequestForm with access', () => {
  const systems = [{ id: 'app-a', label: 'App A' }]
  const access = (systemId: string, settingCode: string) =>
    masterAccess(
      {
        enabled: true,
        grants: [{ systemId, settingCode, read: true, write: true }],
      },
      systems
    )

  it('offers the request with a */* write grant', () => {
    setup({ access: access('*', '*') })
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeEnabled()
  })

  it('offers no request without a */* write grant, and says why', () => {
    setup({ access: access('*', 'PRODUCT') })
    expect(screen.queryByRole('button', { name: 'コピー登録' })).toBeNull()
    expect(screen.getByText('この操作を行う権限がありません。')).toBeVisible()
  })

  it('waits for the grants before sending', () => {
    setup({ access: { ...OPEN_ACCESS, loading: true, systems } })
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeDisabled()
  })

  it('explains a refused copy even without access', async () => {
    setup({
      onRequestCopy: async () => {
        throw new MbcApiError(403, {})
      },
    })
    await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'この操作を行う権限がありません。'
    )
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/copy/copy-request-form.test.tsx`
Expected: FAIL. Submit is offered without a `*`/`*` grant, and a 403 shows the generic hint.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run to see them pass**

Run: `pnpm vitest run packages/master-web/src/copy`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): request a copy only with the copy grant"
```

### Task 4: Mark common-tenant rows

**Files:**

- Create: `packages/master-web/src/list/common-mark.tsx`, `packages/master-web/src/list/common-mark.test.tsx`
- Modify: `packages/master-web/src/settings/master-setting-list.tsx`, `packages/master-web/src/data/master-data-list.tsx`
- Test: `settings/master-setting-list.test.tsx`, `data/master-data-list.test.tsx`

**Interfaces:**

- Produces:
  - `CommonMark({ rowTenant, tenantCode }: { rowTenant: string | undefined; tenantCode: string | undefined })`. It renders `null` when either value is `undefined` or `isSameTenant(rowTenant, tenantCode)`. Otherwise it renders `<Badge variant="secondary" className="mbc:ml-2">{m.access.common}</Badge>`.
  - `MasterSettingListProps.includeCommon?: boolean` and `MasterDataListProps.includeCommon?: boolean`, default `false`, documented as "Rows of another tenant are marked as common (`/mbc`'s `includeCommon`)". When it is true, the code cell renders `<CommonMark rowTenant={row.tenantCode} tenantCode={tenantCode} />` after the link, outside it, so the link's name stays the code.

- [ ] **Step 1: Write the failing tests.** Create `list/common-mark.test.tsx`:

<!-- prettier-ignore -->
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CommonMark } from './common-mark'

describe('CommonMark', () => {
  it('marks another tenant’s row as common', () => {
    render(<CommonMark rowTenant="common" tenantCode="tenant-a" />)
    expect(screen.getByText('共通')).toBeVisible()
  })

  it('marks nothing for the page’s own tenant in any case, or without tenants', () => {
    const { container, rerender } = render(
      <CommonMark rowTenant="tenant-a" tenantCode="TENANT-A" />
    )
    expect(container).toBeEmptyDOMElement()
    rerender(<CommonMark rowTenant={undefined} tenantCode="tenant-a" />)
    expect(container).toBeEmptyDOMElement()
    rerender(<CommonMark rowTenant="common" tenantCode={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

Append to `settings/master-setting-list.test.tsx`:

<!-- prettier-ignore -->
```tsx
it('marks the common tenant’s rows only with includeCommon', () => {
  const props: MasterSettingListProps = {
    items: SETTING_ROWS,
    total: 2,
    state: initialSettingListState(),
    onStateChange: () => {},
    routing,
    tenantCode: 'tenant-a',
  }
  const { rerender } = render(<MasterSettingList {...props} />)
  expect(screen.queryByText('共通')).toBeNull()
  rerender(<MasterSettingList {...props} includeCommon />)
  const table = screen.getByRole('table', { name: 'マスター設定一覧' })
  expect(within(table).getAllByText('共通')).toHaveLength(1)
  expect(within(table).getByRole('link', { name: 'PREF' })).toBeVisible()
})
```

Append to `data/master-data-list.test.tsx`:

<!-- prettier-ignore -->
```tsx
it('marks the common tenant’s records only with includeCommon', () => {
  const items = [
    { ...DATA_ROWS[0]!, tenantCode: 'tenant-a' },
    { ...DATA_ROWS[1]!, tenantCode: 'common' },
  ]
  const { rerender } = render(
    <MasterDataList
      setting={setting()}
      items={items}
      total={2}
      state={initialDataListState()}
      onStateChange={() => {}}
      routing={routing}
      tenantCode="tenant-a"
    />
  )
  expect(screen.queryByText('共通')).toBeNull()
  rerender(
    <MasterDataList
      setting={setting()}
      items={items}
      total={2}
      state={initialDataListState()}
      onStateChange={() => {}}
      routing={routing}
      tenantCode="tenant-a"
      includeCommon
    />
  )
  expect(screen.getAllByText('共通')).toHaveLength(1)
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/list packages/master-web/src/settings/master-setting-list.test.tsx packages/master-web/src/data/master-data-list.test.tsx`
Expected: FAIL. `./common-mark` does not resolve, and no `共通` appears with `includeCommon`.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run to see them pass.** Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): mark common-tenant rows with includeCommon"
```

### Task 5: Wire the pages

**Files:**

- Modify: `packages/master-web/src/mbc/setting-pages.tsx`, `mbc/data-pages.tsx`, `mbc/copy-pages.tsx`
- Test: `mbc/setting-pages.test.tsx`, `mbc/data-pages.test.tsx`, `mbc/copy-pages.test.tsx`

**Interfaces:**

- Consumes: `useMasterAccess` (S2a), and the screens' `access` and `includeCommon` (Tasks 1–4).
- Changes:
  - `MbcMasterSettingEditorPage`, `MbcMasterDataEditorPage` and `MbcMasterCopyRequestPage` read `systems` from their props (it is already in `MbcPageProps`). Each one:
    - calls `useMasterAccess(systems, { paths })`;
    - reports its `error` with `useReport`;
    - passes `access` to its screen.
  - The two list pages also pass `includeCommon={includeCommon}` to their screens.
  - The copy task list and detail pages do not change: results stay readable.

- [ ] **Step 1: Write the failing tests.** Append to `mbc/setting-pages.test.tsx`:

<!-- prettier-ignore -->
```tsx
describe('MbcMasterSettingEditorPage with systems', () => {
  it('creates a setting in the only writable system', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-data/list': sequences,
      '/api/master-access': {
        enabled: true,
        grants: [
          { systemId: 'app-a', settingCode: '*', read: true, write: true },
        ],
      },
    })
    client.post.mockResolvedValue(false)
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={createRouting()}
        systems={[
          { id: 'app-a', label: 'App A' },
          { id: 'shared', label: '共通' },
        ]}
      />
    )
    expect(
      await screen.findByRole('combobox', { name: 'システム' })
    ).toHaveTextContent('App A')
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    await waitFor(() =>
      expect(client.command.mock.calls[0]?.[0]).toMatchObject({
        path: '/api/master-setting',
        body: { code: 'NEW', systemId: 'app-a' },
      })
    )
  })
})
```

Append to `mbc/data-pages.test.tsx`:

<!-- prettier-ignore -->
```tsx
describe('MbcMasterDataEditorPage with systems', () => {
  it('opens a record it may not write read-only', async () => {
    const client = createFakeClient()
    serveGets(client, {
      [settingPath]: V0_SETTING,
      [dataPath]: { ...(V0_DATA as object), systemId: 'app-a' },
      '/api/master-access': {
        enabled: true,
        grants: [
          { systemId: 'app-a', settingCode: '*', read: true, write: false },
        ],
      },
    })
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        id={DATA_ID}
        systems={[{ id: 'app-a', label: 'App A' }]}
      />
    )
    expect(
      await screen.findByText('この操作を行う権限がありません。')
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })
})
```

Append to `mbc/copy-pages.test.tsx`:

<!-- prettier-ignore -->
```tsx
describe('MbcMasterCopyRequestPage with systems', () => {
  it('offers no request without a */* write grant', async () => {
    const client = createFakeClient()
    serveGets(client, {
      [settingPath]: V0_SETTING,
      '/api/master-data/list': { items: DATA_ROWS, total: 2 },
      '/api/master-access': {
        enabled: true,
        grants: [
          { systemId: 'shared', settingCode: '*', read: true, write: true },
        ],
      },
    })
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={createRouting()}
        settingId={SETTING_ID}
        loadTenants={async () => TENANTS}
        systems={[{ id: 'shared', label: '共通' }]}
      />
    )
    expect(
      await screen.findByText('この操作を行う権限がありません。')
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'コピー登録' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/mbc`
Expected: FAIL. The editor and copy pages ignore `systems`.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run the gate**

Run: `pnpm verify`
Expected: exit 0. The prototype of S1, S2a and this plan ends with 1144 tests passing repo-wide.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): take systems on the editor and copy pages"
```

### Hand-back

Do not merge. Report the branch name, `git log --oneline main..`, and the last lines of `pnpm verify`. List anything you did differently from this plan, and why.
