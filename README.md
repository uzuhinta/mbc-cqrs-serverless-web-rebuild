# mbc-cqrs-serverless web packages (rebuild)

pnpm monorepo for `@mbc-cqrs-serverless/ui-web`, `@mbc-cqrs-serverless/client-web`, and `@mbc-cqrs-serverless/survey-web`.

## Requirements

- Node 24.13+ (`.node-version`), pnpm 10.29 (`packageManager`).

## Commands

```bash
pnpm install
pnpm verify          # format check → lint → typecheck → build → test → package checks
pnpm use-react 18    # switch the workspace to React 18 (reinstalls)
pnpm use-react 19    # switch back (the committed state)
```

Build-output tests read `packages/*/dist`, so run `pnpm build` before `pnpm test`.

Design: `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md`.
