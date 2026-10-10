# Master Web Rebuild — Orchestrator Plan

> **For agentic workers:** This plan does not contain implementation steps. It sequences eight sub-plans. For each sub-plan: write its detailed plan (superpowers:writing-plans), execute it (superpowers:executing-plans, inline), pass its gate, get one fresh whole-branch review, fix, merge, then tick it here. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@mbc-cqrs-serverless/master-web` with full v0 0.0.50 parity, plus the ui-web and client-web additions it needs, and release all four packages together as 1.0.0.

**Architecture:** A fourth ESM-only package in the `rebuild/` monorepo, built like survey-web (tsdown unbundled, Tailwind v4 `mbc:` prefix, `styles.css` + `styles.layer.css`). Layers: React-free `/core`, prop-driven screens at the root, opt-in rich editors in `/editors`, backend integration in `/mbc` on client-web. ui-web gains `Table`, `Accordion`, `Command`, `MultiSelect`, `useHydrated`; client-web gains `command({ expectedFinishes, onProgress })` and a public `useQuery`.

**Tech Stack:** pnpm 10.29, Node 24.13 (fnm), TypeScript ~6.0, tsdown, Tailwind CSS 4, Vitest + jsdom + Testing Library + axe-core, ESLint 10, Radix, cmdk, react-hook-form 7, zod 4, dnd-kit, Changesets. Optional peers in `/editors`: `react-quill-new`, `@uiw/react-md-editor`, `jsoneditor`.

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

Look notes from the M3b probe, left as they are (ui-web's shared look, or polish for later):

- Hover states of ui-web's outline, secondary and pagination buttons are faint on white (a background a few shades off, or a border colour change only).
- When a wide table scrolls sideways on a phone, its first column is not pinned.
- Code links in table rows are 20px tall; they pass WCAG 2.5.8 through row spacing, not size.
- Links use `text-primary`, which is near-black in ui-web's palette: they read as text until hovered (v0's look).

Added by the M4 probe:

- ui-web's switches are 32×18px; they pass WCAG 2.5.8 through spacing, not size.
- Dropdown menus have a border of about 1.23:1 on white, heavier than a decorative line needs.
- On a phone the fields table scrolls sideways with no column pinned (v0 pinned three columns, which covered the screen at 375px; they stay pinned from `md` up).

Added by M6:

- The Markdown editor stays light in dark mode (`data-color-mode="light"`); its toolbar titles and Quill's picker labels ("Normal", "Heading 1") are the libraries' English.

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

- [x] **M2 — `/core`** (`m2-core`)
  - Merged 2026-10-07: implemented by an external agent from the plan; independent review (0 Critical, 2 Important + 4 re-graded) fixed test-first; gate React 19 and 18 642/642, smoke passes. Also fixed: `pnpm verify` builds before it typechecks (clean checkouts / CI).
  - Plan: `docs/superpowers/plans/2026-10-07-m2-core.md` — written for an implementer without this conversation's context; its code was replayed task by task on `main` (5b8a2c9) and passes the full gate.
  - Spec: §3.1, §5 (auto-number type code note), Review Focus 1.
  - Builds: types (`MasterFieldType`, `MasterField`, `MasterSetting`, `MasterData`), `parseMasterSetting`, `parseMasterData` (tolerant, passthrough), `fieldTypes` table (options, defaults, `toFormValue`, `fromFormValue`, `validate`), `validateMasterData`, `toDataPayload`, `validateFieldDefinition`, `defaultSettingFields`, `parseBulkJson` + v0's `MapResult` / `MappedSetting` / `MappedData` / `mapResultToBulkItem`, `MasterCopyRequest`; error keys with ja/en messages in `master`; fixtures with all ten field types and unknown keys.
  - Gate: standard gate; `/core` build has no React import.
  - Depends on: M1.

- [x] **M3a — List building blocks** (`m3a-list-parts`)
  - Merged 2026-10-07 (fast-forward, at the user's request, before an independent code review): implemented by an external agent from the plan, plus its own fix for progress after a partial import failure; gate on React 19 667/667, smoke passes. A visual probe of the parts found four defects (pagination labels breaking per character, a cut page-size select, header contrast under 4.5:1, a dialog taller than the screen); M3b fixes them.
  - Plan: `docs/superpowers/plans/2026-10-07-m3a-list-parts.md`.
  - Spec: §2 (ui-web additions), §3.2 (navigation, `BulkImportDialog`), §4 (data table), Review Focus 2, 3, 5.
  - Builds: ui-web `PaginationBar` (survey-web's template pagination moved to ui-web, plus master v0's `table` arrangement: result count, page size after the pages, page-number box; survey-web's `TemplatePagination` re-exports it); master-web `MasterRouting` / `MasterTarget` / `MasterLink`; internal `DataTable` (sortable headers with `aria-sort`, pagination above and below, row selection, empty and loading rows); `parseBulkJson` `tenantCode` option; `BulkImportDialog`; `master.table` and `master.bulkDialog` messages; smoke render.
  - Ruling: no TanStack — the lists need fixed columns, server-side sorting and paging, and checkbox selection, which a small component covers (spec §2 and §4 updated).
  - Gate: standard gate.
  - Depends on: M2.

- [x] **M3b — List screens** (`m3b-lists`)
  - Merged 2026-10-08 (fast-forward): implemented by an external agent from the plan; the branch matches the plan apart from one redundant class; the implementer's own review found nothing; gate React 19 and 18 702/702, smoke passes.
  - Plan: `docs/superpowers/plans/2026-10-07-m3b-lists.md` — replayed task by task on M3a's tip before hand-over.
  - Spec: §3.2 (`MasterSettingList`, `MasterDataList`), §4 (state), Review Focus 2, 5.
  - Builds: ui-web `--mbc-emphasis` token (master v0's section headers); list row types; per-type cell formatting; `MasterSettingList` (search, JSON editor, create, table, back) without the "own tenant" column (v0's live list had none — it lived in the unused `MasterTable.tsx`); `MasterDataList` (accordion: setting info, search, results); `masterSetting` / `masterData` messages; playground pages on fixture data; smoke render; fixes from the visual probe of M3a's parts (`PaginationBar` labels on one line and a page-size select sized to its text; `DataTable` header contrast and a minimum width per column; the JSON dialog kept on screen).
  - Gate: standard gate; master v0 layout parity for both lists (layout markup, not ui-web controls).
  - Depends on: M3a.

- [x] **M4 — Settings editor** (`m4-settings-editor`)
  - Merged 2026-10-08 (fast-forward): implemented by an external agent from the plan. The branch matches the plan apart from the files `pnpm add` writes. The implementer's review found that a second Save during the code check could create twice, and that JSON defaults of `0` / `false` / `null` were dropped on save; both were fixed test-first. Gate on React 19 and 18: 753/753, smoke passes.
  - Plan: `docs/superpowers/plans/2026-10-08-m4-settings-editor.md` — replayed task by task on `main` before hand-over.
  - Deferred minors: a failed code check uses the timeout wording; the JSON dialog omits attribute keys the editor does not edit (an update still keeps them); the read-only test looks for the copy links as buttons, not links; inputs stay editable while saving; a JSON default v0 stored as a string shows escaped in the field dialog.
  - Spec: §3.2 (`MasterSettingEditor`, host-specific props `canCopy`, `settingOptions`), §4 (forms, fields table), Review Focus 4.
  - Builds: `MasterSettingEditor` (code with async uniqueness, name, description, `settingOptions`), fields table (dnd-kit sortable + keyboard + announcements; `code`/`name`/`seq` fixed), field dialog (per-type options from `fieldTypes`, `validateFieldDefinition`), JSON dialog (edit / import / download), view/edit mode, delete confirm, copy buttons when `canCopy`, read-only mode; playground page. Also: `/core` `settingToForm`, `toSettingPayload` (create sends `settingValue`, update keeps unknown attribute keys), `validateSettingForm`, `parseSettingJson` / `settingJson` (v0's checks plus the field dialog's rules); auto-number `formats`; a shared `JsonDialog` (M5 reuses it); ui-web's destructive red darkened to pass 4.5:1.
  - Gate: standard gate; v0 class parity.
  - Depends on: M3b (`MasterRouting`, `DataTable`, the JSON dialog pattern).

- [x] **M5 — Data editor** (`m5-data-editor`)
  - Merged 2026-10-10 (fast-forward): implemented by an external agent from the plan; the branch matches the plan exactly. The implementer's review found two Important issues, both fixed test-first: a timed-out create now keeps Save off (a retry could number a second record), and the JSON a new auto-numbered record opens with (empty code) applies. Gate on React 19 and 18: 782/782, smoke passes.
  - Plan: `docs/superpowers/plans/2026-10-08-m5-data-editor.md` — replayed task by task on `main` before hand-over.
  - Deferred minors: edits to attribute keys no field owns are shown in the JSON dialog but dropped on apply; Save stays enabled while delete or restore runs; a soft-deleted record can still be edited (v0); field errors stay until the next submit; an unrelated edit writes `attributes.seq` as the string `'0'` (v0); the date test does not pin `TZ`; the mount test uses empty values only; the playground keeps a stale `data` after delete or restore.
  - Spec: §3.2 (`MasterDataEditor`, field renderers), §3.1 (`toDataPayload`), §5 (auto-number note), Review Focus 1, 4.
  - Builds: renderer registry + `FieldRendererProps`; built-ins for all ten types; `components` override; form from `/core` validators with focus-first-error; view/edit mode; code locked after create; `generateCode` on save (once per save, StrictMode-safe); delete / restore confirms; JSON dialog; read-only mode; playground page. Also: `/core` `dataJson` / `parseDataJson` (the record JSON); a shared `ConfirmButton` and failure alert, which M4's editor now uses too. The sequence request bodies move to M7 (`createMasterApi`).
  - Gate: standard gate; v0 class parity.
  - Depends on: M4 (JSON dialog, view/edit pattern).

- [x] **M6 — `/editors`** (`m6-editors`)
  - Merged 2026-10-10 (fast-forward): executed inline from the plan; the branch matched the plan. A fresh review found one Critical issue (the Markdown preview rendered a record's raw HTML and `javascript:` links) and three Important ones (Quill's HTML wrote every space as `&nbsp;` and was re-read on every render; Tab could not leave the editors; a disabled `JsonEditor` sent text that is not JSON to its tree view). All four were fixed test-first (`rehype-sanitize`, an uncontrolled Quill, Tab released in all three, text always loaded in code mode). Gate on React 19 and 18: 809/809, smoke passes.
  - Plan: `docs/superpowers/plans/2026-10-10-m6-editors.md` — replayed task by task on `main` before execution.
  - Deferred minors: focus is lost when a library replaces a focused text box; the text box flashes on every mount even when the library is cached; read-only Quill has no `aria-readonly` and the disabled Markdown preview no label; `JsonEditor` ignores `onBlur`; the Markdown preview's CSS has `body[data-color-mode]` rules (the spec calls it scoped); read-only Quill loses its top border; no SSR test for `MarkdownEditor` / `JsonEditor` and none for relabelling Ace's input; the data editor's focus lookup is not scoped to its form; jsoneditor's menus follow `navigator.language`.
  - Spec: §3.3, Review Focus 5.
  - Builds: `RichTextEditor`, `MarkdownEditor`, `JsonEditor` (lazy, client-only, built-in fallback until loaded), `editorRenderers`; `editors.css` build script that keeps only rules containing the libraries' own root classes; build test; React 18 and 19 verification of each library, documented fallback for any that fails; playground toggle between built-ins and editors. Also: the data editor focuses an invalid field's control by its id (a rich editor's editing area is not an input).
  - Gate: standard gate; build test proves `editors.css` has no element, `:root` or `body` rules.
  - Depends on: M5.

- [ ] **M7 — Copy + `/mbc`** (`m7-copy-mbc`)
  - Spec: §3.2 (copy screens, `tenants`), §3.4 (API, writes, hooks, pages, tenant rules), Review Focus 2, 3, 4.
  - Builds: `MasterCopyRequest`, `MasterCopyTaskList`, `MasterCopyTaskDetail` screens; `createMasterApi(client, { paths })` with every endpoint in §3.4 (bulk batches of 100, `expectedFinishes` per batch, ids encoded; v0's two sequence requests behind the data editor's `generateCode`, checked against the sequence backend, §5); hooks; seven connected pages; re-exports of `createMbcClient`, `MbcClientProvider` and the client errors; playground fake master backend (commands, tasks, sequence) and connected playground pages.
  - Gate: standard gate.
  - Depends on: M6.

- [ ] **M8 — Release** (`m8-release`)
  - Spec: §3 (subpaths not kept), §5, §6, §7, §1 success criteria.
  - From M6's review: the README's editors section names the peers to install, `editors.css` (its sprite in `editors-assets/`), `@uiw/react-md-editor/markdown-editor.css` for bundlers that drop CSS imported from JavaScript, the CSP the editors need (Ace injects `<style>` elements; jsoneditor starts its worker from a `data:` URL) and their size (jsoneditor with Ace is about 1 MB minified, loaded after mount); `next-smoke` imports `editors.css` and passes `editorRenderers` from a Server Component.
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
| §3.2 navigation                   | M3a                                              |
| §3.2 screens                      | M3a, M3b, M4, M5, M7                             |
| §3.2 host-specific props          | M4 (`canCopy`, `settingOptions`), M7 (`tenants`) |
| §3.2 field renderers              | M5                                               |
| §3.3 editors                      | M6                                               |
| §3.4 `/mbc`                       | M7                                               |
| §3.5 messages                     | M1 (namespaces), M2–M7 (strings)                 |
| §4 internals                      | M3a–M7                                           |
| §5 behaviour changes              | M3a, M5, M7, M8 (MIGRATION)                      |
| §6 testing                        | every sub-plan                                   |
| §7 delivery, release              | M1 (fixed group), M8                             |
