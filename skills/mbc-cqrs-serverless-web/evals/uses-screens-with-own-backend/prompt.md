---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

our master settings don't live in the mbc-cqrs-serverless backend — they're in our own REST API: GET /api/masters?page=&size=&q= returns { rows, total }, GET /api/masters/:code returns one setting in the same JSON shape master-web uses, PUT /api/masters/:code saves it. I'd still like master-web's settings list and settings editor UI for them in this Next app, at /settings and /settings/[code]. Write the files under app/ and a NOTES.md explaining the approach.
