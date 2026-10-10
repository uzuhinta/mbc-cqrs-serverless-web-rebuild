# M7a — Copy Screens Implementation Plan

> **For agentic workers:** Implement this plan task by task, in order. Every task is test-first: write the test, run it and watch it fail for the stated reason, write the code, run it and watch it pass, commit. If your harness has the superpowers skills, use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship master-web's three copy screens. Each is prop-driven: data comes in, callbacks go out. M7b connects them to the backend.

| Screen                  | What it does                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `MasterCopyRequestForm` | copies a setting to every tenant or to chosen ones: the setting and all its data, the setting only, or chosen data rows |
| `MasterCopyTaskList`    | the setting's copy requests: start and end time, counts, status                                                         |
| `MasterCopyTaskDetail`  | one copy request's result per destination tenant                                                                        |

**Architecture:**

- **`/core`.** It gains the copy task's type and helpers: its name, its tenant, its error's first line, whether it is done. It also gains `localTimeParts`, which splits a timestamp into its parts in the runtime's time zone.
- **Messages.** A `masterCopy` namespace holds v0's Japanese text, with "テナント" where v0 used its host's own term, plus English.
- **Task screens.** Both share an internal frame: a heading, Refresh, an error with Reload, the tasks ten a page, and Back. They show v0's coloured status badges, and times in the browser's time zone after hydration.
- **The form.** It reuses the data list's columns through a new shared `dataColumns`, and ui-web's `MultiSelect`, `RadioGroup` and `Card`.
- **ui-web.** `MultiSelect` now wraps its text, because a long placeholder overflowed the box on a phone.

**Tech Stack:** TypeScript ~6.0, React 18/19, ui-web (Radix radio group, `MultiSelect`, `Card`, `Badge`), master-web's `DataTable`, Vitest + jsdom + Testing Library + axe-core, pnpm 10 workspace, Node 24.13 via fnm.

**Spec:** `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` §3.1 (copy types), §3.2 (copy screens, `tenants`, `onRequestCopy`), §4 (data table, SSR), §5. Orchestrator: `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, sub-plan M7a.

## Orientation (read once)

- **Repository:** `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`, a pnpm monorepo:
  - `packages/ui-web`, `packages/client-web`, `packages/survey-web` (finished);
  - `packages/master-web`: this work;
  - `apps/playground` (Vite) and `apps/next-smoke` (Next).
- **Start** from an up-to-date `main` (M6 merged): `git switch main && git switch -c m7a-copy-screens`. Check that `packages/master-web/src/editors/index.ts` exists.
- **Commands:** run every command from the repository root, prefixed with `fnm exec --using=v24.13.0 --`.
  - Install and build once: `fnm exec --using=v24.13.0 -- pnpm install && fnm exec --using=v24.13.0 -- pnpm build`.
  - Packages import each other through their built `dist/`.
- **Tests:**
  - `pnpm vitest run <paths>` runs files; `pnpm vitest run --project master-web` runs a package.
  - `packages/master-web/test/build/output.test.ts` reads master-web's built `dist/`, and checks that every module with JSX starts with `'use client'`.
- **What exists already:**
  - `/core` (M2): `MasterCopyRequest` (the backend's request body), `COPY_TYPES` and `buildCopyRequest`. The last one turns "all tenants" into every tenant's code, and a data-only copy with no row chosen into `{ mode: 'ALL' }`.
  - `MasterRouting` and `MasterLink` (M3a), with the targets `copyRequest` and `copyTasks` (each with `settingId`) and `copyTask` (`settingId`, `taskId`). M4's settings editor already links to the first two when `canCopy` is set.
  - `DataTable` (M3a): sortable headers, pagination above and below, and row selection through `selection` / `onSelectionChange`.
  - From the lists and editors (M3b, M5): `useFilters`, `ListError`, `FailureAlert`, and the data list's column builder inside `data/master-data-list.tsx`.
  - Fixtures: `V0_SETTING` (setting `PRODUCT` of `tenant-a`) and `DATA_ROWS` (`P-001`, `P/002`).
- **The backend this mirrors** (the task controller in the master package):
  - `GET /api/tasks/sfn-task-parent?masterSettingCode=` returns one task per copy request, newest first. Its `sk` is `MASTER_COPY_<code>#<key>`, and its `attributes` hold the four counts.
  - `GET /api/tasks/:id` returns one task per destination tenant. Its `input.targetTenants[0]` is the tenant, and a failure's `attributes.error` is a stack.
  - The statuses are the task package's eight: `CREATED`, `QUEUED`, `PROCESSING`, `STARTED`, `FINISHED`, `COMPLETED`, `ERRORED`, `FAILED`.
- **The code in this plan has been run:**
  - every task passes on its own, in order;
  - the full gate is green on the result on React 19 and 18;
  - the playground's copy pages were used in a real browser at 1280 px and 375 px, with no console errors.

  Type it exactly. If a step's output differs from its `Expected:` line, stop and find out why before changing anything.

- **Edit steps** say "In `<file>`, replace:" followed by two code blocks. Find the first block's text in the file (it occurs exactly once) and replace it with the second. The `<!-- prettier-ignore -->` line above each of those blocks keeps the formatter from changing them; it is not part of the text. Every other code block headed by a file path is the whole file: create it, or replace it entirely.

## Global Constraints

- No `process.env`, `console.*`, `any`, `next` or other host libraries in `packages/*/src`. No React-19-only APIs. No reading or writing a ref during render, and no component created during render (`react-hooks/refs`, `react-hooks/static-components`).
- `'use client'` on every module that renders (a build test checks it). `/core` stays React-free.
- Every class has the `mbc:` prefix. Every string the screens show comes from `masterCopy` messages.
- No consumer-specific names in code, tests, fixtures, docs or commit messages. v0 named its host's tenants on these screens; this plan says "テナント" ("tenant"), and a host overrides the messages to use its own word.
- Change only the files each task lists.
- Commits follow Conventional Commits, one per task, with the messages given. Append your tool's co-author trailer if it adds one.

## Review Focus

Each item is pinned by a test in the task that owns it:

1. **Ids with `#`, `/` and spaces** reach every link exactly: a task's details link, and Back from both task screens and from the form. _Task 2: "links each request to its details and Back to the setting, ids intact"; Task 3: "goes back to the setting"._
2. **No destination means no request.** v0 copied to every tenant when "chosen tenants" had none chosen. Now the form asks for a tenant and focuses the list, and with no tenants at all it sends nothing. _Task 3: "asks for a tenant instead of copying to every one when none is chosen", "does not send a request without any tenant"._
3. **Chosen data rows are what is copied.** The choice is kept across pages and searches, and no choice copies all the data (v0). _Task 3: "copies chosen data rows, kept across pages", "copies all the data when no row is chosen (v0)"._
4. **Server rendering.** Times depend on the browser's time zone, so the server renders the `<time>` element without text and the browser fills it in after hydration. The screens render with `renderToString`, and the Next app builds. _Task 2: "has no axe violations, and renders on the server without the times"; Task 1: the `localTimeParts` tests; Task 4: the smoke build._
5. **One request at a time, and failures say so.** The button is off while a request is out. A rejected request shows v0's failure text and allows another try, and a success shows a status with a link to the results. _Task 3: "sends one request at a time", "says when the request failed, and allows another try", "copies the setting and all its data to every tenant by default"._

## Rulings already made (do not undo)

- **The form is `MasterCopyRequestForm`.** `/core` already exports the request body as `MasterCopyRequest` (M2), and one name cannot be both. The spec is updated in Task 4.
- **The task screens page the tasks themselves,** ten a page as in v0, because the endpoints return every task at once. The page stays in range when a refresh brings fewer tasks.
- **"Succeeded" only once a task is `COMPLETED`.** v0 showed "コピー成功" for every task without an error, including running ones. The end time still shows only for `COMPLETED`, as in v0. Both changes are noted in spec §5.
- **Times appear after hydration.** The server renders `<time dateTime="…">` without text, and the browser shows `YYYY/MM/DD HH:mm:ss` in its own time zone. v0 also formatted them in the browser.
- **After a successful request the form shows a status with a link to the copy results.** It replaces v0's toast. Where to go next is the host's choice; M7b's page decides.
- **Refresh is `onRefresh`.** It also drives the error's Reload button, and polling belongs to M7b's pages.
- **The copy form shows codes as text, not links** (v0). It shares the data list's columns through `dataColumns(setting, labels, code)`.
- **v0's status colours stay.** Each passes 4.5:1; `ERRORED`, the lowest, is 4.52:1.
- **Headings are `h2`,** like the settings editor's section headings; v0 used `h3`. v0's button shadows are not kept, as on the other screens.
- **Phone spacing.** From `md` up, the form keeps v0's paddings and its 2.5rem gap between labels and inputs. Below that, both shrink, so the search inputs stay usable at 375 px.

---

### Task 1: Copy tasks and local times in `/core`

**Files:**

- Modify: `packages/master-web/src/core/copy.ts`, `packages/master-web/src/core/list.ts`, `packages/master-web/src/core/index.ts`
- Test: `packages/master-web/src/core/copy.test.ts`, `packages/master-web/src/core/list.test.ts`, `packages/master-web/test/exports.test.tsx`

**Interfaces:**

- Produces (exported from `/core` and the root):
  - `type MasterTenant = { code: string; name: string }`;
  - `COPY_TASK_STATUSES` (the eight statuses), `type CopyTaskStatus`, `isCopyTaskStatus(value)`;
  - `type CopyTask = { id; pk; sk; status?; createdAt?; updatedAt?; input?: unknown; attributes?: { subTaskCount?; subTaskRunningCount?; subTaskSucceedCount?; subTaskFailedCount?; error?: unknown } }`, with other keys passing through;
  - `copyTaskName(task)`: `sk` without `MASTER_COPY_`;
  - `copyTaskTenant(task)`: `input.targetTenants[0]`, or `''`;
  - `copyTaskError(task)`: the error's first line, or `undefined`;
  - `isCopyTaskDone(task)`: whether `status === 'COMPLETED'`;
  - `type TimeParts = { year; month; day; hour; minute; second }` (strings, zero-padded), and `localTimeParts(value)`, which returns them in the runtime's time zone, or `undefined` when the value is not a timestamp.

- [ ] **Step 1: Write the failing tests**

In `packages/master-web/src/core/copy.test.ts`, replace:

<!-- prettier-ignore -->
```ts
import { buildCopyRequest, COPY_TYPES } from './copy'
```

with:

<!-- prettier-ignore -->
```ts
import {
  buildCopyRequest,
  COPY_TASK_STATUSES,
  COPY_TYPES,
  copyTaskError,
  copyTaskName,
  copyTaskTenant,
  isCopyTaskDone,
  isCopyTaskStatus,
} from './copy'
```

In `packages/master-web/src/core/copy.test.ts`, replace:

<!-- prettier-ignore -->
```ts
    ).toEqual({ mode: 'ALL' })
  })
})
```

with:

<!-- prettier-ignore -->
```ts
    ).toEqual({ mode: 'ALL' })
  })
})

describe('copy tasks', () => {
  const task = {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9',
  }

  it('knows v0’s eight statuses', () => {
    expect(COPY_TASK_STATUSES).toHaveLength(8)
    expect(isCopyTaskStatus('COMPLETED')).toBe(true)
    expect(isCopyTaskStatus('LOST')).toBe(false)
    expect(isCopyTaskStatus(undefined)).toBe(false)
  })

  it('names a task by its key without MASTER_COPY_', () => {
    expect(copyTaskName(task)).toBe('PRODUCT#01J9')
    expect(copyTaskName({ sk: 'OTHER#1' })).toBe('OTHER#1')
  })

  it('reads the tenant a tenant’s task copies to', () => {
    expect(
      copyTaskTenant({
        input: { masterSettingId: 'x', targetTenants: ['tenant-b'] },
      })
    ).toBe('tenant-b')
    expect(copyTaskTenant({ input: [{ targetTenants: ['tenant-b'] }] })).toBe(
      ''
    )
    expect(copyTaskTenant({})).toBe('')
  })

  it('shows the first line of an error, and nothing without one', () => {
    expect(
      copyTaskError({
        attributes: { error: 'Error: setting not found\n    at copy (x.js:1)' },
      })
    ).toBe('Error: setting not found')
    expect(copyTaskError({ attributes: { error: { code: 'E1' } } })).toBe(
      '{"code":"E1"}'
    )
    expect(copyTaskError({ attributes: { error: '' } })).toBeUndefined()
    expect(copyTaskError({})).toBeUndefined()
  })

  it('counts a task as done once it is completed (v0)', () => {
    expect(isCopyTaskDone({ status: 'COMPLETED' })).toBe(true)
    expect(isCopyTaskDone({ status: 'FAILED' })).toBe(false)
    expect(isCopyTaskDone({})).toBe(false)
  })
})
```

In `packages/master-web/src/core/list.test.ts`, replace:

<!-- prettier-ignore -->
```ts
  initialSettingListState,
```

with:

<!-- prettier-ignore -->
```ts
  initialSettingListState,
  localTimeParts,
```

In `packages/master-web/src/core/list.test.ts`, replace:

<!-- prettier-ignore -->
```ts
    expect(dataCodeOf(row)).toBe('')
  })
})
```

with:

<!-- prettier-ignore -->
```ts
    expect(dataCodeOf(row)).toBe('')
  })
})

describe('localTimeParts', () => {
  it('reads a stored timestamp in the runtime’s time zone', () => {
    const moment = new Date(2026, 9, 10, 9, 5, 7)
    expect(localTimeParts(moment.toISOString())).toEqual({
      year: '2026',
      month: '10',
      day: '10',
      hour: '09',
      minute: '05',
      second: '07',
    })
    expect(localTimeParts(moment.getTime())?.minute).toBe('05')
  })

  it('gives nothing for a value that is not a timestamp', () => {
    expect(localTimeParts(undefined)).toBeUndefined()
    expect(localTimeParts('')).toBeUndefined()
    expect(localTimeParts('soon')).toBeUndefined()
    expect(localTimeParts({})).toBeUndefined()
  })
})
```

The exports test lists the new names:

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      'bulkSampleJson',
      'COPY_TYPES',
```

with:

<!-- prettier-ignore -->
```tsx
      'bulkSampleJson',
      'COPY_TASK_STATUSES',
      'COPY_TYPES',
      'copyTaskError',
      'copyTaskName',
      'copyTaskTenant',
```

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      'isEntityField',
      'isMasterFieldType',
```

with:

<!-- prettier-ignore -->
```tsx
      'isCopyTaskDone',
      'isCopyTaskStatus',
      'isEntityField',
      'isMasterFieldType',
      'localTimeParts',
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/core packages/master-web/test/exports.test.tsx`
Expected: FAIL: 8 of 93 tests fail, the other 85 pass. The five "copy tasks" tests fail with `copyTaskName is not a function` and the like, and the two `localTimeParts` tests with `localTimeParts is not a function`. "exports the core from the root, plus messages and the provider" fails because the lists of names differ.

- [ ] **Step 3: Implement**

In `packages/master-web/src/core/copy.ts`, replace:

<!-- prettier-ignore -->
```ts
          : { mode: 'ALL' as const },
    }),
  }
}
```

with:

<!-- prettier-ignore -->
```ts
          : { mode: 'ALL' as const },
    }),
  }
}

/** A tenant a setting can be copied to (v0 read them from a host endpoint). */
export type MasterTenant = { code: string; name: string }

/** The task statuses v0 labels (the task package's `TaskStatusEnum`). */
export const COPY_TASK_STATUSES = [
  'CREATED',
  'QUEUED',
  'PROCESSING',
  'STARTED',
  'FINISHED',
  'COMPLETED',
  'ERRORED',
  'FAILED',
] as const
export type CopyTaskStatus = (typeof COPY_TASK_STATUSES)[number]

export function isCopyTaskStatus(value: unknown): value is CopyTaskStatus {
  return (COPY_TASK_STATUSES as readonly unknown[]).includes(value)
}

/**
 * A copy task: a row of `GET /api/tasks/sfn-task-parent` (one per copy
 * request) or of `GET /api/tasks/:id` (one per destination tenant). The
 * fields the copy screens read; the backend's others pass through.
 */
export type CopyTask = {
  id: string
  pk: string
  sk: string
  status?: string
  createdAt?: string
  updatedAt?: string
  /** A tenant's task: the copy request for that one tenant. */
  input?: unknown
  attributes?: {
    subTaskCount?: number
    subTaskRunningCount?: number
    subTaskSucceedCount?: number
    subTaskFailedCount?: number
    /** A failed task's error (the backend stores the stack). */
    error?: unknown
    [key: string]: unknown
  }
  [key: string]: unknown
}

const TASK_PREFIX = 'MASTER_COPY_'

/** v0's task name: the sort key without `MASTER_COPY_` (the setting code, then the task's own key). */
export function copyTaskName(task: Pick<CopyTask, 'sk'>): string {
  return task.sk.startsWith(TASK_PREFIX)
    ? task.sk.slice(TASK_PREFIX.length)
    : task.sk
}

/** The tenant a tenant's task copies to: its input's first target. */
export function copyTaskTenant(task: Pick<CopyTask, 'input'>): string {
  const input = task.input as { targetTenants?: unknown } | null | undefined
  const targets = input?.targetTenants
  const first = Array.isArray(targets) ? (targets as unknown[])[0] : undefined
  return typeof first === 'string' ? first : ''
}

/** The first line of a task's error (v0), or `undefined` when it has none. */
export function copyTaskError(
  task: Pick<CopyTask, 'attributes'>
): string | undefined {
  const error = task.attributes?.error
  if (error === undefined || error === null || error === '') return undefined
  const text = typeof error === 'string' ? error : JSON.stringify(error)
  return text.split('\n')[0]
}

/** v0 shows an end time only for a completed task. */
export function isCopyTaskDone(task: Pick<CopyTask, 'status'>): boolean {
  return task.status === 'COMPLETED'
}
```

In `packages/master-web/src/core/list.ts`, replace:

<!-- prettier-ignore -->
```ts
  return year && month && day ? { year, month, day } : undefined
}
```

with:

<!-- prettier-ignore -->
```ts
  return year && month && day ? { year, month, day } : undefined
}

/** A moment's parts in the runtime's time zone (the browser's, after hydration). */
export type TimeParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The parts of a stored timestamp, or `undefined` when it is not one. */
export function localTimeParts(value: unknown): TimeParts | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return {
    year: String(date.getFullYear()),
    month: pad(date.getMonth() + 1),
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
    second: pad(date.getSeconds()),
  }
}
```

In `packages/master-web/src/core/index.ts`, replace:

<!-- prettier-ignore -->
```ts
  COPY_TYPES,
  type CopyType,
  type MasterCopyRequest,
```

with:

<!-- prettier-ignore -->
```ts
  COPY_TASK_STATUSES,
  COPY_TYPES,
  copyTaskError,
  copyTaskName,
  copyTaskTenant,
  isCopyTaskDone,
  isCopyTaskStatus,
  type CopyTask,
  type CopyTaskStatus,
  type CopyType,
  type MasterCopyRequest,
  type MasterTenant,
```

In `packages/master-web/src/core/index.ts`, replace:

<!-- prettier-ignore -->
```ts
  initialSettingListState,
```

with:

<!-- prettier-ignore -->
```ts
  initialSettingListState,
  localTimeParts,
```

In `packages/master-web/src/core/index.ts`, replace:

<!-- prettier-ignore -->
```ts
  type MasterSettingListState,
```

with:

<!-- prettier-ignore -->
```ts
  type MasterSettingListState,
  type TimeParts,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (224 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): copy tasks and local times in /core"
```

---

### Task 2: The copy results screens

**Files:**

- Create: `packages/master-web/src/i18n/master-copy-messages.ts`, and in `packages/master-web/src/copy/`: `task-screen.tsx`, `master-copy-task-list.tsx`, `master-copy-task-detail.tsx`
- Test: `packages/master-web/src/copy/copy-tasks.test.tsx`, with the fixture `packages/master-web/test/fixtures/v0-copy.ts`

**Interfaces:**

- Consumes: Task 1's copy-task helpers and `localTimeParts`; `DataTable`, `MasterLink`, `ListError`; ui-web's `Badge`, `Button`, `useHydrated`, `defineMessages`.
- Produces:
  - `masterCopyMessages` (namespace `masterCopy`: `request`, `tasks`, `detail`, `status`, `time`, `none`) and `type MasterCopyMessages`. Task 3 uses `request`.
  - `MasterCopyTaskList` / `MasterCopyTaskListProps`: `{ settingId; tasks: readonly CopyTask[]; routing; loading?; error?; onRefresh?() }`. Its rows link to `{ screen: 'copyTask', settingId, taskId: task.id }`, and Back goes to `{ screen: 'setting', id: settingId }`.
  - `MasterCopyTaskDetail` / `MasterCopyTaskDetailProps`: the same props. Back goes to `{ screen: 'copyTasks', settingId }`.
  - Internal (`task-screen.tsx`): `CopyStatus`, `CopyTime`, `CopyTaskScreen` and `ROW_LINK`.
- The root entry exports them in Task 4.

- [ ] **Step 1: Write the failing tests**

The fixture, two copy requests and one request's three tenant tasks:

`packages/master-web/test/fixtures/v0-copy.ts`:

```ts
import type { CopyTask } from '../../src/core/copy'

/** A time on 2026-10-10 in the runtime's time zone, stored as the backend stores it. */
export const at = (hour: number, minute: number, second = 0) =>
  new Date(2026, 9, 10, hour, minute, second).toISOString()

/** `GET /api/tasks/sfn-task-parent?masterSettingCode=PRODUCT`: newest first. */
export const COPY_REQUESTS: CopyTask[] = [
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B',
    status: 'PROCESSING',
    createdAt: at(10, 30),
    updatedAt: at(10, 31),
    attributes: {
      subTaskCount: 3,
      subTaskRunningCount: 1,
      subTaskSucceedCount: 1,
      subTaskFailedCount: 1,
    },
  },
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9A',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9A',
    status: 'COMPLETED',
    createdAt: at(9, 5, 7),
    updatedAt: at(9, 6, 40),
    attributes: {
      subTaskCount: 2,
      subTaskRunningCount: 0,
      subTaskSucceedCount: 2,
      subTaskFailedCount: 0,
    },
  },
]

/** `GET /api/tasks/:id` for the first request: one task per tenant. */
export const COPY_TENANT_TASKS: CopyTask[] = [
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B#0',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B#0',
    status: 'COMPLETED',
    createdAt: at(10, 30),
    updatedAt: at(10, 30, 45),
    input: {
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-b'],
      copyType: 'BOTH',
    },
  },
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B#1',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B#1',
    status: 'FAILED',
    createdAt: at(10, 30),
    updatedAt: at(10, 31),
    input: { targetTenants: ['tenant-c'], copyType: 'BOTH' },
    attributes: {
      error:
        'Error: Master setting does not exist\n    at copy (handler.js:12)',
    },
  },
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B#2',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B#2',
    status: 'PROCESSING',
    createdAt: at(10, 30),
    input: { targetTenants: ['tenant-d'], copyType: 'BOTH' },
  },
]
```

`packages/master-web/src/copy/copy-tasks.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { COPY_REQUESTS, COPY_TENANT_TASKS } from '../../test/fixtures/v0-copy'
import type { CopyTask } from '../core/copy'
import type { MasterRouting } from '../routing/routing'
import { MasterCopyTaskDetail } from './master-copy-task-detail'
import { MasterCopyTaskList } from './master-copy-task-list'

const SETTING = 'MASTER#tenant-a#MASTER_SETTING#a/b c'

const routing: MasterRouting = {
  href: (to) =>
    [
      to.screen,
      'settingId' in to ? to.settingId : '',
      'id' in to ? to.id : '',
      'taskId' in to ? to.taskId : '',
    ]
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/'),
  navigate: vi.fn(),
}

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent)

async function axeClean() {
  const result = await axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  })
  expect(result.violations.map((violation) => violation.id)).toEqual([])
}

describe('MasterCopyTaskList', () => {
  it('shows v0’s columns, one row per copy request', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(
      screen.getByRole('heading', { name: 'コピー結果一覧' })
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'コピー結果一覧' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
    ).toEqual([
      '名前',
      '開始時間',
      '終了時間',
      '総数',
      '実行中数',
      '成功数',
      '失敗数',
      '状態',
    ])
    const [running, done] = within(table).getAllByRole('row').slice(1)
    expect(cells(running!)).toEqual([
      'PRODUCT#01J9B',
      '2026/10/10 10:30:00',
      '-',
      '3',
      '1',
      '1',
      '1',
      '処理中',
    ])
    expect(cells(done!)).toEqual([
      'PRODUCT#01J9A',
      '2026/10/10 09:05:07',
      '2026/10/10 09:06:40',
      '2',
      '0',
      '2',
      '0',
      '終了',
    ])
  })

  it('links each request to its details and Back to the setting, ids intact', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(screen.getByRole('link', { name: 'PRODUCT#01J9B' })).toHaveAttribute(
      'href',
      `copyTask/${encodeURIComponent(SETTING)}/${encodeURIComponent(COPY_REQUESTS[0]!.id)}`
    )
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      `setting/${encodeURIComponent(SETTING)}`
    )
  })

  it('keeps v0’s status colours', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(screen.getByText('終了')).toHaveClass(
      'mbc:bg-[#BBF7D0]',
      'mbc:text-[#14532D]',
      'mbc:border-[#4ADE80]'
    )
    expect(screen.getByText('処理中')).toHaveClass(
      'mbc:bg-[#FEF9C3]',
      'mbc:text-[#92400E]'
    )
  })

  it('shows a status it does not know as it is', () => {
    const task: CopyTask = { ...COPY_REQUESTS[0]!, status: 'PAUSED' }
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={[task]}
        routing={routing}
      />
    )
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
  })

  it('shows ten requests a page', async () => {
    const tasks = Array.from({ length: 12 }, (_, n) => ({
      ...COPY_REQUESTS[1]!,
      id: `${COPY_REQUESTS[1]!.id}-${n}`,
      sk: `MASTER_COPY_PRODUCT#${String(n).padStart(2, '0')}`,
    }))
    render(
      <MasterCopyTaskList settingId={SETTING} tasks={tasks} routing={routing} />
    )
    const table = screen.getByRole('table', { name: 'コピー結果一覧' })
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    const [pager] = screen.getAllByRole('navigation')
    await userEvent.click(within(pager!).getByRole('link', { name: '2' }))
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(
      within(table).getByRole('link', { name: 'PRODUCT#11' })
    ).toBeInTheDocument()
  })

  it('refreshes, and offers a reload when loading failed', async () => {
    const onRefresh = vi.fn()
    const { rerender } = render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
        onRefresh={onRefresh}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: '最新の状態に更新' })
    )
    expect(onRefresh).toHaveBeenCalledTimes(1)
    rerender(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={[]}
        routing={routing}
        error={new Error('down')}
        onRefresh={onRefresh}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('読み込みに失敗しました。')
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(onRefresh).toHaveBeenCalledTimes(2)
  })

  it('turns Refresh off while loading', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
        loading
        onRefresh={() => {}}
      />
    )
    expect(
      screen.getByRole('button', { name: '最新の状態に更新' })
    ).toBeDisabled()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('has no axe violations, and renders on the server without the times', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <MasterCopyTaskList
            settingId={SETTING}
            tasks={COPY_REQUESTS}
            routing={routing}
            onRefresh={() => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(screen.getByRole('heading', { name: 'Copy results' })).toBeVisible()
    await axeClean()
    const html = renderToString(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(html).toContain('PRODUCT#01J9A')
    expect(html).toContain(`dateTime="${COPY_REQUESTS[1]!.createdAt}"`)
    expect(html).not.toContain('2026/10/10')
  })
})

describe('MasterCopyTaskDetail', () => {
  it('shows each destination tenant’s result (v0’s columns)', () => {
    render(
      <MasterCopyTaskDetail
        settingId={SETTING}
        tasks={COPY_TENANT_TASKS}
        routing={routing}
      />
    )
    const table = screen.getByRole('table', { name: 'コピー結果詳細' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
    ).toEqual([
      'テナントコード',
      '状態',
      '開始時間',
      '終了時間',
      'メッセージ',
      'タスクID',
    ])
    const [copied, failed, running] = within(table).getAllByRole('row').slice(1)
    expect(cells(copied!)).toEqual([
      'tenant-b',
      '終了',
      '2026/10/10 10:30:00',
      '2026/10/10 10:30:45',
      'コピー成功',
      'MASTER_COPY_PRODUCT#01J9B#0',
    ])
    expect(cells(failed!)).toEqual([
      'tenant-c',
      '失敗',
      '2026/10/10 10:30:00',
      '-',
      'Error: Master setting does not exist',
      'MASTER_COPY_PRODUCT#01J9B#1',
    ])
    // v0 said "succeeded" here too, before the copy had finished.
    expect(cells(running!)).toEqual([
      'tenant-d',
      '処理中',
      '2026/10/10 10:30:00',
      '-',
      '-',
      'MASTER_COPY_PRODUCT#01J9B#2',
    ])
  })

  it('goes back to the setting’s copy results', () => {
    render(
      <MasterCopyTaskDetail
        settingId={SETTING}
        tasks={COPY_TENANT_TASKS}
        routing={routing}
      />
    )
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      `copyTasks/${encodeURIComponent(SETTING)}`
    )
  })

  it('has no axe violations and renders on the server', async () => {
    render(
      <main>
        <MasterCopyTaskDetail
          settingId={SETTING}
          tasks={COPY_TENANT_TASKS}
          routing={routing}
          onRefresh={() => {}}
        />
      </main>
    )
    await axeClean()
    expect(
      renderToString(
        <MasterCopyTaskDetail
          settingId={SETTING}
          tasks={COPY_TENANT_TASKS}
          routing={routing}
        />
      )
    ).toContain('tenant-c')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/copy`
Expected: FAIL: `Failed to resolve import "./master-copy-task-detail"`; no tests run.

- [ ] **Step 3: Implement**

`packages/master-web/src/i18n/master-copy-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { CopyTaskStatus, CopyType } from '../core/copy'
import type { TimeParts } from '../core/list'

export type MasterCopyMessages = {
  /** The copy request form. */
  request: {
    destination: string
    allTenants: string
    chosenTenants: string
    /** Above the tenant list (v0 named its host's tenants here). */
    chooseTenants: string
    tenantsPlaceholder: string
    content: string
    copyTypes: Record<CopyType, string>
    code: string
    name: string
    includeDeleted: string
    search: string
    /** Accessible name of the data table. */
    table: string
    selected: (params: { count: number }) => string
    back: string
    submit: string
    noTargets: string
    failed: string
    failedHint: string
    requested: string
    viewResults: string
    loadFailed: string
    retry: string
  }
  /** A setting's copy requests. */
  tasks: {
    title: string
    name: string
    started: string
    ended: string
    total: string
    running: string
    succeeded: string
    failed: string
    status: string
    refresh: string
    back: string
    loadFailed: string
    retry: string
  }
  /** One copy request, per destination tenant. */
  detail: {
    title: string
    tenant: string
    status: string
    started: string
    ended: string
    message: string
    taskId: string
    succeeded: string
    refresh: string
    back: string
    loadFailed: string
    retry: string
  }
  status: Record<CopyTaskStatus, string>
  time: (parts: TimeParts) => string
  /** A time or result that does not exist yet (v0's "-"). */
  none: string
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    masterCopy: MasterCopyMessages
  }
}

const ja: MasterCopyMessages = {
  request: {
    destination: 'データのコピー先',
    allTenants: '全テナント',
    chosenTenants: '指定したテナント',
    chooseTenants: 'コピー先のテナントを選択してください',
    tenantsPlaceholder: 'データのコピー先を選択してください',
    content: 'コピーデータ',
    copyTypes: {
      BOTH: '設定データ & 全マスタデータ',
      SETTING_ONLY: '設定データのみ',
      DATA_ONLY: '指定したマスタデータのみ',
    },
    code: 'コード',
    name: '名称',
    includeDeleted: '削除済み含む',
    search: '検索',
    table: 'マスタデータ一覧',
    selected: ({ count }) => `選択した ${count} つのアイテム`,
    back: '戻る',
    submit: 'コピー登録',
    noTargets: 'コピー先のテナントを選択してください。',
    failed: '汎用マスタコピーの登録に失敗しました。',
    failedHint: '入力内容を確認した上で再度やり直してください。',
    requested: '汎用マスタコピーを登録しました。',
    viewResults: 'コピー結果を確認',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  tasks: {
    title: 'コピー結果一覧',
    name: '名前',
    started: '開始時間',
    ended: '終了時間',
    total: '総数',
    running: '実行中数',
    succeeded: '成功数',
    failed: '失敗数',
    status: '状態',
    refresh: '最新の状態に更新',
    back: '戻る',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  detail: {
    title: 'コピー結果詳細',
    tenant: 'テナントコード',
    status: '状態',
    started: '開始時間',
    ended: '終了時間',
    message: 'メッセージ',
    taskId: 'タスクID',
    succeeded: 'コピー成功',
    refresh: '最新の状態に更新',
    back: '戻る',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  status: {
    CREATED: '作成済み',
    QUEUED: 'キュー待ち',
    PROCESSING: '処理中',
    STARTED: '開始済み',
    FINISHED: '完了',
    COMPLETED: '終了',
    ERRORED: 'エラー発生',
    FAILED: '失敗',
  },
  time: ({ year, month, day, hour, minute, second }) =>
    `${year}/${month}/${day} ${hour}:${minute}:${second}`,
  none: '-',
}

const en: MasterCopyMessages = {
  request: {
    destination: 'Copy to',
    allTenants: 'All tenants',
    chosenTenants: 'Chosen tenants',
    chooseTenants: 'Choose the tenants to copy to',
    tenantsPlaceholder: 'Choose tenants',
    content: 'What to copy',
    copyTypes: {
      BOTH: 'The setting and all its data',
      SETTING_ONLY: 'The setting only',
      DATA_ONLY: 'Chosen data only',
    },
    code: 'Code',
    name: 'Name',
    includeDeleted: 'Include deleted',
    search: 'Search',
    table: 'Data',
    selected: ({ count }) => `${count} selected`,
    back: 'Back',
    submit: 'Request copy',
    noTargets: 'Choose at least one tenant to copy to.',
    failed: 'Could not request the copy.',
    failedHint: 'Check your input and try again.',
    requested: 'The copy was requested.',
    viewResults: 'Copy results',
    loadFailed: 'Could not load the data.',
    retry: 'Reload',
  },
  tasks: {
    title: 'Copy results',
    name: 'Name',
    started: 'Started',
    ended: 'Ended',
    total: 'Total',
    running: 'Running',
    succeeded: 'Succeeded',
    failed: 'Failed',
    status: 'Status',
    refresh: 'Refresh',
    back: 'Back',
    loadFailed: 'Could not load the copy results.',
    retry: 'Reload',
  },
  detail: {
    title: 'Copy result details',
    tenant: 'Tenant code',
    status: 'Status',
    started: 'Started',
    ended: 'Ended',
    message: 'Message',
    taskId: 'Task ID',
    succeeded: 'Copied',
    refresh: 'Refresh',
    back: 'Back',
    loadFailed: 'Could not load the copy result.',
    retry: 'Reload',
  },
  status: {
    CREATED: 'Created',
    QUEUED: 'Queued',
    PROCESSING: 'Processing',
    STARTED: 'Started',
    FINISHED: 'Finished',
    COMPLETED: 'Completed',
    ERRORED: 'Errored',
    FAILED: 'Failed',
  },
  time: ({ year, month, day, hour, minute, second }) =>
    `${year}-${month}-${day} ${hour}:${minute}:${second}`,
  none: '-',
}

export const masterCopyMessages = defineMessages('masterCopy', { ja, en })
```

`packages/master-web/src/copy/task-screen.tsx`:

```tsx
'use client'

import {
  Badge,
  Button,
  cn,
  useHydrated,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

import {
  isCopyTaskStatus,
  type CopyTask,
  type CopyTaskStatus,
} from '../core/copy'
import { localTimeParts } from '../core/list'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { ListError } from '../list/list-error'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting, MasterTarget } from '../routing/routing'
import { DataTable, type DataTableColumn } from '../table/data-table'

// v0's status colours: background, text, border.
const STATUS_CLASS: Record<CopyTaskStatus, string> = {
  CREATED: 'mbc:bg-[#DBEAFE] mbc:text-[#1E3A8A] mbc:border-[#93C5FD]',
  QUEUED: 'mbc:bg-[#E0E7FF] mbc:text-[#3730A3] mbc:border-[#A5B4FC]',
  PROCESSING: 'mbc:bg-[#FEF9C3] mbc:text-[#92400E] mbc:border-[#FDE68A]',
  STARTED: 'mbc:bg-[#CCFBF1] mbc:text-[#115E59] mbc:border-[#5EEAD4]',
  FINISHED: 'mbc:bg-[#DCFCE7] mbc:text-[#166534] mbc:border-[#86EFAC]',
  COMPLETED: 'mbc:bg-[#BBF7D0] mbc:text-[#14532D] mbc:border-[#4ADE80]',
  ERRORED: 'mbc:bg-[#FFEDD5] mbc:text-[#C2410C] mbc:border-[#FDBA74]',
  FAILED: 'mbc:bg-[#FECACA] mbc:text-[#991B1B] mbc:border-[#FCA5A5]',
}

/** A task's status as v0's coloured badge; an unknown status as it is. */
export function CopyStatus({ status }: { status?: string }) {
  const t = useMessages(masterCopyMessages)
  if (!status) return null
  const known = isCopyTaskStatus(status)
  return (
    <Badge
      variant="outline"
      className={cn(
        'mbc:whitespace-nowrap mbc:text-center',
        known && STATUS_CLASS[status]
      )}
    >
      {known ? t.status[status] : status}
    </Badge>
  )
}

/**
 * A stored timestamp in the browser's time zone. The server does not know
 * that zone, so the text appears after hydration.
 */
export function CopyTime({ value }: { value: unknown }) {
  const t = useMessages(masterCopyMessages)
  const hydrated = useHydrated()
  const parts = localTimeParts(value)
  if (!parts) return null
  return (
    <time dateTime={new Date(value as string | number).toISOString()}>
      {hydrated ? t.time(parts) : ''}
    </time>
  )
}

/** v0's link colour for a row's name. */
export const ROW_LINK =
  'mbc:text-primary mbc:block mbc:w-full mbc:overflow-hidden mbc:text-ellipsis mbc:hover:underline'

/** v0's page size for the copy results. */
const PAGE_SIZE = 10

/** The copy result screens: a heading, Refresh, the tasks a page at a time, Back. */
export function CopyTaskScreen({
  title,
  labels,
  columns,
  tasks,
  routing,
  back,
  loading,
  error,
  onRefresh,
}: {
  title: string
  labels: { refresh: string; back: string; loadFailed: string; retry: string }
  columns: readonly DataTableColumn<CopyTask>[]
  tasks: readonly CopyTask[]
  routing: MasterRouting
  back: MasterTarget
  loading: boolean
  error: unknown
  onRefresh?(): void
}) {
  const [paging, setPaging] = useState({ page: 1, pageSize: PAGE_SIZE })
  // A refresh can bring fewer tasks: stay on a page that exists.
  const pages = Math.max(1, Math.ceil(tasks.length / paging.pageSize))
  const page = Math.min(paging.page, pages)
  const rows = tasks.slice((page - 1) * paging.pageSize, page * paging.pageSize)

  return (
    <div data-mbc="" className="mbc:p-4">
      <div className="mbc:mb-5 mbc:flex mbc:flex-wrap mbc:items-center mbc:justify-between mbc:gap-4">
        <h2 className="mbc:text-lg mbc:font-semibold">{title}</h2>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCw
              aria-hidden
              className={cn(loading && 'mbc:animate-spin')}
            />
            {labels.refresh}
          </Button>
        )}
      </div>
      {error !== undefined && error !== null && (
        <div className="mbc:mb-3">
          <ListError
            message={labels.loadFailed}
            retry={labels.retry}
            onRetry={onRefresh}
          />
        </div>
      )}
      <DataTable
        label={title}
        columns={columns}
        rows={rows}
        rowKey={(task) => task.id}
        total={tasks.length}
        page={page}
        pageSize={paging.pageSize}
        loading={loading}
        onPageChange={(next) => setPaging({ ...paging, page: next })}
        onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })}
      />
      <div className="mbc:flex mbc:justify-evenly mbc:py-3">
        <Button asChild variant="outline" className="mbc:min-w-[200px]">
          <MasterLink routing={routing} to={back}>
            {labels.back}
          </MasterLink>
        </Button>
      </div>
    </div>
  )
}
```

`packages/master-web/src/copy/master-copy-task-list.tsx`:

```tsx
'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import { copyTaskName, isCopyTaskDone, type CopyTask } from '../core/copy'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import type { DataTableColumn } from '../table/data-table'
import { CopyStatus, CopyTaskScreen, CopyTime, ROW_LINK } from './task-screen'

export type MasterCopyTaskListProps = {
  /** The setting that was copied (the links and Back lead from it). */
  settingId: string
  /** Its copy requests, newest first (`GET /api/tasks/sfn-task-parent`). */
  tasks: readonly CopyTask[]
  routing: MasterRouting
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRefresh`. */
  error?: unknown
  /** Loads the tasks again; without it the Refresh button is hidden. */
  onRefresh?(): void
}

type Count =
  | 'subTaskCount'
  | 'subTaskRunningCount'
  | 'subTaskSucceedCount'
  | 'subTaskFailedCount'

/** v0's copy results of one setting: one row per copy request. */
export function MasterCopyTaskList({
  settingId,
  tasks,
  routing,
  loading = false,
  error,
  onRefresh,
}: MasterCopyTaskListProps) {
  const t = useMessages(masterCopyMessages)
  const count = (
    id: string,
    header: string,
    key: Count
  ): DataTableColumn<CopyTask> => ({
    id,
    header,
    cell: (task) => (
      <div className="mbc:text-center">{task.attributes?.[key]}</div>
    ),
  })
  const columns: DataTableColumn<CopyTask>[] = [
    {
      id: 'name',
      header: t.tasks.name,
      cell: (task) => (
        <MasterLink
          routing={routing}
          to={{ screen: 'copyTask', settingId, taskId: task.id }}
          className={ROW_LINK}
        >
          {copyTaskName(task)}
        </MasterLink>
      ),
    },
    {
      id: 'started',
      header: t.tasks.started,
      cell: (task) => <CopyTime value={task.createdAt} />,
    },
    {
      id: 'ended',
      header: t.tasks.ended,
      cell: (task) =>
        isCopyTaskDone(task) ? <CopyTime value={task.updatedAt} /> : t.none,
    },
    count('total', t.tasks.total, 'subTaskCount'),
    count('running', t.tasks.running, 'subTaskRunningCount'),
    count('succeeded', t.tasks.succeeded, 'subTaskSucceedCount'),
    count('failed', t.tasks.failed, 'subTaskFailedCount'),
    {
      id: 'status',
      header: t.tasks.status,
      cell: (task) => <CopyStatus status={task.status} />,
    },
  ]
  return (
    <CopyTaskScreen
      title={t.tasks.title}
      labels={t.tasks}
      columns={columns}
      tasks={tasks}
      routing={routing}
      back={{ screen: 'setting', id: settingId }}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
    />
  )
}
```

`packages/master-web/src/copy/master-copy-task-detail.tsx`:

```tsx
'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import {
  copyTaskError,
  copyTaskTenant,
  isCopyTaskDone,
  type CopyTask,
} from '../core/copy'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import type { MasterRouting } from '../routing/routing'
import type { DataTableColumn } from '../table/data-table'
import { CopyStatus, CopyTaskScreen, CopyTime } from './task-screen'

export type MasterCopyTaskDetailProps = {
  /** The setting that was copied (Back leads to its copy results). */
  settingId: string
  /** One copy request's tasks, one per destination tenant (`GET /api/tasks/:id`). */
  tasks: readonly CopyTask[]
  routing: MasterRouting
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRefresh`. */
  error?: unknown
  /** Loads the tasks again; without it the Refresh button is hidden. */
  onRefresh?(): void
}

/** v0's result of one copy request: one row per destination tenant. */
export function MasterCopyTaskDetail({
  settingId,
  tasks,
  routing,
  loading = false,
  error,
  onRefresh,
}: MasterCopyTaskDetailProps) {
  const t = useMessages(masterCopyMessages)
  const columns: DataTableColumn<CopyTask>[] = [
    {
      id: 'tenant',
      header: t.detail.tenant,
      cell: (task) => (
        <div className="mbc:text-center mbc:font-bold">
          {copyTaskTenant(task)}
        </div>
      ),
    },
    {
      id: 'status',
      header: t.detail.status,
      cell: (task) => <CopyStatus status={task.status} />,
    },
    {
      id: 'started',
      header: t.detail.started,
      cell: (task) => <CopyTime value={task.createdAt} />,
    },
    {
      id: 'ended',
      header: t.detail.ended,
      cell: (task) =>
        isCopyTaskDone(task) ? <CopyTime value={task.updatedAt} /> : t.none,
    },
    {
      id: 'message',
      header: t.detail.message,
      // v0 said "succeeded" for every task without an error, finished or not.
      cell: (task) =>
        copyTaskError(task) ??
        (isCopyTaskDone(task) ? t.detail.succeeded : t.none),
    },
    { id: 'taskId', header: t.detail.taskId, cell: (task) => task.sk },
  ]
  return (
    <CopyTaskScreen
      title={t.detail.title}
      labels={t.detail}
      columns={columns}
      tasks={tasks}
      routing={routing}
      back={{ screen: 'copyTasks', settingId }}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
    />
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (235 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): copy results screens"
```

---

### Task 3: The copy request form

**Files:**

- Create: `packages/master-web/src/data/data-columns.tsx`, `packages/master-web/src/copy/master-copy-request-form.tsx`
- Modify: `packages/master-web/src/data/master-data-list.tsx`, `packages/ui-web/src/components/multi-select.tsx`
- Test: `packages/master-web/src/copy/copy-request-form.test.tsx`; modify `packages/ui-web/src/components/multi-select.test.tsx`

**Interfaces:**

- Consumes: `buildCopyRequest`, `COPY_TYPES` and Task 1's `MasterTenant`; Task 2's `masterCopyMessages`; `DataTable` (with selection), `useFilters`, `ListError`, `FailureAlert`, `MasterLink`; ui-web's `Card`, `RadioGroup`, `MultiSelect`, `Input`, `Switch`, `Label`.
- Produces:
  - `MasterCopyRequestForm` / `MasterCopyRequestFormProps`: `{ setting: MasterSetting; tenants: readonly MasterTenant[]; items; total; state: MasterDataListState; onStateChange(state); routing; loading?; error?; onRetry?(); onRequestCopy(request: MasterCopyRequest): Promise<void> }`;
  - `dataColumns(setting, t: { code; name }, code: (row) => ReactNode)` in `data/data-columns.tsx`, moved out of the data list, which now passes its link as `code`.
- ui-web: `MultiSelect`'s trigger gains `mbc:whitespace-normal mbc:text-left`.

- [ ] **Step 1: Write the failing tests**

`packages/master-web/src/copy/copy-request-form.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DATA_ROWS } from '../../test/fixtures/v0-lists'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import type { MasterCopyRequest, MasterTenant } from '../core/copy'
import { initialDataListState, type MasterDataListState } from '../core/list'
import { parseMasterSetting } from '../core/parse'
import type { MasterSetting } from '../core/types'
import type { MasterRouting } from '../routing/routing'
import {
  MasterCopyRequestForm,
  type MasterCopyRequestFormProps,
} from './master-copy-request-form'

function setting(): MasterSetting {
  const result = parseMasterSetting(V0_SETTING)
  if (!result.success) throw result.error
  return result.data
}

const TENANTS: MasterTenant[] = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
]

const routing: MasterRouting = {
  href: (to) =>
    [to.screen, 'settingId' in to ? to.settingId : '', 'id' in to ? to.id : '']
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/'),
  navigate: vi.fn(),
}

/** The host: owns the search state and serves one row a page. */
function Host(props: Partial<MasterCopyRequestFormProps>) {
  const [state, setState] = useState<MasterDataListState>({
    ...initialDataListState(),
    pageSize: 1,
  })
  return (
    <MasterCopyRequestForm
      setting={setting()}
      tenants={TENANTS}
      items={DATA_ROWS.slice(state.page - 1, state.page)}
      total={DATA_ROWS.length}
      state={state}
      onStateChange={setState}
      routing={routing}
      onRequestCopy={async () => {}}
      {...props}
    />
  )
}

function setup(props: Partial<MasterCopyRequestFormProps> = {}) {
  const onRequestCopy = vi.fn<(request: MasterCopyRequest) => Promise<void>>(
    async () => {}
  )
  render(<Host onRequestCopy={onRequestCopy} {...props} />)
  return { onRequestCopy }
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'コピー登録' }))

describe('MasterCopyRequestForm', () => {
  it('copies the setting and all its data to every tenant by default', async () => {
    const { onRequestCopy } = setup()
    expect(
      screen.getByRole('radiogroup', { name: 'データのコピー先' })
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '全テナント' })).toBeChecked()
    expect(
      screen.getByRole('radio', { name: '設定データ & 全マスタデータ' })
    ).toBeChecked()
    await submit()
    expect(onRequestCopy).toHaveBeenCalledWith({
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-b', 'tenant-c'],
      copyType: 'BOTH',
    })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('汎用マスタコピーを登録しました。')
    expect(
      within(status).getByRole('link', { name: 'コピー結果を確認' })
    ).toHaveAttribute(
      'href',
      `copyTasks/${encodeURIComponent('MASTER#tenant-a#MASTER_SETTING#PRODUCT')}`
    )
  })

  it('copies to the chosen tenants only', async () => {
    const { onRequestCopy } = setup()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したテナント' })
    )
    await userEvent.click(
      screen.getByRole('combobox', {
        name: 'コピー先のテナントを選択してください',
      })
    )
    await userEvent.click(screen.getByRole('option', { name: 'テナントC' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('radio', { name: '設定データのみ' }))
    await submit()
    expect(onRequestCopy).toHaveBeenCalledWith({
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-c'],
      copyType: 'SETTING_ONLY',
    })
  })

  it('asks for a tenant instead of copying to every one when none is chosen', async () => {
    const { onRequestCopy } = setup()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したテナント' })
    )
    await submit()
    expect(onRequestCopy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'コピー先のテナントを選択してください。'
    )
    const list = screen.getByRole('combobox', {
      name: 'コピー先のテナントを選択してください',
    })
    expect(list).toHaveFocus()
    expect(list).toHaveAttribute('aria-invalid', 'true')
    await userEvent.click(list)
    await userEvent.click(screen.getByRole('option', { name: 'テナントB' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not send a request without any tenant', async () => {
    const { onRequestCopy } = setup({ tenants: [] })
    await submit()
    expect(onRequestCopy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'コピー先のテナントを選択してください。'
    )
  })

  it('copies chosen data rows, kept across pages', async () => {
    const { onRequestCopy } = setup()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    const table = screen.getByRole('table', { name: 'マスタデータ一覧' })
    expect(within(table).getByText('P-001')).toBeInTheDocument()
    expect(within(table).queryByRole('link')).not.toBeInTheDocument()
    await userEvent.click(
      within(table).getByRole('checkbox', { name: 'この行を選択' })
    )
    expect(screen.getByText('選択した 1 つのアイテム')).toBeInTheDocument()
    const [pager] = screen.getAllByRole('navigation')
    await userEvent.click(within(pager!).getByRole('link', { name: '2' }))
    expect(within(table).getByText('P/002')).toBeInTheDocument()
    await userEvent.click(
      within(table).getByRole('checkbox', { name: 'この行を選択' })
    )
    expect(screen.getByText('選択した 2 つのアイテム')).toBeInTheDocument()
    await submit()
    expect(onRequestCopy).toHaveBeenCalledWith({
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-b', 'tenant-c'],
      copyType: 'DATA_ONLY',
      dataCopyOption: {
        mode: 'PARTIAL',
        id: ['MASTER#tenant-a#PRODUCT#P-001', 'MASTER#tenant-a#PRODUCT#P/002'],
      },
    })
  })

  it('copies all the data when no row is chosen (v0)', async () => {
    const { onRequestCopy } = setup()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    await submit()
    expect(onRequestCopy.mock.calls[0]?.[0].dataCopyOption).toEqual({
      mode: 'ALL',
    })
  })

  it('searches the data with v0’s filters', async () => {
    const onStateChange = vi.fn()
    render(
      <MasterCopyRequestForm
        setting={setting()}
        tenants={TENANTS}
        items={DATA_ROWS}
        total={2}
        state={{ ...initialDataListState(), page: 3 }}
        onStateChange={onStateChange}
        routing={routing}
        onRequestCopy={async () => {}}
      />
    )
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    await userEvent.type(screen.getByLabelText('コード'), 'P-0')
    await userEvent.type(screen.getByLabelText('名称'), 'りん')
    await userEvent.click(screen.getByRole('switch', { name: '削除済み含む' }))
    await userEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(onStateChange).toHaveBeenLastCalledWith({
      ...initialDataListState(),
      code: 'P-0',
      keyword: 'りん',
      isDeleted: true,
      page: 1,
    })
  })

  it('says when the request failed, and allows another try', async () => {
    setup({
      onRequestCopy: async () => {
        throw new Error('400')
      },
    })
    await submit()
    expect(screen.getByRole('alert')).toHaveTextContent(
      '汎用マスタコピーの登録に失敗しました。'
    )
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeEnabled()
  })

  it('sends one request at a time', async () => {
    let finish = () => {}
    const onRequestCopy = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    setup({ onRequestCopy })
    await submit()
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeDisabled()
    await submit()
    expect(onRequestCopy).toHaveBeenCalledTimes(1)
    finish()
    expect(
      await screen.findByRole('link', { name: 'コピー結果を確認' })
    ).toBeVisible()
  })

  it('goes back to the setting', () => {
    setup()
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      `setting/${encodeURIComponent('MASTER#tenant-a#MASTER_SETTING#PRODUCT')}`
    )
  })

  it('has no axe violations and renders on the server', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <Host />
        </main>
      </MbcProvider>
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Chosen tenants' }))
    await userEvent.click(
      screen.getByRole('radio', { name: 'Chosen data only' })
    )
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
    expect(renderToString(<Host />)).toContain('コピー登録')
  })
})
```

ui-web's `MultiSelect` wraps its text, and its shared-look test lists the two new classes:

In `packages/ui-web/src/components/multi-select.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  it('searches and toggles options from the keyboard', async () => {
```

with:

<!-- prettier-ignore -->
```tsx
  it('wraps a long placeholder or many chips inside its box', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox', { name: 'Tenants' })).toHaveClass(
      'mbc:whitespace-normal',
      'mbc:text-left'
    )
  })

  it('searches and toggles options from the keyboard', async () => {
```

In `packages/ui-web/src/components/multi-select.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
          'mbc:h-auto mbc:w-full mbc:justify-between'
```

with:

<!-- prettier-ignore -->
```tsx
          'mbc:h-auto mbc:w-full mbc:justify-between mbc:whitespace-normal mbc:text-left'
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/copy/copy-request-form.test.tsx packages/ui-web/src/components/multi-select.test.tsx`
Expected: FAIL: `copy-request-form.test.tsx` cannot resolve `./master-copy-request-form`. In `multi-select.test.tsx`, "wraps a long placeholder or many chips inside its box" and "uses ui-web’s outline button and secondary badges (one shared look)" fail because the trigger lacks the two classes; the other 7 pass.

- [ ] **Step 3: Implement**

In `packages/ui-web/src/components/multi-select.tsx`, replace:

<!-- prettier-ignore -->
```tsx
              'mbc:h-auto mbc:w-full mbc:justify-between',
```

with:

<!-- prettier-ignore -->
```tsx
              // Long placeholders and many chips wrap inside the box.
              'mbc:h-auto mbc:w-full mbc:justify-between mbc:whitespace-normal mbc:text-left',
```

The data list's columns move to their own module, so the form can show them with plain-text codes:

`packages/master-web/src/data/data-columns.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'

import type { MasterDataListItem } from '../core/list'
import type { MasterField, MasterSetting } from '../core/types'
import type { DataTableColumn } from '../table/data-table'
import { DataCell } from './data-cell'

const own = (record: Record<string, unknown> | undefined, key: string) =>
  record && Object.hasOwn(record, key) ? record[key] : undefined

/**
 * v0's data columns: the fields shown on the list, code and name first when
 * the setting lacks them. `code` renders a row's code (the data list links
 * it to the record; the copy form shows it as text).
 */
export function dataColumns(
  setting: MasterSetting,
  t: { code: string; name: string },
  code: (row: MasterDataListItem) => ReactNode
): DataTableColumn<MasterDataListItem>[] {
  const fields = setting.attributes.fields
  const shown = fields.filter((field) => field.isShowedOnList)
  const codeColumn = (header: string): DataTableColumn<MasterDataListItem> => ({
    id: 'code',
    header,
    sortable: true,
    width: '25%',
    cell: code,
  })
  const column = (field: MasterField): DataTableColumn<MasterDataListItem> => {
    const name = field.physicalName
    if (name === 'code') return codeColumn(field.name)
    if (name === 'name')
      return {
        id: 'name',
        header: field.name,
        sortable: true,
        cell: (row) => row.name,
      }
    if (name === 'seq')
      return {
        id: 'seq',
        header: field.name,
        sortable: true,
        cell: (row) => row.seq ?? '',
      }
    return {
      id: `attr-${name}`,
      header: field.name,
      cell: (row) => (
        <DataCell field={field} value={own(row.attributes, name)} />
      ),
    }
  }
  const columns = shown.map(column)
  if (fields.some((field) => field.physicalName === 'code')) return columns
  const lead = [codeColumn(t.code)]
  if (!shown.some((field) => field.physicalName === 'name'))
    lead.push({
      id: 'name',
      header: t.name,
      sortable: true,
      width: '25%',
      cell: (row) => row.name,
    })
  return [...lead, ...columns]
}
```

In `packages/master-web/src/data/master-data-list.tsx`, replace:

<!-- prettier-ignore -->
```tsx
import type { MasterField, MasterSetting } from '../core/types'
import {
  masterDataMessages,
  type MasterDataMessages,
} from '../i18n/master-data-messages'
```

with:

<!-- prettier-ignore -->
```tsx
import type { MasterSetting } from '../core/types'
import { masterDataMessages } from '../i18n/master-data-messages'
```

In `packages/master-web/src/data/master-data-list.tsx`, replace:

<!-- prettier-ignore -->
```tsx
import { DataTable, type DataTableColumn } from '../table/data-table'
import { DataCell } from './data-cell'
```

with:

<!-- prettier-ignore -->
```tsx
import { DataTable } from '../table/data-table'
import { dataColumns } from './data-columns'
```

In `packages/master-web/src/data/master-data-list.tsx`, replace:

<!-- prettier-ignore -->
```tsx
const own = (record: Record<string, unknown> | undefined, key: string) =>
  record && Object.hasOwn(record, key) ? record[key] : undefined

/** v0's columns: the fields shown on the list; code and name first when the setting lacks them. */
function dataColumns(
  setting: MasterSetting,
  routing: MasterRouting,
  t: MasterDataMessages['list']
): DataTableColumn<MasterDataListItem>[] {
  const fields = setting.attributes.fields
  const shown = fields.filter((field) => field.isShowedOnList)
  const codeColumn = (header: string): DataTableColumn<MasterDataListItem> => ({
    id: 'code',
    header,
    sortable: true,
    width: '25%',
    cell: (row) => (
      <MasterLink
        routing={routing}
        to={{ screen: 'dataItem', settingId: setting.id, id: row.id }}
        className="mbc:text-primary mbc:block mbc:w-full mbc:overflow-hidden mbc:text-ellipsis mbc:hover:underline"
      >
        {dataCodeOf(row)}
      </MasterLink>
    ),
  })
  const column = (field: MasterField): DataTableColumn<MasterDataListItem> => {
    const name = field.physicalName
    if (name === 'code') return codeColumn(field.name)
    if (name === 'name')
      return {
        id: 'name',
        header: field.name,
        sortable: true,
        cell: (row) => row.name,
      }
    if (name === 'seq')
      return {
        id: 'seq',
        header: field.name,
        sortable: true,
        cell: (row) => row.seq ?? '',
      }
    return {
      id: `attr-${name}`,
      header: field.name,
      cell: (row) => (
        <DataCell field={field} value={own(row.attributes, name)} />
      ),
    }
  }
  const columns = shown.map(column)
  if (fields.some((field) => field.physicalName === 'code')) return columns
  const lead = [codeColumn(t.code)]
  if (!shown.some((field) => field.physicalName === 'name'))
    lead.push({
      id: 'name',
      header: t.name,
      sortable: true,
      width: '25%',
      cell: (row) => row.name,
    })
  return [...lead, ...columns]
}

/** v0's data list of one setting: its details, a search, the table, back to the settings. */
```

with:

<!-- prettier-ignore -->
```tsx
/** v0's data list of one setting: its details, a search, the table, back to the settings. */
```

In `packages/master-web/src/data/master-data-list.tsx`, replace:

<!-- prettier-ignore -->
```tsx
                columns={dataColumns(setting, routing, t.list)}
```

with:

<!-- prettier-ignore -->
```tsx
                columns={dataColumns(setting, t.list, (row) => (
                  <MasterLink
                    routing={routing}
                    to={{
                      screen: 'dataItem',
                      settingId: setting.id,
                      id: row.id,
                    }}
                    className="mbc:text-primary mbc:block mbc:w-full mbc:overflow-hidden mbc:text-ellipsis mbc:hover:underline"
                  >
                    {dataCodeOf(row)}
                  </MasterLink>
                ))}
```

The form:

`packages/master-web/src/copy/master-copy-request-form.tsx`:

```tsx
'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  MultiSelect,
  RadioGroup,
  RadioGroupItem,
  Switch,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Search } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'

import {
  buildCopyRequest,
  COPY_TYPES,
  type CopyType,
  type MasterCopyRequest,
  type MasterTenant,
} from '../core/copy'
import {
  dataCodeOf,
  type MasterDataListItem,
  type MasterDataListState,
} from '../core/list'
import type { MasterSetting } from '../core/types'
import { dataColumns } from '../data/data-columns'
import { FailureAlert, type Failure } from '../form/failure'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { ListError } from '../list/list-error'
import { useFilters } from '../list/use-filters'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import { DataTable } from '../table/data-table'

export type MasterCopyRequestFormProps = {
  /** The setting to copy: the request names it; its fields make the data columns. */
  setting: MasterSetting
  /** The tenants it can be copied to (v0 read them from a host endpoint). */
  tenants: readonly MasterTenant[]
  /** "Chosen data only" picks rows from the setting's data: this page of it. */
  items: readonly MasterDataListItem[]
  total: number
  state: MasterDataListState
  onStateChange(state: MasterDataListState): void
  routing: MasterRouting
  /** The data rows are loading. */
  loading?: boolean
  /** The data rows failed to load; shown with a reload button that calls `onRetry`. */
  error?: unknown
  onRetry?(): void
  /** Sends the request; reject to show the failure. What follows is the host's. */
  onRequestCopy(request: MasterCopyRequest): Promise<void>
}

type Filters = Pick<MasterDataListState, 'code' | 'keyword' | 'isDeleted'>

const LABEL = 'mbc:flex mbc:h-9 mbc:items-center mbc:text-sm mbc:font-semibold'

const isCopyType = (value: string): value is CopyType =>
  (COPY_TYPES as readonly string[]).includes(value)

/** v0's copy request: where to, what, and for chosen data the rows to copy. */
export function MasterCopyRequestForm({
  setting,
  tenants,
  items,
  total,
  state,
  onStateChange,
  routing,
  loading = false,
  error,
  onRetry,
  onRequestCopy,
}: MasterCopyRequestFormProps) {
  const t = useMessages(masterCopyMessages).request
  const id = useId()
  const [destination, setDestination] = useState<'all' | 'chosen'>('all')
  const [chosen, setChosen] = useState<string[]>([])
  const [copyType, setCopyType] = useState<CopyType>('BOTH')
  // Kept across pages and searches, like v0's row selection.
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [noTargets, setNoTargets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [requested, setRequested] = useState(false)
  const tenantList = useRef<HTMLButtonElement>(null)
  const [filters, setFilters] = useFilters<Filters>({
    code: state.code,
    keyword: state.keyword,
    isDeleted: state.isDeleted,
  })

  const search = (event: FormEvent) => {
    event.preventDefault()
    onStateChange({ ...state, ...filters, page: 1 })
  }

  const submit = async () => {
    const request = buildCopyRequest({
      masterSettingId: setting.id,
      copyType,
      targets: destination === 'all' ? 'all' : chosen,
      allTenants: tenants.map((tenant) => tenant.code),
      dataIds: [...selection],
    })
    // v0 copied to every tenant when none was chosen.
    if (request.targetTenants.length === 0) {
      setNoTargets(true)
      tenantList.current?.focus()
      return
    }
    setSaving(true)
    setFailure(null)
    setRequested(false)
    try {
      await onRequestCopy(request)
      setRequested(true)
    } catch {
      setFailure({ title: t.failed, hint: t.failedHint })
    } finally {
      setSaving(false)
    }
  }

  const errorId = `${id}-no-targets`

  return (
    <div data-mbc="" className="mbc:space-y-6 mbc:p-5">
      <Card>
        <CardHeader>
          <CardTitle id={`${id}-destination`}>{t.destination}</CardTitle>
        </CardHeader>
        <CardContent className="mbc:space-y-4">
          <RadioGroup
            value={destination}
            onValueChange={(value) => {
              setDestination(value === 'chosen' ? 'chosen' : 'all')
              setNoTargets(false)
            }}
            aria-labelledby={`${id}-destination`}
            className="mbc:flex mbc:flex-wrap mbc:gap-4"
          >
            {(['all', 'chosen'] as const).map((value) => (
              <div key={value} className="mbc:flex mbc:items-center mbc:gap-2">
                <RadioGroupItem value={value} id={`${id}-${value}`} />
                <Label htmlFor={`${id}-${value}`}>
                  {value === 'all' ? t.allTenants : t.chosenTenants}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {destination === 'chosen' && (
            <div className="mbc:mt-2 mbc:md:px-5">
              <div id={`${id}-tenants`}>{t.chooseTenants}</div>
              <MultiSelect
                ref={tenantList}
                options={tenants.map((tenant) => ({
                  value: tenant.code,
                  label: tenant.name,
                }))}
                value={chosen}
                onValueChange={(value) => {
                  setChosen(value)
                  setNoTargets(false)
                }}
                placeholder={t.tenantsPlaceholder}
                aria-labelledby={`${id}-tenants`}
                aria-invalid={noTargets || undefined}
                aria-describedby={noTargets ? errorId : undefined}
                className="mbc:mt-3 mbc:w-full"
              />
            </div>
          )}
          {noTargets && (
            <p
              id={errorId}
              role="alert"
              className="mbc:text-destructive mbc:text-sm"
            >
              {t.noTargets}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle id={`${id}-content`}>{t.content}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={copyType}
            onValueChange={(value) => {
              if (isCopyType(value)) setCopyType(value)
            }}
            aria-labelledby={`${id}-content`}
            className="mbc:space-y-2"
          >
            {COPY_TYPES.map((type) => (
              <div key={type} className="mbc:flex mbc:items-center mbc:gap-2">
                <RadioGroupItem value={type} id={`${id}-${type}`} />
                <Label htmlFor={`${id}-${type}`}>{t.copyTypes[type]}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {copyType === 'DATA_ONLY' && (
        <Card>
          <CardContent className="mbc:space-y-4">
            <form onSubmit={search} role="search">
              <div className="mbc:flex mbc:w-full mbc:flex-col mbc:justify-center mbc:md:px-6">
                <div className="mbc:flex mbc:w-full mbc:gap-4 mbc:md:gap-10">
                  <div className="mbc:flex mbc:w-fit mbc:flex-col mbc:gap-4">
                    <Label htmlFor={`${id}-code`} className={LABEL}>
                      {t.code}
                    </Label>
                    <Label htmlFor={`${id}-keyword`} className={LABEL}>
                      {t.name}
                    </Label>
                    <Label htmlFor={`${id}-deleted`} className={LABEL}>
                      {t.includeDeleted}
                    </Label>
                  </div>
                  <div className="mbc:flex mbc:flex-1 mbc:flex-col mbc:gap-4">
                    <Input
                      id={`${id}-code`}
                      value={filters.code}
                      onChange={(event) =>
                        setFilters({ ...filters, code: event.target.value })
                      }
                    />
                    <Input
                      id={`${id}-keyword`}
                      value={filters.keyword}
                      onChange={(event) =>
                        setFilters({ ...filters, keyword: event.target.value })
                      }
                    />
                    <div className="mbc:flex mbc:h-9 mbc:items-center">
                      <Switch
                        id={`${id}-deleted`}
                        checked={filters.isDeleted}
                        onCheckedChange={(checked) =>
                          setFilters({ ...filters, isDeleted: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="mbc:mt-3 mbc:flex mbc:justify-end">
                  <Button type="submit">
                    <Search aria-hidden />
                    {t.search}
                  </Button>
                </div>
              </div>
            </form>
            <p aria-live="polite" className="mbc:ml-2 mbc:min-h-5">
              {selection.size > 0 ? t.selected({ count: selection.size }) : ''}
            </p>
            {error !== undefined && error !== null && (
              <ListError
                message={t.loadFailed}
                retry={t.retry}
                onRetry={onRetry}
              />
            )}
            <DataTable
              label={t.table}
              columns={dataColumns(setting, t, (row) => (
                <span className="mbc:text-primary mbc:block mbc:w-full mbc:overflow-hidden mbc:text-ellipsis">
                  {dataCodeOf(row)}
                </span>
              ))}
              rows={items}
              rowKey={(row) => row.id}
              total={total}
              page={state.page}
              pageSize={state.pageSize}
              loading={loading}
              sort={state.sort}
              onPageChange={(page) => onStateChange({ ...state, page })}
              onPageSizeChange={(pageSize) =>
                onStateChange({ ...state, pageSize, page: 1 })
              }
              onSortChange={(sort) =>
                onStateChange({ ...state, sort, page: 1 })
              }
              selection={selection}
              onSelectionChange={setSelection}
            />
          </CardContent>
        </Card>
      )}

      {failure && <FailureAlert failure={failure} />}
      <div role="status">
        {requested && (
          <p className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-2">
            {t.requested}
            <MasterLink
              routing={routing}
              to={{ screen: 'copyTasks', settingId: setting.id }}
              className="mbc:text-primary mbc:underline"
            >
              {t.viewResults}
            </MasterLink>
          </p>
        )}
      </div>

      <div className="mbc:mt-10 mbc:flex mbc:flex-wrap mbc:justify-evenly mbc:gap-4">
        <Button asChild variant="outline" className="mbc:min-w-[200px]">
          <MasterLink
            routing={routing}
            to={{ screen: 'setting', id: setting.id }}
          >
            {t.back}
          </MasterLink>
        </Button>
        <Button
          type="button"
          className="mbc:min-w-[200px]"
          loading={saving}
          onClick={() => void submit()}
        >
          {t.submit}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web --project ui-web && fnm exec --using=v24.13.0 -- pnpm typecheck`
Expected: the build exits 0; PASS (395 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web packages/ui-web
git commit -m "feat(master-web): copy request form; ui-web's MultiSelect wraps its text"
```

---

### Task 4: Exports, playground pages, smoke app, docs

**Files:**

- Modify: `packages/master-web/src/index.ts`, `packages/master-web/test/exports.test.tsx`
- Modify: `apps/playground/src/master-pages.tsx`, `apps/next-smoke/app/master-screens.tsx`
- Modify: `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`

**Interfaces:**

- The root entry exports `MasterCopyRequestForm`, `MasterCopyTaskList`, `MasterCopyTaskDetail` (with their props types) and `masterCopyMessages` / `MasterCopyMessages`.
- The playground has `#master/copyRequest/<setting id>`, `#master/copyTasks/<setting id>` and `#master/copyTask/<setting id>/<task id>`. They run on an in-memory copy store, where each Refresh finishes one more tenant and the last of several fails. M4's settings editor links to the first two.
- The Next smoke app renders the three screens. Its server HTML has the task list and no formatted time.

- [ ] **Step 1: Write the failing test**

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
        'defaultRenderers',
```

with:

<!-- prettier-ignore -->
```tsx
        'defaultRenderers',
        'MasterCopyRequestForm',
        'MasterCopyTaskDetail',
        'MasterCopyTaskList',
```

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
        'MasterSettingList',
```

with:

<!-- prettier-ignore -->
```tsx
        'MasterSettingList',
        'masterCopyMessages',
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/test/exports.test.tsx`
Expected: FAIL in "exports the core from the root, plus messages and the provider": the root does not export the copy screens yet. The other 2 tests pass.

- [ ] **Step 3: Export the screens**

In `packages/master-web/src/index.ts`, replace:

<!-- prettier-ignore -->
```ts
  defaultRenderers,
```

with:

<!-- prettier-ignore -->
```ts
  MasterCopyRequestForm,
  type MasterCopyRequestFormProps,
} from './copy/master-copy-request-form'
export {
  MasterCopyTaskList,
  type MasterCopyTaskListProps,
} from './copy/master-copy-task-list'
export {
  MasterCopyTaskDetail,
  type MasterCopyTaskDetailProps,
} from './copy/master-copy-task-detail'
export {
  defaultRenderers,
```

In `packages/master-web/src/index.ts`, replace:

<!-- prettier-ignore -->
```ts
} from './i18n/master-data-messages'
```

with:

<!-- prettier-ignore -->
```ts
} from './i18n/master-data-messages'
export {
  masterCopyMessages,
  type MasterCopyMessages,
} from './i18n/master-copy-messages'
```

- [ ] **Step 4: Add the playground pages**

The data page's filtering moves into `dataPage`, so the copy form can search the same records:

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  initialDataListState,
  initialSettingListState,
```

with:

<!-- prettier-ignore -->
```tsx
  copyTaskTenant,
  initialDataListState,
  initialSettingListState,
  MasterCopyRequestForm,
  MasterCopyTaskDetail,
  MasterCopyTaskList,
```

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  type BulkJsonItem,
  type ListSort,
```

with:

<!-- prettier-ignore -->
```tsx
  type BulkJsonItem,
  type CopyTask,
  type ListSort,
  type MasterCopyRequest,
```

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  type MasterSettingUpdateBody,
```

with:

<!-- prettier-ignore -->
```tsx
  type MasterSettingUpdateBody,
  type MasterTenant,
```

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
const routing: MasterRouting = {
  href: (to) =>
    to.screen === 'data'
      ? `#master/data/${encodeURIComponent(to.settingId)}`
      : to.screen === 'setting'
        ? `#master/setting/${encodeURIComponent(to.id)}`
        : to.screen === 'newData'
          ? `#master/newData/${encodeURIComponent(to.settingId)}`
          : to.screen === 'dataItem'
            ? `#master/dataItem/${encodeURIComponent(to.settingId)}/${encodeURIComponent(to.id)}`
            : `#master/${to.screen}`,
```

with:

<!-- prettier-ignore -->
```tsx
const TENANTS: MasterTenant[] = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
  { code: 'tenant-d', name: 'テナントD' },
]

/** Copy requests by setting id (newest first), and each one's tenant tasks. */
const copies = new Map<string, CopyTask[]>()
const tenantTasks = new Map<string, CopyTask[]>()

/** The parent's counts, as the backend keeps them; done when no tenant waits. */
function count(parent: CopyTask) {
  const tasks = tenantTasks.get(parent.id) ?? []
  const of = (status: string) =>
    tasks.filter((task) => task.status === status).length
  parent.attributes = {
    subTaskCount: tasks.length,
    subTaskRunningCount: of('QUEUED'),
    subTaskSucceedCount: of('COMPLETED'),
    subTaskFailedCount: of('FAILED'),
  }
  if (of('QUEUED') === 0) {
    parent.status = 'COMPLETED'
    parent.updatedAt = new Date().toISOString()
  }
}

function requestCopy(setting: MasterSetting, request: MasterCopyRequest) {
  const now = new Date().toISOString()
  const sk = `MASTER_COPY_${setting.code}#${Date.now().toString(36).toUpperCase()}`
  const parent: CopyTask = {
    id: `SFN_TASK#${TENANT}#${sk}`,
    pk: `SFN_TASK#${TENANT}`,
    sk,
    status: 'PROCESSING',
    createdAt: now,
    updatedAt: now,
  }
  tenantTasks.set(
    parent.id,
    request.targetTenants.map((tenant, n) => ({
      id: `${parent.id}#${n}`,
      pk: parent.pk,
      sk: `${sk}#${n}`,
      status: 'QUEUED',
      createdAt: now,
      input: { ...request, targetTenants: [tenant] },
    }))
  )
  copies.set(setting.id, [parent, ...(copies.get(setting.id) ?? [])])
  count(parent)
}

/** Pretends the copy runs: each refresh finishes one more tenant; the last of several fails. */
function advance(parent: CopyTask) {
  const tasks = tenantTasks.get(parent.id) ?? []
  const next = tasks.find((task) => task.status === 'QUEUED')
  if (next) {
    const fails = tasks.length > 1 && next === tasks.at(-1)
    next.status = fails ? 'FAILED' : 'COMPLETED'
    next.updatedAt = new Date().toISOString()
    if (fails)
      next.attributes = {
        error: `Error: ${copyTaskTenant(next)} is not ready\n    at copy (playground)`,
      }
  }
  count(parent)
}

const routing: MasterRouting = {
  href: (to) => {
    const id = encodeURIComponent
    switch (to.screen) {
      case 'setting':
        return `#master/setting/${id(to.id)}`
      case 'dataItem':
        return `#master/dataItem/${id(to.settingId)}/${id(to.id)}`
      case 'copyTask':
        return `#master/copyTask/${id(to.settingId)}/${id(to.taskId)}`
      case 'data':
      case 'newData':
      case 'copyRequest':
      case 'copyTasks':
        return `#master/${to.screen}/${id(to.settingId)}`
      default:
        return `#master/${to.screen}`
    }
  },
```

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
function DataPage({ settingId }: { settingId: string }) {
  const [state, setState] = useState<MasterDataListState>(initialDataListState)
  const setting = store.get(settingId) ?? [...store.values()][0]!
```

with:

<!-- prettier-ignore -->
```tsx
/** A setting's records, filtered, sorted and paged as the backend's list does. */
function dataPage(setting: MasterSetting, state: MasterDataListState) {
```

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  return (
    <MasterDataList
      setting={setting}
      items={pageOf(rows, state)}
      total={rows.length}
```

with:

<!-- prettier-ignore -->
```tsx
  return { items: pageOf(rows, state), total: rows.length }
}

function DataPage({ settingId }: { settingId: string }) {
  const [state, setState] = useState<MasterDataListState>(initialDataListState)
  const setting = store.get(settingId) ?? [...store.values()][0]!
  const { items, total } = dataPage(setting, state)
  return (
    <MasterDataList
      setting={setting}
      items={items}
      total={total}
```

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
/**
 * `#master` (settings list), `#master/newSetting`, `#master/setting/<id>`,
 * `#master/data/<setting id>`, `#master/newData/<setting id>` and
 * `#master/dataItem/<setting id>/<id>`, on in-memory data.
```

with:

<!-- prettier-ignore -->
```tsx
function CopyRequestPage({ settingId }: { settingId: string }) {
  const [state, setState] = useState<MasterDataListState>(initialDataListState)
  const setting = store.get(settingId)
  if (!setting) return null
  const { items, total } = dataPage(setting, state)
  return (
    <MasterCopyRequestForm
      setting={setting}
      tenants={TENANTS}
      items={items}
      total={total}
      state={state}
      onStateChange={setState}
      routing={routing}
      onRequestCopy={async (request) => {
        await wait(600)
        requestCopy(setting, request)
      }}
    />
  )
}

/** Copies of the store's tasks, so React sees each refresh. */
const fresh = (tasks: CopyTask[] | undefined) =>
  (tasks ?? []).map((task) => ({ ...task }))

function CopyTasksPage({ settingId }: { settingId: string }) {
  const [tasks, setTasks] = useState(() => fresh(copies.get(settingId)))
  const [loading, setLoading] = useState(false)
  const refresh = async () => {
    setLoading(true)
    await wait(400)
    for (const parent of copies.get(settingId) ?? []) advance(parent)
    setTasks(fresh(copies.get(settingId)))
    setLoading(false)
  }
  return (
    <MasterCopyTaskList
      settingId={settingId}
      tasks={tasks}
      routing={routing}
      loading={loading}
      onRefresh={() => void refresh()}
    />
  )
}

function CopyTaskPage({
  settingId,
  taskId,
}: {
  settingId: string
  taskId: string
}) {
  const [tasks, setTasks] = useState(() => fresh(tenantTasks.get(taskId)))
  const [loading, setLoading] = useState(false)
  const refresh = async () => {
    setLoading(true)
    await wait(400)
    const parent = copies.get(settingId)?.find((task) => task.id === taskId)
    if (parent) advance(parent)
    setTasks(fresh(tenantTasks.get(taskId)))
    setLoading(false)
  }
  return (
    <MasterCopyTaskDetail
      settingId={settingId}
      tasks={tasks}
      routing={routing}
      loading={loading}
      onRefresh={() => void refresh()}
    />
  )
}

/**
 * `#master` (settings list), `#master/newSetting`, `#master/setting/<id>`,
 * `#master/data/<setting id>`, `#master/newData/<setting id>`,
 * `#master/dataItem/<setting id>/<id>`, `#master/copyRequest/<setting id>`,
 * `#master/copyTasks/<setting id>` and `#master/copyTask/<setting id>/<task
 * id>`, on in-memory data.
```

In `apps/playground/src/master-pages.tsx`, replace:

<!-- prettier-ignore -->
```tsx
        <DataEditorPage key={itemId} settingId={decoded} id={itemId} />
```

with:

<!-- prettier-ignore -->
```tsx
        <DataEditorPage key={itemId} settingId={decoded} id={itemId} />
      ) : screen === 'copyRequest' && decoded ? (
        <CopyRequestPage key={decoded} settingId={decoded} />
      ) : screen === 'copyTasks' && decoded ? (
        <CopyTasksPage key={decoded} settingId={decoded} />
      ) : screen === 'copyTask' && decoded && itemId ? (
        <CopyTaskPage key={itemId} settingId={decoded} taskId={itemId} />
```

- [ ] **Step 5: Render them in the smoke app**

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  MASTER_FIELD_TYPES,
```

with:

<!-- prettier-ignore -->
```tsx
  MASTER_FIELD_TYPES,
  MasterCopyRequestForm,
  MasterCopyTaskDetail,
  MasterCopyTaskList,
```

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
/** master-web's client entry and the new ui-web parts, rendered on the server and hydrated. */
```

with:

<!-- prettier-ignore -->
```tsx
const copyTask = {
  id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9A',
  pk: 'SFN_TASK#tenant-a',
  sk: 'MASTER_COPY_PRODUCT#01J9A',
  status: 'COMPLETED',
  createdAt: '2026-10-10T00:05:07.000Z',
  updatedAt: '2026-10-10T00:06:40.000Z',
  input: { targetTenants: ['tenant-b'] },
  attributes: { subTaskCount: 1, subTaskSucceedCount: 1 },
}

/** master-web's client entry and the new ui-web parts, rendered on the server and hydrated. */
```

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
        onDelete={async () => {}}
      />
```

with:

<!-- prettier-ignore -->
```tsx
        onDelete={async () => {}}
      />
      <MasterCopyRequestForm
        setting={setting}
        tenants={[{ code: 'tenant-b', name: 'テナントB' }]}
        items={[]}
        total={0}
        state={initialDataListState()}
        onStateChange={() => {}}
        routing={routing}
        onRequestCopy={async () => {}}
      />
      <MasterCopyTaskList
        settingId={setting.id}
        tasks={[copyTask]}
        routing={routing}
        onRefresh={() => {}}
      />
      <MasterCopyTaskDetail
        settingId={setting.id}
        tasks={[copyTask]}
        routing={routing}
      />
```

- [ ] **Step 6: Update the docs**

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
| Screen                 | Behaviour (v0 parity unless noted)                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MasterSettingList`    | search by code, name, keyword; clear; table (code → data list, name, description) with sorting and paging; Create; bulk import                                                                                                                                                                                                                          |
| `MasterSettingEditor`  | code (unique check), name, description, `settingOptions` toggles; fields table: drag to reorder, add/edit dialog with per-type options, delete (not `code`, `name`, `seq`); view/edit mode; Save, Cancel, Delete (confirm); JSON dialog (edit, import, download the whole setting); copy buttons when `canCopy`; read-only for another tenant's setting |
| `MasterDataList`       | setting header (name, description, link to edit the setting); search by code, keyword, "show deleted"; columns from `isShowedOnList` fields, formatted per type; Create; bulk import                                                                                                                                                                    |
| `MasterDataEditor`     | form built from the setting's fields through the renderer registry; view/edit mode; code locked after create; `auto_number` generated on save; Delete and Restore (soft delete, confirm); JSON dialog; read-only for another tenant's record                                                                                                            |
| `BulkImportDialog`     | paste or load a JSON file, download the sample (`inputSampleJson`), per-item errors from `parseBulkJson`, submit with progress (`done / total`). **Change:** a normal large dialog instead of v0's drag-and-resize window                                                                                                                               |
| `MasterCopyRequest`    | destinations: all tenants or chosen ones (`MultiSelect` over `tenants`); content: setting + all data, setting only, or chosen data rows (selectable data table)                                                                                                                                                                                         |
| `MasterCopyTaskList`   | the setting's copy tasks with status; links to detail; Refresh                                                                                                                                                                                                                                                                                          |
| `MasterCopyTaskDetail` | per-tenant results of one copy task; Refresh                                                                                                                                                                                                                                                                                                            |
```

with:

<!-- prettier-ignore -->
```md
| Screen                  | Behaviour (v0 parity unless noted)                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MasterSettingList`     | search by code, name, keyword; clear; table (code → data list, name, description) with sorting and paging; Create; bulk import                                                                                                                                                                                                                          |
| `MasterSettingEditor`   | code (unique check), name, description, `settingOptions` toggles; fields table: drag to reorder, add/edit dialog with per-type options, delete (not `code`, `name`, `seq`); view/edit mode; Save, Cancel, Delete (confirm); JSON dialog (edit, import, download the whole setting); copy buttons when `canCopy`; read-only for another tenant's setting |
| `MasterDataList`        | setting header (name, description, link to edit the setting); search by code, keyword, "show deleted"; columns from `isShowedOnList` fields, formatted per type; Create; bulk import                                                                                                                                                                    |
| `MasterDataEditor`      | form built from the setting's fields through the renderer registry; view/edit mode; code locked after create; `auto_number` generated on save; Delete and Restore (soft delete, confirm); JSON dialog; read-only for another tenant's record                                                                                                            |
| `BulkImportDialog`      | paste or load a JSON file, download the sample (`inputSampleJson`), per-item errors from `parseBulkJson`, submit with progress (`done / total`). **Change:** a normal large dialog instead of v0's drag-and-resize window                                                                                                                               |
| `MasterCopyRequestForm` | destinations: all tenants or chosen ones (`MultiSelect` over `tenants`; with none chosen it asks for one); content: setting + all data, setting only, or chosen data rows (v0's search and a selectable data table; the choice is kept across pages). Named `…Form` because `/core` exports the request body as `MasterCopyRequest`                     |
| `MasterCopyTaskList`    | the setting's copy requests (v0's columns: name, start and end time, total, running, succeeded and failed counts, status badge in v0's colours), ten a page; links to detail; Refresh                                                                                                                                                                   |
| `MasterCopyTaskDetail`  | one copy request's result per destination tenant (tenant, status, times, the error's first line, task id); Refresh                                                                                                                                                                                                                                      |
```

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
- Bulk import sends batches of 100 and reports progress per item.
```

with:

<!-- prettier-ignore -->
```md
- Bulk import sends batches of 100 and reports progress per item.
- A copy to "chosen tenants" with none chosen asks for a tenant; v0 copied to every tenant. A tenant's copy result says "succeeded" once its task has completed; v0 said so for every task without an error, finished or not.
- Copy task times show in the browser's time zone, after hydration (v0 formatted them in the browser too).
```

In `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, replace:

<!-- prettier-ignore -->
```md
### Standard gate (every sub-plan)
```

with:

<!-- prettier-ignore -->
```md
Added by M7a:

- The copy results centre their counts under left-aligned headers (v0); their tables scroll sideways on a phone like the other lists.

### Standard gate (every sub-plan)
```

- [ ] **Step 7: Run the checks**

Run: `fnm exec --using=v24.13.0 -- pnpm build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm typecheck && fnm exec --using=v24.13.0 -- pnpm smoke && grep -c "コピー結果一覧" apps/next-smoke/.next/server/app/index.html && ! grep -q "2026/10/10" apps/next-smoke/.next/server/app/index.html`
Expected: PASS (master-web 246 tests); typecheck and the smoke build exit 0; the first grep prints `1`; the second finds no formatted time.

- [ ] **Step 8: Check the screens in a browser**

Optional, and not checked by the replay. Start the playground (`pnpm --filter @mbc-cqrs-serverless/playground dev`) and open Master lists → PRODUCT → 詳細 → テナントへコピー. Then:

1. Choose 指定したテナント and press コピー登録. The form should ask for a tenant.
2. Choose two tenants and 指定したマスタデータのみ, tick a row, and press コピー登録.
3. Follow コピー結果を確認, press 最新の状態に更新, and open the request.

Check at 375 px wide as well. There should be no errors in the console.

- [ ] **Step 9: Commit**

```bash
git add packages/master-web apps docs
git commit -m "feat(master-web): copy screens in the playground and the smoke app; docs for M7a"
```

---

### Task 5: Gate and hand-back

**Files:** none (verification only).

- [ ] **Step 1: Format and lint**

Run: `fnm exec --using=v24.13.0 -- pnpm format:check && fnm exec --using=v24.13.0 -- pnpm lint`
Expected: both exit 0. If `format:check` lists files, run `fnm exec --using=v24.13.0 -- pnpm format`, check the diff is whitespace only, and commit it as `style: format`.

- [ ] **Step 2: Full gate on React 19**

Run: `fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke`
Expected: both exit 0; every test passes (839 in all after this plan).

- [ ] **Step 3: Full gate on React 18, then restore**

```bash
fnm exec --using=v24.13.0 -- pnpm use-react 18
fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke
fnm exec --using=v24.13.0 -- pnpm use-react 19
git status --porcelain
```

Expected: `verify` and `smoke` exit 0 on React 18; `git status --porcelain` prints nothing after the restore.

- [ ] **Step 4: Hand back**

Do not merge `m7a-copy-screens` into `main` and do not tick M7a in the orchestrator — an independent review comes first. Report: the branch name, the commit range (`git log --oneline main..m7a-copy-screens`), the gate results from Steps 2–3, and any step whose output did not match its `Expected:` line together with what you did about it.
