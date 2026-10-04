# Survey Web Rebuild — Orchestrator Plan

> **For agentic workers:** This plan does not contain implementation steps. It sequences eight sub-plans. For each sub-plan: write its detailed plan (superpowers:writing-plans), execute it (superpowers:subagent-driven-development or superpowers:executing-plans), pass its gate, then tick it here. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@mbc-cqrs-serverless/ui-web`, `@mbc-cqrs-serverless/client-web`, and `@mbc-cqrs-serverless/survey-web@1.0.0` from the `rebuild/` pnpm monorepo, as specified.

**Architecture:** Three published ESM-only packages built with tsdown (unbundled) and Tailwind v4 (prefixed `mbc:`, unlayered `styles.css` + opt-in `styles.layer.css`). `survey-web` depends on `ui-web` for primitives/theme/i18n and, only in its `/mbc` entry, on `client-web` for HTTP + AppSync realtime. Everything is verified against React 18 and React 19.

**Tech Stack:** pnpm 10.29, Node 24.13 (fnm), TypeScript ~6.0, tsdown 0.23, Tailwind CSS 4.3, Vitest 5 + jsdom 29 + Testing Library, ESLint 10 + typescript-eslint 8, Radix (`radix-ui`), react-hook-form 7, zod 4, dnd-kit, react-day-picker 9, Changesets.

**Spec:** `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md`

## Global Constraints

Every sub-plan's tasks implicitly include these.

- React peer range in every package: `"react": "^18.2.0 || ^19.0.0"`, `"react-dom": "^18.2.0 || ^19.0.0"`.
- ESM-only output; `"type": "module"`; no CommonJS.
- No `process.env`, `next`, `next/*`, `nuqs`, `sonner`, or hard-coded routes in any `packages/*/src` file.
- No React-19-only APIs in `packages/*/src`: `use`, `useActionState`, `useOptimistic`, `useFormStatus`, ref as a plain prop, `<Context>` as a provider. Use `forwardRef` and `Context.Provider`.
- No `console.*` in `packages/*/src`.
- `"use client"` only in modules that need it; it must survive the build.
- All CSS classes prefixed `mbc:`; no preflight; theme through `--mbc-*` CSS variables; dark mode under `.dark` or `[data-mbc-theme="dark"]`.
- Every root element and portal content element renders the `data-mbc` attribute.
- UI strings come from typed messages (`ja` default, `en` built in); no hard-coded UI text in components.
- Survey JSON stays v0-compatible.
- TypeScript `strict: true` and `noUncheckedIndexedAccess: true`; no `any` (lint error).
- Commands run under Node 24.13: prefix with `fnm exec --using=v24.13.0 --` (shell state does not persist between commands).
- Commits use Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

Cross-cutting failure modes no single sub-plan's happy-path tests would catch. Each line names the owning sub-plan that must pin it with a test.

1. **Host app with Tailwind v3 preflight loaded after `styles.css`** → library buttons, inputs, and borders keep their styling. _Owner: SP1 (CSS structure test: `styles.css` has no `@layer` blocks and no rule outside `:where(...)` / `:root` targets elements without an `mbc:` class), SP2 (playground fixture page that loads a Tailwind v3 preflight after the library CSS, for a visual check)._
2. **React 18 StrictMode double-mount during `useCommand` / realtime subscribe** → exactly one live subscription afterwards, the command resolves once, nothing leaks on unmount. _Owner: SP3._
3. **v0 survey JSON with extra unknown fields, a dangling `nextSectionId`, or no leading section header** → parses, renders, and navigates without throwing. _Owner: SP4 (parse + engine), SP5 (render)._
4. **Server rendering in Next App Router** (`SurveyForm` with `shuffleOptions`, any generated ids) → no hydration mismatch, no `window` access during render. _Owner: SP5 (`renderToString` test), SP8 (`next-smoke` build)._
5. **`getAuthToken` rejects, or the realtime socket drops mid-`command()`** → the promise rejects with a typed error (or resubscribes and still resolves); it never hangs past `timeoutMs`. _Owner: SP3._

---

## Process for each sub-plan

1. Branch from `main`: `git switch -c sp<N>-<slug>`.
2. Write the detailed plan to `docs/superpowers/plans/2026-10-04-<NN>-sp<N>-<slug>.md` (superpowers:writing-plans), self-review it against the spec sections listed below.
3. Execute it task by task (TDD, small commits).
4. Pass the gate (below), then request a code review (superpowers:requesting-code-review) and fix findings.
5. Merge to `main` with `git merge --ff-only` (superpowers:finishing-a-development-branch), tick the checkbox here, commit.

Screens and primitives (SP2, SP5, SP6, SP7) also use the `evon:ui-ux` skill in **refactor-keep-the-look** mode: v0 visuals are the reference, improvements are limited to spacing consistency, states (hover, focus, disabled, error, empty, loading), and accessibility.

### Standard gate (every sub-plan)

```bash
fnm exec --using=v24.13.0 -- pnpm verify                      # React 19
fnm exec --using=v24.13.0 -- pnpm use-react 18 && fnm exec --using=v24.13.0 -- pnpm verify
fnm exec --using=v24.13.0 -- pnpm use-react 19                # restore
git status --porcelain                                        # must be empty after restore
```

`pnpm verify` = lint → typecheck → build → test → package checks (defined in SP1).

---

## Sub-plans

- [x] **SP1 — Workspace foundation** (`01-sp1-foundation`)
  - Spec: §2 (layout, boundaries, library rules), §3.1 (CSS pipeline), §8 (toolchain, CI).
  - Builds: pnpm workspace, tsconfig, ESLint (incl. library-rule lints), Prettier, Vitest projects + jsdom + Testing Library, `scripts/use-react.ts`, shared tsdown config with `"use client"` preservation, shared Tailwind build script producing `styles.css` + `styles.layer.css`, theme tokens (light/dark, v0 values) + scoped base CSS, shared build-output test helpers, Changesets, CI workflow. Proven end to end by a `ui-web` skeleton exporting `cn` and `Button`.
  - Gate: standard gate; build-output tests prove `"use client"` survives, CSS is prefixed, `styles.css` is unlayered, `styles.layer.css` is fully layered.
  - Depends on: —

- [ ] **SP2 — `ui-web`** (`02-sp2-ui-web`)
  - Spec: §3.2 tokens, §3.3 provider + i18n, §3.4 primitives.
  - Builds: animation utilities for Radix open/close states, `MbcProvider`, `defineMessages` / `useMessages` / `MessagesFor`, `ui` namespace (`ja`, `en`), the 20 primitives + `Field*` helpers, `apps/playground` (Vite) with a primitives gallery and the Tailwind-v3-preflight fixture page.
  - Gate: standard gate; `vitest-axe` clean on the gallery primitives; every portal primitive renders `data-mbc` on its content.
  - From the SP1 review: variant helpers (`badgeVariants`, `inputVariants`, …) in modules without `"use client"`; the keyframes test allows only tw-animate-css's `enter`/`exit` besides `mbc-*`; playground fixtures for (a) the latest Tailwind v3 preflight loaded after the library CSS and (b) `styles.layer.css` imported before a host Tailwind v4 stylesheet.
  - Depends on: SP1.

- [ ] **SP3 — `client-web`** (`03-sp3-client-web`)
  - Spec: §4.
  - Builds: `createMbcClient` HTTP (auth, tenant, query arrays, timeout, abort), typed errors, AppSync realtime client (URL derivation, handshake, `ka` watchdog, multiplexing, reconnect), `command()` with subscribe-before-send, `/react` provider + `useCommand`.
  - Gate: standard gate; fake-WebSocket tests for handshake, keep-alive loss, reconnect + resubscribe, finish-before-response race, timeout, abort, StrictMode.
  - Depends on: SP1.

- [ ] **SP4 — `survey-web` schema and engine** (`04-sp4-survey-core`)
  - Spec: §5.1 (schema, types, aliases, `validateAnswers`), §6.1 registry shape, §6.2 engine, §7 schema-compat.
  - Builds: `survey-web` package scaffold (entries `.`, `/templates`, `/mbc` as empty barrels, CSS build scanning `ui-web` sources), zod 4 `SurveySchema`, `parseSurvey`, types + deprecated aliases, v0 compatibility fixtures, `buildPages`, `resolveNext`, `validateAnswer`, `collectAnswers`, `validateAnswers`, `survey` messages namespace (validation + form strings).
  - Gate: standard gate; v0 `schema.test.ts` cases ported and passing; engine tests for branching, jumps, dangling targets, abandoned-branch clearing.
  - Depends on: SP1, SP2 (messages infrastructure).

- [ ] **SP5 — `SurveyForm`** (`05-sp5-survey-form`)
  - Spec: §5.1 `SurveyForm` props, §6.1 renderers, §6.2 form wiring, §6.4–6.6.
  - Builds: nine question renderers + registry renderer entries, `SurveyForm` (sections, Back/Next/Submit, async submit, `onSubmitError`, `onSectionChange`, `components`, `className`), focus management, shuffle-after-mount, playground form page.
  - Gate: standard gate; ported `survey-form.test.tsx` behaviours; `renderToString` hydration test; `vitest-axe` clean.
  - Depends on: SP4.

- [ ] **SP6 — `SurveyCreator`** (`06-sp6-survey-creator`)
  - Spec: §5.1 `SurveyCreator` props + handle, §6.1 editors, §6.3 creator state.
  - Builds: `creatorReducer` with all lock guards, `useSyncExternalStore` store, nine question editors, section header/action editors, floating action bar, section reorder dialog, dnd-kit (pointer + keyboard + announcements), preview dialog using `SurveyForm`, `ref` handle, playground creator page.
  - Gate: standard gate; ported `locked-question`, `section-locked`, `section-locked-question`, `question-creator-id`, `id` behaviours; keyboard drag test.
  - Depends on: SP5.

- [ ] **SP7 — `/templates` and `/mbc`** (`07-sp7-templates-mbc`)
  - Spec: §5.2, §5.3, §5.4 deprecated subpaths.
  - Builds: `SurveyTemplateList`, `SurveyTemplateEditor`, `createSurveyTemplateApi`, `submitSurveyAnswer`, `useSurveyTemplates`, `useSurveyTemplate`, `useSurveyTemplateMutations`, `useSubmitSurveyAnswer`, `MbcSurveyTemplateListPage`, `MbcSurveyTemplateEditorPage`, `/SurveyForm` + `/SurveyCreator` alias entries, playground pages with a mock client.
  - Gate: standard gate; ported `get-pagination-item` behaviour; build-output test that `.` and `/templates` do not import `client-web`.
  - Depends on: SP3, SP6.

- [ ] **SP8 — Release readiness** (`08-sp8-release`)
  - Spec: §5.4 migration, §7 remaining build-output checks, §8 CI/next-smoke/docs/release.
  - README must state the host requirements from spec §3.1: `styles.layer.css` import order, Tailwind v3 ≥ 3.4, and that `mbc:` overrides only work for shipped classes.
  - Builds: `apps/next-smoke` (Next 16 App Router + Turbopack) importing every entry point in client and server components; CI job for it; READMEs for the three packages; `packages/survey-web/MIGRATION.md`; initial changesets (`major` for all three → `1.0.0`); final whole-repo review.
  - Gate: standard gate + `next build` in `apps/next-smoke` on React 18 and 19 + `changeset status` shows the three `1.0.0` releases.
  - Depends on: SP7.

## Spec coverage map

| Spec section                         | Sub-plan                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| §1 success criteria 1, 3             | SP1, SP2, SP8                                                                |
| §1 success criteria 2, 4, 5, 6       | SP4–SP7                                                                      |
| §2 layout, boundaries, library rules | SP1 (enforced by lint + build-output tests), SP7 (client-web isolation test) |
| §3 ui-web                            | SP1 (CSS pipeline), SP2                                                      |
| §4 client-web                        | SP3                                                                          |
| §5.1 core API                        | SP4, SP5, SP6                                                                |
| §5.2 `/templates`                    | SP7                                                                          |
| §5.3 `/mbc`                          | SP7                                                                          |
| §5.4 migration                       | SP7 (aliases), SP8 (`MIGRATION.md`)                                          |
| §6 internals                         | SP4, SP5, SP6                                                                |
| §7 testing                           | every SP; schema-compat SP4; build-output SP1 + SP7 + SP8                    |
| §8 CI, tooling, release              | SP1, SP8                                                                     |
| §9 out of scope                      | —                                                                            |
