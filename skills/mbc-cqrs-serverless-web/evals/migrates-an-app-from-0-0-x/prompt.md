---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

We're on @mbc-cqrs-serverless/master-web 0.0.50 and want to move to 1.0. Here are our master layout, the data editor page and globals.css (the other master pages look like the data editor one). Rewrite these three files for 1.0, keeping our existing URLs working because users have them bookmarked, and write MIGRATION_NOTES.md with what else we need to change and what our users will notice.

Input files: app/admin/[tenant]/master/layout.tsx, app/admin/[tenant]/master/master-data/edit/[pk]/[sk]/page.tsx, app/globals.css
