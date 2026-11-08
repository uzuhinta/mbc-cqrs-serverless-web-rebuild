# Reviewing a contribution

Review the branch against `main`, read-only:

```bash
git log --oneline main..HEAD
git diff --stat main...HEAD
git diff main...HEAD -- <path>
```

Read every commit, then run the gate yourself; don't trust a description of a green run.

## Severity

Grade each finding by what a person using the package gets if it ships, not by whether a rule names it:

- **Critical** — broken install or import, data loss or silent data change, security (unsanitised HTML, script links), a screen that crashes.
- **Important** — a wrong result a user will hit, an inaccessible control, SSR/hydration mismatch, React 18 breakage, a missing test for the changed behaviour, a public API change without docs or changeset.
- **Minor** — polish, naming, docs wording.

For each finding give the file and line, what goes wrong in a concrete scenario, and a fix.

## Checklist

**Tests**

- [ ] Each behaviour change has a test that would fail without it (ask, or check by reverting the fix locally).
- [ ] Tests assert what a user sees (roles, names, text), not internals; async UI waits with `findBy`/`waitFor`.
- [ ] `pnpm verify` passes on React 19 and 18; `pnpm smoke` when entries, SSR or `'use client'` changed.

**Boundaries and the libraries' rules**

- [ ] `/core` imports only `zod` and itself; screens don't fetch; backend calls are in `/mbc`.
- [ ] Editor libraries only under `master-web/src/editors`, only through `import()`.
- [ ] No `process.env`, `next`, `console`, `any`, host libraries or hard-coded routes.
- [ ] `'use client'` on modules with JSX/hooks only; server-needed constants in plain modules.
- [ ] No React-19-only APIs.

**UI**

- [ ] Every class `mbc:`-prefixed; ui-web components used rather than restyled raw elements.
- [ ] All visible and spoken text from messages, with `ja` and `en`.
- [ ] Controls named; focus returns after dialogs; live regions exist before their text; read-only states have no mutating controls (including keyboard paths).
- [ ] No `window`/`document` during render; dates render the same on server and client.

**Data**

- [ ] Unknown keys survive load → save; untouched values keep their stored type.
- [ ] Clearing a value sends an empty value (the backend merges updates).
- [ ] Ids with `#`, `/`, `?`, `%` or spaces round-trip through links and API paths.
- [ ] Timeouts and dropped connections are "outcome unknown", not "failed".

**Release and docs**

- [ ] Changeset for user-visible changes; README/MIGRATION/spec updated where the table in `preparing.md` says.
- [ ] Commits follow the format; messages explain why.
- [ ] No specific consuming app or organisation named anywhere — code, fixtures, docs, commit messages (`git log --format=%B main..HEAD`).

## Writing the review

Start with what is done well, specifically. Then the findings, most severe first, each with file:line, scenario, and fix. End with a verdict: ready to merge, ready with fixes, or not ready — and one sentence why.
