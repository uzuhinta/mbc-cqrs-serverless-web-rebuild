---
'@mbc-cqrs-serverless/ui-web': major
'@mbc-cqrs-serverless/client-web': major
'@mbc-cqrs-serverless/survey-web': major
'@mbc-cqrs-serverless/master-web': major
---

First release of the rebuilt packages: React 18 and 19, ESM-only, SSR-safe, prefixed Tailwind v4 styles, translated text (ja, en), and no AWS SDK. `survey-web` 1.0.0 replaces 0.0.x; see `packages/survey-web/MIGRATION.md`. `master-web` 1.0.0 replaces 0.0.x; see `packages/master-web/MIGRATION.md`. `client-web` receives notifications over AppSync GraphQL subscriptions or AppSync Events (`realtime.transport`).
