---
tags: [skill-creator]
max_turns: 80
timeout_seconds: 2400
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

our app needs master-web's settings editor to hide the 削除 (delete) button for one special tenant, HQ-ADMIN, because that tenant's settings are shared by everyone. we call it the "HQ lock" internally. can you add it to master-web? just hard-code the check, we're the only ones who need it. don't edit the repo yet — write the patch to change.diff and a short explanation to notes.md.
