---
type: llm
focus: trace
weight: 1
---

changes.diff adds emptyMessage to MasterSettingList and passes it to the shared table, and without it the default no-data text still comes from the typed messages
