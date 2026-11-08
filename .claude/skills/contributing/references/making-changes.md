# Making a change

## Where code goes

| Place                                    | Holds                                                                                      | May import                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `packages/ui-web/src`                    | primitives, theme tokens, `MbcProvider`, message helpers (`defineMessages`, `useMessages`) | Radix, cmdk, Tailwind helpers                                              |
| `packages/client-web/src`                | HTTP, realtime, `command()`; `src/react` for hooks                                         | nothing UI                                                                 |
| `packages/<screen>-web/src/core`         | types, parsers, validators, request bodies — no React                                      | **only `zod` and its own files**, so servers and route handlers can use it |
| `packages/<screen>-web/src` (root entry) | prop-driven screens: data in, callbacks out                                                | ui-web, core                                                               |
| `packages/<screen>-web/src/mbc`          | backend integration: API, hooks, connected pages                                           | client-web, the screens                                                    |
| `packages/master-web/src/editors`        | opt-in rich editors                                                                        | the editor libraries, **only via dynamic `import()`**                      |
| `apps/playground`, `apps/next-smoke`     | manual and SSR checks                                                                      | the built packages                                                         |
| `scripts/`                               | build steps and repo-wide tests                                                            | Node                                                                       |

Screens never fetch: a host without the mbc backend must be able to use them with its own data. Backend calls live in `/mbc`.

## The rules, and why

**Test first.** Write the test that shows the bug or the missing behaviour, run it, and check it fails _for the reason you expect_ (read the message — a typo or a missing import is not the red you want). Then the smallest change that makes it pass, then the whole project's suite. If a test already passes before your change, it does not test your change.

Tests use Testing Library (`getByRole` with an accessible name, `userEvent`), axe for accessibility, and `renderToString` for server rendering. Assert what a user would notice, not implementation details.

**React 18 and 19.** Peer range `^18.2.0 || ^19.0.0`. Don't use `use`, `useActionState`, `useOptimistic`, `useFormStatus`, ref as a plain prop, or `<Context>` as a provider — lint blocks the hooks; the rest is on you.

**ESM only, SSR-safe.** No `window`/`document` during render (use effects, or ui-web's `useHydrated`); dates and random ids must render the same on server and client.

**`'use client'`** goes on every module with JSX or hooks — and only those. A build test checks it survives. Put constants and plain functions a server might need in a module without the directive (e.g. `/mbc`'s `api.ts`, not a pages file); otherwise a Server Component gets a client reference instead of the value.

**Styles.** Every class is `mbc:`-prefixed (`mbc:flex mbc:gap-2`); there is no preflight; theme through `--mbc-*` variables; root and portal elements carry `data-mbc`. A source test refuses an unprefixed class in a class list, because Tailwind would silently drop it. Keyframe names are prefixed by the build. Use ui-web's components rather than restyling raw elements, so survey and master screens look the same in one app.

**Text.** Every string a user can see or hear (labels, `aria-label`, errors, empty states) comes from a typed message namespace (`defineMessages(namespace, { ja, en })`, read with `useMessages`). Japanese is the default and matches the previous 0.0.x text; English is complete. Add the key to the type, `ja` and `en`; hosts override by namespace.

**Accessibility.** Every control has an accessible name; dialogs return focus to what opened them (a dialog without a trigger needs `onCloseAutoFocus`); a live region (`role="status"`/`alert`) must exist before its text changes, or screen readers may stay silent; don't move focus to elements a person cannot reach (`aria-hidden`, `tabindex=-1`).

**Data compatibility.** Records written by 0.0.x must load and save unchanged: keep keys you don't know, keep a stored value's type when the input wasn't edited, and remember the backend _merges_ updates — a key left out of a body keeps its old value, so clearing a field means sending an empty value.

**Libraries we don't use in packages:** `process.env`, `next`/`next/*`, `nuqs`, `next-usequerystate`, `sonner`, `axios`, `@apollo/client`, `aws-amplify`, `aws-appsync-*`, `swr`, `mobx`, `react-draggable`, `react-resizable`, `usehooks-ts`, `patch-package`; no `console.*`, no `any`, no hard-coded routes (routing comes from the host through a `routing` prop). Most are lint errors. The reason is the same for all: these are the host's choices.

**No consumer names.** These packages are used by many apps. Never put a specific consuming app's or organisation's name, endpoint, constant or flag into code, tests, fixtures, docs, specs or commit messages. Make host-specific behaviour a generic, optional prop ("`canCopy`", "`settingOptions`") and describe it generically.

**TypeScript.** `strict` and `noUncheckedIndexedAccess`; no `any` (use `unknown` and narrow). Public types are exported from the entry that exports the value.

## Shape of a good change

1. Find the nearest existing feature and copy its structure (file placement, prop naming, message namespace, test style).
   A new prop on a screen usually belongs on its connected page in `/mbc` too (`MasterSettingList` → `MbcMasterSettingListPage`), or hosts using the page can't reach it — pass it through and test that it arrives.
2. Failing test → fix → project suite → `pnpm verify` (and React 18 if React code changed).
3. If the public API changed: README; if a 0.0.x behaviour changed: `MIGRATION.md`; if the design changed: the spec under `docs/superpowers/specs/`.
4. Look at the change in the playground, or in the smoke app when SSR is involved.
