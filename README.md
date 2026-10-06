# MBC CQRS Serverless web packages

| Package                                                  | What it is                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| [`@mbc-cqrs-serverless/ui-web`](packages/ui-web)         | Shared React UI primitives (Radix, prefixed Tailwind v4)    |
| [`@mbc-cqrs-serverless/client-web`](packages/client-web) | HTTP and AppSync realtime client, `command()`               |
| [`@mbc-cqrs-serverless/survey-web`](packages/survey-web) | Survey form, creator, template screens, backend integration |

All three support React 18 and 19, are ESM-only and SSR-safe, and are released together (one version).

## Develop

```bash
pnpm install
pnpm verify            # format, lint, typecheck, build, test, package checks
pnpm use-react 18      # switch the workspace to React 18 (pnpm use-react 19 to go back)
pnpm playground        # Vite gallery, survey form, creator, templates
pnpm smoke             # Next 16 build importing every entry point
pnpm changeset         # describe a change for the next release
```
