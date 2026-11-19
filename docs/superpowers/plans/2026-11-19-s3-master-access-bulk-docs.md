# S3: master-web bulk access pre-check, playground and docs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish system scoping:

- With access enabled, bulk import refuses the items the grants would refuse, before anything is sent, and explains a refused batch.
- The playground shows the feature on a fake backend with access rules.
- The README, MIGRATION guide, changeset and usage skill describe it.

**Architecture:** `bulkAccessErrors` in `core/bulk.ts` is a pure function. `parseBulkJson` runs it, with each error mapped back to the item's position in the JSON. `BulkImportDialog` takes the list's `access`, plus the setting's system on a data list. The playground's fake master backend gains optional grants, and a `#mbc-scoped` route renders the pages with `systems` and `includeCommon`.

**Tech Stack:** TypeScript, React 18/19, Vitest, Vite playground. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-master-system-scoping-design.md` (section "Bulk import access pre-check", the bulk dialog row of "Screens", "Testing" for the playground, and "Documentation and release").

## Orientation

- **Prerequisites:** S1, S2a and S2b are merged:
  - `docs/superpowers/plans/2026-11-19-s1-master-access-core.md`
  - `…-s2a-master-access-lists.md`
  - `…-s2b-master-access-editors.md`

  This plan uses:
  - `MasterAccess`, `masterAccess`, `OPEN_ACCESS`, `MasterAccessGrant` (`core/access`)
  - `BulkJsonItem.systemId` (S1)
  - `refusalOf` and `RefusalTexts` (`form/refusal`), and `masterMessages.access` (S2a)
  - the lists' `access` and `waiting`, and the data list's `setting` (S2a)
  - every page's `systems` and the list pages' `includeCommon` (S2a/S2b)

- Repo `lib-web/rebuild`. Work on a branch from `main`, e.g. `feat/master-access-bulk-docs`, in a worktree.
- Toolchain: `eval "$(fnm env)"; fnm use 24.13.0`, then `pnpm install --frozen-lockfile` and `pnpm build`. On "Cannot find native binding", delete `node_modules` (root, `packages/*`, `apps/*`) and install again under Node 24.
- `parseBulkJson` already reports per entry with the entry's index in the JSON (`errors[].index`). Entries a host mapper maps to `null` are skipped, so an item's index in `items` can differ from its index in the JSON.
- The playground is `apps/playground` (Vite, no tests). It is checked by `pnpm typecheck` and `pnpm lint`, and by eye with `pnpm --filter @mbc-cqrs-serverless/playground dev`.

## Global Constraints

- Without access (or not enabled), bulk import behaves exactly as before: no new errors, and the same failure text.
- Owner's decision: the pre-check refuses the whole import, and sends nothing, when any item fails it.
- Messages (`master` `bulk`):
  - `systemNotWritable`: ja `このシステムの設定を登録する権限がありません。` / en `You may not write settings of this system.`
  - `settingNotWritable`: ja `このマスター設定のデータを登録する権限がありません。` / en `You may not write data of this setting.`
- Docs and the playground use only `app-a`, `app-b` and `shared` (labels `システムA`, `システムB`, `共通` in the playground). No product, client or host names.
- Commit trailer on every commit:
  ```
  Co-Authored-By: <your agent identity>
  Claude-Session: https://claude.ai/code/session_011KPZCcUnsRe8xry6DPcPHW
  ```
- Gate before hand-back:
  - `pnpm verify`
  - `pnpm smoke`
  - `pnpm use-react 18 && pnpm vitest run packages/master-web && pnpm use-react 19`

## Review Focus

1. A host mapper skips the first entry (`null`), and the second is refused. The error says item 2, not item 1 (Task 2 test `names a refused entry by its place in the JSON, after skipped ones`).
2. A setting item with no `systemId`, for a user who may write only `app-a`, is refused: it would land in `shared` (Task 1 `checks a setting without a system as shared`).
3. A data item for a setting the import does not contain, on the settings list, is left to the backend and not refused, because its owner is unknown there (Task 1 `leaves a record of a setting it cannot see to the backend`).
4. An entry with both a bad key and a refused system shows only the key error: the access check runs once the entries are valid (Task 2 `runs the access check only once the entries are valid`).
5. A batch refused by the backend (403 inside `MasterBulkError`) says "no permission", not "Request failed with status 403" (Task 3 `says a refused batch was refused for lack of permission`).

---

### Task 1: `bulkAccessErrors`

**Files:**

- Modify: `packages/master-web/src/core/bulk.ts`, `packages/master-web/src/i18n/master-messages.ts`, `packages/master-web/src/core/index.ts`, `packages/master-web/test/exports.test.tsx`
- Test: `packages/master-web/src/core/bulk.test.ts`

**Interfaces:**

- Produces:
  - `BulkError` gains `| { key: 'systemNotWritable'; index: number } | { key: 'settingNotWritable'; index: number }`. `MasterMessages['bulk']` gains both texts (Global Constraints).
  - `bulkAccessErrors(items: readonly BulkJsonItem[], access: MasterAccess, setting?: { code: string; systemId?: string }): BulkError[]`. Its `index` is the item's index in `items`.
    - Not enabled: `[]`.
    - A setting item (one without `settingCode`) with `systemId` must have that id, lower-cased, among the lower-cased `access.writableSystems` ids. Without `systemId`, it needs `access.canWrite(undefined, item.code)`. Otherwise the error is `systemNotWritable`.
    - A data item looks up its setting's owner in a map. The map holds `setting` (when given) plus every setting item of `items` (code → `systemId`). If the setting code is in the map and `!access.canWrite(owner, settingCode)`, the error is `settingNotWritable`. A setting code not in the map gives no error.
  - Exported from `core/index.ts`. Add `'bulkAccessErrors'` to `CORE` in `test/exports.test.tsx`.
  - The doc comment says why: the backend writes settings first and is not a transaction, and grants can change, so this narrows partial writes but cannot rule them out.

- [ ] **Step 1: Write the failing tests.** In `core/bulk.test.ts`, add `import { masterAccess, OPEN_ACCESS } from './access'`, add `bulkAccessErrors` to the `./bulk` import, and append:

<!-- prettier-ignore -->
```ts
describe('bulkAccessErrors', () => {
  const systems = [
    { id: 'app-a', label: 'App A' },
    { id: 'app-b', label: 'App B' },
    { id: 'shared', label: '共通' },
  ]
  const grants = (
    ...list: { systemId: string; settingCode: string; write: boolean }[]
  ) =>
    masterAccess(
      {
        enabled: true,
        grants: list.map((grant) => ({ ...grant, read: true })),
      },
      systems
    )

  it('refuses nothing without access', () => {
    expect(
      bulkAccessErrors([{ ...setting, systemId: 'app-z' }], OPEN_ACCESS)
    ).toEqual([])
  })

  it('needs a setting’s system to be writable, in any case', () => {
    const access = grants({ systemId: 'app-a', settingCode: '*', write: true })
    expect(
      bulkAccessErrors(
        [
          { ...setting, systemId: 'APP-A' },
          { ...setting, code: 'T', systemId: 'app-b' },
        ],
        access
      )
    ).toEqual([{ key: 'systemNotWritable', index: 1 }])
  })

  it('checks a setting without a system as shared', () => {
    expect(
      bulkAccessErrors(
        [setting],
        grants({ systemId: 'shared', settingCode: 'S', write: true })
      )
    ).toEqual([])
    expect(
      bulkAccessErrors(
        [setting],
        grants({ systemId: 'app-a', settingCode: '*', write: true })
      )
    ).toEqual([{ key: 'systemNotWritable', index: 0 }])
  })

  it('checks a record against a setting of the same import', () => {
    const access = grants(
      { systemId: 'app-a', settingCode: '*', write: true },
      { systemId: 'app-b', settingCode: '*', write: false }
    )
    expect(
      bulkAccessErrors(
        [
          { ...setting, systemId: 'app-a' },
          data,
          { ...setting, code: 'T', systemId: 'app-b' },
          { ...data, settingCode: 'T' },
        ],
        access
      )
    ).toEqual([
      { key: 'systemNotWritable', index: 2 },
      { key: 'settingNotWritable', index: 3 },
    ])
  })

  it('leaves a record of a setting it cannot see to the backend', () => {
    expect(
      bulkAccessErrors(
        [{ ...data, settingCode: 'ELSEWHERE' }],
        grants({ systemId: 'app-a', settingCode: '*', write: false })
      )
    ).toEqual([])
  })

  it('checks a data list’s records against its setting', () => {
    const access = grants({ systemId: 'app-a', settingCode: 'S', write: true })
    expect(
      bulkAccessErrors([data], access, { code: 'S', systemId: 'app-a' })
    ).toEqual([])
    expect(bulkAccessErrors([data], access, { code: 'S' })).toEqual([
      { key: 'settingNotWritable', index: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/core/bulk.test.ts`
Expected: FAIL, `bulkAccessErrors is not a function`.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run to see them pass**

Run: `pnpm vitest run packages/master-web/src/core packages/master-web/src/i18n packages/master-web/test/exports.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): find bulk items the grants would refuse"
```

### Task 2: `parseBulkJson` runs the access check

**Files:**

- Modify: `packages/master-web/src/core/bulk.ts`
- Test: `packages/master-web/src/core/bulk.test.ts`

**Interfaces:**

- Consumes: `bulkAccessErrors` (Task 1).
- Produces: `parseBulkJson`'s options gain:
  - `access?: MasterAccess`, documented as "With access enabled, entries the grants would refuse are reported too";
  - `settingCode?: string` and `settingSystemId?: string`, a data list's setting.

  Behaviour:
  - Keep a `positions: number[]` next to `items`, holding each accepted item's index in the JSON.
  - After the existing checks, if `access` is given and `errors` is still empty, run `bulkAccessErrors(items, access, setting)`. `setting` is `{ code: settingCode, systemId: settingSystemId }` when `screen === 'data'` and `settingCode` is given, else `undefined`.
  - Push each error with `index: positions[error.index]`.

- [ ] **Step 1: Write the failing tests.** Append to `core/bulk.test.ts`:

<!-- prettier-ignore -->
```ts
describe('parseBulkJson with access', () => {
  const access = masterAccess(
    {
      enabled: true,
      grants: [
        { systemId: 'app-a', settingCode: '*', read: true, write: true },
      ],
    },
    [{ id: 'app-a', label: 'App A' }]
  )

  it('names a refused entry by its place in the JSON, after skipped ones', () => {
    const mapRawItem: BulkMapper = (raw) =>
      (raw as { skip?: boolean }).skip
        ? null
        : {
            kind: 'setting',
            value: { ...(raw as typeof setting), settingValue: {} },
          }
    const text = JSON.stringify([
      { skip: true },
      { ...setting, systemId: 'app-b' },
    ])
    expect(
      parseBulkJson(text, { screen: 'settings', mapRawItem, access }).errors
    ).toEqual([{ key: 'systemNotWritable', index: 1 }])
  })

  it('checks a data list’s entries against its setting', () => {
    const text = JSON.stringify([data])
    expect(
      parseBulkJson(text, {
        screen: 'data',
        access,
        settingCode: 'S',
        settingSystemId: 'app-a',
      }).errors
    ).toEqual([])
    expect(
      parseBulkJson(text, { screen: 'data', access, settingCode: 'S' }).errors
    ).toEqual([{ key: 'settingNotWritable', index: 0 }])
  })

  it('runs the access check only once the entries are valid', () => {
    const text = JSON.stringify([
      { ...setting, code: 'a#b', systemId: 'app-b' },
    ])
    expect(parseBulkJson(text, { screen: 'settings', access }).errors).toEqual([
      { key: 'invalidCode', index: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/core/bulk.test.ts`
Expected: FAIL. `parseBulkJson` ignores `access`, so no `systemNotWritable` or `settingNotWritable` is reported.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run to see them pass.** Same command. Expected: PASS (24 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): check bulk items against the grants before sending"
```

### Task 3: The import dialog uses the access

**Files:**

- Modify: `packages/master-web/src/bulk/bulk-import-dialog.tsx`, `packages/master-web/src/settings/master-setting-list.tsx`, `packages/master-web/src/data/master-data-list.tsx`
- Test: `packages/master-web/src/bulk/bulk-import-dialog.test.tsx`

**Interfaces:**

- Consumes: `parseBulkJson`'s new options (Task 2), and `refusalOf`/`RefusalTexts` (S2a).
- Produces:
  - `BulkImportDialogProps.access?: MasterAccess` (default `OPEN_ACCESS`) and `settingSystemId?: string`.
  - `submit` passes `{ screen, mapRawItem, tenantCode, access, settingCode, settingSystemId }` to `parseBulkJson`.
  - The dialog's private `failureOf(error, refusal: RefusalTexts)` sets `message` to `refusalOf(error, refusal) ?? (error instanceof Error ? error.message : undefined)`. It is called with `{ enabled: access.enabled, permissionDenied: t.access.permissionDenied }`.
  - The settings list passes `access={access}` to its dialog. The data list passes `access={access}` and `settingSystemId={setting.systemId}`.

- [ ] **Step 1: Write the failing tests.** In `bulk-import-dialog.test.tsx`, import `MbcApiError` from `@mbc-cqrs-serverless/client-web` and `masterAccess` from `../core/access`, then append:

<!-- prettier-ignore -->
```tsx
describe('BulkImportDialog with access', () => {
  const access = (write: boolean) =>
    masterAccess(
      {
        enabled: true,
        grants: [{ systemId: 'app-a', settingCode: 'P', read: true, write }],
      },
      [{ id: 'app-a', label: 'App A' }]
    )

  it('refuses entries the grants would refuse and sends nothing', async () => {
    const { onImport } = setup({
      access: access(false),
      settingSystemId: 'app-a',
    })
    await open()
    await typeJson([DATA])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(
      screen.getByText(
        '1件目: このマスター設定のデータを登録する権限がありません。'
      )
    ).toBeInTheDocument()
    expect(onImport).not.toHaveBeenCalled()
  })

  it('imports what the grants allow', async () => {
    const { onImport } = setup({
      access: access(true),
      settingSystemId: 'app-a',
    })
    await open()
    await typeJson([DATA])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    await waitFor(() => expect(onImport).toHaveBeenCalled())
  })

  it('says a refused batch was refused for lack of permission', async () => {
    setup({
      access: access(true),
      settingSystemId: 'app-a',
      onImport: async () => {
        throw new MasterBulkError(new MbcApiError(403, {}), {
          done: 0,
          from: 1,
          to: 1,
        })
      },
    })
    await open()
    await typeJson([DATA])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'この操作を行う権限がありません。'
    )
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm vitest run packages/master-web/src/bulk/bulk-import-dialog.test.tsx`
Expected: FAIL. The refused entry is sent, and the 403 shows "Request failed with status 403".

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run the package's tests**

Run: `pnpm vitest run packages/master-web`
Expected: PASS (463 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): refuse and explain bulk imports by access"
```

### Task 4: Playground: a backend with access rules

**Files:**

- Modify: `apps/playground/src/fake-master-backend.ts`, `apps/playground/src/mbc-pages.tsx`, `apps/playground/src/toolbar.tsx`

**Interfaces:**

- `createFakeMasterBackend({ grants }: { grants?: MasterAccessGrant[] } = {})`:
  - Without `grants`, behaviour does not change. `/api/master-access` falls through to the existing 404.
  - With `grants`, `rules = masterAccess({ enabled: true, grants }, [])` from `@mbc-cqrs-serverless/master-web`, and:
    - `GET /api/master-access` returns `{ enabled: true, grants }`.
    - `Entity` gains `systemId?: string`. `putSetting(code, name, attributes, systemId?)` keeps an existing owner, and otherwise stores `systemId?.toLowerCase()`. A record takes its setting's `systemId` when stored.
    - The settings list keeps only `rules.canRead(entity.systemId, entity.code)` rows, and narrows by the `systemId` query when present (`(systemId ?? 'shared') === query`). The data list keeps only readable records.
    - Setting create, update and delete, record create, update, delete and restore, and bulk (all items checked first) answer `403 { message: 'Forbidden' }` when `rules.canWrite` refuses. The owner is the setting's, for a record.
  - Seed data: `PRODUCT` owned by `app-a`, and a new `ROUTE` (配送ルート, fields `code` and `name`) owned by `app-b`. `sequence_setting` has no owner (`shared`).
- `mbc-pages.tsx`:
  - A second backend `scopedBackend` with grants `app-a` `*` read and write, and `shared` `*` read only.
  - `SYSTEMS`: `app-a` → `システムA`, `app-b` → `システムB`, `shared` → `共通`.
  - The `href` and `routing` builders take a base (`#mbc` or `#mbc-scoped`).
  - `MbcMasterPage` reads the base from `route.split('/')[0]`. For `mbc-scoped` it uses `scopedBackend`, adds `systems: SYSTEMS` to every page's common props, and adds `includeCommon` to both list pages. `MbcClientProvider` is keyed by the mode.
  - Update the doc comment of `MbcMasterPage`.
- `toolbar.tsx`: a link `<a href="#mbc-scoped">Master (systems)</a>` after `Master (backend)`.

- [ ] **Step 1: Implement** as in Interfaces.

- [ ] **Step 2: Check it**

Run: `pnpm --filter ./packages/master-web build && pnpm --filter @mbc-cqrs-serverless/playground typecheck && pnpm exec eslint apps/playground`
Expected: no errors.

Then run `pnpm --filter @mbc-cqrs-serverless/playground dev`, open `#mbc-scoped`, and check:

- the settings list shows PRODUCT (システムA) and 採番設定 (共通), but not ROUTE;
- the system filter narrows the list;
- 新規作成 offers only システムA, preselected;
- 採番設定 opens read-only with 「この操作を行う権限がありません。」;
- the copy request is not offered, because the user has no `*`/`*` grant.

- [ ] **Step 3: Commit**

```bash
git add apps/playground
git commit -m "chore(playground): show master pages on a backend with access rules"
```

### Task 5: Docs

**Files:**

- Modify: `packages/master-web/README.md`, `packages/master-web/MIGRATION.md`, `.changeset/first-release.md`, `skills/mbc-cqrs-serverless-web/references/setup.md`, `skills/mbc-cqrs-serverless-web/references/troubleshooting.md`

**Content** (write it in the files' own style):

- README: a new `### Systems and access` section before `### Realtime`. It covers:
  - the backend it needs (master 1.7+ with a resolver);
  - a `systems` example with `app-a` and `shared`;
  - one request, `paths.access`, and no request without `systems`;
  - 404 or `enabled: false` means as before;
  - what each screen shows: the settings list filter and column, the data list column only, the new setting's system choice with preselection, the stored system read-only, hidden actions (disabled while loading), and read-only rows;
  - copy needs `*`/`*`, and results stay readable;
  - the bulk pre-check and its limit;
  - 403 and 400 messages, and copy's 403 always;
  - no system means `shared`, and case is ignored;
  - "the UI only hides; the backend decides";
  - rollout order: backend, then this package with `systems`, then the resolver;
  - `sequence_setting` needs read access;
  - a logged-out caller gets every action hidden.

  Then add a paragraph on `includeCommon` (rows marked 共通, read-only), and one on the key rules (`#`, `@`, `MASTER_SETTING`, backend 1.8, with or without `systems`).

- MIGRATION:
  - Section 5 gets a **Systems** bullet: v0's `AppProviders` `systems` prop, if a host's version had it, becomes the pages' `systems`. Matching is case-insensitive, and copy needs `*`/`*`.
  - Section 7 "Saving" gets one bullet: new codes with `#`/`@`, or the setting code `MASTER_SETTING`, are refused before sending, while stored codes keep working.
- Changeset: append one sentence to `first-release.md`: master-web supports the backend's system scoping (`systems`, `includeCommon`) and its key rules.
- Skill `setup.md`, step 5: master-web pages also take `systems` (`{ id, label }[]`, include `shared` to offer it; pass the same list to every page), and the list pages take `includeCommon`.
- Skill `troubleshooting.md`: two rows before "Rich editors stay plain text boxes".
  - Symptom "with `systems`, every create, edit and import is hidden". Causes: not logged in (empty grants), no write grant for those systems, or `systems` ids that differ from the backend's. Fix: check `GET /api/master-access`.
  - Symptom "a copy is refused (権限がありません)". Cause: copy needs `system_admin` from `custom:roles` (group roles do not count) and a `*`/`*` write grant, and to other tenants `system_admin` as the caller's tenant role.

- [ ] **Step 1: Write the docs**, then run `pnpm exec prettier --write packages/master-web/README.md packages/master-web/MIGRATION.md .changeset skills`.

- [ ] **Step 2: Scan for names**

Run: `git grep -n -iE "<the product or client names you know of>" -- packages skills .changeset docs`
Expected: no output.

- [ ] **Step 3: Run the gate**

Run: `pnpm verify && pnpm smoke && pnpm use-react 18 && pnpm vitest run packages/master-web && pnpm use-react 19`
Expected: all exit 0. The prototype ends with 1156 tests repo-wide, and 463 in master-web on React 18.

- [ ] **Step 4: Commit**

```bash
git add packages/master-web .changeset skills
git commit -m "docs(master-web): document systems, access and the key rules"
```

### Hand-back

Do not merge. Report the branch name, `git log --oneline main..`, and the last lines of each gate command. Say whether you checked the playground in a browser, and what you saw. List anything you did differently from this plan, and why.
