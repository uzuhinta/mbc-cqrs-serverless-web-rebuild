# Set up and run the gate

## Tools

- **Node 24.13** — the version in `.node-version`. With fnm: `fnm use` in the repo, or prefix a command with `fnm exec --using=v24.13.0 --`.
- **pnpm 10.29.2** — pinned in `package.json` (`packageManager`). `corepack enable` under Node 24 gives you that exact version. If pnpm is missing, `npx -y pnpm@10.29.2 <command>` works without installing anything.

```bash
pnpm install --frozen-lockfile
pnpm build
```

`--frozen-lockfile` keeps the lockfile as it is; if it fails, someone changed a `package.json` without updating the lockfile — fix that rather than dropping the flag.

## The gate

```bash
pnpm verify
```

runs, in order: `format:check` (Prettier), `lint` (ESLint), `build`, `typecheck`, `test` (Vitest), `check:package` (publint + are-the-types-wrong). CI runs it on React 19 and on React 18, plus the Next smoke build on both. Run the same yourself before you say a change is done — CI is the backstop, not the first check: a React-18-only failure found in CI costs a round trip, and you can't see the error until it runs.

```bash
pnpm verify                      # React 19 (the default)
pnpm use-react 18 && pnpm verify # React 18
pnpm use-react 19                # back to the default
pnpm smoke                       # Next 16 build of apps/next-smoke
```

`use-react` rewrites the workspace's React versions; always switch back to 19 before committing, or the lockfile and `package.json` files change.

Run the gate **inside the checkout you changed** — in your worktree if you use one. From the main checkout, `pnpm lint` also lints every worktree under `.worktrees/` (ESLint's ignores don't cover it), so another branch's work can fail your run.

## Faster loops while you work

```bash
pnpm vitest run --project master-web packages/master-web/src/data/master-data-editor.test.tsx
pnpm vitest run --project scripts scripts/build-css.test.ts
pnpm vitest run --project master-web -t "part of a test name"
pnpm --filter ./packages/master-web typecheck
pnpm prettier --write packages/master-web/src
```

Projects: `ui-web`, `client-web`, `survey-web`, `master-web`, `scripts`.

### Things that look like bugs but are the setup

- **A package's tests or the apps' typecheck use the other packages' built `dist/`.** After changing ui-web or client-web, run `pnpm build` (or `pnpm --filter ./packages/client-web build`) before testing master-web or survey-web, or they test the old code.
- **survey-web and master-web ship the same stylesheet** (each `@source`s the other's `src`). After adding a class in one, rebuild both, or the "same stylesheet" test fails.
- **Build output tests** (`packages/*/test/build`, `scripts/*.test.ts`) read `dist/`: rebuild before running them.

## Seeing a change

- `pnpm playground` — a Vite app with a gallery of ui-web parts and the survey and master screens on a fake backend. `pnpm playground:react18` runs it on React 18.
- `pnpm smoke`, then `pnpm --filter @mbc-cqrs-serverless/next-smoke start` — the Next app that imports every entry point from Server and Client Components; a hydration or `'use client'` mistake shows up here.

## When the gate fails

Read the first failure, not the last line. Common ones:

| Failure                                                                | Usual cause                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `format:check`                                                         | run `pnpm format`                                                                           |
| lint `no-restricted-imports`                                           | an import the libraries may not use (see `making-changes.md`)                               |
| `build-output` / `use client` test                                     | a module with JSX or hooks lost `'use client'`, or a plain module gained it                 |
| "styles.css is the same in both packages"                              | rebuild survey-web and master-web                                                           |
| "publishes exactly the modules its entries reach" / "ships every file" | a new file is unreachable from `exports`, or an import points at a file that is not shipped |
| a test passes alone but fails in the full run                          | shared state or timing; look for an effect that reports after render and use `waitFor`      |
