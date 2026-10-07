# Master Web Rebuild — Orchestrator Plan

> **For agentic workers:** This plan does not contain implementation steps. It sequences eight sub-plans. For each sub-plan: write its detailed plan (superpowers:writing-plans), execute it (superpowers:executing-plans, inline), pass its gate, get one fresh whole-branch review, fix, merge, then tick it here. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@mbc-cqrs-serverless/master-web` with full v0 0.0.50 parity, plus the ui-web and client-web additions it needs, and release all four packages together as 1.0.0.

**Architecture:** A fourth ESM-only package in the `rebuild/` monorepo, built like survey-web (tsdown unbundled, Tailwind v4 `mbc:` prefix, `styles.css` + `styles.layer.css`). Layers: React-free `/core`, prop-driven screens at the root, opt-in rich editors in `/editors`, backend integration in `/mbc` on client-web. ui-web gains `Table`, `Accordion`, `Command`, `MultiSelect`, `useHydrated`; client-web gains `command({ expectedFinishes, onProgress })` and a public `useQuery`.

**Tech Stack:** pnpm 10.29, Node 24.13 (fnm), TypeScript ~6.0, tsdown, Tailwind CSS 4, Vitest + jsdom + Testing Library + axe-core, ESLint 10, Radix, cmdk, react-hook-form 7, zod 4, `@tanstack/react-table` 8, dnd-kit, Changesets. Optional peers in `/editors`: `react-quill-new`, `@uiw/react-md-editor`, `jsoneditor`.

**Spec:** `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` (builds on `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md`)

## Global Constraints

Every sub-plan's tasks implicitly include these.

- React peer range: `"react": "^18.2.0 || ^19.0.0"`, `"react-dom": "^18.2.0 || ^19.0.0"`.
- ESM-only output; `"type": "module"`; no CommonJS.
- No `process.env`, `next`, `next/*`, `nuqs`, `sonner`, axios, `@apollo/client`, `aws-amplify`, `aws-appsync-*`, mobx, swr, `react-draggable`, `react-resizable`, `patch-package`, or hard-coded routes in any `packages/*/src` file.
- `react-quill-new`, `@uiw/react-md-editor` and `jsoneditor` are imported only under `packages/master-web/src/editors/`, and only through dynamic `import()`.
- `packages/master-web/src/core/` imports nothing but `zod` and its own files (no React).
- No React-19-only APIs in `packages/*/src` (`use`, `useActionState`, `useOptimistic`, `useFormStatus`, ref as a plain prop, `<Context>` as a provider).
- No `console.*` in `packages/*/src`.
- `"use client"` only in modules that need it; it must survive the build.
- All CSS classes prefixed `mbc:`; no preflight; theme through `--mbc-*` variables; root and portal elements render `data-mbc`.
- UI strings come from typed messages (`ja` default = v0's text, `en` built in); no hard-coded UI text in components.
- Settings and data stay v0-compatible: unknown keys survive a load-and-save.
- No consumer-specific names (apps, organisations, their endpoints or constants) in code, docs, plans, tests, fixtures or commit messages.
- TypeScript `strict: true` and `noUncheckedIndexedAccess: true`; no `any`.
- Commands run under Node 24.13: prefix with `fnm exec --using=v24.13.0 --`.
- Commits use Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

Cross-cutting failure modes no single sub-plan's happy-path tests would catch. Each names the sub-plan that must pin it with a test.

1. **v0-stored values that do not match the field's type** (`"12"` for a number, a JSON field stored as a string, a missing array, `"true"` for a boolean, a date with a time part) → the record loads, displays, validates and saves without throwing or silently changing untouched fields. _Owner: M2 (conversion round trips), M5 (form load → save without edits sends the same attributes)._
2. **Ids and codes containing `#`, `/`, `?` or spaces** (`MASTER#tenant#MASTER_SETTING#a/b`) → `routing.href` targets, API paths and back-navigation round-trip the exact id. _Owner: M3 (links), M7 (API encoding, connected pages)._
3. **Bulk import of 250 items where the second batch fails, or the client has no realtime** → completed batches are reported, the failure names the items it covers, nothing hangs past the timeout; without realtime the dialog reports "accepted" instead of waiting. _Owner: M1 (`expectedFinishes` with partial finishes and without realtime), M3 (dialog), M7 (batching)._
4. **A setting or record owned by another tenant (including `common`)** → opens read-only: no Save, Delete, Restore, field reordering or JSON import; links still work. _Owner: M4, M5, M7 (connected pages pass ownership from `client.tenantCode()`)._
5. **Server rendering in Next App Router** with dates, the data table, the fields table and the `/editors` renderers → no hydration mismatch, no `window` access during render, editors appear after mount. _Owner: M3–M6 (`renderToString` tests), M8 (`next-smoke` build)._

---

## Process for each sub-plan

1. Branch from `main`: `git switch -c m<N>-<slug>`.
2. Write the detailed plan to `docs/superpowers/plans/2026-10-06-m<N>-<slug>.md` (superpowers:writing-plans) and self-review it against the spec sections listed below.
3. Execute it inline (superpowers:executing-plans): TDD, small commits, ledger in `.superpowers/sdd/<plan>/progress.md`.
4. Pass the gate, then one fresh whole-branch review (most capable model); fix Critical/Important findings RED→GREEN; ledger Minors.
5. Merge to `main` with `git merge --ff-only`, tick the checkbox here, commit.

Screens and new primitives (M1, M3–M7) also use the `evon:ui-ux` skill in **keep-the-look** mode: v0 visuals are the reference; improvements are limited to spacing consistency, states (hover, focus, disabled, error, empty, loading) and accessibility.

v0 reference source: `../mbc-cqrs-serverless-web/packages/master/src` (identical to npm 0.0.50).

### Look: one shared look (user decision, 2026-10-07)

Master screens use ui-web's controls as they are (Button, Input, Select, Switch, Badge, Dialog, Accordion, Table, MultiSelect, pagination), so survey and master screens look the same in one app. What master-web keeps from master v0: page layouts, section structure (e.g. the data list's accordion sections and their dark section headers), the table's structure, colour roles and the Japanese text. Parity tests pin master-web's own layout markup, not ui-web's controls. (Replaces the M1-review ruling that master screens copy master v0's control classes.)

### Standard gate (every sub-plan)

```bash
fnm exec --using=v24.13.0 -- pnpm verify                      # React 19
fnm exec --using=v24.13.0 -- pnpm use-react 18 && fnm exec --using=v24.13.0 -- pnpm verify
fnm exec --using=v24.13.0 -- pnpm use-react 19                # restore
fnm exec --using=v24.13.0 -- pnpm smoke                       # from M1 on: next-smoke includes master-web
git status --porcelain                                        # must be empty after restore
```

---

## Sub-plans

- [x] **M1 — Foundations** (`m1-foundations`)
  - Merged 2026-10-06 after the standard gate (React 19 and 18: 572/572, smoke passes). No ledger was kept and no fresh whole-branch review ran for M1; M2's review covers the M1 range as well.
  - Spec: §2 (layout, boundaries, ui-web additions, client-web addition), §3 (entry table), §3.5 (namespaces).
  - Builds:
    - ui-web: `Table` family, `Accordion` family (`@radix-ui/react-accordion`, caret range), `Command` family (`cmdk`), `MultiSelect`; `useHydrated` moved from survey-web (survey-web imports it from ui-web); `ui` messages for their text; axe + SSR + v0 class parity tests; playground gallery entries.
    - client-web: `command(request, { expectedFinishes, onProgress })`; `useQuery` made public in `client-web/react` (moved from survey-web's private copy; survey-web uses it).
    - master-web: package scaffold (`package.json` exports for `.`, `./core`, `./styles.css`, `./styles.layer.css` (`/editors` added in M6, `/mbc` in M7)), tsconfig, tsdown entries, CSS build, Vitest project, build-output tests (entries exist, `"use client"` banners, `/core` has no React import, optional peers only in `/editors`), `master` namespace registered with the field-type labels (`masterSetting`/`masterData` in M3, `masterCopy` in M7), Changesets `fixed` group extended, `apps/next-smoke` and playground wiring, CI unchanged except the new package.
  - Gate: standard gate; `pnpm changeset status` lists four packages.
  - Depends on: —

- [ ] **M2 — `/core`** (`m2-core`)
  - Plan: `docs/superpowers/plans/2026-10-07-m2-core.md` — written for an implementer without this conversation's context; its code was replayed task by task on `main` (5b8a2c9) and passes the full gate.
  - Spec: §3.1, §5 (auto-number type code note), Review Focus 1.
  - Builds: types (`MasterFieldType`, `MasterField`, `MasterSetting`, `MasterData`), `parseMasterSetting`, `parseMasterData` (tolerant, passthrough), `fieldTypes` table (options, defaults, `toFormValue`, `fromFormValue`, `validate`), `validateMasterData`, `toDataPayload`, `validateFieldDefinition`, `defaultSettingFields`, `parseBulkJson` + v0's `MapResult` / `MappedSetting` / `MappedData` / `mapResultToBulkItem`, `MasterCopyRequest`; error keys with ja/en messages in `master`; fixtures with all ten field types and unknown keys.
  - Gate: standard gate; `/core` build has no React import.
  - Depends on: M1.

- [ ] **M3 — Lists** (`m3-lists`)
  - Spec: §3.2 (navigation, `MasterSettingList`, `MasterDataList`, `BulkImportDialog`), §4 (data table, state), Review Focus 2, 3, 5.
  - Builds: `MasterRouting` / `MasterTarget` types and a link helper; `DataTable` (TanStack manual mode, sortable headers with `aria-sort`, paging via ui-web `Pagination`, row selection); `MasterSettingList`; `MasterDataList` (columns from `isShowedOnList`, per-type cell formatting); `BulkImportDialog` (paste / file / sample download, per-item errors, progress); playground pages on fixture data.
  - Gate: standard gate; v0 class parity for both lists.
  - Depends on: M2.

- [ ] **M4 — Settings editor** (`m4-settings-editor`)
  - Spec: §3.2 (`MasterSettingEditor`, host-specific props `canCopy`, `settingOptions`), §4 (forms, fields table), Review Focus 4.
  - Builds: `MasterSettingEditor` (code with async uniqueness, name, description, `settingOptions`), fields table (dnd-kit sortable + keyboard + announcements; `code`/`name`/`seq` fixed), field dialog (per-type options from `fieldTypes`, `validateFieldDefinition`), JSON dialog (edit / import / download), view/edit mode, delete confirm, copy buttons when `canCopy`, read-only mode; playground page.
  - Gate: standard gate; v0 class parity.
  - Depends on: M3 (`MasterRouting`, JSON dialog shares the bulk dialog's text area).

- [ ] **M5 — Data editor** (`m5-data-editor`)
  - Spec: §3.2 (`MasterDataEditor`, field renderers), §3.1 (`toDataPayload`), §5 (auto-number note), Review Focus 1, 4.
  - Builds: renderer registry + `FieldRendererProps`; built-ins for all ten types; `components` override; form from `/core` validators with focus-first-error; view/edit mode; code locked after create; `generateCode` on save (once per save, StrictMode-safe); delete / restore confirms; JSON dialog; read-only mode; playground page.
  - Gate: standard gate; v0 class parity.
  - Depends on: M4 (JSON dialog, view/edit pattern).

- [ ] **M6 — `/editors`** (`m6-editors`)
  - Spec: §3.3, Review Focus 5.
  - Builds: `RichTextEditor`, `MarkdownEditor`, `JsonEditor` (lazy, client-only, built-in fallback until loaded), `editorRenderers`; `editors.css` build script that keeps only rules containing the libraries' own root classes; build test; React 18 and 19 verification of each library, documented fallback for any that fails; playground toggle between built-ins and editors.
  - Gate: standard gate; build test proves `editors.css` has no element, `:root` or `body` rules.
  - Depends on: M5.

- [ ] **M7 — Copy + `/mbc`** (`m7-copy-mbc`)
  - Spec: §3.2 (copy screens, `tenants`), §3.4 (API, writes, hooks, pages, tenant rules), Review Focus 2, 3, 4.
  - Builds: `MasterCopyRequest`, `MasterCopyTaskList`, `MasterCopyTaskDetail` screens; `createMasterApi(client, { paths })` with every endpoint in §3.4 (bulk batches of 100, `expectedFinishes` per batch, ids encoded); hooks; seven connected pages; re-exports of `createMbcClient`, `MbcClientProvider` and the client errors; playground fake master backend (commands, tasks, sequence) and connected playground pages.
  - Gate: standard gate.
  - Depends on: M6.

- [ ] **M8 — Release** (`m8-release`)
  - Spec: §3 (subpaths not kept), §5, §6, §7, §1 success criteria.
  - Builds: master-web README (entries, routing examples for Next App Router and React Router, editors opt-in, tenant rules), `MIGRATION.md` (every v0 export and host setup step mapped, with a worked typical-host rewrite), root README update, `apps/next-smoke` pages for every master-web entry, docs-imports and package-files tests cover master-web, changeset (four packages → 1.0.0), final whole-repo review.
  - Gate: standard gate + smoke on React 18 and 19 + `changeset status` shows four 1.0.0 releases.
  - Depends on: M7.

## Spec coverage map

| Spec section                      | Sub-plans                                        |
| --------------------------------- | ------------------------------------------------ |
| §1 goal, success criteria         | M8 (verified), all                               |
| §2 layout, boundaries             | M1                                               |
| §2 ui-web additions               | M1                                               |
| §2 client-web addition            | M1                                               |
| §3 entry table, subpaths not kept | M1 (exports), M8 (migration)                     |
| §3.1 core                         | M2                                               |
| §3.2 navigation                   | M3                                               |
| §3.2 screens                      | M3, M4, M5, M7                                   |
| §3.2 host-specific props          | M4 (`canCopy`, `settingOptions`), M7 (`tenants`) |
| §3.2 field renderers              | M5                                               |
| §3.3 editors                      | M6                                               |
| §3.4 `/mbc`                       | M7                                               |
| §3.5 messages                     | M1 (namespaces), M2–M7 (strings)                 |
| §4 internals                      | M3–M7                                            |
| §5 behaviour changes              | M3, M5, M7, M8 (MIGRATION)                       |
| §6 testing                        | every sub-plan                                   |
| §7 delivery, release              | M1 (fixed group), M8                             |
