# M3a — List Building Blocks Implementation Plan

> **For agentic workers:** Implement this plan task by task, in order. Every task is test-first: write the test, run it and watch it fail for the stated reason, write the code, run it and watch it pass, commit. If your harness has the superpowers skills, use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pieces both master list screens (M3b) and later screens share: a pagination bar in ui-web (survey-web's, plus master v0's table arrangement), routing targets and a link component, a data table, a per-entry tenant check for bulk import, and the JSON bulk-import dialog.

**Architecture:** `PaginationBar` moves from survey-web into ui-web so survey and master lists share one look; survey-web re-exports it under its old name. master-web adds a `routing/` folder (types + `MasterLink`), an internal `table/DataTable` built from ui-web's `Table`, `Button`, `Checkbox`, `Skeleton` and `PaginationBar`, and `bulk/BulkImportDialog` on ui-web's `Dialog`, `Textarea`, `Alert`, `Button`. All text comes from the `ui` and `master` message namespaces.

**Tech Stack:** TypeScript ~6.0 (`strict`, `noUncheckedIndexedAccess`), React 18/19, ui-web primitives (Radix), lucide-react 1.52, Vitest + jsdom + Testing Library + axe-core, pnpm 10 workspace, Node 24.13 via fnm.

**Spec:** `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` §2, §3.2, §4 (orchestrator: `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, sub-plan M3a — Task 6 creates that entry).

## Orientation (read once)

- Repository: `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`, a pnpm monorepo: `packages/ui-web` (UI primitives, i18n), `packages/client-web` (HTTP + realtime), `packages/survey-web` (finished; reference for conventions), `packages/master-web` (this work), `apps/playground`, `apps/next-smoke`.
- Start from an up-to-date `main`: `git switch main && git switch -c m3a-list-parts`.
- Run every command from the repository root, prefixed with `fnm exec --using=v24.13.0 --`. Install and build once: `fnm exec --using=v24.13.0 -- pnpm install && fnm exec --using=v24.13.0 -- pnpm build` — packages import each other through their built `dist/`, so after changing ui-web run `pnpm --filter @mbc-cqrs-serverless/ui-web build` before testing master-web or survey-web against it.
- Tests sit next to the code (`src/**/x.test.tsx`); build-output and export tests sit in each package's `test/`. `pnpm vitest run <paths>` runs files; `pnpm vitest run --project master-web` runs a package.
- What exists already: master-web `/core` from M2 (`parseBulkJson`, `bulkSampleJson`, `BulkJsonItem`, `BulkMapper`, `BulkScreen`, `BulkError`, …) and `src/i18n/format-error.ts` (`formatBulkError`); `src/i18n/master-messages.ts` (`master` namespace: `fieldTypes`, `validation`, `fieldDefinition`, `bulk`); ui-web's `Table`, `Accordion`, `Command`, `MultiSelect`, `Pagination*`, `Dialog*`, `Button`, `Checkbox`, `Skeleton`, `Alert*`, `Textarea`; survey-web's `TemplatePagination` (moved in Task 1).
- **Look (user decision):** master screens use ui-web's controls as they are — one shared look with survey-web. What comes from master v0 is layout, structure, colour roles and Japanese text. Do not copy master v0's control classes.
- Messages follow ui-web's pattern: a typed object per locale (`ja` default, `en`); a message is a string or a function of named parameters.
- The code in this plan has been run: every task passes on its own in order, and the full gate is green on the result. Type it exactly; if a step's output differs from its `Expected:` line, stop and find out why before changing anything.

## Global Constraints

- No `process.env`, `console.*`, `any`, `next`, axios or other host libraries in `packages/*/src` (lint enforces it). No React-19-only APIs.
- `"use client"` on every module that renders; `packages/master-web/src/core/**` imports only zod and its own files.
- Every UI string from messages; roots and portal content render `data-mbc` (ui-web primitives do this).
- survey-web's public API and tests must keep passing unchanged (only its two pagination messages move).
- No consumer-specific names in code, tests, fixtures, docs or commit messages.
- Change only the files each task lists, plus `pnpm-lock.yaml` when a task adds a dependency.
- Commits: Conventional Commits, one per task, with the messages given (append your tool's co-author trailer if it adds one).

## Review Focus

Each is pinned by a test in the task that owns it:

1. **Two pagination bars on one page** (above and below a table) → each has its own accessible name, so landmarks stay distinct. _Task 3: "puts a pagination bar above and below the table, each with its own name"; Task 1: "takes its own name"._
2. **A bulk entry for another tenant** → refused per entry before anything is sent (the backend rejects the whole batch). _Task 4; Task 5: "lists every bad entry and sends nothing"._
3. **Closing the import dialog while it runs** (Escape, Cancel) → refused; the outcome is never lost. _Task 5: "imports with progress, then closes and reports success"._
4. **Ids with `#` or `/` in links** → the host's `href` gets the decoded id; a plain click navigates with the exact target, modified clicks are left to the browser. _Task 2._
5. **No rows vs still loading; server rendering** → "データがありません" only when not loading, a status row while loading, and the table renders with `renderToString`. _Task 3._

## Rulings already made (do not undo)

- **No TanStack Table:** the lists need fixed columns, server-side sorting and paging, and checkbox selection; a small component covers that. `DataTable` is internal (not exported). Task 6 updates the spec.
- **Pagination lives in ui-web:** survey-web's pagination becomes `PaginationBar`; its `table` variant adds master v0's result count ("検索件数:n"), page size after the pages, and the page-number box ("移動 [n] ページ"); page sizes 10/20/50/100 for tables.
- **Sorting is v0's:** a column sorts ascending first, then flips; it never clears.
- **The import dialog** is a normal dialog with a visible title "JSONエディタ" and no description (`aria-describedby={undefined}`); the editor is a plain text box (M6 may offer a richer one); it stays open while importing.
- **Tenant check:** `parseBulkJson` refuses entries whose `tenantCode` differs from the current tenant when one is given; a setting's data list still accepts other settings' codes (v0 did).
- **Empty state:** v0 faded the whole empty block to 20%; only the icon stays faded so the text is readable (as in ui-web's `MultiSelect`).

---

### Task 1: ui-web `PaginationBar` (survey-web's pagination, shared)

**Files:**

- Move: `packages/survey-web/src/templates/pagination-items.ts` → `packages/ui-web/src/lib/pagination-items.ts` (and its test)
- Create: `packages/ui-web/src/components/pagination-bar.tsx`
- Test: `packages/ui-web/src/components/pagination-bar.test.tsx`
- Modify: `packages/ui-web/src/i18n/ui-messages.ts`, `packages/ui-web/src/i18n/catalog.test-d.ts`, `packages/ui-web/src/index.ts`, `packages/ui-web/test/exports.test.ts`
- Modify: `packages/survey-web/src/templates/template-pagination.tsx`, `packages/survey-web/src/templates/i18n/template-messages.ts`

**Interfaces:**

- Produces: `PaginationBar(props: PaginationBarProps)` and `type PaginationBarProps = { page: number; pageSize: number; total: number; onPageChange(page): void; onPageSizeChange?(pageSize): void; pageSizeOptions?: readonly number[]; variant?: 'default' | 'table'; label?: string; className?: string }` from `@mbc-cqrs-serverless/ui-web`. `default` is survey v0's bar (hidden with one page); `table` shows the result count first, the page size after the pages, a page-number box when there is more than one page, and stays visible with one page or none. `ui` messages gain `pagination.pageSize`, `perPage({ size })`, `total({ count })`, `jump({ last })`, `jumpBefore`, `jumpAfter`.
- survey-web keeps exporting `TemplatePagination` (now `PaginationBar`); its `list.pageSize` / `list.perPage` messages move to ui-web's `pagination`.

- [ ] **Step 1: Move the page-list helper**

```bash
git mv packages/survey-web/src/templates/pagination-items.ts packages/ui-web/src/lib/pagination-items.ts
git mv packages/survey-web/src/templates/pagination-items.test.ts packages/ui-web/src/lib/pagination-items.test.ts
```

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/src/lib/pagination-items.test.ts`
Expected: PASS (11 tests; the file and its test moved together, imports unchanged).

- [ ] **Step 2: Write the failing test**

`packages/ui-web/src/components/pagination-bar.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { PaginationBar } from './pagination-bar'

describe('PaginationBar', () => {
  it('renders nothing for a single page (survey v0)', () => {
    const { container } = render(
      <PaginationBar
        page={1}
        pageSize={10}
        total={10}
        onPageChange={() => {}}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('changes page from the mouse and the keyboard, and marks the current page', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationBar
        page={2}
        pageSize={10}
        total={95}
        onPageChange={onPageChange}
      />
    )
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await userEvent.click(screen.getByRole('link', { name: '3' }))
    screen.getByRole('link', { name: '1' }).focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(screen.getByRole('link', { name: '次のページへ' }))
    expect(onPageChange.mock.calls).toEqual([[3], [1], [3]])
  })

  it('disables Previous on the first page', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationBar
        page={1}
        pageSize={10}
        total={30}
        onPageChange={onPageChange}
      />
    )
    const previous = screen.getByRole('link', { name: '前のページへ' })
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(previous)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('offers the page sizes it is given', async () => {
    const onPageSizeChange = vi.fn()
    render(
      <PaginationBar
        page={1}
        pageSize={10}
        total={30}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[10, 20]}
      />
    )
    await userEvent.click(
      screen.getByRole('combobox', { name: '1ページの件数' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: '20 / ページ' })
    )
    expect(onPageSizeChange).toHaveBeenCalledWith(20)
  })

  it('takes its own name', () => {
    render(
      <PaginationBar
        label="下部のページ送り"
        page={1}
        pageSize={10}
        total={30}
        onPageChange={() => {}}
      />
    )
    expect(
      screen.getByRole('navigation', { name: '下部のページ送り' })
    ).toBeInTheDocument()
  })

  describe('table variant (master v0)', () => {
    it('shows the result count and stays visible with one page or none', () => {
      const { rerender } = render(
        <PaginationBar
          variant="table"
          page={1}
          pageSize={10}
          total={0}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )
      const bar = screen.getByRole('navigation', { name: 'ページ送り' })
      expect(within(bar).getByText('検索件数:0')).toBeInTheDocument()
      expect(within(bar).queryByRole('link')).toBeNull()
      expect(
        within(bar).getByRole('combobox', { name: '1ページの件数' })
      ).toBeInTheDocument()
      expect(within(bar).queryByRole('spinbutton')).toBeNull()

      rerender(
        <PaginationBar
          variant="table"
          page={1}
          pageSize={10}
          total={25}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )
      const order = Array.from(bar.children).map(
        (child) => child.getAttribute('data-part') ?? child.tagName
      )
      expect(order).toEqual(['total', 'UL', 'size', 'jump'])
    })

    it('jumps to a typed page and ignores pages that do not exist', async () => {
      const onPageChange = vi.fn()
      render(
        <MbcProvider locale="en">
          <PaginationBar
            variant="table"
            page={1}
            pageSize={10}
            total={95}
            onPageChange={onPageChange}
          />
        </MbcProvider>
      )
      expect(screen.getByText('95 results')).toBeInTheDocument()
      const jump = screen.getByRole('spinbutton', { name: 'Go to page (1–10)' })
      await userEvent.type(jump, '11{Enter}')
      await userEvent.type(jump, '3{Enter}')
      expect(onPageChange.mock.calls).toEqual([[3]])
      expect(jump).toHaveValue(null)
    })
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/src/components/pagination-bar.test.tsx`
Expected: FAIL — `./pagination-bar` cannot be resolved.

- [ ] **Step 4: Implement**

`packages/ui-web/src/components/pagination-bar.tsx`:

```tsx
'use client'

import { useState, type KeyboardEvent, type MouseEvent } from 'react'

import { useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'
import { getPaginationItems } from '../lib/pagination-items'
import { Input } from './input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

const ARROW =
  'mbc:flex mbc:h-8 mbc:w-8 mbc:items-center mbc:justify-center mbc:aria-disabled:pointer-events-none mbc:aria-disabled:cursor-not-allowed mbc:aria-disabled:text-[#A3ACBA] mbc:aria-disabled:opacity-50'

export type PaginationBarProps = {
  /** 1-based. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: readonly number[]
  /**
   * `table`: a data table's bar (master v0) — the result count first, the
   * page size after the pages, a page-number box, and shown even with one
   * page or no rows. `default`: survey v0's bar, hidden with one page.
   */
  variant?: 'default' | 'table'
  /** Accessible name; give each bar its own when a page has two. Default: the `ui` pagination label. */
  label?: string
  className?: string
}

function JumpToPage({
  lastPage,
  onPageChange,
}: {
  lastPage: number
  onPageChange: (page: number) => void
}) {
  const t = useMessages(uiMessages)
  const [value, setValue] = useState('')
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const target = Number(value)
    if (Number.isInteger(target) && target >= 1 && target <= lastPage)
      onPageChange(target)
    setValue('')
  }
  return (
    <span data-part="jump" className="mbc:flex mbc:items-center mbc:gap-2">
      {t.pagination.jumpBefore && (
        <span aria-hidden className="mbc:text-muted-foreground">
          {t.pagination.jumpBefore}
        </span>
      )}
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={lastPage}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label={t.pagination.jump({ last: lastPage })}
        className="mbc:h-8 mbc:w-16 mbc:text-center"
      />
      {t.pagination.jumpAfter && (
        <span aria-hidden className="mbc:text-muted-foreground">
          {t.pagination.jumpAfter}
        </span>
      )}
    </span>
  )
}

/** Page links with an optional page-size select; links are `href="#"` so they are reachable from the keyboard. */
export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 300, 500],
  variant = 'default',
  label,
  className,
}: PaginationBarProps) {
  const t = useMessages(uiMessages)
  const lastPage = Math.ceil(total / Math.max(1, pageSize))
  const table = variant === 'table'
  // Only when given: an explicit undefined would remove Pagination's default name.
  const named = label === undefined ? {} : { 'aria-label': label }
  if (!table && (lastPage <= 1 || total === 0)) return null

  const go = (target: number, enabled: boolean) => (event: MouseEvent) => {
    event.preventDefault()
    if (enabled) onPageChange(target)
  }

  const sizeSelect = onPageSizeChange && (
    <div
      data-part="size"
      className="mbc:flex mbc:items-center mbc:gap-x-2 mbc:text-sm"
    >
      <Select
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      >
        <SelectTrigger
          className="mbc:h-8 mbc:w-[120px]"
          aria-label={t.pagination.pageSize}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {t.pagination.perPage({ size: option })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const pages = lastPage > 1 && (
    <PaginationContent className="mbc:flex mbc:items-center mbc:justify-center mbc:gap-0">
      <PaginationItem>
        <PaginationPrevious
          href="#"
          aria-disabled={page === 1 || undefined}
          className={cn(ARROW, 'mbc:rounded-r-none')}
          onClick={go(page - 1, page > 1)}
        />
      </PaginationItem>
      {getPaginationItems(page, lastPage, 7).map((item, index) =>
        Number.isNaN(item) ? (
          <PaginationItem key={`ellipsis-${index}`}>
            <PaginationEllipsis />
          </PaginationItem>
        ) : (
          <PaginationItem key={item}>
            <PaginationLink
              href="#"
              isActive={item === page}
              onClick={go(item, item !== page)}
              className={cn(
                'mbc:hover:text-primary mbc:flex mbc:h-8 mbc:w-8 mbc:items-center mbc:justify-center mbc:rounded-none mbc:text-sm mbc:transition-colors mbc:duration-200',
                item === page &&
                  'mbc:border-primary mbc:bg-primary/5 mbc:text-primary mbc:border'
              )}
            >
              {item}
            </PaginationLink>
          </PaginationItem>
        )
      )}
      <PaginationItem>
        <PaginationNext
          href="#"
          aria-disabled={page >= lastPage || undefined}
          className={cn(ARROW, 'mbc:rounded-l-none')}
          onClick={go(page + 1, page < lastPage)}
        />
      </PaginationItem>
    </PaginationContent>
  )

  if (!table)
    return (
      <Pagination {...named} className={cn('mbc:mt-4', className)}>
        {sizeSelect}
        {pages}
      </Pagination>
    )
  return (
    <Pagination
      {...named}
      className={cn(
        'mbc:flex-wrap mbc:items-center mbc:justify-end mbc:text-sm',
        className
      )}
    >
      <span
        data-part="total"
        className="mbc:text-muted-foreground mbc:font-medium"
      >
        {t.pagination.total({ count: total })}
      </span>
      {pages}
      {sizeSelect}
      {lastPage > 1 && (
        <JumpToPage lastPage={lastPage} onPageChange={onPageChange} />
      )}
    </Pagination>
  )
}
```

Replace the whole file:

`packages/ui-web/src/i18n/ui-messages.ts`:

```ts
import { defineMessages } from './catalog'

export type UiMessages = {
  close: string
  required: string
  pagination: {
    label: string
    previous: string
    next: string
    morePages: string
    page: (params: { page: number }) => string
    pageSize: string
    perPage: (params: { size: number }) => string
    /** A data table's result count. */
    total: (params: { count: number }) => string
    /** Name of the page-number box. */
    jump: (params: { last: number }) => string
    /** Text before and after the page-number box ('' for none). */
    jumpBefore: string
    jumpAfter: string
  }
  multiSelect: {
    placeholder: string
    search: string
    empty: string
    /** Read by screen readers after a chosen option ("selected" is the highlighted one). */
    checked: string
    /** Name of the open option list. */
    options: string
  }
}

const ja: UiMessages = {
  close: '閉じる',
  required: '必須',
  pagination: {
    label: 'ページ送り',
    previous: '前のページへ',
    next: '次のページへ',
    morePages: '省略されたページ',
    page: ({ page }) => `${page}ページ目`,
    pageSize: '1ページの件数',
    perPage: ({ size }) => `${size} / ページ`,
    total: ({ count }) => `検索件数:${count}`,
    jump: ({ last }) => `移動するページ（1〜${last}）`,
    jumpBefore: '移動',
    jumpAfter: 'ページ',
  },
  multiSelect: {
    placeholder: '選択してください',
    search: '検索...',
    empty: 'データがありません',
    checked: 'チェック済み',
    options: '選択肢',
  },
}

const en: UiMessages = {
  close: 'Close',
  required: 'required',
  pagination: {
    label: 'pagination',
    previous: 'Go to previous page',
    next: 'Go to next page',
    morePages: 'More pages',
    page: ({ page }) => `Page ${page}`,
    pageSize: 'Items per page',
    perPage: ({ size }) => `${size} / page`,
    total: ({ count }) => `${count} results`,
    jump: ({ last }) => `Go to page (1–${last})`,
    jumpBefore: 'Go to page',
    jumpAfter: '',
  },
  multiSelect: {
    placeholder: 'Select options...',
    search: 'Search...',
    empty: 'No data',
    checked: 'checked',
    options: 'Options',
  },
}

export const uiMessages = defineMessages('ui', { ja, en })
```

Replace the whole file (the type-level test lists every `ui` message):

`packages/ui-web/src/i18n/catalog.test-d.ts`:

```ts
import { defineMessages } from './catalog'

interface InterfaceTyped {
  close: string
  required: string
  pagination: {
    label: string
    previous: string
    next: string
    morePages: string
    page: (params: { page: number }) => string
    pageSize: string
    perPage: (params: { size: number }) => string
    total: (params: { count: number }) => string
    jump: (params: { last: number }) => string
    jumpBefore: string
    jumpAfter: string
  }
  multiSelect: {
    placeholder: string
    search: string
    empty: string
    checked: string
    options: string
  }
}

const messages: InterfaceTyped = {
  close: 'x',
  required: 'x',
  pagination: {
    label: 'x',
    previous: 'x',
    next: 'x',
    morePages: 'x',
    page: () => 'x',
    pageSize: 'x',
    perPage: () => 'x',
    total: () => 'x',
    jump: () => 'x',
    jumpBefore: 'x',
    jumpAfter: 'x',
  },
  multiSelect: {
    placeholder: 'x',
    search: 'x',
    empty: 'x',
    checked: 'x',
    options: 'x',
  },
}

// Interface-typed catalogs are accepted.
export const ok = defineMessages('ui', { ja: messages, en: messages })

// @ts-expect-error unknown namespace
export const typo = defineMessages('uii', { ja: messages, en: messages })
```

In `packages/ui-web/src/index.ts`, insert above the `export {\n  Popover,` block:

```ts
export {
  PaginationBar,
  type PaginationBarProps,
} from './components/pagination-bar'
```

In `packages/ui-web/test/exports.test.ts`, add `'PaginationBar',` to `EXPECTED` directly above `'PaginationContent',`.

survey-web's pagination becomes a re-export (replace the whole file):

`packages/survey-web/src/templates/template-pagination.tsx`:

```tsx
/** The template list's pagination: ui-web's `PaginationBar` (it began as this component). */
export { PaginationBar as TemplatePagination } from '@mbc-cqrs-serverless/ui-web'
```

Replace the whole file (the two pagination messages moved to ui-web):

`packages/survey-web/src/templates/i18n/template-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

export type TemplateMessages = {
  list: {
    searchPlaceholder: string
    create: string
    createLabel: string
    emptyTitle: string
    emptyDescription: string
    loadError: string
    retry: string
    loading: string
    noDescription: string
    questions: (params: { count: number }) => string
    sections: (params: { count: number }) => string
    open: (params: { name: string }) => string
  }
  editor: {
    loadingEdit: string
    loadingEditHint: string
    loadingCreate: string
    loadingCreateHint: string
    loadErrorTitle: string
    loadErrorFallback: string
    retry: string
    back: string
    delete: string
    update: string
    create: string
    discardTitle: string
    discardDescription: string
    cancel: string
    ok: string
    deleteTitle: string
    deleteDescription: string
    deleteConfirm: string
    deleting: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    surveyTemplates: TemplateMessages
  }
}

const ja: TemplateMessages = {
  list: {
    searchPlaceholder: 'テキスト・タグ・IDで検索',
    create: '新規作成',
    createLabel: 'アンケートテンプレートを新規作成',
    emptyTitle: 'アンケートが見つかりません',
    emptyDescription: '最初のアンケートテンプレートを作成してください。',
    loadError: 'アンケートの読み込みに失敗しました。再度試してください。',
    retry: '再度試す',
    loading: 'アンケートテンプレートを読み込んでいます',
    noDescription: '説明が提供されていません',
    questions: ({ count }) => `${count} 質問`,
    sections: ({ count }) => `${count} セクション`,
    open: ({ name }) => `アンケートテンプレートを開く: ${name}`,
  },
  editor: {
    loadingEdit: 'アンケートを読み込んでいます...',
    loadingEditHint:
      'アンケートデータを読み込んでいます。しばらくお待ちください。',
    loadingCreate: 'アンケート作成インターフェースを準備しています...',
    loadingCreateHint:
      'アンケート作成インターフェースを準備しています。しばらくお待ちください。',
    loadErrorTitle: 'アンケートの読み込みに失敗しました。',
    loadErrorFallback:
      'アンケートデータの取得に失敗しました。再度試してください。',
    retry: '再度試す',
    back: '戻る',
    delete: '削除',
    update: '更新',
    create: '作成',
    discardTitle: '変更を破棄しますか？',
    discardDescription:
      '未保存の変更があります。このページを離れると、変更内容が失われます。よろしいですか？',
    cancel: 'キャンセル',
    ok: 'OK',
    deleteTitle: '削除の確認',
    deleteDescription:
      'このデータを完全に削除します。この操作は元に戻せません。よろしいですか？',
    deleteConfirm: '削除する',
    deleting: '削除中...',
  },
}

const en: TemplateMessages = {
  list: {
    searchPlaceholder: 'Search by text, tag, or ID',
    create: 'Create',
    createLabel: 'Create a survey template',
    emptyTitle: 'No surveys found',
    emptyDescription: 'Create your first survey template.',
    loadError: 'Failed to load surveys. Please try again.',
    retry: 'Try again',
    loading: 'Loading survey templates',
    noDescription: 'No description provided',
    questions: ({ count }) =>
      `${count} ${count === 1 ? 'question' : 'questions'}`,
    sections: ({ count }) => `${count} ${count === 1 ? 'section' : 'sections'}`,
    open: ({ name }) => `Open survey template: ${name}`,
  },
  editor: {
    loadingEdit: 'Loading survey...',
    loadingEditHint: 'Please wait while the survey loads.',
    loadingCreate: 'Preparing the survey creator...',
    loadingCreateHint: 'Please wait while the survey creator is set up.',
    loadErrorTitle: 'Failed to load the survey.',
    loadErrorFallback: 'The survey data could not be loaded. Please try again.',
    retry: 'Try again',
    back: 'Back',
    delete: 'Delete',
    update: 'Update',
    create: 'Create',
    discardTitle: 'Discard changes?',
    discardDescription:
      'You have unsaved changes. They will be lost if you leave this page. Continue?',
    cancel: 'Cancel',
    ok: 'OK',
    deleteTitle: 'Confirm deletion',
    deleteDescription:
      'This permanently deletes the data. This cannot be undone. Continue?',
    deleteConfirm: 'Delete',
    deleting: 'Deleting...',
  },
}

export const templateMessages = defineMessages('surveyTemplates', { ja, en })
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web build && fnm exec --using=v24.13.0 -- pnpm vitest run --project ui-web --project survey-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web typecheck && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/survey-web typecheck`
Expected: PASS (survey-web's `template-pagination.test.tsx` passes unchanged through the re-export); both typechecks exit 0.

- [ ] **Step 6: Commit**

```bash
git add -A packages/ui-web packages/survey-web
git commit -m "feat(ui-web): PaginationBar, shared by survey and master lists"
```

---

### Task 2: Routing types and `MasterLink`

**Files:**

- Create: `packages/master-web/src/routing/routing.ts`, `packages/master-web/src/routing/master-link.tsx`
- Test: `packages/master-web/src/routing/master-link.test.tsx`

**Interfaces:**

- Produces: `type MasterTarget` (nine screens; ids decoded), `type MasterRouting = { href(target): string; navigate(target): void; Link?: ComponentType<{ href; className?; children }> }`, `MasterLink({ routing, to, className?, children })` — the host's `Link` when given; otherwise an `<a href>` whose plain left click calls `routing.navigate(to)` and whose modified / middle clicks are left to the browser.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/routing/master-link.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MasterLink } from './master-link'
import type { MasterRouting, MasterTarget } from './routing'

const target: MasterTarget = {
  screen: 'dataItem',
  settingId: 'MASTER#t#MASTER_SETTING#P',
  id: 'MASTER#t#P#a/b',
}

function routing(overrides: Partial<MasterRouting> = {}): MasterRouting {
  return {
    href: (to) =>
      to.screen === 'dataItem'
        ? `/data/${encodeURIComponent(to.settingId)}/${encodeURIComponent(to.id)}`
        : '/',
    navigate: vi.fn(),
    ...overrides,
  }
}

describe('MasterLink', () => {
  it('renders the host’s Link with the target’s href', () => {
    const Link = ({
      href,
      className,
      children,
    }: {
      href: string
      className?: string
      children: ReactNode
    }) => (
      <a href={href} className={className} data-host-link="">
        {children}
      </a>
    )
    render(
      <MasterLink routing={routing({ Link })} to={target} className="x">
        P-001
      </MasterLink>
    )
    const link = screen.getByRole('link', { name: 'P-001' })
    expect(link).toHaveAttribute('data-host-link', '')
    expect(link).toHaveAttribute(
      'href',
      '/data/MASTER%23t%23MASTER_SETTING%23P/MASTER%23t%23P%23a%2Fb'
    )
    expect(link).toHaveClass('x')
  })

  it('without a Link, navigates on a plain click and leaves modified clicks to the browser', async () => {
    const host = routing()
    render(
      <MasterLink routing={host} to={target}>
        P-001
      </MasterLink>
    )
    const link = screen.getByRole('link', { name: 'P-001' })
    await userEvent.click(link)
    expect(host.navigate).toHaveBeenCalledWith(target)

    fireEvent.click(link, { ctrlKey: true })
    fireEvent.click(link, { button: 1 })
    expect(host.navigate).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/routing`
Expected: FAIL — `./master-link` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/routing/routing.ts`:

```ts
import type { ComponentType, ReactNode } from 'react'

/** A screen the package links to. Ids are decoded (`pk#sk`); the host encodes them in its URLs. */
export type MasterTarget =
  | { screen: 'settings' }
  | { screen: 'newSetting' }
  | { screen: 'setting'; id: string }
  | { screen: 'data'; settingId: string }
  | { screen: 'newData'; settingId: string }
  | { screen: 'dataItem'; settingId: string; id: string }
  | { screen: 'copyRequest'; settingId: string }
  | { screen: 'copyTasks'; settingId: string }
  | { screen: 'copyTask'; settingId: string; taskId: string }

/** How the host's router reaches each screen; the package has no routing of its own. */
export type MasterRouting = {
  /** A real URL, so links can be opened in a new tab. */
  href(target: MasterTarget): string
  /** Go somewhere after an action (save, delete, cancel) or a plain link click. */
  navigate(target: MasterTarget): void
  /** The router's link component (e.g. next/link); without it, plain anchors call `navigate`. */
  Link?: ComponentType<{
    href: string
    className?: string
    children: ReactNode
  }>
}
```

`packages/master-web/src/routing/master-link.tsx`:

```tsx
'use client'

import type { MouseEvent, ReactNode } from 'react'

import type { MasterRouting, MasterTarget } from './routing'

/** A link to one of the package's screens through the host's routing. */
export function MasterLink({
  routing,
  to,
  className,
  children,
}: {
  routing: MasterRouting
  to: MasterTarget
  className?: string
  children: ReactNode
}) {
  const href = routing.href(to)
  if (routing.Link) {
    const { Link } = routing
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Modified and middle clicks open a new tab: leave those to the browser.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    event.preventDefault()
    routing.navigate(to)
  }
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/routing && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (2 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web/src/routing
git commit -m "feat(master-web): routing targets and MasterLink"
```

---

### Task 3: `DataTable`

**Files:**

- Modify: `packages/master-web/package.json` (add `lucide-react`), `packages/master-web/src/i18n/master-messages.ts`
- Create: `packages/master-web/src/table/data-table.tsx`
- Test: `packages/master-web/src/table/data-table.test.tsx`

**Interfaces:**

- Consumes: ui-web `PaginationBar` (`variant="table"`, `label`) from Task 1.
- Produces (internal, not exported from the package): `DataTable<T>(props: DataTableProps<T>)`, `type DataTableColumn<T> = { id; header; sortable?; width?; cell(row): ReactNode }`, `type DataTableSort = { column: string; desc: boolean }`, `type DataTableProps<T> = { columns; rows; rowKey(row); label; total; page; pageSize; onPageChange; onPageSizeChange; sort?; onSortChange?; selection?: ReadonlySet<string>; onSelectionChange?(selection: Set<string>); loading? }`. `master` messages gain `table: { empty, loading, selectAll, selectRow, pagerTop, pagerBottom }`.

- [ ] **Step 1: Add the icon library**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web add lucide-react@^1.52.0`
Expected: `packages/master-web/package.json` lists `"lucide-react": "^1.52.0"`; `pnpm-lock.yaml` changes.

- [ ] **Step 2: Write the failing test**

`packages/master-web/src/table/data-table.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type DataTableSort,
} from './data-table'

type Row = { id: string; code: string; name: string }

const ROWS: Row[] = [
  { id: 'a', code: 'A-1', name: 'りんご' },
  { id: 'b', code: 'B-2', name: 'みかん' },
]
const COLUMNS: DataTableColumn<Row>[] = [
  {
    id: 'code',
    header: 'コード',
    sortable: true,
    width: '25%',
    cell: (row) => row.code,
  },
  { id: 'name', header: '名称', sortable: true, cell: (row) => row.name },
  { id: 'memo', header: '説明', cell: () => '—' },
]

function table(overrides: Partial<DataTableProps<Row>> = {}) {
  return (
    <DataTable
      label="データ一覧"
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.id}
      total={25}
      page={1}
      pageSize={10}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      {...overrides}
    />
  )
}

describe('DataTable', () => {
  it('shows rows, column widths and which column is sorted', () => {
    render(
      table({ sort: { column: 'code', desc: false }, onSortChange: () => {} })
    )
    const grid = screen.getByRole('table', { name: 'データ一覧' })
    expect(within(grid).getByRole('cell', { name: 'B-2' })).toBeInTheDocument()
    const [code, name, memo] = within(grid).getAllByRole('columnheader')
    expect(code).toHaveAttribute('aria-sort', 'ascending')
    expect(code).toHaveStyle({ width: '25%' })
    expect(name).toHaveAttribute('aria-sort', 'none')
    expect(memo).not.toHaveAttribute('aria-sort')
    expect(within(memo!).queryByRole('button')).toBeNull()
  })

  it('sorts a column ascending first, then flips it (v0)', async () => {
    const onSortChange = vi.fn<(sort: DataTableSort) => void>()
    const { rerender } = render(table({ onSortChange }))
    await userEvent.click(screen.getByRole('button', { name: '名称' }))
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      desc: false,
    })
    rerender(table({ onSortChange, sort: { column: 'name', desc: false } }))
    await userEvent.click(screen.getByRole('button', { name: '名称' }))
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      desc: true,
    })
    rerender(table({ onSortChange, sort: { column: 'name', desc: true } }))
    await userEvent.click(screen.getByRole('button', { name: '名称' }))
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      desc: false,
    })
  })

  it('puts a pagination bar above and below the table, each with its own name', async () => {
    const onPageChange = vi.fn()
    render(table({ onPageChange }))
    const top = screen.getByRole('navigation', { name: '上部のページ送り' })
    const bottom = screen.getByRole('navigation', { name: '下部のページ送り' })
    expect(within(top).getByText('検索件数:25')).toBeInTheDocument()
    await userEvent.click(within(bottom).getByRole('link', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('says when there is no data, and shows a loading row instead while loading', () => {
    const { rerender } = render(table({ rows: [], total: 0 }))
    expect(screen.getByText('データがありません')).toBeInTheDocument()
    rerender(table({ rows: [], total: 0, loading: true }))
    expect(screen.queryByText('データがありません')).toBeNull()
    expect(
      screen.getByRole('status', { name: '読み込み中' })
    ).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('selects rows one by one or the whole page', async () => {
    function Selectable() {
      const [selection, setSelection] = useState<Set<string>>(new Set())
      return (
        <>
          {table({ selection, onSelectionChange: setSelection })}
          <output>{[...selection].join(',')}</output>
        </>
      )
    }
    render(<Selectable />)
    const all = screen.getByRole('checkbox', { name: 'このページをすべて選択' })
    const [first] = screen.getAllByRole('checkbox', { name: 'この行を選択' })
    await userEvent.click(first!)
    expect(document.querySelector('output')).toHaveTextContent('a')
    expect(all).toHaveAttribute('data-state', 'indeterminate')
    expect(first!.closest('tr')).toHaveAttribute('data-state', 'selected')
    await userEvent.click(all)
    expect(document.querySelector('output')).toHaveTextContent('a,b')
    await userEvent.click(all)
    expect(document.querySelector('output')).toHaveTextContent('')
  })

  it('has no axe violations and renders on the server', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          {table({ onSortChange: () => {}, onSelectionChange: () => {} })}
        </main>
      </MbcProvider>
    )
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
    expect(renderToString(table())).toContain('りんご')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/table`
Expected: FAIL — `./data-table` cannot be resolved.

- [ ] **Step 4: Implement**

`packages/master-web/src/table/data-table.tsx`:

```tsx
'use client'

import {
  Button,
  Checkbox,
  cn,
  PaginationBar,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronsUpDown,
  Inbox,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { masterMessages } from '../i18n/master-messages'

export type DataTableColumn<T> = {
  id: string
  header: string
  /** A sortable column sends its `id` as the sort key. */
  sortable?: boolean
  /** v0's column width (`meta.size`), e.g. '25%'. */
  width?: string
  cell(row: T): ReactNode
}

export type DataTableSort = { column: string; desc: boolean }

export type DataTableProps<T> = {
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[]
  rowKey(row: T): string
  /** Accessible name of the table. */
  label: string
  total: number
  /** 1-based. */
  page: number
  pageSize: number
  onPageChange(page: number): void
  onPageSizeChange(pageSize: number): void
  sort?: DataTableSort
  onSortChange?(sort: DataTableSort): void
  /** Selected row keys; with `onSelectionChange`, a checkbox column appears. */
  selection?: ReadonlySet<string>
  onSelectionChange?(selection: Set<string>): void
  loading?: boolean
}

/** master v0's page sizes. */
const PAGE_SIZES = [10, 20, 50, 100] as const

function SortIcon({ state }: { state: false | 'asc' | 'desc' }) {
  const className = 'mbc:ml-2 mbc:h-4 mbc:w-4'
  if (state === 'asc')
    return <ArrowUpNarrowWide aria-hidden className={className} />
  if (state === 'desc')
    return <ArrowDownWideNarrow aria-hidden className={className} />
  return (
    <ChevronsUpDown aria-hidden className={cn(className, 'mbc:opacity-50')} />
  )
}

/** master v0's data table: pagination above and below, sortable headers, an empty row. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  label,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
  selection,
  onSelectionChange,
  loading = false,
}: DataTableProps<T>) {
  const t = useMessages(masterMessages)
  const selectable = onSelectionChange !== undefined
  const keys = rows.map(rowKey)
  const selected: ReadonlySet<string> = selection ?? new Set()
  const allSelected = keys.length > 0 && keys.every((key) => selected.has(key))
  const someSelected = keys.some((key) => selected.has(key))
  const columnCount = columns.length + (selectable ? 1 : 0)

  const select = (changed: readonly string[], checked: boolean) => {
    const next = new Set(selected)
    for (const key of changed) {
      if (checked) next.add(key)
      else next.delete(key)
    }
    onSelectionChange?.(next)
  }

  const bar = (name: string) => (
    <PaginationBar
      variant="table"
      label={name}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={PAGE_SIZES}
    />
  )

  return (
    <div className="mbc:space-y-2">
      {bar(t.table.pagerTop)}
      <div className="mbc:rounded-md">
        <Table
          className="mbc:table-fixed"
          aria-label={label}
          aria-busy={loading || undefined}
        >
          <TableHeader>
            <TableRow className="mbc:border-border mbc:border-b mbc:font-bold">
              {selectable && (
                <TableHead className="mbc:bg-muted mbc:w-10 mbc:px-2">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) =>
                      select(keys, checked === true)
                    }
                    aria-label={t.table.selectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => {
                const state =
                  sort?.column === column.id
                    ? sort.desc
                      ? 'desc'
                      : 'asc'
                    : false
                const ariaSort = !column.sortable
                  ? undefined
                  : state === 'asc'
                    ? 'ascending'
                    : state === 'desc'
                      ? 'descending'
                      : 'none'
                return (
                  <TableHead
                    key={column.id}
                    aria-sort={ariaSort}
                    style={column.width ? { width: column.width } : undefined}
                    className="mbc:bg-muted mbc:px-0 mbc:font-bold"
                  >
                    {column.sortable && onSortChange ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mbc:bg-muted mbc:hover:bg-muted/80 mbc:focus:bg-muted/80 mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:rounded-none mbc:font-bold"
                        // v0: ascending first, then flip.
                        onClick={() =>
                          onSortChange({
                            column: column.id,
                            desc: state === 'asc',
                          })
                        }
                      >
                        {column.header}
                        <SortIcon state={state} />
                      </Button>
                    ) : (
                      <div className="mbc:px-4 mbc:font-bold">
                        {column.header}
                      </div>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, index) => {
                const key = keys[index] ?? String(index)
                const checked = selected.has(key)
                return (
                  <TableRow
                    key={key}
                    data-state={checked ? 'selected' : undefined}
                    className="mbc:border-border mbc:border-b mbc:transition-all mbc:duration-200 mbc:data-[state=selected]:bg-accent/70 mbc:data-[state=selected]:font-normal"
                  >
                    {selectable && (
                      <TableCell className="mbc:px-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            select([key], value === true)
                          }
                          aria-label={t.table.selectRow}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} className="mbc:break-words">
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : loading ? (
              <TableRow className="mbc:border-border mbc:border-b">
                <TableCell colSpan={columnCount} className="mbc:h-48">
                  <div
                    role="status"
                    aria-label={t.table.loading}
                    className="mbc:flex mbc:flex-col mbc:gap-3"
                  >
                    <Skeleton className="mbc:h-4 mbc:w-full" />
                    <Skeleton className="mbc:h-4 mbc:w-full" />
                    <Skeleton className="mbc:h-4 mbc:w-2/3" />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow className="mbc:border-border mbc:border-b">
                <TableCell colSpan={columnCount} className="mbc:h-48">
                  <div className="mbc:text-muted-foreground mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:gap-4">
                    {/* v0 faded the whole block to 20%; only the icon stays faded so the text is readable. */}
                    <Inbox
                      aria-hidden
                      className="mbc:h-16 mbc:w-16 mbc:opacity-20"
                    />
                    <p>{t.table.empty}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {bar(t.table.pagerBottom)}
    </div>
  )
}
```

Replace the whole messages file (adds `table`):

`packages/master-web/src/i18n/master-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterFieldType } from '../core/field-type-names'

export type MasterMessages = {
  fieldTypes: Record<MasterFieldType, string>
  /** The data tables of the list screens. */
  table: {
    empty: string
    loading: string
    selectAll: string
    selectRow: string
    pagerTop: string
    pagerBottom: string
  }
  /** Data-record errors (`MasterError`). */
  validation: {
    required: string
    blank: string
    maxLength: (params: { max: number }) => string
    maxRows: (params: { max: number }) => string
    pattern: (params: { name: string }) => string
    integer: string
    min: (params: { min: number }) => string
    max: (params: { max: number }) => string
    json: string
  }
  /** Field-definition errors (`FieldDefinitionError`). */
  fieldDefinition: {
    required: string
    tooLong: (params: { max: number }) => string
    nameChars: string
    duplicate: string
    reserved: string
    typeNotAllowed: string
    numeric: string
    lengthRange: string
    maxRowMin: string
    minNotLess: string
    maxNotGreater: string
    defaultRange: string
    defaultJson: string
    defaultBoolean: string
    defaultLength: string
    formatRequired: string
  }
  /** Bulk-import errors (`BulkError`); `item` prefixes errors about one entry. */
  bulk: {
    item: (params: { n: number }) => string
    invalidJson: string
    notArray: string
    empty: string
    mapFailed: (params: { message: string }) => string
    invalidItem: string
    invalidDataItem: string
    invalidMappedSetting: string
    invalidMappedData: string
    settingNotAllowed: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    master: MasterMessages
  }
}

const ja: MasterMessages = {
  fieldTypes: {
    string: '文字列',
    number: '数値',
    auto_number: '自動採番',
    boolean: 'ブール値',
    date: '日付',
    array: '文字列(配列)',
    json: 'JSON',
    'text-area': 'テキストエリア',
    'text-html': 'HTML形式',
    'text-markdown': 'Markdown形式',
  },
  table: {
    empty: 'データがありません',
    loading: '読み込み中',
    selectAll: 'このページをすべて選択',
    selectRow: 'この行を選択',
    pagerTop: '上部のページ送り',
    pagerBottom: '下部のページ送り',
  },
  validation: {
    required: '入力してください。',
    blank: '空白のみは許可されていません。',
    maxLength: ({ max }) => `${max}文字以内で入力してください。`,
    maxRows: ({ max }) => `${max}行以内で入力してください。`,
    pattern: ({ name }) => `${name} の型が違います。`,
    integer: '数字を入力してください。',
    min: ({ min }) => `最小値は ${min} です。`,
    max: ({ max }) => `最大値は ${max} です。`,
    json: 'JSONの形式が正しくありません。',
  },
  fieldDefinition: {
    required: '入力してください。',
    tooLong: ({ max }) => `${max}文字以内で入力してください。`,
    nameChars: '物理名に「.」「[」「]」「\'」「"」は使えません。',
    duplicate: '同じ物理名の項目が既にあります。',
    reserved: 'この物理名は使えません。',
    typeNotAllowed: 'この項目では選択できないデータ型です。',
    numeric: '数字で入力してください。',
    lengthRange: '1〜255の範囲で入力してください。',
    maxRowMin: '1以上の数値を入力してください。',
    minNotLess: '最小値には最大値より小さい値を入力してください。',
    maxNotGreater: '最大値には最小値より大きい値を入力してください。',
    defaultRange: 'デフォルト値は min から max の範囲内である必要があります。',
    defaultJson: 'デフォルト値は有効な JSON である必要があります。',
    defaultBoolean: 'デフォルト値は true または false である必要があります。',
    defaultLength: '文字列の長さは設定された長さを超えてはいけません。',
    formatRequired: '選択してください。',
  },
  bulk: {
    item: ({ n }) => `${n}件目: `,
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    notArray: 'JSON が無効です。配列である必要があります。',
    empty: 'データがありません',
    mapFailed: ({ message }) => `マッピングに失敗しました。${message}`,
    invalidItem:
      '各項目には code, name, attributes が必須です。マスターデータの場合は settingCode, seq も必須です。',
    invalidDataItem:
      '各項目には settingCode, code, name, seq, attributes が必須です。',
    invalidMappedSetting:
      '設定データの name, code は文字列、settingValue はオブジェクトである必要があります。',
    invalidMappedData:
      'データの settingCode, code, name は文字列、seq は数値、attributes はオブジェクトである必要があります。',
    settingNotAllowed:
      'マスター設定はこの画面から登録できません。マスターデータ画面では kind: "data" のみ登録できます。',
  },
}

const en: MasterMessages = {
  fieldTypes: {
    string: 'Text',
    number: 'Number',
    auto_number: 'Auto number',
    boolean: 'Boolean',
    date: 'Date',
    array: 'Text list',
    json: 'JSON',
    'text-area': 'Text area',
    'text-html': 'HTML',
    'text-markdown': 'Markdown',
  },
  table: {
    empty: 'No data',
    loading: 'Loading',
    selectAll: 'Select all on this page',
    selectRow: 'Select this row',
    pagerTop: 'Pagination (top)',
    pagerBottom: 'Pagination (bottom)',
  },
  validation: {
    required: 'This field is required.',
    blank: 'Spaces alone are not allowed.',
    maxLength: ({ max }) => `Enter at most ${max} characters.`,
    maxRows: ({ max }) => `Enter at most ${max} lines.`,
    pattern: ({ name }) => `${name} has the wrong format.`,
    integer: 'Enter a whole number.',
    min: ({ min }) => `The minimum is ${min}.`,
    max: ({ max }) => `The maximum is ${max}.`,
    json: 'The JSON is not valid.',
  },
  fieldDefinition: {
    required: 'This field is required.',
    tooLong: ({ max }) => `Enter at most ${max} characters.`,
    nameChars: `A physical name cannot contain ".", "[", "]", "'" or '"'.`,
    duplicate: 'Another field already has this physical name.',
    reserved: 'This physical name is reserved.',
    typeNotAllowed: 'This data type is not available for this field.',
    numeric: 'Enter a number.',
    lengthRange: 'Enter a number from 1 to 255.',
    maxRowMin: 'Enter 1 or more.',
    minNotLess: 'The minimum must be less than the maximum.',
    maxNotGreater: 'The maximum must be greater than the minimum.',
    defaultRange: 'The default must be between the minimum and the maximum.',
    defaultJson: 'The default must be valid JSON.',
    defaultBoolean: 'The default must be true or false.',
    defaultLength: 'The default is longer than the length allows.',
    formatRequired: 'Select a format.',
  },
  bulk: {
    item: ({ n }) => `Item ${n}: `,
    invalidJson: 'The JSON is not valid.',
    notArray: 'The JSON must be a list.',
    empty: 'There is no data.',
    mapFailed: ({ message }) => `Mapping failed. ${message}`,
    invalidItem:
      'Every item needs code, name and attributes; data items also need settingCode and seq.',
    invalidDataItem:
      'Every item needs settingCode, code, name, seq and attributes.',
    invalidMappedSetting:
      'A mapped setting needs a text name and code and an object settingValue.',
    invalidMappedData:
      'Mapped data needs a text settingCode, code and name, a number seq and an object attributes.',
    settingNotAllowed:
      'Settings cannot be imported here; only kind: "data" items are allowed.',
  },
}

export const masterMessages = defineMessages('master', { ja, en })
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/table && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (6 tests, including the axe check and `renderToString`); typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/master-web pnpm-lock.yaml
git commit -m "feat(master-web): data table with sortable headers, pagination above and below, selection"
```

---

### Task 4: Refuse bulk entries for another tenant

**Files:**

- Modify: `packages/master-web/src/core/bulk.ts`, `packages/master-web/src/core/bulk.test.ts`, `packages/master-web/src/i18n/master-messages.ts`

**Interfaces:**

- Produces: `parseBulkJson(text, { screen, mapRawItem?, tenantCode? })` — with `tenantCode`, an entry whose `tenantCode` is set to another tenant becomes `{ key: 'otherTenant', index }` (the backend rejects a whole batch for one such item). `BulkError` gains that key; `master.bulk.otherTenant` is its text.

- [ ] **Step 1: Write the failing test**

Replace the whole test file (adds the `parseBulkJson with the current tenant` block):

`packages/master-web/src/core/bulk.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  bulkSampleJson,
  mapResultToBulkItem,
  parseBulkJson,
  type BulkMapper,
  type MapResult,
} from './bulk'

const setting = {
  code: 'S',
  name: '設定',
  attributes: { description: '', fields: [] },
}
const data = {
  settingCode: 'S',
  code: 'D1',
  name: 'データ',
  seq: 0,
  attributes: {},
}

describe('parseBulkJson without a mapper', () => {
  it('reports JSON that does not parse or is not a list', () => {
    expect(parseBulkJson('{', { screen: 'settings' })).toEqual({
      items: [],
      errors: [{ key: 'invalidJson' }],
    })
    expect(parseBulkJson('{}', { screen: 'settings' }).errors).toEqual([
      { key: 'notArray' },
    ])
    expect(parseBulkJson('[]', { screen: 'settings' }).errors).toEqual([
      { key: 'empty' },
    ])
  })

  it('accepts settings and data on the settings list, data only on a data list', () => {
    const text = JSON.stringify([setting, data])
    expect(parseBulkJson(text, { screen: 'settings' })).toEqual({
      items: [setting, data],
      errors: [],
    })
    expect(parseBulkJson(text, { screen: 'data' })).toEqual({
      items: [data],
      errors: [{ key: 'invalidDataItem', index: 0 }],
    })
  })

  it('reports every bad entry with its index', () => {
    const text = JSON.stringify([
      { code: 1, name: 'x', attributes: {} },
      { ...data, seq: '0' },
      { ...data, settingCode: ' ' },
      data,
    ])
    expect(parseBulkJson(text, { screen: 'settings' })).toEqual({
      items: [data],
      errors: [
        { key: 'invalidItem', index: 0 },
        { key: 'invalidItem', index: 1 },
        { key: 'invalidItem', index: 2 },
      ],
    })
  })
})

describe('parseBulkJson with a mapper', () => {
  const mapper: BulkMapper = (raw) => {
    const row = raw as { kind?: string; id?: string; label?: string }
    if (row.kind === 'skip') return null
    if (row.kind === 'boom') throw new Error('bad row')
    if (row.kind === 'setting')
      return {
        kind: 'setting',
        value: { code: row.id ?? '', name: row.label ?? '', settingValue: {} },
      }
    return {
      kind: 'data',
      value: {
        settingCode: 'S',
        code: row.id ?? '',
        name: row.label ?? '',
        seq: 1,
        attributes: {},
      },
    }
  }

  it('maps entries, skips nulls and reports mapper failures', () => {
    const text = JSON.stringify([
      { kind: 'data', id: 'a', label: 'A' },
      { kind: 'skip' },
      { kind: 'boom' },
      { kind: 'setting', id: 's', label: 'S' },
    ])
    expect(
      parseBulkJson(text, { screen: 'settings', mapRawItem: mapper })
    ).toEqual({
      items: [
        {
          name: 'A',
          code: 'a',
          settingCode: 'S',
          tenantCode: undefined,
          seq: 1,
          attributes: {},
        },
        { name: 'S', code: 's', tenantCode: undefined, attributes: {} },
      ],
      errors: [{ key: 'mapFailed', index: 2, message: 'bad row' }],
    })
  })

  it('reports malformed mapper results instead of throwing', () => {
    const results: unknown[] = [
      { kind: 'data' },
      { kind: 'setting', value: null },
      'oops',
      { kind: 'other', value: {} },
    ]
    const mapper: BulkMapper = (raw) =>
      results[(raw as { i: number }).i] as MapResult
    const text = JSON.stringify([{ i: 0 }, { i: 1 }, { i: 2 }, { i: 3 }])
    expect(
      parseBulkJson(text, { screen: 'settings', mapRawItem: mapper }).errors
    ).toEqual([
      { key: 'invalidMappedData', index: 0 },
      { key: 'invalidMappedSetting', index: 1 },
      { key: 'invalidMappedData', index: 2 },
      { key: 'invalidMappedData', index: 3 },
    ])
  })

  it('refuses mapped settings on a data list and checks mapped values', () => {
    const text = JSON.stringify([{ kind: 'setting', id: 's' }])
    expect(
      parseBulkJson(text, { screen: 'data', mapRawItem: mapper }).errors
    ).toEqual([{ key: 'settingNotAllowed', index: 0 }])
    const broken: BulkMapper = () => ({
      kind: 'data',
      value: { settingCode: '', code: 'c', name: 'n', seq: 0, attributes: {} },
    })
    expect(
      parseBulkJson('[{}]', { screen: 'data', mapRawItem: broken }).errors
    ).toEqual([{ key: 'invalidMappedData', index: 0 }])
    expect(
      parseBulkJson('[{"kind":"skip"}]', { screen: 'data', mapRawItem: mapper })
        .errors
    ).toEqual([{ key: 'empty' }])
  })
})

describe('parseBulkJson with the current tenant', () => {
  it('refuses entries for another tenant, mapped or not (the backend would reject the batch)', () => {
    const text = JSON.stringify([
      { ...data, tenantCode: 't1' },
      { ...data, code: 'D2', tenantCode: 't2' },
      { ...data, code: 'D3' },
    ])
    expect(parseBulkJson(text, { screen: 'data', tenantCode: 't1' })).toEqual({
      items: [
        { ...data, tenantCode: 't1' },
        { ...data, code: 'D3' },
      ],
      errors: [{ key: 'otherTenant', index: 1 }],
    })
    const mapper: BulkMapper = () => ({
      kind: 'data',
      value: {
        settingCode: 'S',
        code: 'c',
        name: 'n',
        seq: 0,
        attributes: {},
        tenantCode: 't2',
      },
    })
    expect(
      parseBulkJson('[{}]', {
        screen: 'data',
        tenantCode: 't1',
        mapRawItem: mapper,
      }).errors
    ).toEqual([{ key: 'otherTenant', index: 0 }])
  })
})

describe('mapResultToBulkItem', () => {
  it('turns a mapped setting’s settingValue into attributes (v0)', () => {
    expect(
      mapResultToBulkItem({
        kind: 'setting',
        value: { code: 'c', name: 'n', settingValue: { a: 1 } },
      })
    ).toEqual({
      code: 'c',
      name: 'n',
      tenantCode: undefined,
      attributes: { a: 1 },
    })
  })
})

describe('bulkSampleJson', () => {
  it('gives a sample that its own screen accepts', () => {
    for (const screen of ['settings', 'data'] as const) {
      const result = parseBulkJson(bulkSampleJson(screen, 'PRODUCT'), {
        screen,
      })
      expect(result.errors, screen).toEqual([])
    }
    expect(JSON.parse(bulkSampleJson('data', 'PRODUCT'))[0].settingCode).toBe(
      'PRODUCT'
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/core/bulk.test.ts`
Expected: FAIL — "refuses entries for another tenant…" (the entry is accepted).

- [ ] **Step 3: Implement**

Replace the whole file:

`packages/master-web/src/core/bulk.ts`:

```ts
/** One item of `POST /api/master-bulk`; `settingCode` makes it a data record. */
export type BulkJsonItem = {
  name: string
  code: string
  attributes: Record<string, unknown>
  tenantCode?: string
  settingCode?: string
  seq?: number
}

/** v0's mapper result types: hosts map their own JSON shape with `mapRawItem`. */
export type MappedSetting = {
  kind: 'setting'
  value: {
    name: string
    code: string
    tenantCode?: string
    settingValue: Record<string, unknown>
  }
}

export type MappedData = {
  kind: 'data'
  value: {
    settingCode: string
    code: string
    name: string
    seq: number
    attributes: Record<string, unknown>
    tenantCode?: string
  }
}

export type MapResult = MappedSetting | MappedData

/** Return `null` / `undefined` to skip an entry. */
export type BulkMapper = (raw: unknown) => MapResult | null | undefined

export type BulkError =
  | { key: 'invalidJson' }
  | { key: 'notArray' }
  | { key: 'empty' }
  | { key: 'mapFailed'; index: number; message: string }
  | { key: 'invalidItem'; index: number }
  | { key: 'invalidDataItem'; index: number }
  | { key: 'invalidMappedSetting'; index: number }
  | { key: 'invalidMappedData'; index: number }
  | { key: 'settingNotAllowed'; index: number }
  | { key: 'otherTenant'; index: number }

export type BulkParseResult = { items: BulkJsonItem[]; errors: BulkError[] }

/** The settings list imports settings and data; a setting's data list imports data only. */
export type BulkScreen = 'settings' | 'data'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isText = (value: unknown): value is string => typeof value === 'string'
const isFilled = (value: unknown): value is string =>
  isText(value) && value.trim() !== ''
const optionalText = (value: unknown) => value === undefined || isText(value)

export function mapResultToBulkItem(result: MapResult): BulkJsonItem {
  if (result.kind === 'setting') {
    const { name, code, tenantCode, settingValue } = result.value
    return { name, code, tenantCode, attributes: settingValue }
  }
  const { name, code, settingCode, tenantCode, seq, attributes } = result.value
  return { name, code, settingCode, tenantCode, seq, attributes }
}

function isMappedSetting(value: MappedSetting['value']): boolean {
  return (
    isText(value.name) &&
    isText(value.code) &&
    isPlainObject(value.settingValue) &&
    optionalText(value.tenantCode)
  )
}

function isMappedData(value: MappedData['value']): boolean {
  return (
    isFilled(value.settingCode) &&
    isText(value.code) &&
    isText(value.name) &&
    typeof value.seq === 'number' &&
    isPlainObject(value.attributes) &&
    optionalText(value.tenantCode)
  )
}

function isBulkItem(entry: unknown, screen: BulkScreen): entry is BulkJsonItem {
  if (!isPlainObject(entry)) return false
  if (
    !isText(entry.code) ||
    !isText(entry.name) ||
    !isPlainObject(entry.attributes)
  )
    return false
  if (!optionalText(entry.tenantCode)) return false
  const isData = screen === 'data' || 'settingCode' in entry
  return (
    !isData || (isFilled(entry.settingCode) && typeof entry.seq === 'number')
  )
}

/**
 * v0's bulk-import checks, reported per entry instead of stopping at the
 * first one. Without a mapper each entry must already be a bulk item; with
 * one, entries mapped to `null` are skipped. `items` holds the valid entries;
 * import only when `errors` is empty.
 */
export function parseBulkJson(
  text: string,
  {
    screen,
    mapRawItem,
    tenantCode,
  }: {
    screen: BulkScreen
    mapRawItem?: BulkMapper
    /** The current tenant: entries for another tenant are refused (the backend rejects the whole batch). */
    tenantCode?: string
  }
): BulkParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { items: [], errors: [{ key: 'invalidJson' }] }
  }
  if (!Array.isArray(raw)) return { items: [], errors: [{ key: 'notArray' }] }

  const items: BulkJsonItem[] = []
  const errors: BulkError[] = []
  const accept = (item: BulkJsonItem, index: number) => {
    if (
      tenantCode !== undefined &&
      item.tenantCode !== undefined &&
      item.tenantCode !== tenantCode
    )
      errors.push({ key: 'otherTenant', index })
    else items.push(item)
  }
  raw.forEach((entry: unknown, index) => {
    if (!mapRawItem) {
      if (isBulkItem(entry, screen)) accept(entry, index)
      else
        errors.push({
          key: screen === 'data' ? 'invalidDataItem' : 'invalidItem',
          index,
        })
      return
    }
    let mapped: MapResult | null | undefined
    try {
      mapped = mapRawItem(entry)
    } catch (error) {
      errors.push({
        key: 'mapFailed',
        index,
        message: error instanceof Error ? error.message : String(error),
      })
      return
    }
    if (!mapped) return
    // A host mapper may hand back anything; check the shape before reading it.
    const raw: unknown = mapped
    const kind = isPlainObject(raw) ? raw.kind : undefined
    const value = isPlainObject(raw) ? raw.value : undefined
    if (kind === 'setting') {
      if (screen === 'data') errors.push({ key: 'settingNotAllowed', index })
      else if (
        !isPlainObject(value) ||
        !isMappedSetting(value as MappedSetting['value'])
      )
        errors.push({ key: 'invalidMappedSetting', index })
      else accept(mapResultToBulkItem(mapped), index)
      return
    }
    if (
      kind !== 'data' ||
      !isPlainObject(value) ||
      !isMappedData(value as MappedData['value'])
    )
      errors.push({ key: 'invalidMappedData', index })
    else accept(mapResultToBulkItem(mapped), index)
  })
  if (items.length === 0 && errors.length === 0) errors.push({ key: 'empty' })
  return { items, errors }
}

/** The starting JSON in the import dialog (v0's samples, indented for a plain text box). */
export function bulkSampleJson(
  screen: BulkScreen,
  settingCode = 'SETTING_CODE'
): string {
  const data = {
    settingCode,
    code: 'MASTER_DATA_CODE',
    name: 'マスターデータサンプル',
    seq: 0,
    attributes:
      screen === 'data' ? { seq: 0, code: '', name: '' } : { description: '' },
  }
  if (screen === 'data') return JSON.stringify([data], null, 2)
  const field = (
    physicalName: string,
    name: string,
    dataType: string,
    extra: Record<string, unknown>
  ) => ({
    physicalName,
    name,
    description: '',
    dataType,
    ...extra,
    isShowedOnList: true,
    uiComponent: 'string',
  })
  return JSON.stringify(
    [
      {
        code: 'MASTER_SETTING_CODE',
        name: 'マスター設定サンプル',
        attributes: {
          description: '',
          fields: [
            field('code', 'コード', 'string', {
              defaultValue: '',
              isRequired: true,
              length: '255',
            }),
            field('name', '名称', 'string', {
              isRequired: true,
              length: '255',
            }),
            field('seq', '並び順', 'number', {
              defaultValue: '',
              isRequired: false,
            }),
          ],
        },
      },
      data,
    ],
    null,
    2
  )
}
```

Replace the whole messages file (adds `bulk.otherTenant`):

`packages/master-web/src/i18n/master-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterFieldType } from '../core/field-type-names'

export type MasterMessages = {
  fieldTypes: Record<MasterFieldType, string>
  /** The data tables of the list screens. */
  table: {
    empty: string
    loading: string
    selectAll: string
    selectRow: string
    pagerTop: string
    pagerBottom: string
  }
  /** Data-record errors (`MasterError`). */
  validation: {
    required: string
    blank: string
    maxLength: (params: { max: number }) => string
    maxRows: (params: { max: number }) => string
    pattern: (params: { name: string }) => string
    integer: string
    min: (params: { min: number }) => string
    max: (params: { max: number }) => string
    json: string
  }
  /** Field-definition errors (`FieldDefinitionError`). */
  fieldDefinition: {
    required: string
    tooLong: (params: { max: number }) => string
    nameChars: string
    duplicate: string
    reserved: string
    typeNotAllowed: string
    numeric: string
    lengthRange: string
    maxRowMin: string
    minNotLess: string
    maxNotGreater: string
    defaultRange: string
    defaultJson: string
    defaultBoolean: string
    defaultLength: string
    formatRequired: string
  }
  /** Bulk-import errors (`BulkError`); `item` prefixes errors about one entry. */
  bulk: {
    item: (params: { n: number }) => string
    invalidJson: string
    notArray: string
    empty: string
    mapFailed: (params: { message: string }) => string
    invalidItem: string
    invalidDataItem: string
    invalidMappedSetting: string
    invalidMappedData: string
    settingNotAllowed: string
    otherTenant: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    master: MasterMessages
  }
}

const ja: MasterMessages = {
  fieldTypes: {
    string: '文字列',
    number: '数値',
    auto_number: '自動採番',
    boolean: 'ブール値',
    date: '日付',
    array: '文字列(配列)',
    json: 'JSON',
    'text-area': 'テキストエリア',
    'text-html': 'HTML形式',
    'text-markdown': 'Markdown形式',
  },
  table: {
    empty: 'データがありません',
    loading: '読み込み中',
    selectAll: 'このページをすべて選択',
    selectRow: 'この行を選択',
    pagerTop: '上部のページ送り',
    pagerBottom: '下部のページ送り',
  },
  validation: {
    required: '入力してください。',
    blank: '空白のみは許可されていません。',
    maxLength: ({ max }) => `${max}文字以内で入力してください。`,
    maxRows: ({ max }) => `${max}行以内で入力してください。`,
    pattern: ({ name }) => `${name} の型が違います。`,
    integer: '数字を入力してください。',
    min: ({ min }) => `最小値は ${min} です。`,
    max: ({ max }) => `最大値は ${max} です。`,
    json: 'JSONの形式が正しくありません。',
  },
  fieldDefinition: {
    required: '入力してください。',
    tooLong: ({ max }) => `${max}文字以内で入力してください。`,
    nameChars: '物理名に「.」「[」「]」「\'」「"」は使えません。',
    duplicate: '同じ物理名の項目が既にあります。',
    reserved: 'この物理名は使えません。',
    typeNotAllowed: 'この項目では選択できないデータ型です。',
    numeric: '数字で入力してください。',
    lengthRange: '1〜255の範囲で入力してください。',
    maxRowMin: '1以上の数値を入力してください。',
    minNotLess: '最小値には最大値より小さい値を入力してください。',
    maxNotGreater: '最大値には最小値より大きい値を入力してください。',
    defaultRange: 'デフォルト値は min から max の範囲内である必要があります。',
    defaultJson: 'デフォルト値は有効な JSON である必要があります。',
    defaultBoolean: 'デフォルト値は true または false である必要があります。',
    defaultLength: '文字列の長さは設定された長さを超えてはいけません。',
    formatRequired: '選択してください。',
  },
  bulk: {
    item: ({ n }) => `${n}件目: `,
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    notArray: 'JSON が無効です。配列である必要があります。',
    empty: 'データがありません',
    mapFailed: ({ message }) => `マッピングに失敗しました。${message}`,
    invalidItem:
      '各項目には code, name, attributes が必須です。マスターデータの場合は settingCode, seq も必須です。',
    invalidDataItem:
      '各項目には settingCode, code, name, seq, attributes が必須です。',
    invalidMappedSetting:
      '設定データの name, code は文字列、settingValue はオブジェクトである必要があります。',
    invalidMappedData:
      'データの settingCode, code, name は文字列、seq は数値、attributes はオブジェクトである必要があります。',
    settingNotAllowed:
      'マスター設定はこの画面から登録できません。マスターデータ画面では kind: "data" のみ登録できます。',
    otherTenant: 'tenantCode が現在のテナントと異なります。',
  },
}

const en: MasterMessages = {
  fieldTypes: {
    string: 'Text',
    number: 'Number',
    auto_number: 'Auto number',
    boolean: 'Boolean',
    date: 'Date',
    array: 'Text list',
    json: 'JSON',
    'text-area': 'Text area',
    'text-html': 'HTML',
    'text-markdown': 'Markdown',
  },
  table: {
    empty: 'No data',
    loading: 'Loading',
    selectAll: 'Select all on this page',
    selectRow: 'Select this row',
    pagerTop: 'Pagination (top)',
    pagerBottom: 'Pagination (bottom)',
  },
  validation: {
    required: 'This field is required.',
    blank: 'Spaces alone are not allowed.',
    maxLength: ({ max }) => `Enter at most ${max} characters.`,
    maxRows: ({ max }) => `Enter at most ${max} lines.`,
    pattern: ({ name }) => `${name} has the wrong format.`,
    integer: 'Enter a whole number.',
    min: ({ min }) => `The minimum is ${min}.`,
    max: ({ max }) => `The maximum is ${max}.`,
    json: 'The JSON is not valid.',
  },
  fieldDefinition: {
    required: 'This field is required.',
    tooLong: ({ max }) => `Enter at most ${max} characters.`,
    nameChars: `A physical name cannot contain ".", "[", "]", "'" or '"'.`,
    duplicate: 'Another field already has this physical name.',
    reserved: 'This physical name is reserved.',
    typeNotAllowed: 'This data type is not available for this field.',
    numeric: 'Enter a number.',
    lengthRange: 'Enter a number from 1 to 255.',
    maxRowMin: 'Enter 1 or more.',
    minNotLess: 'The minimum must be less than the maximum.',
    maxNotGreater: 'The maximum must be greater than the minimum.',
    defaultRange: 'The default must be between the minimum and the maximum.',
    defaultJson: 'The default must be valid JSON.',
    defaultBoolean: 'The default must be true or false.',
    defaultLength: 'The default is longer than the length allows.',
    formatRequired: 'Select a format.',
  },
  bulk: {
    item: ({ n }) => `Item ${n}: `,
    invalidJson: 'The JSON is not valid.',
    notArray: 'The JSON must be a list.',
    empty: 'There is no data.',
    mapFailed: ({ message }) => `Mapping failed. ${message}`,
    invalidItem:
      'Every item needs code, name and attributes; data items also need settingCode and seq.',
    invalidDataItem:
      'Every item needs settingCode, code, name, seq and attributes.',
    invalidMappedSetting:
      'A mapped setting needs a text name and code and an object settingValue.',
    invalidMappedData:
      'Mapped data needs a text settingCode, code and name, a number seq and an object attributes.',
    settingNotAllowed:
      'Settings cannot be imported here; only kind: "data" items are allowed.',
    otherTenant: 'The tenantCode differs from the current tenant.',
  },
}

export const masterMessages = defineMessages('master', { ja, en })
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web/src/core/bulk.ts packages/master-web/src/core/bulk.test.ts packages/master-web/src/i18n/master-messages.ts
git commit -m "feat(master-web): refuse bulk entries for another tenant, per entry"
```

---

### Task 5: `BulkImportDialog`

**Files:**

- Create: `packages/master-web/src/bulk/bulk-import-dialog.tsx`
- Test: `packages/master-web/src/bulk/bulk-import-dialog.test.tsx`
- Modify: `packages/master-web/src/i18n/master-messages.ts`

**Interfaces:**

- Consumes: `parseBulkJson` (Task 4), `bulkSampleJson`, `formatBulkError` (M2).
- Produces: `BulkImportDialog(props: BulkImportDialogProps)` and `type BulkImportDialogProps = { screen: BulkScreen; settingCode?; tenantCode?; inputSampleJson?; mapRawItem?; onImport(items: BulkJsonItem[], onProgress: (done: number, total: number) => void): Promise<void>; onImported?(); disabled? }`. The dialog cannot be dismissed while `onImport` runs. `master` messages gain `bulkDialog`.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/bulk/bulk-import-dialog.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BulkJsonItem } from '../core/bulk'
import {
  BulkImportDialog,
  type BulkImportDialogProps,
} from './bulk-import-dialog'

const DATA = {
  settingCode: 'P',
  code: 'D1',
  name: 'データ',
  seq: 0,
  attributes: {},
}

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(overrides: Partial<BulkImportDialogProps> = {}) {
  const onImport = vi.fn<BulkImportDialogProps['onImport']>(async () => {})
  const onImported = vi.fn()
  render(
    <BulkImportDialog
      screen="data"
      settingCode="P"
      onImport={onImport}
      onImported={onImported}
      {...overrides}
    />
  )
  return { onImport, onImported }
}

const open = () =>
  userEvent.click(screen.getByRole('button', { name: 'JSONエディタ' }))
const editor = () => screen.getByRole('textbox', { name: 'JSON' })
const typeJson = async (value: unknown) => {
  await userEvent.clear(editor())
  // userEvent.type treats { and [ as key descriptors; paste the JSON instead.
  editor().focus()
  await userEvent.paste(JSON.stringify(value))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BulkImportDialog', () => {
  it('opens with the sample for its screen', async () => {
    setup()
    await open()
    expect(
      screen.getByRole('dialog', { name: 'JSONエディタ' })
    ).toBeInTheDocument()
    expect(
      JSON.parse((editor() as HTMLTextAreaElement).value)[0].settingCode
    ).toBe('P')
  })

  it('starts from the host’s sample when given', async () => {
    setup({ inputSampleJson: '[]' })
    await open()
    expect(editor()).toHaveValue('[]')
  })

  it('lists every bad entry and sends nothing', async () => {
    const { onImport } = setup({ tenantCode: 't1' })
    await open()
    await typeJson([{ code: 1 }, { ...DATA, tenantCode: 't2' }])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(
      screen.getByText(
        '1件目: 各項目には settingCode, code, name, seq, attributes が必須です。'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText('2件目: tenantCode が現在のテナントと異なります。')
    ).toBeInTheDocument()
    expect(editor()).toHaveAttribute('aria-invalid', 'true')
    expect(onImport).not.toHaveBeenCalled()
  })

  it('imports with progress, then closes and reports success', async () => {
    const gate = deferred()
    let report: (done: number, total: number) => void = () => {}
    const onImport = vi.fn<BulkImportDialogProps['onImport']>(
      async (_items: BulkJsonItem[], onProgress) => {
        report = onProgress
        await gate.promise
      }
    )
    const { onImported } = setup({ onImport })
    await open()
    await typeJson([DATA, { ...DATA, code: 'D2' }])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(screen.getByRole('status')).toHaveTextContent('反映中 (0/2)')
    report(1, 2)
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('反映中 (1/2)')
    )
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    gate.resolve()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onImport.mock.calls[0]?.[0]).toEqual([DATA, { ...DATA, code: 'D2' }])
    expect(onImported).toHaveBeenCalledTimes(1)
  })

  it('stays open and says why when the import fails', async () => {
    const { onImported } = setup({
      onImport: async () => {
        throw new Error('batch 2 failed')
      },
    })
    await open()
    await typeJson([DATA])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('マスターデータの反映に失敗しました。')
    expect(alert).toHaveTextContent('batch 2 failed')
    expect(screen.getByRole('button', { name: 'データ反映' })).toBeEnabled()
    expect(onImported).not.toHaveBeenCalled()
  })

  it('loads a JSON file and saves the text as a file', async () => {
    setup()
    await open()
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    await userEvent.upload(
      input,
      new File([JSON.stringify([DATA])], 'items.json', {
        type: 'application/json',
      })
    )
    await waitFor(() => expect(editor()).toHaveValue(JSON.stringify([DATA])))

    const created: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      created.push(blob as Blob)
      return 'blob:x'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('master-data-bulk.json')
      })
    await userEvent.click(screen.getByRole('button', { name: 'JSON保存' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(await created[0]?.text()).toBe(JSON.stringify([DATA]))
  })

  it('has no axe violations while open', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <BulkImportDialog screen="settings" onImport={async () => {}} />
        </main>
      </MbcProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'JSON editor' }))
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/bulk`
Expected: FAIL — `./bulk-import-dialog` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/bulk/bulk-import-dialog.tsx`:

```tsx
'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Download, Save, Upload } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'

import {
  bulkSampleJson,
  parseBulkJson,
  type BulkError,
  type BulkJsonItem,
  type BulkMapper,
  type BulkScreen,
} from '../core/bulk'
import { formatBulkError } from '../i18n/format-error'
import { masterMessages } from '../i18n/master-messages'

export type BulkImportDialogProps = {
  /** `settings`: the settings list (settings and data); `data`: one setting's data list. */
  screen: BulkScreen
  /** A data list's setting code, used in the sample JSON. */
  settingCode?: string
  /** The current tenant; entries for another tenant are refused. */
  tenantCode?: string
  /** Starting JSON instead of the built-in sample (v0's `inputSampleJson`). */
  inputSampleJson?: string
  /** Maps the host's own JSON shape to bulk items (v0's `mapRawItem`). */
  mapRawItem?: BulkMapper
  /**
   * Sends the items; call `onProgress(done, total)` as they finish. Resolve
   * when everything is done (or nothing changed); reject on failure.
   */
  onImport(
    items: BulkJsonItem[],
    onProgress: (done: number, total: number) => void
  ): Promise<void>
  /** After a successful import, e.g. to reload the list. */
  onImported?(): void
  disabled?: boolean
}

const FILE_NAMES: Record<BulkScreen, string> = {
  settings: 'master-setting-bulk.json',
  data: 'master-data-bulk.json',
}

/** v0's JSON editor dialog for bulk import, as a normal dialog with a text box. */
export function BulkImportDialog({
  screen,
  settingCode,
  tenantCode,
  inputSampleJson,
  mapRawItem,
  onImport,
  onImported,
  disabled = false,
}: BulkImportDialogProps) {
  const t = useMessages(masterMessages)
  const errorsId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(
    () => inputSampleJson ?? bulkSampleJson(screen, settingCode)
  )
  const [errors, setErrors] = useState<BulkError[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const submitting = progress !== null

  const changeOpen = (next: boolean) => {
    // A running import cannot be dismissed; its outcome would be lost.
    if (submitting) return
    setOpen(next)
    if (next) {
      setErrors([])
      setFailure(null)
    }
  }

  const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setText(reader.result)
      input.value = ''
    }
    reader.onerror = () => {
      input.value = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'application/json' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = FILE_NAMES[screen]
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const submit = async () => {
    const parsed = parseBulkJson(text, { screen, mapRawItem, tenantCode })
    setErrors(parsed.errors)
    setFailure(null)
    if (parsed.errors.length > 0) return
    setProgress({ done: 0, total: parsed.items.length })
    try {
      await onImport(parsed.items, (done, total) =>
        setProgress({ done, total })
      )
      setProgress(null)
      setOpen(false)
      onImported?.()
    } catch (error) {
      setProgress(null)
      setFailure(error instanceof Error ? error.message : '')
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          {t.bulkDialog.open}
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="mbc:sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.bulkDialog.title}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={t.bulkDialog.json}
          aria-invalid={errors.length > 0 || undefined}
          aria-describedby={errors.length > 0 ? errorsId : undefined}
          spellCheck={false}
          disabled={submitting}
          className="mbc:min-h-[50vh] mbc:font-mono mbc:text-xs"
        />
        {errors.length > 0 && (
          <Alert variant="destructive" id={errorsId}>
            <AlertDescription>
              <ul className="mbc:list-disc mbc:pl-5">
                {errors.map((error, index) => (
                  <li key={index}>{formatBulkError(error, t.bulk)}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {failure !== null && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>{t.bulkDialog.failed}</AlertTitle>
            {failure && <AlertDescription>{failure}</AlertDescription>}
          </Alert>
        )}
        {progress && (
          <p role="status" className="mbc:text-muted-foreground mbc:text-sm">
            {t.bulkDialog.progress(progress)}
          </p>
        )}
        <DialogFooter className="mbc:gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => changeOpen(false)}
          >
            {t.bulkDialog.cancel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden />
            {t.bulkDialog.load}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            tabIndex={-1}
            aria-hidden
            className="mbc:hidden"
            onChange={loadFile}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={download}
          >
            <Download aria-hidden />
            {t.bulkDialog.save}
          </Button>
          <Button
            type="button"
            loading={submitting}
            onClick={() => void submit()}
          >
            {!submitting && <Save aria-hidden />}
            {t.bulkDialog.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Replace the whole messages file (adds `bulkDialog`):

`packages/master-web/src/i18n/master-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterFieldType } from '../core/field-type-names'

export type MasterMessages = {
  fieldTypes: Record<MasterFieldType, string>
  /** The data tables of the list screens. */
  table: {
    empty: string
    loading: string
    selectAll: string
    selectRow: string
    pagerTop: string
    pagerBottom: string
  }
  /** The JSON bulk-import dialog. */
  bulkDialog: {
    open: string
    title: string
    json: string
    cancel: string
    load: string
    save: string
    submit: string
    progress: (params: { done: number; total: number }) => string
    failed: string
  }
  /** Data-record errors (`MasterError`). */
  validation: {
    required: string
    blank: string
    maxLength: (params: { max: number }) => string
    maxRows: (params: { max: number }) => string
    pattern: (params: { name: string }) => string
    integer: string
    min: (params: { min: number }) => string
    max: (params: { max: number }) => string
    json: string
  }
  /** Field-definition errors (`FieldDefinitionError`). */
  fieldDefinition: {
    required: string
    tooLong: (params: { max: number }) => string
    nameChars: string
    duplicate: string
    reserved: string
    typeNotAllowed: string
    numeric: string
    lengthRange: string
    maxRowMin: string
    minNotLess: string
    maxNotGreater: string
    defaultRange: string
    defaultJson: string
    defaultBoolean: string
    defaultLength: string
    formatRequired: string
  }
  /** Bulk-import errors (`BulkError`); `item` prefixes errors about one entry. */
  bulk: {
    item: (params: { n: number }) => string
    invalidJson: string
    notArray: string
    empty: string
    mapFailed: (params: { message: string }) => string
    invalidItem: string
    invalidDataItem: string
    invalidMappedSetting: string
    invalidMappedData: string
    settingNotAllowed: string
    otherTenant: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    master: MasterMessages
  }
}

const ja: MasterMessages = {
  fieldTypes: {
    string: '文字列',
    number: '数値',
    auto_number: '自動採番',
    boolean: 'ブール値',
    date: '日付',
    array: '文字列(配列)',
    json: 'JSON',
    'text-area': 'テキストエリア',
    'text-html': 'HTML形式',
    'text-markdown': 'Markdown形式',
  },
  table: {
    empty: 'データがありません',
    loading: '読み込み中',
    selectAll: 'このページをすべて選択',
    selectRow: 'この行を選択',
    pagerTop: '上部のページ送り',
    pagerBottom: '下部のページ送り',
  },
  bulkDialog: {
    open: 'JSONエディタ',
    title: 'JSONエディタ',
    json: 'JSON',
    cancel: 'キャンセル',
    load: 'JSON読込',
    save: 'JSON保存',
    submit: 'データ反映',
    progress: ({ done, total }) => `反映中 (${done}/${total})`,
    failed: 'マスターデータの反映に失敗しました。',
  },
  validation: {
    required: '入力してください。',
    blank: '空白のみは許可されていません。',
    maxLength: ({ max }) => `${max}文字以内で入力してください。`,
    maxRows: ({ max }) => `${max}行以内で入力してください。`,
    pattern: ({ name }) => `${name} の型が違います。`,
    integer: '数字を入力してください。',
    min: ({ min }) => `最小値は ${min} です。`,
    max: ({ max }) => `最大値は ${max} です。`,
    json: 'JSONの形式が正しくありません。',
  },
  fieldDefinition: {
    required: '入力してください。',
    tooLong: ({ max }) => `${max}文字以内で入力してください。`,
    nameChars: '物理名に「.」「[」「]」「\'」「"」は使えません。',
    duplicate: '同じ物理名の項目が既にあります。',
    reserved: 'この物理名は使えません。',
    typeNotAllowed: 'この項目では選択できないデータ型です。',
    numeric: '数字で入力してください。',
    lengthRange: '1〜255の範囲で入力してください。',
    maxRowMin: '1以上の数値を入力してください。',
    minNotLess: '最小値には最大値より小さい値を入力してください。',
    maxNotGreater: '最大値には最小値より大きい値を入力してください。',
    defaultRange: 'デフォルト値は min から max の範囲内である必要があります。',
    defaultJson: 'デフォルト値は有効な JSON である必要があります。',
    defaultBoolean: 'デフォルト値は true または false である必要があります。',
    defaultLength: '文字列の長さは設定された長さを超えてはいけません。',
    formatRequired: '選択してください。',
  },
  bulk: {
    item: ({ n }) => `${n}件目: `,
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    notArray: 'JSON が無効です。配列である必要があります。',
    empty: 'データがありません',
    mapFailed: ({ message }) => `マッピングに失敗しました。${message}`,
    invalidItem:
      '各項目には code, name, attributes が必須です。マスターデータの場合は settingCode, seq も必須です。',
    invalidDataItem:
      '各項目には settingCode, code, name, seq, attributes が必須です。',
    invalidMappedSetting:
      '設定データの name, code は文字列、settingValue はオブジェクトである必要があります。',
    invalidMappedData:
      'データの settingCode, code, name は文字列、seq は数値、attributes はオブジェクトである必要があります。',
    settingNotAllowed:
      'マスター設定はこの画面から登録できません。マスターデータ画面では kind: "data" のみ登録できます。',
    otherTenant: 'tenantCode が現在のテナントと異なります。',
  },
}

const en: MasterMessages = {
  fieldTypes: {
    string: 'Text',
    number: 'Number',
    auto_number: 'Auto number',
    boolean: 'Boolean',
    date: 'Date',
    array: 'Text list',
    json: 'JSON',
    'text-area': 'Text area',
    'text-html': 'HTML',
    'text-markdown': 'Markdown',
  },
  table: {
    empty: 'No data',
    loading: 'Loading',
    selectAll: 'Select all on this page',
    selectRow: 'Select this row',
    pagerTop: 'Pagination (top)',
    pagerBottom: 'Pagination (bottom)',
  },
  bulkDialog: {
    open: 'JSON editor',
    title: 'JSON editor',
    json: 'JSON',
    cancel: 'Cancel',
    load: 'Load JSON',
    save: 'Save JSON',
    submit: 'Import',
    progress: ({ done, total }) => `Importing (${done}/${total})`,
    failed: 'The import failed.',
  },
  validation: {
    required: 'This field is required.',
    blank: 'Spaces alone are not allowed.',
    maxLength: ({ max }) => `Enter at most ${max} characters.`,
    maxRows: ({ max }) => `Enter at most ${max} lines.`,
    pattern: ({ name }) => `${name} has the wrong format.`,
    integer: 'Enter a whole number.',
    min: ({ min }) => `The minimum is ${min}.`,
    max: ({ max }) => `The maximum is ${max}.`,
    json: 'The JSON is not valid.',
  },
  fieldDefinition: {
    required: 'This field is required.',
    tooLong: ({ max }) => `Enter at most ${max} characters.`,
    nameChars: `A physical name cannot contain ".", "[", "]", "'" or '"'.`,
    duplicate: 'Another field already has this physical name.',
    reserved: 'This physical name is reserved.',
    typeNotAllowed: 'This data type is not available for this field.',
    numeric: 'Enter a number.',
    lengthRange: 'Enter a number from 1 to 255.',
    maxRowMin: 'Enter 1 or more.',
    minNotLess: 'The minimum must be less than the maximum.',
    maxNotGreater: 'The maximum must be greater than the minimum.',
    defaultRange: 'The default must be between the minimum and the maximum.',
    defaultJson: 'The default must be valid JSON.',
    defaultBoolean: 'The default must be true or false.',
    defaultLength: 'The default is longer than the length allows.',
    formatRequired: 'Select a format.',
  },
  bulk: {
    item: ({ n }) => `Item ${n}: `,
    invalidJson: 'The JSON is not valid.',
    notArray: 'The JSON must be a list.',
    empty: 'There is no data.',
    mapFailed: ({ message }) => `Mapping failed. ${message}`,
    invalidItem:
      'Every item needs code, name and attributes; data items also need settingCode and seq.',
    invalidDataItem:
      'Every item needs settingCode, code, name, seq and attributes.',
    invalidMappedSetting:
      'A mapped setting needs a text name and code and an object settingValue.',
    invalidMappedData:
      'Mapped data needs a text settingCode, code and name, a number seq and an object attributes.',
    settingNotAllowed:
      'Settings cannot be imported here; only kind: "data" items are allowed.',
    otherTenant: 'The tenantCode differs from the current tenant.',
  },
}

export const masterMessages = defineMessages('master', { ja, en })
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/bulk && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (7 tests, including the axe check while open); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web/src/bulk packages/master-web/src/i18n/master-messages.ts
git commit -m "feat(master-web): JSON bulk-import dialog with per-entry errors and progress"
```

---

### Task 6: Exports, smoke app, docs

**Files:**

- Modify: `packages/master-web/src/index.ts`, `packages/master-web/test/exports.test.tsx`, `packages/master-web/test/build/output.test.ts`, `apps/next-smoke/app/master-screens.tsx`
- Modify: `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`

**Interfaces:**

- Produces: the root entry exports `BulkImportDialog`, `type BulkImportDialogProps`, `MasterLink`, `type MasterRouting`, `type MasterTarget` (`DataTable` stays internal).

- [ ] **Step 1: Write the failing tests**

Replace both test files:

`packages/master-web/test/exports.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import * as root from '../src/index'
import * as core from '../src/core/index'
import {
  MASTER_FIELD_TYPES,
  MbcProvider,
  masterMessages,
  useMessages,
} from '../src/index'

function Labels() {
  const t = useMessages(masterMessages)
  return <p>{MASTER_FIELD_TYPES.map((type) => t.fieldTypes[type]).join('|')}</p>
}

describe('master-web entries', () => {
  it('exports the core from the root, plus messages and the provider', () => {
    const CORE = [
      'allowedFieldTypes',
      'buildCopyRequest',
      'bulkSampleJson',
      'COPY_TYPES',
      'dataFields',
      'defaultSettingFields',
      'ENTITY_CODE_FIELD',
      'ENTITY_NAME_FIELD',
      'fieldTypeOf',
      'fieldTypes',
      'FIXED_FIELD_NAMES',
      'formatDateValue',
      'fromFormValues',
      'isEntityField',
      'isMasterFieldType',
      'MASTER_FIELD_TYPES',
      'mapResultToBulkItem',
      'normalizeFieldDefinition',
      'numberOption',
      'parseBulkJson',
      'parseMasterData',
      'parseMasterSetting',
      'settingCodeOf',
      'toDataPayload',
      'toFormValues',
      'validateFieldDefinition',
      'validateMasterData',
    ]
    expect(Object.keys(core).sort()).toEqual([...CORE].sort())
    expect(Object.keys(root).sort()).toEqual(
      [
        ...CORE,
        'BulkImportDialog',
        'MasterLink',
        'MbcProvider',
        'masterMessages',
        'useMessages',
      ].sort()
    )
  })

  it('labels every field type in Japanese by default and in English', () => {
    const { unmount } = render(
      <MbcProvider>
        <Labels />
      </MbcProvider>
    )
    expect(screen.getByText(/^文字列\|数値\|自動採番\|/)).toBeInTheDocument()
    unmount()
    render(
      <MbcProvider locale="en">
        <Labels />
      </MbcProvider>
    )
    expect(screen.getByText(/\|JSON\|/)).toBeInTheDocument()
    expect(screen.getByText(/^Text\|Number\|/)).toBeInTheDocument()
  })
})
```

`packages/master-web/test/build/output.test.ts`:

```ts
// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  externalsOf,
  FORBIDDEN_JS_PATTERNS,
  hasUseClientDirective,
  listFiles,
  readText,
} from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  parseCss,
  unprefixedClasses,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))

describe('master-web output', () => {
  it('ships the root and /core entries and both stylesheets', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'core/index.js'])
    )
    expect(listFiles(dist, '.css')).toEqual(['styles.css', 'styles.layer.css'])
  })

  it('includes ui-web’s styles, prefixed and scoped', () => {
    const css = readText(dist, 'styles.css')
    expect(css).toContain('--mbc-primary:')
    const root = parseCss(css)
    expect(
      unprefixedClasses(root, [
        'dark',
        'rdp-button_next',
        'rdp-button_previous',
      ])
    ).toEqual([])
    expect(elementOnlyRules(root)).toEqual([])
  })

  it('keeps /core free of React and of every package but zod', () => {
    expect(
      [...externalsOf(dist, 'core/index.js')].filter((name) => name !== 'zod')
    ).toEqual([])
    for (const file of listFiles(dist, '.js').filter((f) =>
      f.startsWith('core/')
    )) {
      expect(hasUseClientDirective(readText(dist, file)), file).toBe(false)
    }
  })

  it('marks every module that renders as a client module', () => {
    for (const file of listFiles(dist, '.js')) {
      const source = readText(dist, file)
      if (/from\s*["']react\/jsx-runtime["']/.test(source))
        expect(hasUseClientDirective(source), file).toBe(true)
    }
  })

  it('contains no host-framework or host-library references', () => {
    for (const file of listFiles(dist, '.js')) {
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(readText(dist, file), `${file} ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web`
Expected: FAIL — the exports test lacks `BulkImportDialog` and `MasterLink` on the root.

- [ ] **Step 3: Implement**

Replace the whole file:

`packages/master-web/src/index.ts`:

```ts
// One MbcContext: hosts may import the provider from here or from ui-web.
export {
  MbcProvider,
  useMessages,
  type MbcProviderProps,
} from '@mbc-cqrs-serverless/ui-web'
export * from './core'
export { masterMessages, type MasterMessages } from './i18n/master-messages'
export {
  BulkImportDialog,
  type BulkImportDialogProps,
} from './bulk/bulk-import-dialog'
export { MasterLink } from './routing/master-link'
export type { MasterRouting, MasterTarget } from './routing/routing'
```

Render the new parts in the Next smoke app (replace the whole file):

`apps/next-smoke/app/master-screens.tsx`:

```tsx
'use client'

import {
  BulkImportDialog,
  MASTER_FIELD_TYPES,
  MasterLink,
  MbcProvider,
  masterMessages,
  useMessages,
  type MasterRouting,
} from '@mbc-cqrs-serverless/master-web'
import { MultiSelect } from '@mbc-cqrs-serverless/ui-web'

function FieldTypes() {
  const t = useMessages(masterMessages)
  return (
    <ul>
      {MASTER_FIELD_TYPES.map((type) => (
        <li key={type}>{t.fieldTypes[type]}</li>
      ))}
    </ul>
  )
}

const routing: MasterRouting = {
  href: (target) => `/master/${target.screen}`,
  navigate: () => {},
}

/** master-web's client entry and the new ui-web parts, rendered on the server and hydrated. */
export function MasterScreens() {
  return (
    <MbcProvider locale="ja">
      <FieldTypes />
      <MasterLink routing={routing} to={{ screen: 'settings' }}>
        master settings
      </MasterLink>
      <BulkImportDialog screen="settings" onImport={async () => {}} />
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
        value={['a']}
        onValueChange={() => {}}
      />
    </MbcProvider>
  )
}
```

- [ ] **Step 4: Update the docs**

In `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`:

- In the **Tech Stack** line, delete `` `@tanstack/react-table` 8, ``.
- Replace the whole `- [ ] **M3 — Lists** (`m3-lists`)` entry (down to, not including, the M4 entry) with:

```markdown
- [ ] **M3a — List building blocks** (`m3a-list-parts`)
  - Spec: §2 (ui-web additions), §3.2 (navigation, `BulkImportDialog`), §4 (data table), Review Focus 2, 3, 5.
  - Builds: ui-web `PaginationBar` (survey-web's template pagination moved to ui-web, plus master v0's `table` arrangement: result count, page size after the pages, page-number box; survey-web's `TemplatePagination` re-exports it); master-web `MasterRouting` / `MasterTarget` / `MasterLink`; internal `DataTable` (sortable headers with `aria-sort`, pagination above and below, row selection, empty and loading rows); `parseBulkJson` `tenantCode` option; `BulkImportDialog`; `master.table` and `master.bulkDialog` messages; smoke render.
  - Ruling: no TanStack — the lists need fixed columns, server-side sorting and paging, and checkbox selection, which a small component covers (spec §2 and §4 updated).
  - Gate: standard gate.
  - Depends on: M2.

- [ ] **M3b — List screens** (`m3b-lists`)
  - Spec: §3.2 (`MasterSettingList`, `MasterDataList`), §4 (state), Review Focus 2, 5.
  - Builds: ui-web `--mbc-emphasis` token (master v0's section headers); list row types; per-type cell formatting; `MasterSettingList` (search, JSON editor, create, table, back) without the "own tenant" column (v0's live list had none — it lived in the unused `MasterTable.tsx`); `MasterDataList` (accordion: setting info, search, results); `masterSetting` / `masterData` messages; playground pages on fixture data; smoke render.
  - Gate: standard gate; master v0 layout parity for both lists (layout markup, not ui-web controls).
  - Depends on: M3a.
```

- In the M4 entry, replace `  - Depends on: M3 (`MasterRouting`, JSON dialog shares the bulk dialog's text area).` with `  - Depends on: M3b (`MasterRouting`, `DataTable`, the JSON dialog pattern).`
- In the spec coverage map, change the rows for "§3.2 navigation" to `M3a`, "§3.2 screens" to `M3a, M3b, M4, M5, M7`, "§4 internals" to `M3a–M7`, and "§5 behaviour changes" to `M3a, M5, M7, M8 (MIGRATION)`.

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`:

- Replace the line starting with `- \`master-web\` depends on` with:

```markdown
- `master-web` depends on `ui-web` and `client-web` (same version, `workspace:^`), `react-hook-form`, `zod` 4, `@dnd-kit/*`, `lucide-react`. Peer: `react`, `react-dom` `^18.2 || ^19`.
```

- Replace the line starting with `- The TanStack \`DataTable\` lives in master-web` with:

```markdown
- master-web's `DataTable` is a small internal component (fixed columns, server-side sorting and paging, checkbox selection; no TanStack, ruling in M3a); ui-web gains the plain `Table` primitives and the `PaginationBar` both lists share.
```

- In the "ui-web additions" table, add this row below the `MultiSelect` row:

```markdown
| `PaginationBar` | survey-web's template pagination moved to ui-web; `variant="table"` adds master v0's result count, page size after the pages and a page-number box (M3a) |
```

- Replace the line starting with `- **Data table:**` with:

```markdown
- **Data table:** `DataTable`, a small component (server paging and sorting); sortable column headers are buttons with `aria-sort`; page size, page links, result count and page-number box from ui-web `PaginationBar` (`table` variant); row selection (copy request) with labelled checkboxes. Column sizes follow v0's `meta.size`.
```

Run: `fnm exec --using=v24.13.0 -- pnpm format` (it re-aligns the markdown tables), then `fnm exec --using=v24.13.0 -- pnpm format:check`.
Expected: `format:check` exits 0.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm smoke && grep -c "JSONエディタ" apps/next-smoke/.next/server/app/index.html`
Expected: PASS (master-web 82 tests); the smoke build succeeds; grep prints `1` or more.

- [ ] **Step 6: Commit**

```bash
git add packages/master-web apps/next-smoke docs
git commit -m "feat(master-web): export the bulk dialog and routing; smoke and docs for M3a"
```

---

### Task 7: Gate and hand-back

**Files:** none (verification only).

- [ ] **Step 1: Format and lint**

Run: `fnm exec --using=v24.13.0 -- pnpm format:check && fnm exec --using=v24.13.0 -- pnpm lint`
Expected: both exit 0. If `format:check` lists files, run `fnm exec --using=v24.13.0 -- pnpm format`, check the diff is whitespace only, and commit it as `style: format`.

- [ ] **Step 2: Full gate on React 19**

Run: `fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke`
Expected: both exit 0; every test passes (666 in all after this plan).

- [ ] **Step 3: Full gate on React 18, then restore**

```bash
fnm exec --using=v24.13.0 -- pnpm use-react 18
fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke
fnm exec --using=v24.13.0 -- pnpm use-react 19
git status --porcelain
```

Expected: `verify` and `smoke` exit 0 on React 18; `git status --porcelain` prints nothing after the restore.

- [ ] **Step 4: Hand back**

Do not merge `m3a-list-parts` into `main` and do not tick M3a in the orchestrator — an independent review comes first. Report: the branch name, the commit range (`git log --oneline main..m3a-list-parts`), the gate results from Steps 2–3, and any step whose output did not match its `Expected:` line together with what you did about it.
