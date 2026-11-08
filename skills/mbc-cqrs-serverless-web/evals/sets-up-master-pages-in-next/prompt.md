---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I have a Next 16 App Router app (Tailwind 3.4, our own Cognito login — there's a getIdToken() helper in lib/auth.ts). I want the master settings and master data screens under /admin/master, talking to our mbc-cqrs-serverless backend at https://api.example.com with AppSync realtime (https://abc.appsync-api.ap-northeast-1.amazonaws.com/graphql, API key in NEXT_PUBLIC_APPSYNC_KEY). The tenant comes from a `tenant` cookie. Write the files I need (providers, routing, the page files, and where the stylesheet goes) into an app/ folder, plus a short SETUP.md saying where each one goes and why.
