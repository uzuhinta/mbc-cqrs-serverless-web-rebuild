# Preparing the contribution

## Branch

Work on a branch from `main` (`git switch -c fix-bulk-timeout-text`), never on `main` itself. A worktree under `.worktrees/` (git-ignored) keeps your main checkout free: `git worktree add .worktrees/<name> -b <name> main`, then `pnpm install --frozen-lockfile --offline && pnpm build` inside it, and run every command — tests, lint, the gate — from inside it.

## Commits

Conventional Commits, one change per commit:

```
fix(master-web): keep focus when the field dialog closes

The field dialog has no trigger of its own, so closing it sent focus to
the page's start. Focus now goes back to the button that opened it.
```

- **type**: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
- **scope**: the package (`ui-web`, `client-web`, `survey-web`, `master-web`) or app (`next-smoke`, `playground`); none for repo-wide changes.
- **subject**: what changes _for someone using the package_, in plain words, lower case, no full stop.
- **body**: why — the situation that went wrong and what happens now. Someone reading `git log` a year later should not need the PR.
- A commit that went in broken gets a follow-up commit that says so; don't rewrite shared history.

## Changeset

The four packages are a Changesets _fixed_ group: they always release together with one version, and each depends on its siblings at the exact version (`workspace:*`). For any change a package user would notice:

```bash
pnpm changeset
```

Pick the packages you changed and the bump (patch: fix; minor: new, backwards-compatible API; major: breaking), and write one or two sentences for the changelog, aimed at someone upgrading. Check `.changeset/` first: if a pending changeset already describes an unreleased change of the same kind (for example the first `1.0.0` release), extend it rather than adding a near-duplicate. Docs-only, test-only and internal script changes need no changeset.

## Docs

| You changed…                                 | Update                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| a public prop, export, hook or message key   | the package's `README.md` (and its examples must still type-check — a test checks that every import in the docs exists) |
| behaviour that differed in 0.0.x             | `packages/<pkg>/MIGRATION.md`                                                                                           |
| the design (a boundary, a new entry, a rule) | the spec in `docs/superpowers/specs/`                                                                                   |
| how to develop or release                    | the root `README.md`                                                                                                    |

Write docs for an app developer who has never seen this repo: what it does, how to use it, what changes for them.

## Pull request

```markdown
## What

One or two sentences: what changes for someone using the package.

## Why

The situation that went wrong or was missing.

## How

The approach, and anything a reviewer should look at closely.

## Checked

- pnpm verify (React 19): <result>
- pnpm use-react 18 && pnpm verify: <result>
- pnpm smoke: <result, if SSR or entries changed>
- Playground / browser: <what you looked at>

## Changeset

<the bump and the changelog line, or "none: tests/docs only">
```

Before opening it, review your own branch with `review-checklist.md`.
