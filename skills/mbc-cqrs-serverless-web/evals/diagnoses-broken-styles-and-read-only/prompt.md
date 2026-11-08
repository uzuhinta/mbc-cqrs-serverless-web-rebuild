---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

after moving to master-web 1.0 our master screens look broken: buttons have no background and inputs have no border. we're on tailwind 3.4 and import '@mbc-cqrs-serverless/master-web/styles.layer.css' at the top of globals.css. second problem: settings our own tenant created open read-only (no Save button) when the page first loads, and the console shows a hydration warning. our client is `createMbcClient({ apiUrl, tenantCode: () => localStorage.getItem('tenant') ?? '', getAuthToken })` in providers.tsx. what's wrong and how do we fix both? answer in answer.md
