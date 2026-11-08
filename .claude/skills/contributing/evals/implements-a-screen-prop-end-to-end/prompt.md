---
tags: [skill-creator]
max_turns: 80
timeout_seconds: 2400
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Add an optional `emptyMessage` prop to master-web's MasterSettingList so a host can replace the table's "no data" text with its own. Implement it, test it, and commit it on the current branch so it's ready for a PR (don't push). When you're done, write notes.md listing the commands you ran and what they printed (including any failing test output you saw before the fix), and save `git diff main...HEAD` as changes.diff.
