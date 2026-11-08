---
name: contributing
description: How to contribute to the MBC CQRS Serverless web packages in this monorepo (ui-web, client-web, survey-web, master-web): set up and run the gate, make a change that follows the project's rules, prepare the changeset, commits, docs and PR, and review someone else's contribution. Use this whenever someone works on code, tests, styles, messages or docs under packages/, apps/ or scripts/ in this repo — fixing a bug, adding a prop or screen, touching a stylesheet, writing a changeset, opening or reviewing a PR, or asking "how do I run / test / release this" — even if they never say "contribute".
---

# Contributing to the MBC CQRS Serverless web packages

Four npm packages, released together under one version:

| Package                           | What it is                                                           |
| --------------------------------- | -------------------------------------------------------------------- |
| `@mbc-cqrs-serverless/ui-web`     | UI primitives (Radix, prefixed Tailwind v4), messages, `MbcProvider` |
| `@mbc-cqrs-serverless/client-web` | HTTP and AppSync realtime client, `command()`, React hooks           |
| `@mbc-cqrs-serverless/survey-web` | Survey form, creator, templates, backend integration                 |
| `@mbc-cqrs-serverless/master-web` | Master settings and data screens, editors, backend integration       |

They are libraries many different apps install. That one fact explains most rules here: a library cannot assume the host's framework, router, CSS, React version, language or backend version, and anything it ships (a class name, a keyframe, a constant, a file) can collide with or break someone else's app.

## Pick the path

Work out which of these the person needs, then read only that reference:

| They want to…                                                                                                  | Read                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| install, build, run tests, the playground or the Next smoke app; switch React 18/19; understand a failing gate | `references/setup-and-gate.md`                                            |
| change code, tests, styles or messages                                                                         | `references/making-changes.md` (and `setup-and-gate.md` for the commands) |
| commit, write a changeset, update docs, open a PR                                                              | `references/preparing.md`                                                 |
| review a branch or PR before it merges                                                                         | `references/review-checklist.md`                                          |

A full contribution goes through all four in order: set up, change, prepare, then review your own branch with the checklist before asking anyone else to.

## The few rules that break things most often

Read the reference for the reasons; these are the ones to keep in mind from the first line of code:

- **Test first.** Write the test, watch it fail for the reason you expect, then make it pass. A test that passes before the fix proves nothing.
- **Every class has the `mbc:` prefix.** Tailwind only emits prefixed classes, so a class without it silently does nothing.
- **UI text lives in typed messages** (`ja` default, `en` built in), never in a component.
- **React 18 and 19 both.** No React-19-only APIs; the gate runs on both.
- **`'use client'` only on modules that need it.** A constant in a client module reaches a Server Component as a client reference, not a value.
- **Never name a specific consuming app or organisation** — in code, tests, fixtures, docs, specs or commit messages. Describe host-specific needs generically ("a host whose backend reads such flags").
- **Run `pnpm verify` yourself before you call anything done**, and `pnpm use-react 18 && pnpm verify` (then `pnpm use-react 19`) when the change touches React code — CI is the backstop, not the first check. Say what you ran and what it printed.

## Working style

- Narrate briefly; let commands and test output carry the evidence.
- When a rule seems to block a reasonable change, say so and propose the smallest change that keeps the rule's purpose, rather than quietly working around it.
- If you are unsure where something belongs, look at how the nearest existing feature does it and follow that.
