---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

we use both survey-web and master-web in this app. make them match our app: brand colour #0f766e (primary buttons too), slightly rounder corners, dark mode via a `dark` class on <html>, the UI in English, and our users call tenants "workspaces" — the copy screens should say workspaces. put the CSS in app/theme.css and the provider in app/providers.tsx, and tell me in NOTES.md where to import them.
