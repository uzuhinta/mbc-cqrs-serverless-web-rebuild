# S1: master-web access and key rules, core and API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give master-web's `core` and `/mbc` API everything the system-scoping screens need. That means the access rules, the backend's key rules, `systemId` on rows and bodies, `includeCommon`, and `GET /api/master-access`. No screen shows anything new yet.

**Architecture:** Pure functions in `packages/master-web/src/core` (`access.ts`, `keys.ts`, plus changes to `parse.ts`, `list.ts`, `bulk.ts`, `setting-form.ts`, `validate.ts`, `types.ts`), and additions to `createMasterApi` in `src/mbc/api.ts`. S2 (screens and `/mbc` pages) and S3 (bulk access pre-check, playground, docs) build on these names.

**Tech Stack:** TypeScript, React 18/19 library, zod 4, Vitest, pnpm workspace. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-master-system-scoping-design.md` (read "Backend contract", "Design → core" and "Design → /mbc API").

## Orientation

- Repo: `lib-web/rebuild` (pnpm monorepo). Work on a branch from `main`, e.g. `feat/master-access-core`, in a worktree.
- Toolchain: `eval "$(fnm env)"; fnm use 24.13.0` (Node 24.13.0, arm64). Then `pnpm install --frozen-lockfile`. If a build fails with "Cannot find native binding", `node_modules` came from another Node; delete `node_modules` (root, `packages/*`, `apps/*`) and install again.
- Build before testing: `pnpm build`. Tests of one file: `pnpm vitest run <path>`.
- `master-web` layers: `core/` is pure (no React); screens take props; `mbc/` connects them to the backend through `@mbc-cqrs-serverless/client-web`. `test/exports.test.tsx` pins every public export name.
- Nothing is published yet (all packages `0.0.0`, one first-release changeset). Do not add a changeset.

## Global Constraints

- A host that does not opt in sees no change: every new field is optional, and every new query parameter is sent only when given.
- The backend compares `systemId` and `settingCode` grants in **lower case**. A missing, `null` or empty `systemId` counts as `shared`.
- Key rules (backend v1.8, always on): no `#` or `@` in a setting code, a data `settingCode` or a data `code`. A setting code must not be `MASTER_SETTING`.
- Messages: ja `「#」と「@」は使用できません。`, `このコードは予約されています。`; en `The characters # and @ cannot be used.`, `This code is reserved.`
- No product, client or host names in code, tests, docs or commits (use `app-a`, `app-b`, `shared`).
- Commit trailer on every commit:
  ```
  Co-Authored-By: <your agent identity>
  Claude-Session: https://claude.ai/code/session_011KPZCcUnsRe8xry6DPcPHW
  ```
- Gate before hand-back: `pnpm verify` (format, lint, build, typecheck, all tests, package checks) passes.

## Review Focus

1. A list row with `systemId: null` (every RDS row of an untagged setting) reads as having no `systemId`, never as the string `"null"` (Task 5 test `reads list rows with a null systemId as shared…`).
2. A host's own `MasterSettingListState` literal without `systemId` still type-checks, and no `systemId` is sent for it (`systemId` is optional; Task 3, Task 5 `sends systemId and includeCommon only when given`).
3. An existing setting or record whose code already contains `#` can still be saved: the key rules run on create only (Task 2 tests `…on create, not on update` and `…on create only`).
4. A grant written as `App-A` matches a row stored as `app-a` (Task 1 test `compares systems and setting codes in lower case`).
5. A backend before v1.7 (404 on `/api/master-access`), or one answering `enabled: false` with leftover grants, reads as not enabled (Task 5 test `reads a missing route or an odd answer as not enabled`).

---

### Task 1: Access rules

**Files:**

- Create: `packages/master-web/src/core/access.ts`
- Modify: `packages/master-web/src/core/index.ts` (export), `packages/master-web/test/exports.test.tsx` (names)
- Test: `packages/master-web/src/core/access.test.ts`

**Interfaces:**

- Produces (all exported from `core/index.ts`):
  - `type SystemOption = { id: string; label: string }`
  - `type MasterAccessGrant = { systemId: string; settingCode: string; read: boolean; write: boolean }`
  - `type MasterAccessAnswer = { enabled: boolean; grants: readonly MasterAccessGrant[] }`
  - `type SystemIdValue = string | null | undefined`
  - `type MasterAccess = { enabled: boolean; loading: boolean; systems: readonly SystemOption[]; writableSystems: readonly SystemOption[]; canRead(systemId: SystemIdValue, settingCode: string): boolean; canWrite(systemId: SystemIdValue, settingCode: string): boolean; canCopyAll: boolean }`
  - `const SHARED_SYSTEM_ID = 'shared'`
  - `const OPEN_ACCESS: MasterAccess`: `enabled: false`, `loading: false`, `systems: []`, `writableSystems: []`, both checks always `true`, `canCopyAll: true`.
  - `masterAccess(answer: MasterAccessAnswer, systems: readonly SystemOption[]): MasterAccess`
  - `systemLabel(systems: readonly SystemOption[], systemId: SystemIdValue): string`

- [ ] **Step 1: Write the failing test** `packages/master-web/src/core/access.test.ts`:

<!-- prettier-ignore -->
```ts
import { describe, expect, it } from 'vitest'

import {
  masterAccess,
  OPEN_ACCESS,
  SHARED_SYSTEM_ID,
  systemLabel,
  type MasterAccessGrant,
} from './access'

const systems = [
  { id: 'app-a', label: 'App A' },
  { id: 'app-b', label: 'App B' },
  { id: SHARED_SYSTEM_ID, label: '共通' },
]
const grant = (
  systemId: string,
  settingCode: string,
  read: boolean,
  write: boolean
): MasterAccessGrant => ({ systemId, settingCode, read, write })

describe('masterAccess', () => {
  it('allows everything when not enabled', () => {
    const access = masterAccess({ enabled: false, grants: [] }, systems)
    expect(access.enabled).toBe(false)
    expect(access.canRead('app-a', 'X')).toBe(true)
    expect(access.canWrite(undefined, 'X')).toBe(true)
    expect(access.canCopyAll).toBe(true)
    expect(access.writableSystems).toEqual(systems)
  })

  it('OPEN_ACCESS allows everything and shows no systems', () => {
    expect(OPEN_ACCESS.enabled).toBe(false)
    expect(OPEN_ACCESS.loading).toBe(false)
    expect(OPEN_ACCESS.systems).toEqual([])
    expect(OPEN_ACCESS.canWrite('app-a', 'X')).toBe(true)
  })

  it('denies everything with no grants', () => {
    const access = masterAccess({ enabled: true, grants: [] }, systems)
    expect(access.canRead('app-a', 'X')).toBe(false)
    expect(access.canWrite('app-a', 'X')).toBe(false)
    expect(access.writableSystems).toEqual([])
    expect(access.canCopyAll).toBe(false)
  })

  it('matches * for the system and for the setting code', () => {
    const access = masterAccess(
      {
        enabled: true,
        grants: [
          grant('*', 'ROUTE', false, true),
          grant('app-b', '*', true, false),
        ],
      },
      systems
    )
    expect(access.canWrite('app-a', 'ROUTE')).toBe(true)
    expect(access.canWrite('app-a', 'OTHER')).toBe(false)
    expect(access.canRead('app-b', 'OTHER')).toBe(true)
    expect(access.canWrite('app-b', 'OTHER')).toBe(false)
  })

  it('counts a missing, null or empty systemId as shared', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('shared', '*', false, true)] },
      systems
    )
    expect(access.canWrite(undefined, 'X')).toBe(true)
    expect(access.canWrite(null, 'X')).toBe(true)
    expect(access.canWrite('', 'X')).toBe(true)
    expect(access.canWrite('app-a', 'X')).toBe(false)
  })

  it('lets write imply read', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('app-a', '*', false, true)] },
      systems
    )
    expect(access.canRead('app-a', 'X')).toBe(true)
  })

  it('compares systems and setting codes in lower case', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('App-A', 'Route', true, true)] },
      systems
    )
    expect(access.canWrite('app-a', 'ROUTE')).toBe(true)
    expect(access.canWrite('APP-A', 'route')).toBe(true)
    expect(access.writableSystems.map((s) => s.id)).toEqual(['app-a'])
  })

  it('lists a system with a write grant for any setting code as writable', () => {
    const access = masterAccess(
      {
        enabled: true,
        grants: [
          grant('app-a', 'ONE', false, true),
          grant('app-b', '*', true, false),
        ],
      },
      systems
    )
    expect(access.writableSystems.map((s) => s.id)).toEqual(['app-a'])
  })

  it('lists every system for a * write grant', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('*', 'X', false, true)] },
      systems
    )
    expect(access.writableSystems).toEqual(systems)
  })

  it('allows copy only with a */* write grant', () => {
    const only = (grants: MasterAccessGrant[]) =>
      masterAccess({ enabled: true, grants }, systems).canCopyAll
    expect(only([grant('*', '*', false, true)])).toBe(true)
    expect(only([grant('*', '*', true, false)])).toBe(false)
    expect(only([grant('app-a', '*', false, true)])).toBe(false)
    expect(only([grant('*', 'X', false, true)])).toBe(false)
  })
})

describe('systemLabel', () => {
  it('reads the label in lower case', () => {
    expect(systemLabel(systems, 'APP-A')).toBe('App A')
  })
  it('falls back to the id', () => {
    expect(systemLabel(systems, 'app-z')).toBe('app-z')
  })
  it('reads no owner as shared', () => {
    expect(systemLabel(systems, undefined)).toBe('共通')
    expect(systemLabel(systems, null)).toBe('共通')
    expect(systemLabel([], undefined)).toBe('shared')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run packages/master-web/src/core/access.test.ts`
Expected: FAIL, `Failed to resolve import "./access"`.

- [ ] **Step 3: Implement `core/access.ts`**

Rules the tests pin:

- Not enabled returns `{ ...OPEN_ACCESS, systems, writableSystems: systems }`.
- A grant matches when its value is `*`, or equal to the lower-cased value. The owner is `systemId.toLowerCase()`, or `shared` when `systemId` is falsy.
- A read is allowed by `read || write`.
- `writableSystems` keeps the systems that some `write` grant matches, for any setting code.
- `canCopyAll` needs a `write` grant whose `systemId` and `settingCode` are both literally `*`.
- `systemLabel` finds the label by lower-case id. Otherwise it returns `systemId`, or `shared` when that is falsy.

Write a one-line doc comment on each export.

- [ ] **Step 4: Export and pin the names**

In `core/index.ts`, add as the first export block:

```ts
export {
  masterAccess,
  OPEN_ACCESS,
  SHARED_SYSTEM_ID,
  systemLabel,
  type MasterAccess,
  type MasterAccessAnswer,
  type MasterAccessGrant,
  type SystemIdValue,
  type SystemOption,
} from './access'
```

In `test/exports.test.tsx`, add `'masterAccess'`, `'OPEN_ACCESS'`, `'SHARED_SYSTEM_ID'` and `'systemLabel'` to the `CORE` array. Order does not matter, because the test sorts.

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm vitest run packages/master-web/src/core/access.test.ts packages/master-web/test/exports.test.tsx`
Expected: PASS (13 tests in `access.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add packages/master-web/src/core/access.ts packages/master-web/src/core/access.test.ts packages/master-web/src/core/index.ts packages/master-web/test/exports.test.tsx
git commit -m "feat(master-web): add the master access rules"
```

### Task 2: Key rules in the editors' checks

**Files:**

- Create: `packages/master-web/src/core/keys.ts`, `packages/master-web/src/core/keys.test.ts`
- Modify: `core/errors.ts`, `core/setting-form.ts` (`validateSettingForm`), `core/validate.ts` (`validateMasterData`), `i18n/master-messages.ts` (`validation`), `settings/master-setting-editor.tsx` (one call), `core/index.ts`, `test/exports.test.tsx`
- Test: `core/keys.test.ts`, `core/setting-form.test.ts`, `core/validate.test.ts`

**Interfaces:**

- Produces:
  - `MasterError` gains `| { key: 'keyChars' } | { key: 'reserved' }`.
  - `MasterMessages['validation']` gains `keyChars: string` and `reserved: string` (texts from Global Constraints). `formatMasterError`'s default branch already handles keys without params, so it needs no change.
  - `const SETTING_KEY_PREFIX = 'MASTER_SETTING'`
  - `settingCodeError(code: string): MasterError | undefined`: `keyChars` when the code contains `#` or `@`, else `reserved` when it equals `MASTER_SETTING`, else `undefined`. It does not check emptiness.
  - `dataCodeError(code: string): MasterError | undefined`: `keyChars` when the code contains `#` or `@`.
  - `validateSettingForm(values: SettingFormValues, options?: { mode?: 'create' | 'update' })`. The default is `'create'`. On create, when the code has no `required`/`blank` error, the trimmed code is checked with `settingCodeError`.
  - `validateMasterData`: on create, a string `code` that passes `required`/`blank` is checked with `dataCodeError`. Skip `auto_number` and update as today.

- [ ] **Step 1: Write the failing tests**

`packages/master-web/src/core/keys.test.ts`:

<!-- prettier-ignore -->
```ts
import { describe, expect, it } from 'vitest'

import { dataCodeError, settingCodeError } from './keys'

describe('settingCodeError', () => {
  it.each(['a#b', 'a@b', '#', 'USER#u1#S1', 'S1@2'])(
    'rejects %s for its key characters',
    (code) => expect(settingCodeError(code)).toEqual({ key: 'keyChars' })
  )
  it('rejects the reserved MASTER_SETTING', () => {
    expect(settingCodeError('MASTER_SETTING')).toEqual({ key: 'reserved' })
  })
  it.each(['PRODUCT', 'master_setting', 'a-b_c.d'])('accepts %s', (code) =>
    expect(settingCodeError(code)).toBeUndefined()
  )
})

describe('dataCodeError', () => {
  it.each(['a#b', 'a@b'])('rejects %s', (code) =>
    expect(dataCodeError(code)).toEqual({ key: 'keyChars' })
  )
  it('accepts MASTER_SETTING as a data code', () => {
    expect(dataCodeError('MASTER_SETTING')).toBeUndefined()
  })
})
```

In `core/setting-form.test.ts`, inside `describe('validateSettingForm')`, after the existing `it`, add:

<!-- prettier-ignore -->
```ts
  it('rejects codes the backend cannot key on create, not on update', () => {
    const values = { code: ' a#b ', name: 'N', description: '', options: {} }
    expect(validateSettingForm(values)).toEqual({ code: { key: 'keyChars' } })
    expect(validateSettingForm({ ...values, code: 'MASTER_SETTING' })).toEqual({
      code: { key: 'reserved' },
    })
    expect(validateSettingForm(values, { mode: 'update' })).toEqual({})
  })
```

In `core/validate.test.ts`, inside `describe('validateMasterData')`, before `it('accepts a required switch that is off…`, add:

<!-- prettier-ignore -->
```ts
  it('rejects # and @ in a typed code on create only', () => {
    const fields = [codeField('string')]
    expect(
      validateMasterData(fields, { code: 'a#b' }, { mode: 'create' })
    ).toEqual({ code: { key: 'keyChars' } })
    expect(
      validateMasterData(fields, { code: 'a@b' }, { mode: 'create' })
    ).toEqual({ code: { key: 'keyChars' } })
    expect(
      validateMasterData(fields, { code: 'MASTER_SETTING' }, { mode: 'create' })
    ).toEqual({})
    expect(
      validateMasterData(fields, { code: 'a#b' }, { mode: 'update' })
    ).toEqual({})
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/master-web/src/core/keys.test.ts packages/master-web/src/core/setting-form.test.ts packages/master-web/src/core/validate.test.ts`
Expected: FAIL. `keys.test.ts` cannot resolve `./keys`. The new `validateSettingForm` and `validateMasterData` tests get `{}` where they expect `keyChars`/`reserved`.

- [ ] **Step 3: Implement**

- `core/keys.ts` with the three exports above, using one regular expression `/[#@]/`. Its doc comment says why: `#` joins key segments and `@` starts the version.
- `core/errors.ts`, the two `validation` message entries (type, `ja`, `en`), and the two validators as in Interfaces.
- `settings/master-setting-editor.tsx`, in `onSubmit`: replace `validateSettingForm(values)` with `validateSettingForm(values, { mode: mode === 'create' ? 'create' : 'update' })`. The editor's `mode` is `'create' | 'edit'`.
- `core/index.ts`: `export { dataCodeError, SETTING_KEY_PREFIX, settingCodeError } from './keys'`. Add the three names to `CORE` in `test/exports.test.tsx`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm vitest run packages/master-web/src/core packages/master-web/src/settings packages/master-web/src/i18n packages/master-web/test/exports.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): reject codes the backend cannot use as keys"
```

### Task 3: `systemId` on rows, bodies and the settings list state

**Files:**

- Modify: `core/types.ts`, `core/list.ts`, `core/parse.ts`, `core/setting-form.ts` (`MasterSettingCreateBody`), `core/index.ts`, `test/exports.test.tsx`
- Test: `core/parse.test.ts`, `core/list.test.ts`

**Interfaces:**

- Produces:
  - `systemId?: string` on `MasterSetting`, `MasterData`, `MasterSettingListItem` and `MasterDataListItem`. Doc comment: "The owning system; absent means `shared` (backend v1.7+)". `MasterDataListItem` also gains `tenantCode?: string`, which S2 needs to mark common rows.
  - `MasterSettingListState.systemId?: string`. It is **optional**, so hosts' own state literals keep compiling. `initialSettingListState()` returns `systemId: ''`. `MasterDataListState` does not change (spec: the data list has no system filter).
  - `MasterSettingCreateBody.systemId?: string`. The update body does not change.
  - `const SYSTEM_ATTRIBUTE = '__systemId'`
  - `publicRow<T>(row: T): T`. It returns non-objects unchanged. Otherwise it returns a copy that keeps `systemId` only when it is a non-empty string, and drops `attributes.__systemId` when present.
  - `parseMasterSetting` and `parseMasterData` run `publicRow` on their input before the schema.

- [ ] **Step 1: Write the failing tests**

In `core/list.test.ts`, the expected `initialSettingListState()` gains `systemId: ''`:

<!-- prettier-ignore -->
```ts
    expect(initialSettingListState()).toEqual({
      page: 1,
      pageSize: 20,
      code: '',
      name: '',
      keyword: '',
      systemId: '',
    })
```

In `core/parse.test.ts`, import `publicRow` next to the parsers, and append:

<!-- prettier-ignore -->
```ts
describe('publicRow', () => {
  it('keeps a string systemId and drops null or empty', () => {
    expect(publicRow({ id: 'a', systemId: 'app-a' })).toEqual({
      id: 'a',
      systemId: 'app-a',
    })
    expect(publicRow({ id: 'a', systemId: null })).not.toHaveProperty(
      'systemId'
    )
    expect(publicRow({ id: 'a', systemId: '' })).not.toHaveProperty('systemId')
  })

  it('drops the reserved owner attribute', () => {
    expect(
      publicRow({ id: 'a', attributes: { __systemId: 'x', keep: 1 } })
    ).toEqual({ id: 'a', attributes: { keep: 1 } })
  })

  it('returns what is not an object as it is', () => {
    expect(publicRow(null)).toBeNull()
    expect(publicRow('x')).toBe('x')
  })
})

describe('systemId on parsed rows', () => {
  type Row = Record<string, unknown> & { attributes: Record<string, unknown> }
  const v0Setting = V0_SETTING as Row
  const v0Data = V0_DATA as Row

  it('keeps a setting’s and a record’s owner and drops the reserved attribute', () => {
    const setting = parseMasterSetting({
      ...v0Setting,
      systemId: 'app-a',
      attributes: { ...v0Setting.attributes, __systemId: 'app-a' },
    })
    expect(setting.success && setting.data.systemId).toBe('app-a')
    expect(setting.success && setting.data.attributes).not.toHaveProperty(
      '__systemId'
    )
    const data = parseMasterData({ ...v0Data, systemId: null })
    expect(data.success && data.data).not.toHaveProperty('systemId')
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/master-web/src/core/parse.test.ts packages/master-web/src/core/list.test.ts`
Expected: FAIL. `publicRow` is not exported. The list state has no `systemId`.

- [ ] **Step 3: Implement** the Interfaces above. `publicRow` destructures `systemId` out and rebuilds `attributes` without the reserved key. It must not mutate its input. Export `publicRow` and `SYSTEM_ATTRIBUTE` from `core/index.ts`, and add both names to `CORE` in `test/exports.test.tsx`.

- [ ] **Step 4: Run the package's tests and typecheck**

Run: `pnpm vitest run packages/master-web && pnpm --filter ./packages/master-web exec tsc --noEmit -p .`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): read and send a setting's systemId"
```

### Task 4: Bulk import: setting `systemId` and key rules

**Files:**

- Modify: `core/bulk.ts`, `i18n/master-messages.ts` (`bulk`)
- Test: `core/bulk.test.ts`

**Interfaces:**

- Consumes: `settingCodeError` and `dataCodeError` (Task 2).
- Produces:
  - `BulkJsonItem.systemId?: string`, documented as "A setting's owning system (backend v1.7+); data items never carry one". Also `MappedSetting['value'].systemId?: string`.
  - `BulkError` gains `| { key: 'invalidCode'; index: number }`. `MasterMessages['bulk']` gains `invalidCode: string`:
    - ja `code と settingCode に「#」「@」は使用できません。「MASTER_SETTING」は設定コードに使えません。`
    - en `code and settingCode cannot contain # or @, and MASTER_SETTING cannot be a setting code.`
  - `mapResultToBulkItem` carries a mapped setting's `systemId` only when it is defined. The existing test's `toEqual` must keep passing.
  - `parseBulkJson` changes:
    - An unmapped item, or a mapped setting, whose `systemId` is present but not a string is invalid (`invalidItem` / `invalidMappedSetting`).
    - A data item (one with `settingCode`) loses `systemId`.
    - After the existing tenant check, an item with a bad key gets `invalidCode`: for a setting, `settingCodeError(code)`; for data, `settingCodeError(settingCode)` or `dataCodeError(code)`.

- [ ] **Step 1: Write the failing tests.** In `core/bulk.test.ts`, before `describe('bulkSampleJson')`, add:

<!-- prettier-ignore -->
```ts
describe('parseBulkJson: keys and systems (backend v1.8)', () => {
  it('refuses codes the backend cannot key, before anything is sent', () => {
    const text = JSON.stringify([
      { ...setting, code: 'a#b' },
      { ...setting, code: 'MASTER_SETTING' },
      { ...data, settingCode: 'S@1' },
      { ...data, code: 'D#1' },
      { ...data, settingCode: 'MASTER_SETTING' },
      { ...data, code: 'MASTER_SETTING' },
    ])
    expect(parseBulkJson(text, { screen: 'settings' })).toEqual({
      items: [{ ...data, code: 'MASTER_SETTING' }],
      errors: [0, 1, 2, 3, 4].map((index) => ({ key: 'invalidCode', index })),
    })
  })

  it('keeps a setting’s systemId and drops a record’s', () => {
    const text = JSON.stringify([
      { ...setting, systemId: 'app-a' },
      { ...data, systemId: 'app-a' },
    ])
    const { items, errors } = parseBulkJson(text, { screen: 'settings' })
    expect(errors).toEqual([])
    expect(items[0]).toEqual({ ...setting, systemId: 'app-a' })
    expect(items[1]).toEqual(data)
    expect(items[1]).not.toHaveProperty('systemId')
  })

  it('refuses a systemId that is not text', () => {
    const text = JSON.stringify([{ ...setting, systemId: 1 }])
    expect(parseBulkJson(text, { screen: 'settings' }).errors).toEqual([
      { key: 'invalidItem', index: 0 },
    ])
  })

  it('carries a mapped setting’s systemId', () => {
    expect(
      mapResultToBulkItem({
        kind: 'setting',
        value: { code: 'c', name: 'n', settingValue: {}, systemId: 'app-a' },
      })
    ).toMatchObject({ code: 'c', systemId: 'app-a' })
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/core/bulk.test.ts`
Expected: FAIL. Bad codes are accepted, and a data item keeps `systemId`.

- [ ] **Step 3: Implement** as in Interfaces. Keep the per-entry reporting style of `parseBulkJson`.

- [ ] **Step 4: Run to see them pass**

Run: `pnpm vitest run packages/master-web/src/core packages/master-web/src/i18n packages/master-web/src/bulk`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): carry a setting's systemId in bulk import and check keys"
```

### Task 5: API: access grants, `systemId` and `includeCommon`

**Files:**

- Modify: `packages/master-web/src/mbc/api.ts`
- Test: `packages/master-web/src/mbc/api.test.ts`

**Interfaces:**

- Consumes: `MasterAccessAnswer` and `MasterAccessGrant` (Task 1), `publicRow` (Task 3).
- Produces:
  - `MasterApiPaths.access: string`, default `'/api/master-access'` in `DEFAULT_MASTER_API_PATHS`.
  - `type ListOptions = ReadOptions & { includeCommon?: boolean }`. It is exported from `api.ts`, and also from `mbc/index.ts` if `ReadOptions` is exported there.
  - `settings.list(state, options?: ListOptions)`. The query adds `systemId: filter(state.systemId ?? '')` and `includeCommon: includeCommon || undefined`.
  - `data.list(settingCode, state, options?: ListOptions)`. The query adds `includeCommon: includeCommon || undefined`, and no `systemId`.
  - Both lists map their items through `publicRow` (in `pageOf`).
  - `access: { get(options?: ReadOptions): Promise<MasterAccessAnswer> }` on `MasterApi`:
    - It calls `GET paths.access`.
    - A `MbcApiError` with status 404 resolves `{ enabled: false, grants: [] }`.
    - An answer that is not `{ enabled: boolean, grants: array }`, or has `enabled: false`, resolves to the same value.
    - Otherwise it keeps only the grants with string `systemId`/`settingCode` and boolean `read`/`write`, reduced to those four keys.
    - Every other failure rejects.

- [ ] **Step 1: Write the failing tests.** Append to `mbc/api.test.ts`:

<!-- prettier-ignore -->
```ts
describe('createMasterApi: system scoping (backend v1.7+)', () => {
  it('sends systemId and includeCommon only when given', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [], total: 0 })
    const api = createMasterApi(client)
    await api.settings.list(
      { ...initialSettingListState(), systemId: ' app-a ' },
      { includeCommon: true }
    )
    expect(client.get).toHaveBeenLastCalledWith('/api/master-setting/list', {
      query: expect.objectContaining({
        systemId: 'app-a',
        includeCommon: true,
      }),
      signal: undefined,
    })
    await api.settings.list(initialSettingListState())
    const query = client.get.mock.lastCall?.[1].query
    expect(query.systemId).toBeUndefined()
    expect(query.includeCommon).toBeUndefined()
    await api.data.list('PRODUCT', initialDataListState(), {
      includeCommon: true,
    })
    expect(client.get).toHaveBeenLastCalledWith('/api/master-data/list', {
      query: expect.objectContaining({
        settingCode: 'PRODUCT',
        includeCommon: true,
      }),
      signal: undefined,
    })
    expect(client.get.mock.lastCall?.[1].query).not.toHaveProperty('systemId')
  })

  it('reads list rows with a null systemId as shared and drops the reserved attribute', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({
      items: [
        { id: 'a', systemId: null, attributes: { __systemId: 'x' } },
        { id: 'b', systemId: 'app-a' },
      ],
      total: 2,
    })
    const page = await createMasterApi(client).settings.list(
      initialSettingListState()
    )
    expect(page.items).toEqual([
      { id: 'a', attributes: {} },
      { id: 'b', systemId: 'app-a' },
    ])
  })

  it('gets the grants from /api/master-access', async () => {
    const client = createFakeClient()
    const grants = [
      { systemId: 'app-a', settingCode: '*', read: true, write: true },
    ]
    client.get.mockResolvedValue({
      enabled: true,
      grants: [...grants, { x: 1 }],
    })
    expect(await createMasterApi(client).access.get()).toEqual({
      enabled: true,
      grants,
    })
    expect(client.get).toHaveBeenCalledWith('/api/master-access', {
      signal: undefined,
    })
  })

  it('reads a missing route or an odd answer as not enabled', async () => {
    const client = createFakeClient()
    const api = createMasterApi(client)
    client.get.mockRejectedValueOnce(new MbcApiError(404, null))
    expect(await api.access.get()).toEqual({ enabled: false, grants: [] })
    client.get.mockResolvedValueOnce({ message: 'odd' })
    expect(await api.access.get()).toEqual({ enabled: false, grants: [] })
    client.get.mockResolvedValueOnce({ enabled: false, grants: [{}] })
    expect(await api.access.get()).toEqual({ enabled: false, grants: [] })
  })

  it('rejects other failures of the access request', async () => {
    const client = createFakeClient()
    client.get.mockRejectedValue(new MbcApiError(500, null))
    await expect(createMasterApi(client).access.get()).rejects.toBeInstanceOf(
      MbcApiError
    )
  })

  it('uses a host’s access path', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ enabled: false, grants: [] })
    await createMasterApi(client, {
      paths: { access: '/x/access' },
    }).access.get()
    expect(client.get).toHaveBeenCalledWith('/x/access', { signal: undefined })
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/mbc/api.test.ts`
Expected: FAIL. `api.access` is undefined, and the queries lack the new keys.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run the gate**

Run: `pnpm verify`
Expected: exit 0. The prototype of this plan ends with 1092 tests passing repo-wide.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): read master access and send systemId and includeCommon"
```

### Hand-back

Do not merge. Report the branch name, `git log --oneline main..`, and the last lines of `pnpm verify`. List anything you did differently from this plan, and why.
