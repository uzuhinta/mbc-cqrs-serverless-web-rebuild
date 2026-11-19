# master-web: system scoping, access and the v1.8 master backend

- **Date:** 2026-11-19
- **Status:** approved by the owner pending review of this document
- **Brings the rebuild up to:** backend `mbc-cqrs-serverless` `main` at `63ecf49` (release v1.8.0; the rebuild last tracked v1.6.0, `f4e851b`), and the v0 frontend branch `feature/master-system-scoping-web` at `2a6baca` (2026-11-11).
- **Packages touched:** `master-web` (all layers), the playground's fake master backend, docs and the usage skill. `client-web`, `ui-web` and `survey-web` do not change.

Items marked **(author's call)** were settled by the author of this document, not by the owner.

## Why

The rebuild is behind both upstreams. The backend's master package (v1.7–v1.8) added per-system ownership of master settings, access grants per system and setting code, a guard on the built-in routes, an `includeCommon` list option and stricter key rules. The v0 frontend branch added a UI for the ownership and access part. A host that turns these on in the backend needs the rebuild's master screens to offer only what the user may do, to let a new setting choose its system, and to say plainly when the backend refuses.

The owner chose to go beyond the v0 branch (option B): also use what the backend now allows and the v0 branch left out, so users get errors early instead of after a refused write.

## What the v0 branch changed, and what the rebuild already has

| v0 branch change                                                     | Rebuild today                                                                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| survey: option values distinct from labels, unique, `other` reserved | Already there (`creator/question/options-editor.tsx`, `schema/option-values.ts`, from v0 0.0.49). No work.                         |
| survey: host resolves the tenant code per request                    | Already there: client-web's `tenantCode` accepts `() => string`, used for the header and for `command()`'s subscriptions. No work. |
| master: system scoping and access UI                                 | Missing. This document.                                                                                                            |

## Goals

1. With access enabled, offer only the systems and actions the user's grants allow, on every master screen including the copy screens.
2. A new setting chooses its system; an existing setting shows its system read-only.
3. Both list screens show a system column; the settings list also filters by system.
4. A refused write says "no permission" (HTTP 403); a rejected write shows the backend's reason (HTTP 400).
5. Beyond v0 (option B):
   - The code inputs and bulk import reject codes the backend now rejects (`#`, `@`, the reserved `MASTER_SETTING`), before anything is sent. This applies with or without access, because the backend rejects them in every deployment.
   - Both list pages can include the common tenant's rows (`includeCommon`).
   - Copy is offered only to a user whose grants allow it as the backend checks it (a `*`/`*` write grant), and a refused copy shows the permission message.

## Non-goals

- Enforcing permissions in the browser. The UI hides or disables; the backend decides.
- Sending `systemId` for data rows (the backend takes it from the setting and ignores the client).
- Changing a setting's `systemId` after creation (the backend forbids it).
- Tagging existing data (`assignSystem` has no route; it is a backend migration tool).
- Switching tenants (stays with the host's `tenantCode` on the client).
- Changing `canCopy`: it stays the host's switch; the access check is added on top.

## Anti-goals

- Any change, including an extra request, for a host that does not opt in.
- A second place where permission rules are defined: the rules live in one pure function in `core`.
- A context provider that screens read implicitly. Screens keep taking everything as props (owner's choice, approach 1).
- Any product, client or host name in code, docs, tests or commits.

## Backend contract this relies on (v1.8.0)

From `docs/development/master-access-and-sync.md` and the controllers, DTOs and helpers on `main`:

- **`GET /api/master-access`** → `{ enabled: boolean, grants: { systemId, settingCode, read, write }[] }`. No resolver: `{ enabled: false, grants: [] }`. A backend older than v1.7 answers 404. Route is guarded like the others when `controllerAuth` is set.
- **Grants:** `systemId` and `settingCode` may be `*`; `write` implies `read`; grants are a union; no grants means nothing. The backend compares systems in **lower case** (`systemId` is stored so) and setting codes exactly (`assertAccess`).
- **`shared`** is the reserved system for data every system receives; a row without `systemId` counts as `shared`.
- **Rows** from every master endpoint carry an optional top-level `systemId`; `attributes.__systemId` is never returned and a client-sent `__systemId` attribute is removed.
- **Writes:** `POST /api/master-setting` (common and tenant DTOs) and setting items of `POST /api/master-bulk` accept `systemId`. A setting whose code is already visible (tenant, then common) inherits that owner; a conflicting explicit value is 400. `'*'` as a value is 400. Data rows never take `systemId` from the client.
- **Lists:** `GET /api/master-setting/list` and `GET /api/master-data/list` accept `systemId` (narrows only; `total` stays correct) and `includeCommon` (`true`/`false`). `includeCommon` adds common-tenant rows whose code the caller's tenant does not have; on the data list it needs `settingCode` (always sent) and fails with 400 when the tenant has more than 10,000 matching rows.
- **Logged out:** `GET /api/master-access` answers `{ enabled: true, grants: [] }` without calling the resolver, so every action is hidden.
- **`systemId` may be `null`** on list rows: they come from RDS, whose `system_id` column is nullable, and `toPublicRow` leaves a row without `__systemId` unchanged.
- **Refusals:** a missing grant is 403. The guard answers a disallowed tenant with 400 `Invalid tenant code`. The core `RolesGuard` also answers 403 for a header-named tenant that is not a common tenant, so a 403 is not always a missing grant; the permission message is still the honest summary for the user.
- **Copy** (`POST /api/master-setting/copy`) requires the `system_admin` role from the `custom:roles` claim (group-derived roles do not count) and, with a resolver, a `{ systemId: '*', settingCode: '*', write: true }` grant. Copying to another tenant also needs `system_admin` as the caller's effective tenant role (`tenantRole`). A refusal is 403.
- **Key rules (always on):** a setting code, and a data row's `settingCode` and `code`, must be non-empty, contain neither `#` nor `@`, and a setting code must not be `MASTER_SETTING`. The service answers 400. Bulk checks every item's key before the first write.
- **Bulk:** settings are written before data rows. The request is not a transaction: with a resolver, a data item refused for access fails the request after the settings were written.
- **Partial updates** keep omitted fields. The rebuild sends full bodies, so nothing changes for it.
- Not relevant to the frontend: command admission conditions (core), the survey-template MySQL filter, the SNS sync guidance, the task-list tenant fix (the copy task requests are unchanged).

## Approaches

Considered:

1. **Access as a plain object passed in props** (chosen by the owner). A pure `masterAccess()` in `core` turns grants plus the host's system list into `{ enabled, canRead, canWrite, … }`. Each screen takes an optional `access` prop and treats its absence as "everything allowed". Each `/mbc` page takes `systems`, fetches `/api/master-access` through client-web's `useQuery` under one shared key, and passes `access` down. Fits how the rebuild already passes host decisions (`canCopy`, `settingOptions`), keeps screens testable without a provider. Cost: one more prop threaded through the pages.
2. **A provider, as v0 did** (`MasterAccessProvider` read by the screens). Less threading, but the screens would depend on a context they do not declare, against the rebuild's "screens take props" rule from M1.

## Design

### `core`: access rules (new `core/access.ts`, exported from `/core`)

```ts
export type SystemOption = { id: string; label: string }
export type MasterAccessGrant = {
  systemId: string
  settingCode: string
  read: boolean
  write: boolean
}
export type MasterAccessAnswer = {
  enabled: boolean
  grants: MasterAccessGrant[]
}

export type MasterAccess = {
  /** False: the backend has no access rules (or the host did not opt in); everything is allowed. */
  enabled: boolean
  /** The grants are still loading; write actions wait. */
  loading: boolean
  /** The host's systems, for labels and the filter. */
  systems: readonly SystemOption[]
  /** The systems a new setting may choose: `systems` with any write grant. */
  writableSystems: readonly SystemOption[]
  canRead(systemId: string | undefined, settingCode: string): boolean
  canWrite(systemId: string | undefined, settingCode: string): boolean
  /** A `*`/`*` write grant: what the backend's copy requires. */
  canCopyAll: boolean
}

export const SHARED_SYSTEM_ID = 'shared'
export const OPEN_ACCESS: MasterAccess // enabled false, everything true, no systems
export function masterAccess(
  answer: MasterAccessAnswer,
  systems: readonly SystemOption[]
): MasterAccess
export function systemLabel(
  systems: readonly SystemOption[],
  systemId: string | undefined
): string
```

Rules:

- A missing, `null` or empty `systemId` counts as `shared` (the functions take `string | null | undefined`).
- `shared` is not added by the library. As in v0, the host lists `{ id: 'shared', label: … }` in `systems` if shared settings may be created and filtered for. Without it, a `shared` row still shows the label `shared` **(author's call, following v0)**.
- Systems compare in lower case, setting codes exactly, as the backend does. v0 compared systems exactly, so a grant of `App-A` would not match a row stored as `app-a`. **Change from v0.**
- `*` matches any system or setting code; `write` implies `read`; grants are a union.
- Not enabled: `canRead`/`canWrite` are `true`, `canCopyAll` is `true`, and `writableSystems` is `systems` (unused, since the system field is hidden).
- `writableSystems`: `systems` whose id has a write grant for some setting code (`*` counts). The backend has the final say per setting code.
- `systemLabel`: the label from `systems` (matched in lower case), else the id itself; a missing id gives the `shared` label or `shared`.
- The setting code used in checks: for a setting, `settingCodeOf(setting)` (already in `core/payload.ts`); for a data row, the setting's code. v0 cut it out of the key; the rebuild already has the setting on every data screen.

### `core`: key rules (option B)

- New `MasterError` key `keyChars` ("`#` and `@` cannot be used") and `reserved` ("this code is reserved"). Japanese and English messages in the `master` catalogue **(author's call on the wording)**: ja `「#」と「@」は使用できません。` / `このコードは予約されています。`.
- `validateSettingForm` (the settings editor's code check) adds both rules on create. `validateMasterData`'s code check adds `keyChars` on create (a data code can be `MASTER_SETTING`; only the setting code is reserved).
- Bulk import: before any request, every setting item's code and every data item's `settingCode` and given `code` are checked with the same rules. A failure is shown in the import dialog as a validation error naming the item's position, and nothing is sent. This matches the backend, which checks all keys before writing.
- These rules are on whether or not access is enabled.

### `core` types and parsing

- `MasterSetting`, `MasterData`, `MasterSettingListItem`, `MasterDataListItem` gain `systemId?: string`. A `null` becomes absent. The detail parsers and the list mapping (`pageOf` in `mbc/api.ts`, which today only casts) both normalise it, and both drop a stray `attributes.__systemId`, so it cannot be echoed back. The backend removes it anyway, so dropping it is safe **(author's call)**.
- `MasterSettingCreateBody` gains `systemId?: string`. The update body does not have it.
- `MasterSettingListState` gains `systemId: string` (empty means all); the data list has no system filter (see Screens). It is part of the list state, so a host that keeps list state in the URL keeps the filter too.
- `BulkJsonItem` and `MappedSetting` for settings carry `systemId` from the JSON. For data items it is removed **(author's call: the backend ignores it, so sending it would only mislead)**. The bulk JSON schema and the sample say so.

### `/mbc` API (`createMasterApi`)

- `access.get({ signal })` → `GET {paths.access}` (default `/api/master-access`) parsed to `MasterAccessAnswer`. A 404 means not enabled, so it resolves to `{ enabled: false, grants: [] }`. A malformed answer also counts as not enabled. Other failures reject, and the page decides what to do with them (below).
- `settings.list` sends `systemId` when it is not empty. `settings.list` and `data.list` send `includeCommon: true` when asked (a new `ListOptions` argument `{ includeCommon?: boolean }`). Without it nothing new is sent.
- `settings.create` sends the body's `systemId` as given. `bulk.importItems` sends setting items' `systemId`.
- `MasterApiPaths` gains `access`.

### `/mbc` pages

- Every master page gains `systems?: readonly SystemOption[]`. Without it the page makes no access request and passes no `access`: exactly today's behaviour. **(author's call: the prop is per page, because the rebuild has no shared master provider; the pages share one request per client, tenant and paths; an answer is shared for 30 seconds, so another user or new roles are seen on the next page.)**
- With `systems`, the page fetches `access.get` once per tenant and paths. While it loads, it passes an access with `enabled: false, loading: true`: no system column, filter or select yet (a host whose backend answers `enabled: false` never sees them flash), and every write action disabled. The server render is this loading state **(author's call: the column may appear after the answer; a brief layout change beats showing UI that may not apply)**. If the request fails, the page treats access as not enabled and reports the error to `onError` (v0 logged to the console). The backend still enforces, so the worst outcome is a refused button. **(author's call: `onError`, not the console, because the rebuild reports every failed load there.)**
- Both list pages gain `includeCommon?: boolean` (default off, as v0), sent with every list request.
- `onError` and the screens get the real `MbcApiError` as today. Messages are chosen as below.

### Screens

All new behaviour applies only when `access.enabled`. Every screen without `access` renders exactly as today.

| Screen                                       | Change                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings list                                | A "システム" filter (a `Select` with "すべて" plus `systems`) in the search form, sent as `state.systemId`. A "システム" column (`systemLabel`). Create and the JSON import are shown only when `writableSystems` is not empty, and disabled while loading.                                                                      |
| Data list                                    | The system column only, no filter (owner's decision: a data row's system comes from its setting, so one setting's rows share one system apart from untagged legacy rows). `MasterDataListState` therefore gets no `systemId`. Create and the JSON import need `canWrite(setting.systemId, settingCode)`.                         |
| Settings editor (create)                     | A required "システム" `Select` from `writableSystems`, placeholder "システムを選択してください", sent as `systemId`. With exactly one option it is preselected (v0). The setting JSON has no `systemId`, so a JSON import into the form keeps the chosen system (v0 kept the choice across an import too).                       |
| Settings editor (edit)                       | The system shown read-only. Save, delete, the JSON dialog and the link to the copy request form need `canWrite(setting.systemId, settingCode)`, on top of today's tenant condition. That link also needs `canCopyAll` (option B), on top of `canCopy`.                                                                           |
| Data editor                                  | No system field. Save, delete, restore and the JSON dialog need `canWrite(systemId, settingCode)`, using the record's own `systemId`, else its setting's (the backend's owner rule for untagged records).                                                                                                                        |
| Copy request form, copy results, copy detail | Reachable by URL, so the request form offers no submit without `canWrite(setting.systemId, settingCode)` and `canCopyAll`. The results and detail stay readable, and the editor's link to the results stays under `canCopy` alone; only the link to the request form also needs `canWrite` and `canCopyAll` **(author's call)**. |
| Bulk import dialog                           | Accepts `systemId` on setting items. Runs the key rules before sending, and, with access enabled, the access pre-check below.                                                                                                                                                                                                    |

**Bulk import access pre-check** (owner's decision). The backend writes settings before data rows and is not a transaction, and the rebuild sends batches of 100, so a refusal mid-import leaves part of it written. With access enabled, the dialog checks every item before the first request and sends nothing if any fails:

- A setting item with a `systemId` is refused when `canWrite(systemId, code)` is false.
- A setting item without `systemId` is left to the backend: it gives the item the owner of a visible setting with the same code, or leaves it `shared`, and the screen cannot know which (independent review).
- A data item is refused when `canWrite(setting.systemId, settingCode)` is false for its setting. On the data list that is the screen's setting. On the settings list, a data item whose setting is in the same import uses that item's `systemId`, and otherwise its setting's owner is unknown, so it is allowed and the backend decides **(author's call)**.
- Each refusal is a `BulkError` naming the item's position (new keys `systemNotWritable` and `settingNotWritable`, with ja/en messages).

The pre-check reduces partial writes but cannot rule them out, since grants can change. The README says so, and it suggests importing settings and data separately when that matters.

Hidden or disabled: an action with no permission is **hidden**, as v0 did, and one waiting for the grants to load is **disabled**, so the layout does not jump when they arrive **(author's call)**.

**Common rows with `includeCommon`.** A common-tenant row in a list is one whose `tenantCode` differs from the page's tenant. It shows a "共通" marker next to its code **(author's call)**. Its editor opens read-only, with no save, delete, restore, JSON import or copy: the backend's tenant gate refuses writes to another tenant's row unless the caller holds a cross-tenant role, and the UI cannot know that role **(author's call)**.

### Error messages

Today's messages stay for a host without access. With access enabled:

- HTTP 403 → `この操作を行う権限がありません。` / "You do not have permission to do this." (new message `permissionDenied`).
- HTTP 400 → the backend's message, when it sent one. Otherwise, today's message.
- Anything else → today's message.

A 403 from copy shows the permission message **even without access** (option B). Copy needs `system_admin` whether or not a resolver exists, so this message is always the right one there.

One helper in the screens maps an error to a message, given `access.enabled`, so every screen shows the same text.

## Compatibility

| Host and backend                            | Result                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `systems` not passed                        | As today: no request to `/api/master-access`, no new UI. The new key rules apply (the backend enforces them anyway).  |
| `systems` passed, backend before v1.7 (404) | Not enabled, as today.                                                                                                |
| `systems` passed, `enabled: false`          | As today.                                                                                                             |
| `systems` passed, `enabled: true`           | New UI.                                                                                                               |
| `includeCommon` on a backend before v1.7    | The backend's DTO rejects or ignores the unknown field. The README tells hosts to turn it on only with v1.7 or later. |

## Testing

As the rebuild's standard (unit tests per layer, axe and SSR tests for changed screens, the playground smoke). The following must be covered:

- `masterAccess`: not enabled allows everything; `*` for system and for setting code; a missing `systemId` counts as `shared`; `write` implies read; lower-case matching; `writableSystems`; `canCopyAll`.
- `createMasterApi`: 404 and malformed answers mean not enabled; `systemId` and `includeCommon` reach the query only when given; setting bulk items keep `systemId` and data items lose it.
- Pages: no access request without `systems`; one request is shared by two pages; a failed request is reported and leaves the page not enabled.
- Each screen with `access` absent renders as today (snapshot or class checks the rebuild already uses).
- Create editor: options come from `writableSystems`, one option is preselected, `systemId` is in the body, the field is required.
- Edit editor and data editor: actions are hidden without `canWrite`, and today's tenant condition still applies.
- Filter (settings list): choosing a system changes `state.systemId` and the request.
- Bulk access pre-check: an item for an unwritable system or setting is refused and nothing is sent; an untagged setting item passes with a `shared` write grant.
- Key rules: `a#b`, `a@b` and `MASTER_SETTING` are rejected in the settings editor, the data editor and bulk import, and nothing is sent.
- 403 shows the permission message, 400 shows the server's message, and a copy 403 shows the permission message without access.
- `includeCommon`: a common row is marked and opens read-only.

The playground's fake master backend gains `/api/master-access` and `systemId`/`includeCommon` handling, plus a control to switch access on, so the screens can be seen.

## Documentation and release

- `master-web` README: an "Access and systems" section (`systems`, what each screen hides, the rollout order: upgrade the backend, then this package, then register the resolver; `sequence_setting` needs read access or the format list is empty), `includeCommon`, the new key rules.
- `MIGRATION.md`: v0's `AppProviders systems` prop becomes the pages' `systems` prop; matching is now in lower case.
- Usage skill (`skills/mbc-cqrs-serverless-web`): setup shows `systems`. Troubleshooting adds two entries: "every action hidden" (the caller is not logged in, the grants have no write for those systems, or `systems` ids differ from the backend's) and "403 on copy" (`system_admin` must come from `custom:roles`, and be the caller's tenant role to copy to other tenants).
- `master-web` CHANGELOG entry. Nothing is published yet, so the existing first-release changeset covers it.

## Left to the builder

- File layout inside `master-web`, and how the filter and column components are shared between the two lists.
- The cache key details of the shared access query.
- How the error helper reads a 400's message from `MbcApiError`.
- English wording of new messages.
- How the playground toggles access.
