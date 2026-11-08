---
type: llm
focus: trace
weight: 1
---

answer.md's fix supplies the tenant in a way that works on the server and the client (e.g. a cookie read on the server and passed down), not just a typeof window guard that still differs between them
