# MBC CQRS Serverless web packages

| Package                                                  | What it is                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| [`@mbc-cqrs-serverless/ui-web`](packages/ui-web)         | Shared React UI primitives (Radix, prefixed Tailwind v4)    |
| [`@mbc-cqrs-serverless/client-web`](packages/client-web) | HTTP and AppSync realtime client, `command()`               |
| [`@mbc-cqrs-serverless/survey-web`](packages/survey-web) | Survey form, creator, template screens, backend integration |
| [`@mbc-cqrs-serverless/master-web`](packages/master-web) | Master setting and master data screens, backend integration |

All four support React 18 and 19, are ESM-only and SSR-safe, and are released together (one version).

## Develop

```bash
pnpm install
pnpm verify            # format, lint, typecheck, build, test, package checks
pnpm use-react 18      # switch the workspace to React 18 (pnpm use-react 19 to go back)
pnpm playground        # Vite gallery, survey screens, master screens (with a fake backend)
pnpm smoke             # Next 16 build importing every entry point
pnpm changeset         # describe a change for the next release
```

## Release

Publishing is manual until this repository moves into the GitHub repo:

```bash
pnpm changeset version   # applies the pending changesets (the four packages share one version)
pnpm install             # refreshes the lockfile for the new versions
pnpm release             # verify + Next smoke build, then changeset publish
```

Each package also builds itself before `pack`/`publish` (`prepack`), so an empty package cannot be published.
