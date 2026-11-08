---
name: mbc-cqrs-serverless-web
description: How to use the MBC CQRS Serverless web packages in an app — @mbc-cqrs-serverless/ui-web, client-web, survey-web and master-web: install them, pick and import the right stylesheet, set up MbcProvider, the client and routing (Next App Router, Pages Router, React Router, Vite), use the survey and master screens and connected pages, translate or theme them, migrate from 0.0.x, and fix problems such as unstyled screens, hydration errors, "use client" errors, timeouts or editor CSP. Use this whenever the user's app imports or wants to add any @mbc-cqrs-serverless/*-web package, mentions master settings / master data / survey screens from mbc-cqrs-serverless, or upgrades from the 0.0.x master or survey packages — even if they don't name the package.
---

# Using the MBC CQRS Serverless web packages

Four React packages (React 18 and 19, ESM-only, SSR-safe), released together under one version:

| Package                           | Use it for                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@mbc-cqrs-serverless/master-web` | master settings and master data screens: lists, editors, bulk JSON import, copying a setting to other tenants |
| `@mbc-cqrs-serverless/survey-web` | survey form, survey creator, survey template screens                                                          |
| `@mbc-cqrs-serverless/ui-web`     | the UI parts, theme, `MbcProvider` and text — comes with the two above                                        |
| `@mbc-cqrs-serverless/client-web` | HTTP and AppSync realtime client for the mbc-cqrs-serverless backend — comes with the two above               |

Each screen package has the same layers: the **root** entry (screens that take data and callbacks), **`/core`** (types, parsers, validation — no React, safe on a server), **`/mbc`** (the API, hooks and _connected pages_ that load and save through the mbc backend), and master-web's opt-in **`/editors`**.

## Source of truth: the installed READMEs

This skill gives the decisions and the traps. For exact props, signatures and examples, read the docs of the version the app has installed — they ship in the package:

```
node_modules/@mbc-cqrs-serverless/<package>/README.md
node_modules/@mbc-cqrs-serverless/<package>/MIGRATION.md   # survey-web, master-web
```

Read the relevant section before writing code, and prefer it over memory: props change between versions, and the README's examples are type-checked against that version.

## Pick the path

| The developer wants to…                                                         | Read                            |
| ------------------------------------------------------------------------------- | ------------------------------- |
| add a package to an app; set up styles, provider, client, routing               | `references/setup.md`           |
| show or customise screens: which component, props, editors, translations, theme | `references/screens.md`         |
| upgrade from the 0.0.x master or survey package                                 | `references/migrate.md`         |
| fix something that renders wrong, errors, or never finishes saving              | `references/troubleshooting.md` |

## What goes wrong most often

- **Wrong stylesheet.** Tailwind v3 apps import `styles.css`; `styles.layer.css` is only for Tailwind v4 or apps with their own CSS layers (imported _before_ Tailwind). With v3 and the layered file, the app's reset wins and buttons, inputs and links lose their styles.
- **Missing `'use client'`.** Screens, pages and providers are client components. Render them from a file marked `'use client'`; only `/core` runs in Server Components and route handlers.
- **Ids in URLs.** Ids contain `#` (`MASTER#tenant#MASTER_SETTING#PRODUCT`). Encode them when building URLs (`encodeURIComponent`) and decode route params before passing them to a page.
- **Sibling versions.** ui-web and client-web come with the screen packages. Install them yourself only to import them directly, and then at exactly the same version.
- **Navigation.** The packages never navigate on their own: routing is a `routing` prop the app builds from its router. Connected pages already move on after a save (as 0.0.x did) — don't navigate again in `onSaved`.

## How to help

- Find out first what the app uses: framework and router (Next App/Pages Router, Vite + React Router…), Tailwind version, whether it talks to the mbc-cqrs-serverless backend (connected pages) or its own API (prop-driven screens), and the installed package version (`package.json`).
- Write code that fits the app's existing structure (where its providers and routes live), not a fresh scaffold.
- Keep app-specific decisions in the app: who may copy settings, which tenants exist, which routes — the packages take these as props and callbacks.
- When something is unclear, quote the README section you relied on so the developer can check it.
