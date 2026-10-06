# SP7 — `/templates` and `/mbc` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The survey-template screens: prop-driven `SurveyTemplateList` and `SurveyTemplateEditor` (`/templates`, v0's look, no backend knowledge), the mbc-cqrs-serverless integration (`/mbc`: API on `client-web`, hooks, connected pages), and the deprecated `/SurveyForm` and `/SurveyCreator` subpaths.

**Architecture:** `/templates` components take data and callbacks only; they render v0's search header, card grid, skeletons, empty and error states, pagination, and the editor's loading/error states, creator and action bar with confirm dialogs. `/mbc` wraps `client-web`: `createSurveyTemplateApi(client)` maps backend entities to `SurveyTemplateSummary` and sends mutations through `command()`; hooks hold fetch state; `MbcSurveyTemplateListPage` / `MbcSurveyTemplateEditorPage` connect them, and the host navigates and shows toasts through callbacks.

**Tech Stack:** SP1–SP6, `@mbc-cqrs-serverless/client-web` (`createMbcClient`, `MbcClientProvider`, `useMbcClient`, `useCommand`, `MbcApiError`).

**Spec:** `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md` §5.2, §5.3, §5.4, §4. Orchestrator SP7 notes (SP3: an update with unchanged data returns no `requestId` → no-op success). v0 sources: `../mbc-cqrs-serverless-web/packages/survey/src/modules/**`, `src/hooks/use-*-survey-template*.ts`, `src/components/{SearchInput.tsx,pagination/**,loading/Spinner.tsx}`, `__tests__/get-pagination-item.test.ts`.

## Global Constraints

- Commands: `fnm exec --using=v24.13.0 -- <command>` (`$N`), from `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`.
- `.` and `/templates` never import `client-web`; only `/mbc` does (build-output test).
- Requests match v0's backend contract: `GET /api/survey-template?page&pageSize&keyword&orderBys=<field>:<dir>`, `GET/PUT/DELETE /api/survey-template/:id` (id URL-encoded), `POST /api/survey-template` with `{ name: survey.title, attributes: { surveyTemplate: survey, description: survey.description } }`, `POST /api/survey-answer` with `{ attributes: { surveyId, email, answer } }`.
- Look: v0's classes with `mbc:`; no `space-*`; `bg-gradient-to-*` → `bg-linear-to-*`; `flex-grow`/`flex-shrink-0` → `grow`/`shrink-0`; `!` important modifiers keep v0's meaning with v4's trailing `!`.
- No logging, no toasts, no router: hosts get callbacks. No React-19-only APIs; `"use client"` on component and hook modules; nothing rendered from the clock or time zone before hydration (`useHydrated`).
- All text from the `surveyTemplates` messages (new namespace; `ja` = v0's strings, `en`). Prettier; Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Per-task final test command (exit code): `$N pnpm build && $N pnpm vitest run`.

## Behaviour changes from v0 (for MIGRATION.md)

1. **No routing or toasts inside the package.** v0's pages called `next/navigation` and `sonner`; v1 calls `onCreate`, `onSelect`, `onSaved`, `onDeleted`, `onCancel`, `onError`.
2. **List state is internal by default** (page, page size, keyword), controllable with `state` / `onStateChange` for URL sync (v0 always used `nuqs`).
3. **The list's error state has a retry button**, and pages are buttons reachable from the keyboard (v0's page links had no `href`).
4. **Saving unchanged data succeeds quietly** (v0 showed "アンケートの更新に失敗しました" when the backend returned no `requestId`).
5. **A failed command status (`<step>:FAILED`) is an error** reported through `onError` (v0 waited forever).
6. **Card dates follow the locale** (`Oct 04, 2026` in English as in v0; `2026年10月04日` in Japanese) and appear after hydration.
7. **Ids in API paths are URL-encoded** (mbc ids contain `#`).

## Review Focus

1. **The SP3 no-`requestId` case** (save without changes) → `onSaved`, never `onError`. Pinned in Tasks 4, 5.
2. **Typing in the search box** → one request after the debounce, page reset to 1, and no request for the intermediate keystrokes. Pinned in Tasks 1, 5.
3. **Leaving the editor with unsaved changes** (Back) → confirmation; without changes → `onCancel` at once; changing a value back → Save disabled again in edit mode. Pinned in Task 3.
4. **Unmounting a page while a request or command is running** → no state update after unmount, the request is aborted. Pinned in Task 5.
5. **`.` and `/templates` stay free of `client-web`** (a host without the backend can use the screens). Pinned in Task 6.

---

## File Structure

```
packages/survey-web/
├─ package.json                                  (+ exports ./SurveyForm, ./SurveyCreator) Task 6
├─ src/
│  ├─ templates/
│  │  ├─ i18n/template-messages.ts               surveyTemplates namespace       Task 1
│  │  ├─ types.ts                                SurveyTemplateSummary            Task 1
│  │  ├─ pagination-items.ts (+test)             v0 getPaginationItems           Task 1
│  │  ├─ template-pagination.tsx (+test)         v0 Pagination                    Task 1
│  │  ├─ template-search.tsx (+test)             debounced search input           Task 1
│  │  ├─ template-card.tsx                       v0 SurveyCard                    Task 2
│  │  ├─ survey-template-list.tsx (+test)        list screen                      Task 2
│  │  ├─ survey-template-editor.tsx (+test)      editor screen                    Task 3
│  │  └─ index.ts                                /templates entry                 Task 6
│  ├─ mbc/
│  │  ├─ api.ts (+test)                          createSurveyTemplateApi, submitSurveyAnswer Task 4
│  │  ├─ hooks.ts (+test)                        useSurveyTemplates …             Task 5
│  │  ├─ pages.tsx (+test)                       connected pages                  Task 5
│  │  └─ index.ts                                /mbc entry                       Task 6
│  ├─ SurveyForm/index.ts, SurveyCreator/index.ts  deprecated aliases             Task 6
│  └─ lib/use-hydrated.ts                        moved from question-types        Task 2
└─ test/
   ├─ v0-template-classes.ts                     v0 class strings                 Task 1
   ├─ fake-mbc-client.ts                         MbcClient double                 Task 4
   └─ templates-ssr.test.tsx, templates-a11y.test.tsx                              Task 6
apps/playground/src/templates-page.tsx           list + editor with a fake client Task 6
```

---

### Task 1: Messages, pagination, search input

**Files:**

- Create: `src/templates/i18n/template-messages.ts`, `src/templates/types.ts`, `src/templates/pagination-items.ts`, `pagination-items.test.ts`, `src/templates/template-pagination.tsx`, `template-pagination.test.tsx`, `src/templates/template-search.tsx`, `template-search.test.tsx`, `test/v0-template-classes.ts`

**Interfaces:**

- Produces:
  - `templateMessages` (namespace `surveyTemplates`), `type TemplateMessages` (`list`, `editor` groups below).
  - `type SurveyTemplateSummary = { id: string; name: string; description?: string; version: number; createdAt?: string; updatedAt?: string; questionCount?: number; sectionCount?: number }`.
  - `getPaginationItems(page, lastPage, maxLength): number[]` (v0; `NaN` marks an ellipsis).
  - `TemplatePagination({ page, pageSize, total, onPageChange, onPageSizeChange?, pageSizeOptions? = [10, 20, 50, 100, 300, 500] })` — v0's markup; renders nothing for one page; pages and arrows are keyboard-reachable links (`href="#"`, default prevented).
  - `TemplateSearch({ value, onChange, delay? = 300 })` — v0's rounded search input; calls `onChange` once per pause, never for the value it was given.

- [ ] **Step 1: Branch, fixture, failing tests**

```bash
git switch main && git switch -c sp7-templates-mbc
```

`test/v0-template-classes.ts`:

```ts
/** v0 template-screen class strings (Tailwind v4 reading, rulings applied). */
export const V0T = {
  // survey-template/components
  'list.root': 'flex flex-col gap-9',
  'list.header': 'mb-2 flex flex-row items-center justify-between gap-2',
  'list.search-box': 'w-full md:w-1/2 lg:w-1/3',
  'list.grid': 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
  'search.input':
    'rounded-full border border-[#636F80] bg-white placeholder:text-[#B7BDC6]',
  'create.button':
    'rounded-full border border-[#636F80] bg-[#EEEEEE] px-10! text-black transition-colors duration-200 hover:bg-[#B7BDC6]',
  'card.root':
    'from-background to-muted/20 hover:border-primary/20 group cursor-pointer border-2 bg-linear-to-br transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
  // edit-survey-template/components
  'actions.bar':
    'mt-9 flex flex-row items-center justify-center gap-8 self-center',
  'actions.button':
    'flex items-center rounded-full border border-[#636F80] bg-[#EEEEEE] text-black hover:bg-[#B7BDC6]',
} as const

export function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

/** v0's classes must all be present (ui-web base classes come first, as in v0). */
export const v0t = (key: keyof typeof V0T) => V0T[key].split(' ').sort()
```

`src/templates/pagination-items.test.ts` — v0's `__tests__/get-pagination-item.test.ts` verbatim, with two changes: the import becomes `import { describe, expect, it } from 'vitest'` plus `import { getPaginationItems } from './pagination-items'`. Copy it:

```bash
{ printf "import { describe, expect, it } from 'vitest'\n\nimport { getPaginationItems } from './pagination-items'\n"; tail -n +2 ../mbc-cqrs-serverless-web/packages/survey/__tests__/get-pagination-item.test.ts; } > packages/survey-web/src/templates/pagination-items.test.ts
```

`src/templates/template-pagination.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TemplatePagination } from './template-pagination'

describe('TemplatePagination', () => {
  it('renders nothing for a single page (v0)', () => {
    const { container } = render(
      <TemplatePagination
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
      <TemplatePagination
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
      <TemplatePagination
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

  it('offers v0’s page sizes', async () => {
    const onPageSizeChange = vi.fn()
    render(
      <TemplatePagination
        page={1}
        pageSize={10}
        total={30}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
      />
    )
    await userEvent.click(
      screen.getByRole('combobox', { name: '1ページの件数' })
    )
    expect(
      (await screen.findAllByRole('option')).map((o) => o.textContent)
    ).toEqual([
      '10 / ページ',
      '20 / ページ',
      '50 / ページ',
      '100 / ページ',
      '300 / ページ',
      '500 / ページ',
    ])
    await userEvent.click(screen.getByRole('option', { name: '50 / ページ' }))
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })
})
```

(`次のページへ` / `前のページへ` are ui-web's `pagination` messages — check `ui-messages.ts` and use its exact strings.)

`src/templates/template-search.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { classesOf, v0t } from '../../test/v0-template-classes'
import { TemplateSearch } from './template-search'

describe('TemplateSearch', () => {
  it('reports the keyword once after typing pauses (v0: 300 ms)', async () => {
    const onChange = vi.fn()
    render(<TemplateSearch value="" onChange={onChange} />)
    const input = screen.getByRole('searchbox', {
      name: 'テキスト・タグ・IDで検索',
    })
    expect(classesOf(input)).toEqual(
      expect.arrayContaining(v0t('search.input'))
    )
    await userEvent.type(input, 'abc')
    expect(onChange).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(onChange.mock.calls).toEqual([['abc']])
  })

  it('follows the value it is given without echoing it back', async () => {
    const onChange = vi.fn()
    function Host() {
      const [value, setValue] = useState('first')
      return (
        <>
          <button type="button" onClick={() => setValue('second')}>
            set
          </button>
          <TemplateSearch value={value} onChange={onChange} />
        </>
      )
    }
    render(<Host />)
    await userEvent.click(screen.getByRole('button', { name: 'set' }))
    expect(screen.getByRole('searchbox')).toHaveValue('second')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web src/templates`
Expected: FAIL — cannot resolve `./pagination-items`, `./template-pagination`, `./template-search`.

- [ ] **Step 3: Implement**

`src/templates/i18n/template-messages.ts`:

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
    pageSize: string
    perPage: (params: { size: number }) => string
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
    pageSize: '1ページの件数',
    perPage: ({ size }) => `${size} / ページ`,
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
    pageSize: 'Items per page',
    perPage: ({ size }) => `${size} / page`,
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

`src/templates/types.ts`:

```ts
/** What the template screens show; `/mbc` maps backend entities to it. */
export type SurveyTemplateSummary = {
  id: string
  name: string
  description?: string
  version: number
  createdAt?: string
  updatedAt?: string
  questionCount?: number
  sectionCount?: number
}
```

`src/templates/pagination-items.ts`:

```ts
/** v0's page list: numbers, with `NaN` where an ellipsis goes. */
export function getPaginationItems(
  page: number,
  lastPage: number,
  maxLength: number
): number[] {
  const res: number[] = []
  if (lastPage <= maxLength) {
    for (let i = 1; i <= lastPage; i++) res.push(i)
    return res
  }
  const firstPage = 1
  const confirmedPagesCount = 3
  const deductedMaxLength = maxLength - confirmedPagesCount
  const sideLength = deductedMaxLength / 2

  if (page - firstPage < sideLength || lastPage - page < sideLength) {
    for (let j = 1; j <= sideLength + firstPage; j++) res.push(j)
    res.push(Number.NaN)
    for (let k = lastPage - sideLength; k <= lastPage; k++) res.push(k)
  } else if (
    page - firstPage >= deductedMaxLength &&
    lastPage - page >= deductedMaxLength
  ) {
    const deductedSideLength = sideLength - 1
    res.push(1)
    res.push(Number.NaN)
    for (let l = page - deductedSideLength; l <= page + deductedSideLength; l++)
      res.push(l)
    res.push(Number.NaN)
    res.push(lastPage)
  } else {
    const isNearFirstPage = page - firstPage < lastPage - page
    let remainingLength = maxLength
    if (isNearFirstPage) {
      for (let m = 1; m <= page + 1; m++) {
        res.push(m)
        remainingLength -= 1
      }
      res.push(Number.NaN)
      remainingLength -= 1
      for (let n = lastPage - (remainingLength - 1); n <= lastPage; n++)
        res.push(n)
    } else {
      for (let o = lastPage; o >= page - 1; o--) {
        res.unshift(o)
        remainingLength -= 1
      }
      res.unshift(Number.NaN)
      remainingLength -= 1
      for (let p = remainingLength; p >= 1; p--) res.unshift(p)
    }
  }
  return res
}
```

`src/templates/template-pagination.tsx`:

```tsx
'use client'

import {
  cn,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import type { MouseEvent } from 'react'

import { templateMessages } from './i18n/template-messages'
import { getPaginationItems } from './pagination-items'

const ARROW =
  'mbc:flex mbc:h-8 mbc:w-8 mbc:items-center mbc:justify-center mbc:aria-disabled:pointer-events-none mbc:aria-disabled:cursor-not-allowed mbc:aria-disabled:text-[#A3ACBA] mbc:aria-disabled:opacity-50'

/** v0's pagination; links are `href="#"` so they are reachable from the keyboard. */
export function TemplatePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 300, 500],
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: readonly number[]
}) {
  const t = useMessages(templateMessages)
  const lastPage = Math.ceil(total / Math.max(1, pageSize))
  if (lastPage <= 1 || total === 0) return null

  const go = (target: number, enabled: boolean) => (event: MouseEvent) => {
    event.preventDefault()
    if (enabled) onPageChange(target)
  }

  return (
    <Pagination className="mbc:mt-4">
      {onPageSizeChange && (
        <div className="mbc:flex mbc:items-center mbc:gap-x-2 mbc:text-sm">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              className="mbc:h-8 mbc:w-[120px]"
              aria-label={t.list.pageSize}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t.list.perPage({ size: option })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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
            aria-disabled={page === lastPage || undefined}
            className={cn(ARROW, 'mbc:rounded-l-none')}
            onClick={go(page + 1, page < lastPage)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
```

`src/templates/template-search.tsx`:

```tsx
'use client'

import { cn, Input, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { useEffect, useRef, useState } from 'react'

import { templateMessages } from './i18n/template-messages'

/** v0's SearchInput without nuqs: reports the keyword after `delay` ms of quiet. */
export function TemplateSearch({
  value,
  onChange,
  delay = 300,
  className,
}: {
  value: string
  onChange: (keyword: string) => void
  delay?: number
  className?: string
}) {
  const t = useMessages(templateMessages)
  const [draft, setDraft] = useState(value)
  const [given, setGiven] = useState(value)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // A new value from the host replaces the draft (React's "adjust state on prop change").
  if (value !== given) {
    setGiven(value)
    setDraft(value)
  }

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChangeRef.current(draft), delay)
    return () => clearTimeout(timer)
  }, [draft, value, delay])

  return (
    <Input
      type="search"
      aria-label={t.list.searchPlaceholder}
      placeholder={t.list.searchPlaceholder}
      showSearchIcon
      className={cn(
        'mbc:rounded-full mbc:border mbc:border-[#636F80] mbc:bg-white mbc:placeholder:text-[#B7BDC6]',
        className
      )}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web src/templates`
Expected: PASS — v0's pagination-items cases + 4 + 2. If the search input's class check fails on `border-input` order, it is fine: the assertion is "contains v0's classes". If `type="search"` makes ui-web's `Input` lose its search icon, keep `type="search"` (role `searchbox`) and check the icon renders.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add template messages, pagination and search input

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `SurveyTemplateList`

**Files:**

- Create: `src/lib/use-hydrated.ts` (move from `src/question-types/use-hydrated.ts`; update `date.tsx`'s import), `src/templates/template-card.tsx`, `src/templates/survey-template-list.tsx`, `survey-template-list.test.tsx`

**Interfaces:**

- Consumes: Task 1.
- Produces:
  - `SurveyTemplateCard({ item, onSelect })` — v0's card: name, description (or `noDescription`), question and section counts, created date badge (after hydration).
  - `type SurveyTemplateListProps = { items: readonly SurveyTemplateSummary[]; total: number; page: number; pageSize: number; keyword: string; loading?: boolean; error?: unknown; onPageChange(page: number): void; onPageSizeChange?(pageSize: number): void; onKeywordChange(keyword: string): void; onCreate?(): void; onSelect(item: SurveyTemplateSummary): void; onRetry?(): void; className?: string }`; `SurveyTemplateList(props)`.

- [ ] **Step 1: Write the failing test `src/templates/survey-template-list.test.tsx`**

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { classesOf, v0t } from '../../test/v0-template-classes'
import {
  SurveyTemplateList,
  type SurveyTemplateListProps,
} from './survey-template-list'
import type { SurveyTemplateSummary } from './types'

const items: SurveyTemplateSummary[] = [
  {
    id: 'a',
    name: '満足度調査',
    description: '年次',
    version: 1,
    createdAt: '2026-10-04T03:00:00.000Z',
    questionCount: 5,
    sectionCount: 2,
  },
  { id: 'b', name: '入社アンケート', version: 3 },
]

const list = (props: Partial<SurveyTemplateListProps> = {}) =>
  render(
    <SurveyTemplateList
      items={items}
      total={2}
      page={1}
      pageSize={10}
      keyword=""
      onPageChange={() => {}}
      onKeywordChange={() => {}}
      onSelect={() => {}}
      {...props}
    />
  )

describe('SurveyTemplateList', () => {
  it('shows v0’s header and card grid', () => {
    const { container } = list({ onCreate: () => {} })
    expect(classesOf(container.querySelector('[data-mbc]'))).toEqual(
      expect.arrayContaining(v0t('list.root'))
    )
    expect(
      classesOf(
        screen.getByRole('button', { name: 'アンケートテンプレートを新規作成' })
      )
    ).toEqual(expect.arrayContaining(v0t('create.button')))
    const card = screen.getByRole('button', {
      name: 'アンケートテンプレートを開く: 満足度調査',
    })
    expect(classesOf(card.parentElement)).toEqual(v0t('list.grid'))
    expect(within(card).getByText('5 質問')).toBeInTheDocument()
    expect(within(card).getByText('2 セクション')).toBeInTheDocument()
    expect(within(card).getByText('2026年10月04日')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('button', {
          name: 'アンケートテンプレートを開く: 入社アンケート',
        })
      ).getByText('説明が提供されていません')
    ).toBeInTheDocument()
  })

  it('selects a card by click or keyboard and creates', async () => {
    const onSelect = vi.fn()
    const onCreate = vi.fn()
    list({ onSelect, onCreate })
    await userEvent.click(screen.getByText('満足度調査'))
    screen
      .getByRole('button', {
        name: 'アンケートテンプレートを開く: 入社アンケート',
      })
      .focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートテンプレートを新規作成' })
    )
    expect(onSelect.mock.calls.map(([item]) => item.id)).toEqual(['a', 'b'])
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('shows the loading skeleton instead of cards', () => {
    list({ loading: true })
    expect(
      screen.getByRole('status', {
        name: 'アンケートテンプレートを読み込んでいます',
      })
    ).toBeInTheDocument()
    expect(screen.queryByText('満足度調査')).toBeNull()
  })

  it('shows the error with a retry', async () => {
    const onRetry = vi.fn()
    list({ error: new Error('x'), onRetry })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'アンケートの読み込みに失敗しました。再度試してください。'
    )
    await userEvent.click(screen.getByRole('button', { name: '再度試す' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('shows the empty state', () => {
    list({ items: [], total: 0 })
    expect(
      screen.getByRole('heading', { name: 'アンケートが見つかりません' })
    ).toBeInTheDocument()
  })

  it('pages and searches', async () => {
    const onPageChange = vi.fn()
    const onKeywordChange = vi.fn()
    list({ total: 25, onPageChange, onKeywordChange })
    await userEvent.click(screen.getByRole('link', { name: '2' }))
    await userEvent.type(screen.getByRole('searchbox'), '調査')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(onPageChange).toHaveBeenCalledWith(2)
    expect(onKeywordChange).toHaveBeenCalledWith('調査')
  })

  it('speaks English with English dates (v0’s format)', () => {
    render(
      <MbcProvider locale="en">
        <SurveyTemplateList
          items={items}
          total={2}
          page={1}
          pageSize={10}
          keyword=""
          onPageChange={() => {}}
          onKeywordChange={() => {}}
          onSelect={() => {}}
        />
      </MbcProvider>
    )
    expect(screen.getByText('Oct 04, 2026')).toBeInTheDocument()
    expect(screen.getByText('5 questions')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web survey-template-list`
Expected: FAIL — cannot resolve `./survey-template-list`.

- [ ] **Step 3: Implement**

Move the hook: `git mv packages/survey-web/src/question-types/use-hydrated.ts packages/survey-web/src/lib/use-hydrated.ts`, and in `src/question-types/date.tsx` change `import { useHydrated } from './use-hydrated'` to `import { useHydrated } from '../lib/use-hydrated'`.

`src/templates/template-card.tsx`:

```tsx
'use client'

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useLocale,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { FileText, Layers } from 'lucide-react'
import { memo } from 'react'

import { useHydrated } from '../lib/use-hydrated'
import { templateMessages } from './i18n/template-messages'
import type { SurveyTemplateSummary } from './types'

function formatCreated(iso: string | undefined, locale: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ja-JP', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

/** v0's SurveyCard. The date shows after hydration (it depends on the browser's time zone). */
export const SurveyTemplateCard = memo(function SurveyTemplateCard({
  item,
  onSelect,
}: {
  item: SurveyTemplateSummary
  onSelect: (item: SurveyTemplateSummary) => void
}) {
  const t = useMessages(templateMessages)
  const locale = useLocale()
  const hydrated = useHydrated()
  const created = hydrated ? formatCreated(item.createdAt, locale) : null
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={t.list.open({ name: item.name })}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item)
        }
      }}
      className="mbc:from-background mbc:to-muted/20 mbc:hover:border-primary/20 mbc:group mbc:cursor-pointer mbc:border-2 mbc:bg-linear-to-br mbc:transition-all mbc:duration-300 mbc:hover:scale-[1.02] mbc:hover:shadow-lg"
    >
      <CardHeader className="mbc:pb-4">
        <div className="mbc:flex mbc:flex-col mbc:gap-2">
          <CardTitle className="mbc:group-hover:text-primary mbc:line-clamp-2 mbc:text-lg mbc:font-semibold mbc:transition-colors mbc:sm:text-xl">
            {item.name}
          </CardTitle>
          <CardDescription className="mbc:line-clamp-2 mbc:text-sm mbc:sm:text-base">
            {item.description || t.list.noDescription}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mbc:pt-0">
        <div className="mbc:flex mbc:flex-col mbc:gap-3">
          <div className="mbc:flex mbc:flex-col mbc:gap-2 mbc:sm:flex-row mbc:sm:items-center mbc:sm:justify-between">
            <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-3 mbc:sm:gap-4">
              <div className="mbc:text-muted-foreground mbc:flex mbc:items-center mbc:gap-1.5">
                <FileText
                  aria-hidden
                  className="mbc:text-primary mbc:h-4 mbc:w-4"
                />
                <span className="mbc:text-sm mbc:font-medium">
                  {t.list.questions({ count: item.questionCount ?? 0 })}
                </span>
              </div>
              <div className="mbc:text-muted-foreground mbc:flex mbc:items-center mbc:gap-1.5">
                <Layers
                  aria-hidden
                  className="mbc:text-primary mbc:h-4 mbc:w-4"
                />
                <span className="mbc:text-sm mbc:font-medium">
                  {t.list.sections({ count: item.sectionCount ?? 0 })}
                </span>
              </div>
            </div>
            {created && (
              <Badge
                variant="secondary"
                className="mbc:border-primary/20 mbc:bg-primary/10 mbc:text-primary mbc:px-2 mbc:py-1 mbc:text-xs mbc:font-medium"
              >
                {created}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
```

`src/templates/survey-template-list.tsx`:

```tsx
'use client'

import {
  Alert,
  AlertDescription,
  Button,
  cn,
  Skeleton,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { AlertCircle, Plus, RefreshCw, Search } from 'lucide-react'

import { templateMessages } from './i18n/template-messages'
import { SurveyTemplateCard } from './template-card'
import { TemplatePagination } from './template-pagination'
import { TemplateSearch } from './template-search'
import type { SurveyTemplateSummary } from './types'

export type SurveyTemplateListProps = {
  items: readonly SurveyTemplateSummary[]
  total: number
  page: number
  pageSize: number
  keyword: string
  loading?: boolean
  error?: unknown
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onKeywordChange: (keyword: string) => void
  onCreate?: () => void
  onSelect: (item: SurveyTemplateSummary) => void
  onRetry?: () => void
  className?: string
}

const GRID =
  'mbc:grid mbc:grid-cols-1 mbc:gap-6 mbc:md:grid-cols-2 mbc:lg:grid-cols-3'

function LoadingGrid() {
  const t = useMessages(templateMessages)
  return (
    <div
      role="status"
      aria-label={t.list.loading}
      className="mbc:flex mbc:items-start mbc:justify-center mbc:p-4"
      style={{ minHeight: 375, maxHeight: 500 }}
    >
      <div className="mbc:grid mbc:w-full mbc:grid-cols-1 mbc:gap-4 mbc:sm:gap-6 mbc:md:grid-cols-2 mbc:lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="mbc:from-muted/30 mbc:to-muted/10 mbc:group mbc:animate-pulse mbc:rounded-lg mbc:border-2 mbc:border-border mbc:bg-linear-to-br mbc:p-4 mbc:transition-all mbc:duration-300 mbc:hover:shadow-md"
          >
            <div className="mbc:flex mbc:flex-col mbc:gap-2 mbc:pb-4">
              <Skeleton className="mbc:h-5 mbc:w-3/4 mbc:rounded-md" />
              <Skeleton className="mbc:h-4 mbc:w-full mbc:rounded-md" />
              <Skeleton className="mbc:h-4 mbc:w-2/3 mbc:rounded-md" />
            </div>
            <div className="mbc:flex mbc:flex-col mbc:gap-2 mbc:sm:flex-row mbc:sm:items-center mbc:sm:justify-between">
              <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-3 mbc:sm:gap-4">
                {[0, 1].map((n) => (
                  <div
                    key={n}
                    className="mbc:flex mbc:items-center mbc:gap-1.5"
                  >
                    <Skeleton className="mbc:h-4 mbc:w-4 mbc:rounded-full" />
                    <Skeleton className="mbc:h-4 mbc:w-16 mbc:rounded-md" />
                  </div>
                ))}
              </div>
              <Skeleton className="mbc:h-6 mbc:w-20 mbc:rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** v0's survey-template page as a prop-driven screen. */
export function SurveyTemplateList({
  items,
  total,
  page,
  pageSize,
  keyword,
  loading = false,
  error,
  onPageChange,
  onPageSizeChange,
  onKeywordChange,
  onCreate,
  onSelect,
  onRetry,
  className,
}: SurveyTemplateListProps) {
  const t = useMessages(templateMessages)

  let body
  if (loading) {
    body = <LoadingGrid />
  } else if (error) {
    body = (
      <Alert variant="destructive" role="alert">
        <AlertCircle aria-hidden className="mbc:h-4 mbc:w-4" />
        <AlertDescription className="mbc:flex mbc:flex-col mbc:gap-3">
          <p>{t.list.loadError}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mbc:w-fit"
            >
              <RefreshCw aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
              {t.list.retry}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  } else if (items.length === 0) {
    body = (
      <div className="mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:py-12 mbc:text-center">
        <Search
          aria-hidden
          className="mbc:text-muted-foreground mbc:mb-4 mbc:h-12 mbc:w-12"
        />
        <h3 className="mbc:mb-2 mbc:text-lg mbc:font-semibold">
          {t.list.emptyTitle}
        </h3>
        <p className="mbc:text-muted-foreground mbc:mb-4">
          {t.list.emptyDescription}
        </p>
      </div>
    )
  } else {
    body = (
      <>
        <div className={GRID}>
          {items.map((item) => (
            <SurveyTemplateCard key={item.id} item={item} onSelect={onSelect} />
          ))}
        </div>
        <div className="mbc:flex mbc:items-center mbc:justify-center">
          <TemplatePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </>
    )
  }

  return (
    <div
      data-mbc=""
      className={cn('mbc:flex mbc:flex-col mbc:gap-9', className)}
    >
      <div className="mbc:mb-2 mbc:flex mbc:flex-row mbc:items-center mbc:justify-between mbc:gap-2">
        <div className="mbc:w-full mbc:md:w-1/2 mbc:lg:w-1/3">
          <TemplateSearch value={keyword} onChange={onKeywordChange} />
        </div>
        {onCreate && (
          <Button
            aria-label={t.list.createLabel}
            onClick={onCreate}
            className="mbc:rounded-full mbc:border mbc:border-[#636F80] mbc:bg-[#EEEEEE] mbc:px-10! mbc:text-black mbc:transition-colors mbc:duration-200 mbc:hover:bg-[#B7BDC6]"
          >
            <Plus aria-hidden className="mbc:h-5! mbc:w-5! mbc:text-black" />
            {t.list.create}
          </Button>
        )}
      </div>
      {body}
    </div>
  )
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web survey-template-list src/question-types/date`
Expected: PASS — 7 tests, plus the date renderer tests after the hook move. The Japanese date reads `2026年10月04日` in `ja-JP` with `month: 'short'`; if Node's ICU prints `10月` differently, assert the formatter's own output (`new Intl.DateTimeFormat('ja-JP', …).format(...)`) instead of the literal.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add the prop-driven survey template list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `SurveyTemplateEditor`

**Files:**

- Create: `src/templates/survey-template-editor.tsx`, `survey-template-editor.test.tsx`

**Interfaces:**

- Consumes: `SurveyCreator`, `SurveyCreatorHandle` (SP6), `templateMessages`, ui-web `AlertDialog*`, `Alert*`, `Button`.
- Produces: `type SurveyTemplateEditorProps = { mode: 'create' | 'edit'; defaultValue?: SurveyInput; loading?: boolean; error?: unknown; saving?: boolean; deleting?: boolean; onSave(survey: Survey): void | Promise<void>; onDelete?(): void; onCancel(): void; onRetry?(): void; className?: string }`; `SurveyTemplateEditor(props)` — v0's loading state, error state with retry, the creator and the action bar (Back with discard confirmation when changed, Delete with confirmation in edit mode, Save = 更新/作成, disabled in edit mode while the survey equals what was loaded).

- [ ] **Step 1: Write the failing test `src/templates/survey-template-editor.test.tsx`**

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { classesOf, v0t } from '../../test/v0-template-classes'
import type { SurveyInput } from '../schema/survey-schema'
import {
  SurveyTemplateEditor,
  type SurveyTemplateEditorProps,
} from './survey-template-editor'

const stored: SurveyInput = {
  title: '満足度調査',
  items: [
    { id: 'sec_1', type: 'section-header', title: 'S' },
    { id: 'q_1', type: 'short-text', label: 'Q' },
  ],
}

const editor = (props: Partial<SurveyTemplateEditorProps> = {}) =>
  render(
    <SurveyTemplateEditor
      mode="edit"
      defaultValue={stored}
      onSave={() => {}}
      onCancel={() => {}}
      onDelete={() => {}}
      {...props}
    />
  )

const titleInput = async () => {
  await userEvent.click(screen.getByRole('button', { name: '満足度調査' }))
  return screen.getByPlaceholderText('アンケートのタイトル')
}

describe('SurveyTemplateEditor', () => {
  it('shows v0’s loading texts', () => {
    const { unmount } = editor({ loading: true })
    expect(
      screen.getByText('アンケートを読み込んでいます...')
    ).toBeInTheDocument()
    unmount()
    editor({ loading: true, mode: 'create' })
    expect(
      screen.getByText('アンケート作成インターフェースを準備しています...')
    ).toBeInTheDocument()
  })

  it('shows the error with a retry', async () => {
    const onRetry = vi.fn()
    editor({ error: new Error('通信エラー'), onRetry })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'アンケートの読み込みに失敗しました。'
    )
    expect(screen.getByRole('alert')).toHaveTextContent('通信エラー')
    await userEvent.click(screen.getByRole('button', { name: '再度試す' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('enables Update only while the survey differs from what was loaded (v0)', async () => {
    editor()
    const update = screen.getByRole('button', { name: '更新' })
    expect(classesOf(update.parentElement)).toEqual(v0t('actions.bar'))
    expect(classesOf(update)).toEqual(
      expect.arrayContaining(v0t('actions.button'))
    )
    expect(update).toBeDisabled()
    const title = await titleInput()
    await userEvent.type(title, '!')
    expect(update).toBeEnabled()
    await userEvent.type(title, '{Backspace}')
    expect(update).toBeDisabled()
  })

  it('saves the parsed survey', async () => {
    const onSave = vi.fn()
    editor({ onSave })
    await userEvent.type(await titleInput(), '2')
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: '満足度調査2' })
    )
  })

  it('creates without a delete button', () => {
    editor({ mode: 'create', defaultValue: undefined })
    expect(screen.getByRole('button', { name: '作成' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
  })

  it('goes back at once without changes, and asks first with changes', async () => {
    const onCancel = vi.fn()
    editor({ onCancel })
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await userEvent.type(await titleInput(), '!')
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: '変更を破棄しますか？',
    })
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('deletes after confirming', async () => {
    const onDelete = vi.fn()
    editor({ onDelete })
    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: '削除の確認',
    })
    await userEvent.click(
      within(dialog).getByRole('button', { name: '削除する' })
    )
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('locks everything while saving', () => {
    editor({ saving: true })
    expect(screen.getByRole('button', { name: '戻る' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '削除' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'プレビュー' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web survey-template-editor`
Expected: FAIL — cannot resolve `./survey-template-editor`.

- [ ] **Step 3: Implement `src/templates/survey-template-editor.tsx`**

```tsx
'use client'

import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  Button,
  cn,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  SurveyCreator,
  type SurveyCreatorHandle,
} from '../creator/survey-creator'
import type { Survey, SurveyInput } from '../schema/survey-schema'
import { templateMessages } from './i18n/template-messages'

export type SurveyTemplateEditorProps = {
  mode: 'create' | 'edit'
  /** Read when the creator mounts (after `loading` ends). */
  defaultValue?: SurveyInput
  loading?: boolean
  error?: unknown
  saving?: boolean
  deleting?: boolean
  onSave: (survey: Survey) => void | Promise<void>
  onDelete?: () => void
  onCancel: () => void
  onRetry?: () => void
  className?: string
}

const ACTION =
  'mbc:flex mbc:items-center mbc:rounded-full mbc:border mbc:border-[#636F80] mbc:bg-[#EEEEEE] mbc:text-black mbc:hover:bg-[#B7BDC6]'
const ICON = 'mbc:h-5! mbc:w-5!'

function Body({
  mode,
  defaultValue,
  saving = false,
  deleting = false,
  onSave,
  onDelete,
  onCancel,
}: SurveyTemplateEditorProps) {
  const t = useMessages(templateMessages)
  const creator = useRef<SurveyCreatorHandle>(null)
  const loaded = useRef<string | null>(null)
  const [changed, setChanged] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const busy = saving || deleting

  useEffect(() => {
    loaded.current = JSON.stringify(creator.current?.getValue() ?? null)
  }, [])

  const save = async (survey: Survey) => {
    await onSave(survey)
    loaded.current = JSON.stringify(creator.current?.getValue() ?? null)
    setChanged(false)
  }

  return (
    <>
      <SurveyCreator
        ref={creator}
        defaultValue={defaultValue}
        disabled={busy}
        onChange={(survey) =>
          setChanged(JSON.stringify(survey) !== loaded.current)
        }
        onSubmit={save}
      />
      <div className="mbc:mt-9 mbc:flex mbc:flex-row mbc:items-center mbc:justify-center mbc:gap-8 mbc:self-center">
        <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
          <Button
            type="button"
            size="lg"
            className={ACTION}
            disabled={busy}
            onClick={() => (changed ? setDiscardOpen(true) : onCancel())}
          >
            <ChevronLeft aria-hidden className={ICON} />
            {t.editor.back}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.editor.discardTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.editor.discardDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                {t.editor.cancel}
              </AlertDialogCancel>
              <AlertDialogAction disabled={busy} onClick={onCancel}>
                {t.editor.ok}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {mode === 'edit' && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="lg"
                className={ACTION}
                loading={deleting}
                disabled={busy}
              >
                <Trash2 aria-hidden className={ICON} />
                {t.editor.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.editor.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.editor.deleteDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  {t.editor.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={onDelete}
                  className="mbc:bg-red-500 mbc:hover:bg-red-600"
                >
                  {deleting ? t.editor.deleting : t.editor.deleteConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button
          type="button"
          size="lg"
          className={ACTION}
          loading={saving}
          disabled={busy || (mode === 'edit' && !changed)}
          // Errors belong to `onSave`'s owner (the host or the connected page).
          onClick={() => void creator.current?.submit().catch(() => {})}
        >
          {mode === 'edit' ? t.editor.update : t.editor.create}
          <ChevronRight aria-hidden className={ICON} />
        </Button>
      </div>
    </>
  )
}

/** v0's edit-survey-template page as a prop-driven screen. */
export function SurveyTemplateEditor(props: SurveyTemplateEditorProps) {
  const t = useMessages(templateMessages)
  const { mode, loading, error, onRetry, className } = props
  const editing = mode === 'edit'

  let content
  if (loading) {
    content = (
      <div className="mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:gap-4 mbc:py-12">
        <Loader2
          aria-hidden
          className="mbc:text-primary mbc:animate-spin mbc:h-10 mbc:w-10"
        />
        <div className="mbc:text-center" role="status">
          <h3 className="mbc:text-foreground mbc:text-lg mbc:font-semibold">
            {editing ? t.editor.loadingEdit : t.editor.loadingCreate}
          </h3>
          <p className="mbc:text-muted-foreground mbc:text-sm">
            {editing ? t.editor.loadingEditHint : t.editor.loadingCreateHint}
          </p>
        </div>
      </div>
    )
  } else if (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : t.editor.loadErrorFallback
    content = (
      <Alert
        variant="destructive"
        role="alert"
        className="mbc:mx-auto mbc:max-w-md"
      >
        <AlertCircle aria-hidden className="mbc:h-4 mbc:w-4" />
        <AlertTitle>{t.editor.loadErrorTitle}</AlertTitle>
        <AlertDescription className="mbc:flex mbc:flex-col mbc:gap-3">
          <p>{message}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mbc:w-full"
            >
              <RefreshCw aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
              {t.editor.retry}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  } else {
    content = <Body {...props} />
  }

  return (
    <div
      data-mbc=""
      className={cn('mbc:container mbc:mx-auto mbc:px-4 mbc:py-8', className)}
    >
      {content}
    </div>
  )
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web survey-template-editor`
Expected: PASS — 8 tests. If "Update" stays enabled after the Backspace, the loaded snapshot was taken before the creator's ref existed: it must be taken in `Body`'s mount effect (the child's ref is attached before the parent's effects run).

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add the prop-driven survey template editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `/mbc` API

**Files:**

- Create: `src/mbc/api.ts`, `api.test.ts`, `test/fake-mbc-client.ts`

**Interfaces:**

- Consumes: `client-web` (`MbcClient`, `CommandOptions`, `MbcApiError`), `SurveyTemplateSummary`.
- Produces:
  - `type SurveyTemplateListParams = { page: number; pageSize: number; keyword?: string; orderBy?: string; orderType?: 'asc' | 'desc' }`.
  - `type SurveyTemplateApi = { list(params, options?: { signal?: AbortSignal }): Promise<{ items: SurveyTemplateSummary[]; total: number }>; get(id, options?): Promise<{ summary: SurveyTemplateSummary; survey: SurveyInput }>; create(survey: Survey, options?: CommandOptions): Promise<void>; update(id, survey, options?): Promise<void>; remove(id, options?): Promise<void> }`; `createSurveyTemplateApi(client: MbcClient): SurveyTemplateApi`.
  - `toTemplateSummary(entity): SurveyTemplateSummary` (counts questions and sections from `attributes.surveyTemplate`).
  - `submitSurveyAnswer(client, { surveyId, answer, email? }, options?): Promise<void>`.
  - `test/fake-mbc-client.ts`: `createFakeClient(): MbcClient & { get: Mock; command: Mock }`.

- [ ] **Step 1: Write the double and the failing test**

`test/fake-mbc-client.ts`:

```ts
import type { MbcClient } from '@mbc-cqrs-serverless/client-web'
import { vi, type Mock } from 'vitest'

/** An MbcClient whose `get` and `command` are mocks; everything else is unused by `/mbc`. */
export function createFakeClient(): MbcClient & { get: Mock; command: Mock } {
  const unused = () => {
    throw new Error('not used by /mbc')
  }
  return {
    get: vi.fn(),
    command: vi.fn(),
    post: vi.fn(unused),
    put: vi.fn(unused),
    patch: vi.fn(unused),
    delete: vi.fn(unused),
    messages: undefined,
    tenantCode: () => 'demo',
    close: () => {},
  } as unknown as MbcClient & { get: Mock; command: Mock }
}
```

`src/mbc/api.test.ts`:

```ts
import { MbcApiError, MbcCommandError } from '@mbc-cqrs-serverless/client-web'
import { describe, expect, it } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import type { Survey } from '../schema/survey-schema'
import { createSurveyTemplateApi, submitSurveyAnswer } from './api'

const survey: Survey = {
  title: '満足度調査',
  description: '年次',
  items: [
    { id: 'sec_1', type: 'section-header', title: 'S' },
    { id: 'q_1', type: 'short-text', label: 'Q' },
    { id: 'q_2', type: 'short-text', label: 'Q2' },
  ],
}
const entity = {
  id: 'SURVEY#demo#1',
  name: '満足度調査',
  version: 2,
  createdAt: '2026-10-04T03:00:00.000Z',
  attributes: { description: '年次', surveyTemplate: survey },
}

describe('createSurveyTemplateApi', () => {
  it('lists with v0’s query and maps entities to summaries', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [entity], total: 1 })
    const result = await createSurveyTemplateApi(client).list({
      page: 2,
      pageSize: 20,
      keyword: '',
      orderBy: 'createdAt',
    })
    expect(client.get).toHaveBeenCalledWith('/api/survey-template', {
      query: {
        page: 2,
        pageSize: 20,
        keyword: undefined,
        orderBys: ['createdAt:desc'],
      },
      signal: undefined,
    })
    expect(result).toEqual({
      total: 1,
      items: [
        {
          id: 'SURVEY#demo#1',
          name: '満足度調査',
          description: '年次',
          version: 2,
          createdAt: '2026-10-04T03:00:00.000Z',
          updatedAt: undefined,
          questionCount: 2,
          sectionCount: 1,
        },
      ],
    })
  })

  it('gets one template with its id encoded', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(entity)
    const { survey: loaded, summary } =
      await createSurveyTemplateApi(client).get('SURVEY#demo#1')
    expect(client.get.mock.calls[0]?.[0]).toBe(
      '/api/survey-template/SURVEY%23demo%231'
    )
    expect(loaded).toEqual(survey)
    expect(summary.questionCount).toBe(2)
  })

  it('creates, updates and removes through command()', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const api = createSurveyTemplateApi(client)
    const signal = new AbortController().signal
    await api.create(survey, { signal })
    await api.update('SURVEY#demo#1', survey)
    await api.remove('SURVEY#demo#1')
    const body = {
      name: '満足度調査',
      attributes: { surveyTemplate: survey, description: '年次' },
    }
    expect(client.command.mock.calls).toEqual([
      [{ method: 'POST', path: '/api/survey-template', body }, { signal }],
      [
        { method: 'PUT', path: '/api/survey-template/SURVEY%23demo%231', body },
        undefined,
      ],
      [
        { method: 'DELETE', path: '/api/survey-template/SURVEY%23demo%231' },
        undefined,
      ],
    ])
  })

  it('treats an update that returns no requestId as saved (unchanged data)', async () => {
    const client = createFakeClient()
    client.command.mockRejectedValue(
      new MbcApiError(200, null, 'The command response has no requestId')
    )
    await expect(
      createSurveyTemplateApi(client).update('x', survey)
    ).resolves.toBeUndefined()
  })

  it('reports real failures', async () => {
    const client = createFakeClient()
    const api = createSurveyTemplateApi(client)
    client.command.mockRejectedValueOnce(new MbcApiError(500, null))
    await expect(api.update('x', survey)).rejects.toBeInstanceOf(MbcApiError)
    client.command.mockRejectedValueOnce(
      new MbcCommandError('r', 'sync:FAILED')
    )
    await expect(api.update('x', survey)).rejects.toBeInstanceOf(
      MbcCommandError
    )
    client.command.mockRejectedValueOnce(new MbcApiError(200, null))
    await expect(api.create(survey)).rejects.toBeInstanceOf(MbcApiError)
  })
})

describe('submitSurveyAnswer', () => {
  it('posts v0’s answer body', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    await submitSurveyAnswer(client, {
      surveyId: 's1',
      answer: { q_1: 'A' },
      email: 'a@example.com',
    })
    expect(client.command).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/api/survey-answer',
        body: {
          attributes: {
            surveyId: 's1',
            email: 'a@example.com',
            answer: { q_1: 'A' },
          },
        },
      },
      undefined
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web src/mbc/api`
Expected: FAIL — cannot resolve `./api`.

- [ ] **Step 3: Implement `src/mbc/api.ts`**

```ts
import {
  MbcApiError,
  type CommandOptions,
  type MbcClient,
} from '@mbc-cqrs-serverless/client-web'

import type { SurveyAnswers } from '../answers/types'
import type { Survey, SurveyInput } from '../schema/survey-schema'
import type { SurveyTemplateSummary } from '../templates/types'

/** The backend's survey-template entity (the fields this package reads). */
type TemplateEntity = {
  id: string
  name: string
  version?: number
  createdAt?: string
  updatedAt?: string
  attributes?: { description?: string; surveyTemplate?: unknown }
}

export type SurveyTemplateListParams = {
  page: number
  pageSize: number
  keyword?: string
  orderBy?: string
  orderType?: 'asc' | 'desc'
}

export type SurveyTemplateApi = {
  list(
    params: SurveyTemplateListParams,
    options?: { signal?: AbortSignal }
  ): Promise<{ items: SurveyTemplateSummary[]; total: number }>
  get(
    id: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ summary: SurveyTemplateSummary; survey: SurveyInput }>
  create(survey: Survey, options?: CommandOptions): Promise<void>
  update(id: string, survey: Survey, options?: CommandOptions): Promise<void>
  remove(id: string, options?: CommandOptions): Promise<void>
}

type Command = { requestId?: string }

const BASE = '/api/survey-template'
const itemPath = (id: string) => `${BASE}/${encodeURIComponent(id)}`
const bodyOf = (survey: Survey) => ({
  name: survey.title,
  attributes: { surveyTemplate: survey, description: survey.description },
})

export function toTemplateSummary(
  entity: TemplateEntity
): SurveyTemplateSummary {
  const survey = entity.attributes?.surveyTemplate as
    { items?: unknown } | undefined
  const items = Array.isArray(survey?.items)
    ? (survey.items as { type?: unknown }[])
    : []
  const sectionCount = items.filter(
    (item) => item?.type === 'section-header'
  ).length
  return {
    id: entity.id,
    name: entity.name,
    description: entity.attributes?.description,
    version: entity.version ?? 0,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    questionCount: items.length - sectionCount,
    sectionCount,
  }
}

/** An update with unchanged data gets no requestId from the backend: there is nothing to wait for. */
function isUnchanged(error: unknown): boolean {
  return (
    error instanceof MbcApiError && error.status >= 200 && error.status < 300
  )
}

export function createSurveyTemplateApi(client: MbcClient): SurveyTemplateApi {
  return {
    async list({ page, pageSize, keyword, orderBy, orderType }, options = {}) {
      const data = await client.get<{
        items?: TemplateEntity[]
        total?: number
      }>(BASE, {
        query: {
          page,
          pageSize,
          keyword: keyword || undefined,
          orderBys: orderBy ? [`${orderBy}:${orderType ?? 'desc'}`] : undefined,
        },
        signal: options.signal,
      })
      return {
        items: (data.items ?? []).map(toTemplateSummary),
        total: data.total ?? 0,
      }
    },
    async get(id, options = {}) {
      const entity = await client.get<TemplateEntity>(itemPath(id), {
        signal: options.signal,
      })
      return {
        summary: toTemplateSummary(entity),
        survey: (entity.attributes?.surveyTemplate ?? {
          title: entity.name,
          items: [],
        }) as SurveyInput,
      }
    },
    async create(survey, options) {
      await client.command<Command>(
        { method: 'POST', path: BASE, body: bodyOf(survey) },
        options
      )
    },
    async update(id, survey, options) {
      try {
        await client.command<Command>(
          { method: 'PUT', path: itemPath(id), body: bodyOf(survey) },
          options
        )
      } catch (error) {
        if (!isUnchanged(error)) throw error
      }
    },
    async remove(id, options) {
      await client.command<Command>(
        { method: 'DELETE', path: itemPath(id) },
        options
      )
    },
  }
}

export async function submitSurveyAnswer(
  client: MbcClient,
  {
    surveyId,
    answer,
    email,
  }: { surveyId: string; answer: SurveyAnswers; email?: string },
  options?: CommandOptions
): Promise<void> {
  await client.command<Command>(
    {
      method: 'POST',
      path: '/api/survey-answer',
      body: { attributes: { surveyId, email, answer } },
    },
    options
  )
}
```

- [ ] **Step 4: Run it to verify it passes; typecheck, lint, commit**

Run: `$N pnpm vitest run --project survey-web src/mbc/api && $N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: PASS — 6 tests; exit 0. If `client.get`'s option type does not accept `undefined` query values, check `client-web`'s `QueryParams` (SP3 skips `undefined`) and keep them — the test pins v0's request.

```bash
git add -A
git commit -m "feat(survey-web): add the mbc survey-template API and answer submission

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `/mbc` hooks and connected pages

**Files:**

- Create: `src/mbc/hooks.ts`, `hooks.test.tsx`, `src/mbc/pages.tsx`, `pages.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–4, `client-web/react` (`MbcClientProvider`, `useMbcClient`, `useCommand`).
- Produces:
  - `type QueryState<T> = { data: T | undefined; loading: boolean; error: unknown; refetch(): void }`.
  - `useSurveyTemplates(params: SurveyTemplateListParams): QueryState<{ items: SurveyTemplateSummary[]; total: number }>`; `useSurveyTemplate(id?: string): QueryState<{ summary; survey }>` (idle without `id`). Requests are aborted on change and unmount.
  - `useSurveyTemplateMutations(): { create; update; remove }` — each `useCommand` result (`run`, `status`, `error`, `reset`); `run` resolves `true` on success, `undefined` on failure or abort.
  - `useSubmitSurveyAnswer()` — `useCommand` result around `submitSurveyAnswer`.
  - `type TemplateListState = { page: number; pageSize: number; keyword: string }`; `MbcSurveyTemplateListPage({ onCreate?, onSelect, state?, onStateChange?, className? })`.
  - `MbcSurveyTemplateEditorPage({ id?, onSaved?, onDeleted?, onCancel, onError?, className? })` — no `id`: create mode.

- [ ] **Step 1: Write the failing tests**

`src/mbc/hooks.test.tsx`:

```tsx
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { useSurveyTemplate, useSurveyTemplates } from './hooks'

const wrap = (client: ReturnType<typeof createFakeClient>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <MbcClientProvider client={client}>{children}</MbcClientProvider>
      </StrictMode>
    )
  }

describe('useSurveyTemplates', () => {
  it('loads, refetches and aborts the previous request', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [], total: 0 })
    const { result, rerender } = renderHook(
      ({ page }) => useSurveyTemplates({ page, pageSize: 10 }),
      {
        wrapper: wrap(client),
        initialProps: { page: 1 },
      }
    )
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ items: [], total: 0 })

    rerender({ page: 2 })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    const signals = client.get.mock.calls.map(
      ([, options]) => (options as { signal: AbortSignal }).signal
    )
    expect(signals.slice(0, -1).every((signal) => signal.aborted)).toBe(true)
    expect(signals.at(-1)?.aborted).toBe(false)

    act(() => result.current.refetch())
    await waitFor(() =>
      expect(client.get).toHaveBeenCalledTimes(signals.length + 1)
    )
  })

  it('reports errors', async () => {
    const client = createFakeClient()
    client.get.mockRejectedValue(new Error('down'))
    const { result } = renderHook(
      () => useSurveyTemplates({ page: 1, pageSize: 10 }),
      { wrapper: wrap(client) }
    )
    await waitFor(() => expect(result.current.error).toEqual(new Error('down')))
    expect(result.current.loading).toBe(false)
  })
})

describe('useSurveyTemplate', () => {
  it('stays idle without an id and aborts on unmount', async () => {
    const client = createFakeClient()
    const idle = renderHook(() => useSurveyTemplate(undefined), {
      wrapper: wrap(client),
    })
    expect(idle.result.current).toMatchObject({
      loading: false,
      data: undefined,
    })
    expect(client.get).not.toHaveBeenCalled()

    client.get.mockReturnValue(new Promise(() => {}))
    const pending = renderHook(() => useSurveyTemplate('t1'), {
      wrapper: wrap(client),
    })
    pending.unmount()
    const signal = (
      client.get.mock.calls.at(-1)?.[1] as { signal: AbortSignal }
    ).signal
    expect(signal.aborted).toBe(true)
  })
})
```

`src/mbc/pages.test.tsx`:

```tsx
import { MbcApiError, MbcCommandError } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { MbcSurveyTemplateEditorPage, MbcSurveyTemplateListPage } from './pages'

const entity = (id: string, name: string) => ({
  id,
  name,
  version: 1,
  attributes: {
    surveyTemplate: {
      title: name,
      items: [{ id: 'sec_1', type: 'section-header', title: 'S' }],
    },
  },
})

function renderWith(
  client: ReturnType<typeof createFakeClient>,
  ui: ReactElement
) {
  return render(<MbcClientProvider client={client}>{ui}</MbcClientProvider>)
}

describe('MbcSurveyTemplateListPage', () => {
  it('loads page 1 of 10, searches from page 1, and selects', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({
      items: [entity('t1', 'A'), entity('t2', 'B')],
      total: 25,
    })
    const onSelect = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateListPage onSelect={onSelect} onCreate={() => {}} />
    )

    await userEvent.click(await screen.findByText('A'))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', name: 'A' })
    )

    await userEvent.click(screen.getByRole('link', { name: '2' }))
    await screen.findByText('A')
    await userEvent.type(screen.getByRole('searchbox'), 'x')
    await waitFor(() =>
      expect(client.get).toHaveBeenLastCalledWith(
        '/api/survey-template',
        expect.objectContaining({
          query: expect.objectContaining({ page: 1, keyword: 'x' }),
        })
      )
    )
    const queries = client.get.mock.calls.map(
      ([, options]) =>
        (options as { query: { page: number; keyword?: string } }).query
    )
    expect(queries.map((q) => [q.page, q.keyword])).toEqual([
      [1, undefined],
      [2, undefined],
      [1, 'x'],
    ])
  })

  it('lets the host own the state', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [entity('t1', 'A')], total: 25 })
    const onStateChange = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateListPage
        onSelect={() => {}}
        state={{ page: 3, pageSize: 10, keyword: '' }}
        onStateChange={onStateChange}
      />
    )
    await screen.findByText('A')
    await userEvent.click(screen.getByRole('link', { name: '4' }))
    expect(onStateChange).toHaveBeenCalledWith({
      page: 4,
      pageSize: 10,
      keyword: '',
    })
    expect(client.get).toHaveBeenCalledTimes(1)
  })

  it('retries after an error', async () => {
    const client = createFakeClient()
    client.get
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ items: [entity('t1', 'A')], total: 1 })
    renderWith(client, <MbcSurveyTemplateListPage onSelect={() => {}} />)
    await userEvent.click(
      await screen.findByRole('button', { name: '再度試す' })
    )
    expect(await screen.findByText('A')).toBeInTheDocument()
  })
})

describe('MbcSurveyTemplateEditorPage', () => {
  const edit = async (
    client: ReturnType<typeof createFakeClient>,
    props: Partial<Parameters<typeof MbcSurveyTemplateEditorPage>[0]> = {}
  ) => {
    client.get.mockResolvedValue(entity('SURVEY#1', 'Old'))
    renderWith(
      client,
      <MbcSurveyTemplateEditorPage
        id="SURVEY#1"
        onCancel={() => {}}
        {...props}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Old' }))
    await userEvent.type(
      screen.getByPlaceholderText('アンケートのタイトル'),
      '2'
    )
  }

  it('loads, updates and reports onSaved', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const onSaved = vi.fn()
    await edit(client, { onSaved })
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Old2' })
      )
    )
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'PUT',
      path: '/api/survey-template/SURVEY%231',
    })
  })

  it('treats a save without a requestId as saved, not as an error', async () => {
    const client = createFakeClient()
    client.command.mockRejectedValue(
      new MbcApiError(200, null, 'The command response has no requestId')
    )
    const onSaved = vi.fn()
    const onError = vi.fn()
    await edit(client, { onSaved, onError })
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onError).not.toHaveBeenCalled()
  })

  it('reports a failed command through onError and lets the user retry', async () => {
    const client = createFakeClient()
    client.command.mockRejectedValue(new MbcCommandError('r', 'sync:FAILED'))
    const onError = vi.fn()
    await edit(client, { onError })
    const update = screen.getByRole('button', { name: '更新' })
    await userEvent.click(update)
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.any(MbcCommandError))
    )
    expect(update).toBeEnabled()
  })

  it('deletes after confirming', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(entity('SURVEY#1', 'Old'))
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const onDeleted = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateEditorPage
        id="SURVEY#1"
        onCancel={() => {}}
        onDeleted={onDeleted}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '削除' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '削除する' })
    )
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(client.command.mock.calls[0]?.[0]).toEqual({
      method: 'DELETE',
      path: '/api/survey-template/SURVEY%231',
    })
  })

  it('creates without loading anything', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const onSaved = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateEditorPage onCancel={() => {}} onSaved={onSaved} />
    )
    await userEvent.click(screen.getByRole('button', { name: '作成' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(client.get).not.toHaveBeenCalled()
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/api/survey-template',
    })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web src/mbc/hooks src/mbc/pages`
Expected: FAIL — cannot resolve `./hooks`, `./pages`.

- [ ] **Step 3: Implement**

`src/mbc/hooks.ts`:

```ts
'use client'

import { useCommand, useMbcClient } from '@mbc-cqrs-serverless/client-web/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Survey } from '../schema/survey-schema'
import type { SurveyAnswers } from '../answers/types'
import {
  createSurveyTemplateApi,
  submitSurveyAnswer,
  type SurveyTemplateListParams,
} from './api'

export type QueryState<T> = {
  data: T | undefined
  loading: boolean
  error: unknown
  refetch(): void
}

type Settled<T> = { key: string; data?: T; error?: unknown }

/**
 * Fetch keyed by `key`; `load === null` means idle. Loading is derived (the
 * latest request has not settled), so no state is set synchronously in effects.
 */
function useQuery<T>(
  key: string,
  load: ((signal: AbortSignal) => Promise<T>) | null
): QueryState<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  const active = load !== null
  const requestKey = `${nonce}\u0000${key}`

  useEffect(() => {
    const run = loadRef.current
    if (!run) return
    const controller = new AbortController()
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, error })
      }
    )
    return () => controller.abort()
  }, [requestKey, active])

  const current = active && settled?.key === requestKey ? settled : null
  return {
    data: current?.data,
    loading: active && current === null,
    error: current?.error,
    refetch: () => setNonce((n) => n + 1),
  }
}

function useApi() {
  const client = useMbcClient()
  return useMemo(() => createSurveyTemplateApi(client), [client])
}

export function useSurveyTemplates(params: SurveyTemplateListParams) {
  const api = useApi()
  return useQuery(JSON.stringify(params), (signal) =>
    api.list(params, { signal })
  )
}

export function useSurveyTemplate(id?: string) {
  const api = useApi()
  return useQuery(id ?? '', id ? (signal) => api.get(id, { signal }) : null)
}

export function useSurveyTemplateMutations() {
  const create = useCommand(
    async ({ client, signal, onPhase }, survey: Survey) => {
      await createSurveyTemplateApi(client).create(survey, { signal, onPhase })
      return true as const
    }
  )
  const update = useCommand(
    async ({ client, signal, onPhase }, id: string, survey: Survey) => {
      await createSurveyTemplateApi(client).update(id, survey, {
        signal,
        onPhase,
      })
      return true as const
    }
  )
  const remove = useCommand(async ({ client, signal, onPhase }, id: string) => {
    await createSurveyTemplateApi(client).remove(id, { signal, onPhase })
    return true as const
  })
  return { create, update, remove }
}

export function useSubmitSurveyAnswer() {
  return useCommand(
    async (
      { client, signal, onPhase },
      input: { surveyId: string; answer: SurveyAnswers; email?: string }
    ) => {
      await submitSurveyAnswer(client, input, { signal, onPhase })
      return true as const
    }
  )
}
```

`src/mbc/pages.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

import type { Survey } from '../schema/survey-schema'
import { SurveyTemplateEditor } from '../templates/survey-template-editor'
import { SurveyTemplateList } from '../templates/survey-template-list'
import type { SurveyTemplateSummary } from '../templates/types'
import {
  useSurveyTemplate,
  useSurveyTemplateMutations,
  useSurveyTemplates,
} from './hooks'

export type TemplateListState = {
  page: number
  pageSize: number
  keyword: string
}

const INITIAL: TemplateListState = { page: 1, pageSize: 10, keyword: '' }
const pending = (status: string) => status === 'sending' || status === 'waiting'

/** v0's SurveyTemplatePage on the mbc backend. Pass `state` + `onStateChange` to sync with the URL. */
export function MbcSurveyTemplateListPage({
  onCreate,
  onSelect,
  state,
  onStateChange,
  className,
}: {
  onCreate?: () => void
  onSelect: (item: SurveyTemplateSummary) => void
  state?: TemplateListState
  onStateChange?: (state: TemplateListState) => void
  className?: string
}) {
  const [own, setOwn] = useState(INITIAL)
  const current = state ?? own
  const change = (next: Partial<TemplateListState>) => {
    const merged = { ...current, ...next }
    if (!state) setOwn(merged)
    onStateChange?.(merged)
  }
  const { data, loading, error, refetch } = useSurveyTemplates(current)
  return (
    <SurveyTemplateList
      items={data?.items ?? []}
      total={data?.total ?? 0}
      page={current.page}
      pageSize={current.pageSize}
      keyword={current.keyword}
      loading={loading}
      error={error}
      onPageChange={(page) => change({ page })}
      onPageSizeChange={(pageSize) => change({ pageSize, page: 1 })}
      onKeywordChange={(keyword) => change({ keyword, page: 1 })}
      onCreate={onCreate}
      onSelect={onSelect}
      onRetry={refetch}
      className={className}
    />
  )
}

/** v0's EditSurveyTemplatePage on the mbc backend; no `id` creates a template. */
export function MbcSurveyTemplateEditorPage({
  id,
  onSaved,
  onDeleted,
  onCancel,
  onError,
  className,
}: {
  id?: string
  onSaved?: (survey: Survey) => void
  onDeleted?: () => void
  onCancel: () => void
  onError?: (error: unknown) => void
  className?: string
}) {
  const { data, loading, error, refetch } = useSurveyTemplate(id)
  const { create, update, remove } = useSurveyTemplateMutations()
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })
  const failure =
    create.status === 'error'
      ? create.error
      : update.status === 'error'
        ? update.error
        : remove.status === 'error'
          ? remove.error
          : undefined
  useEffect(() => {
    if (failure !== undefined) onErrorRef.current?.(failure)
  }, [failure])

  return (
    <SurveyTemplateEditor
      mode={id ? 'edit' : 'create'}
      defaultValue={data?.survey}
      loading={loading}
      error={error}
      saving={pending(create.status) || pending(update.status)}
      deleting={pending(remove.status)}
      onSave={async (survey) => {
        const ok = id ? await update.run(id, survey) : await create.run(survey)
        // A rejection keeps the editor's unsaved state; the error itself reaches onError.
        if (!ok) throw new Error('The survey was not saved')
        onSaved?.(survey)
      }}
      onDelete={
        id
          ? async () => {
              if (await remove.run(id)) onDeleted?.()
            }
          : undefined
      }
      onCancel={onCancel}
      onRetry={refetch}
      className={className}
    />
  )
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web src/mbc`
Expected: PASS — 6 (api) + 3 (hooks) + 8 (pages) = 17 tests. If the StrictMode hook test sees two requests for one key, that is the first, aborted effect run: assert on the last call's signal (as written), not on the call count.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add mbc hooks and connected template pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Entry points, deprecated subpaths, build output, SSR, a11y, playground; gate

**Files:**

- Create: `src/SurveyForm/index.ts`, `src/SurveyCreator/index.ts`, `test/templates-ssr.test.tsx`, `test/templates-a11y.test.tsx`, `apps/playground/src/templates-page.tsx`, `apps/playground/src/fake-backend.ts`
- Modify: `src/templates/index.ts`, `src/mbc/index.ts`, `packages/survey-web/package.json` (exports), `test/build/output.test.ts`, `apps/playground/src/main.tsx`, `apps/playground/src/toolbar.tsx`, `apps/playground/package.json` (+ client-web), spec §5.2 (`SurveyTemplateSummary` fields)

- [ ] **Step 1: Write the failing tests**

Append to `test/build/output.test.ts` (inside the describe; reuse the import-graph walk from the `./core` test by extracting it into a local `externalsOf(entry: string): Set<string>` helper, and make the `./core` test call it):

```ts
it('keeps . , /templates, /core and the aliases free of client-web; /mbc uses it', () => {
  const CLIENT = '@mbc-cqrs-serverless/client-web'
  for (const entry of [
    'index.js',
    'templates/index.js',
    'core/index.js',
    'SurveyForm/index.js',
    'SurveyCreator/index.js',
  ]) {
    expect(
      [...externalsOf(entry)].some((name) => name.startsWith(CLIENT)),
      entry
    ).toBe(false)
  }
  expect(
    [...externalsOf('mbc/index.js')].some((name) => name.startsWith(CLIENT))
  ).toBe(true)
})
```

and extend `ships every entry point` with `'SurveyForm/index.js'`, `'SurveyCreator/index.js'`.

`test/templates-ssr.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SurveyTemplateEditor } from '../src/templates/survey-template-editor'
import { SurveyTemplateList } from '../src/templates/survey-template-list'

async function hydrate(element: ReactElement) {
  const html = renderToString(element)
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const recoverable: string[] = []
  await act(async () => {
    hydrateRoot(container, element, {
      onRecoverableError: (error) => recoverable.push(String(error)),
    })
  })
  const logged = errors.mock.calls.length
  errors.mockRestore()
  container.remove()
  return { html, recoverable, logged }
}

describe('template screens on the server', () => {
  it('render the list without the date, then hydrate cleanly', async () => {
    const result = await hydrate(
      <MbcProvider>
        <SurveyTemplateList
          items={[
            {
              id: 'a',
              name: 'A',
              version: 1,
              createdAt: '2026-10-04T23:30:00.000Z',
            },
          ]}
          total={1}
          page={1}
          pageSize={10}
          keyword=""
          onPageChange={() => {}}
          onKeywordChange={() => {}}
          onSelect={() => {}}
        />
      </MbcProvider>
    )
    expect(result.html).not.toContain('2026')
    expect(result.recoverable).toEqual([])
    expect(result.logged).toBe(0)
  })

  it('hydrate the editor', async () => {
    const result = await hydrate(
      <MbcProvider>
        <SurveyTemplateEditor
          mode="create"
          onSave={() => {}}
          onCancel={() => {}}
        />
      </MbcProvider>
    )
    expect(result.recoverable).toEqual([])
    expect(result.logged).toBe(0)
  })
})
```

`test/templates-a11y.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { SurveyTemplateEditor } from '../src/templates/survey-template-editor'
import { SurveyTemplateList } from '../src/templates/survey-template-list'

const run = async () => {
  const result = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`
  )
}

describe('template screens accessibility', () => {
  it('list with cards and pagination', async () => {
    render(
      <SurveyTemplateList
        items={Array.from({ length: 3 }, (_, i) => ({
          id: String(i),
          name: `T${i}`,
          version: 1,
          questionCount: i,
          sectionCount: 1,
        }))}
        total={40}
        page={2}
        pageSize={10}
        keyword=""
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onKeywordChange={() => {}}
        onCreate={() => {}}
        onSelect={() => {}}
      />
    )
    expect(await run()).toEqual([])
  })

  it('editor', async () => {
    render(
      <SurveyTemplateEditor
        mode="edit"
        defaultValue={{
          title: 'T',
          items: [{ id: 's', type: 'section-header', title: 'S' }],
        }}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={() => {}}
      />
    )
    expect(await run()).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$N pnpm build && $N pnpm vitest run --project survey-web test/build test/templates-ssr test/templates-a11y`
Expected: FAIL — `SurveyForm/index.js` missing (the SSR and a11y tests may already pass: they pin Tasks 2–3).

- [ ] **Step 3: Implement entries and aliases**

`src/templates/index.ts`:

```ts
export {
  templateMessages,
  type TemplateMessages,
} from './i18n/template-messages'
export type { SurveyTemplateSummary } from './types'
export { SurveyTemplateCard } from './template-card'
export { TemplatePagination } from './template-pagination'
export { TemplateSearch } from './template-search'
export {
  SurveyTemplateList,
  type SurveyTemplateListProps,
} from './survey-template-list'
export {
  SurveyTemplateEditor,
  type SurveyTemplateEditorProps,
} from './survey-template-editor'
```

`src/mbc/index.ts`:

```ts
export {
  createSurveyTemplateApi,
  submitSurveyAnswer,
  toTemplateSummary,
  type SurveyTemplateApi,
  type SurveyTemplateListParams,
} from './api'
export {
  useSubmitSurveyAnswer,
  useSurveyTemplate,
  useSurveyTemplateMutations,
  useSurveyTemplates,
  type QueryState,
} from './hooks'
export {
  MbcSurveyTemplateEditorPage,
  MbcSurveyTemplateListPage,
  type TemplateListState,
} from './pages'
```

`src/SurveyForm/index.ts`:

```ts
/** @deprecated Import `SurveyForm` from `@mbc-cqrs-serverless/survey-web`. Kept through 1.x. */
export { SurveyForm, type SurveyFormProps } from '../form/survey-form'
```

`src/SurveyCreator/index.ts`:

```ts
/** @deprecated Import `SurveyCreator` from `@mbc-cqrs-serverless/survey-web`. Kept through 1.x. */
export {
  SurveyCreator,
  type SurveyCreatorHandle,
  type SurveyCreatorProps,
} from '../creator/survey-creator'
```

In `packages/survey-web/package.json` `exports`, after `"./mbc"`, add:

```json
    "./SurveyForm": {
      "types": "./dist/SurveyForm/index.d.ts",
      "default": "./dist/SurveyForm/index.js"
    },
    "./SurveyCreator": {
      "types": "./dist/SurveyCreator/index.d.ts",
      "default": "./dist/SurveyCreator/index.js"
    },
```

In the spec §5.2, change the item type line to: ``Item type: `SurveyTemplateSummary { id, name, description?, version, createdAt?, updatedAt?, questionCount?, sectionCount? }` (counts and `createdAt` keep v0's card) — the editor and list do not depend on backend entity shapes.``

- [ ] **Step 4: Run them to verify they pass**

Run: `$N pnpm build && $N pnpm vitest run --project survey-web test/build test/templates-ssr test/templates-a11y && $N pnpm --filter @mbc-cqrs-serverless/survey-web check:package`
Expected: PASS; `publint` and `attw` accept the two new subpaths.

- [ ] **Step 5: Playground (fake backend) and probe**

`apps/playground/package.json`: add `"@mbc-cqrs-serverless/client-web": "workspace:*"`; run `$N pnpm install`.

`apps/playground/src/fake-backend.ts`:

```ts
import {
  createMbcClient,
  type MbcClient,
} from '@mbc-cqrs-serverless/client-web'

type Entity = {
  id: string
  name: string
  version: number
  createdAt: string
  attributes: { description?: string; surveyTemplate: unknown }
}

/** An in-memory survey-template backend behind a real MbcClient (no realtime: commands resolve after HTTP). */
export function createFakeBackend(): MbcClient {
  const store = new Map<string, Entity>()
  let seq = 0
  const add = (name: string, description: string) => {
    seq += 1
    const id = `SURVEY#demo#${seq}`
    store.set(id, {
      id,
      name,
      version: 1,
      createdAt: new Date(Date.UTC(2026, 9, seq)).toISOString(),
      attributes: {
        description,
        surveyTemplate: {
          title: name,
          description,
          items: [
            { id: `sec_${seq}`, type: 'section-header', title: '基本情報' },
            { id: `q_${seq}`, type: 'short-text', label: 'お名前' },
          ],
        },
      },
    })
  }
  for (let i = 1; i <= 14; i++) add(`アンケート ${i}`, i % 3 ? `説明 ${i}` : '')

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    )
    const method = init?.method ?? 'GET'
    await new Promise((resolve) => setTimeout(resolve, 300))
    const match = url.pathname.match(/^\/api\/survey-template\/?(.*)$/)
    if (!match) return json({ message: 'not found' }, 404)
    const id = decodeURIComponent(match[1] ?? '')
    if (method === 'GET' && !id) {
      const keyword = url.searchParams.get('keyword') ?? ''
      const page = Number(url.searchParams.get('page') ?? 1)
      const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
      const all = [...store.values()].filter((e) => e.name.includes(keyword))
      return json({
        items: all.slice((page - 1) * pageSize, page * pageSize),
        total: all.length,
      })
    }
    if (method === 'GET')
      return store.has(id)
        ? json(store.get(id))
        : json({ message: 'not found' }, 404)
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (method === 'POST') add(body.name, body.attributes?.description ?? '')
    if (method === 'PUT') {
      const entity = store.get(id)
      if (!entity) return json({ message: 'not found' }, 404)
      store.set(id, {
        ...entity,
        name: body.name,
        version: entity.version + 1,
        attributes: body.attributes,
      })
    }
    if (method === 'DELETE') store.delete(id)
    return json({ requestId: `req-${Date.now()}` })
  }

  return createMbcClient({
    apiUrl: 'https://fake.local',
    tenantCode: 'demo',
    fetch,
  })
}
```

`apps/playground/src/templates-page.tsx`:

```tsx
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import {
  MbcSurveyTemplateEditorPage,
  MbcSurveyTemplateListPage,
} from '@mbc-cqrs-serverless/survey-web/mbc'
import { useState } from 'react'

import { createFakeBackend } from './fake-backend'

const backend = createFakeBackend()

/** `#templates` (list), `#templates/new`, `#templates/<id>` (editor). */
export function TemplatesPage({ route }: { route: string }) {
  const [notice, setNotice] = useState('')
  const go = (next: string) => {
    location.hash = next
  }
  const id = route.startsWith('templates/')
    ? decodeURIComponent(route.slice('templates/'.length))
    : null
  return (
    <MbcClientProvider client={backend}>
      <div style={{ padding: 16 }}>
        {notice && <p role="status">{notice}</p>}
        {id === null ? (
          <MbcSurveyTemplateListPage
            onCreate={() => go('templates/new')}
            onSelect={(item) => go(`templates/${encodeURIComponent(item.id)}`)}
          />
        ) : (
          <MbcSurveyTemplateEditorPage
            key={id}
            id={id === 'new' ? undefined : id}
            onCancel={() => go('templates')}
            onSaved={() => {
              setNotice('保存しました')
              go('templates')
            }}
            onDeleted={() => {
              setNotice('削除しました')
              go('templates')
            }}
            onError={(error) => setNotice(`エラー: ${String(error)}`)}
          />
        )}
      </div>
    </MbcClientProvider>
  )
}
```

In `apps/playground/src/main.tsx` route `hash.startsWith('#templates')` → `<TemplatesPage route={hash.slice(1)} />` before the other routes; in `toolbar.tsx` add `<a href="#templates">Templates</a>`.

Run: `$N pnpm build && $N pnpm --filter @mbc-cqrs-serverless/playground typecheck && $N pnpm --filter @mbc-cqrs-serverless/playground build`, start the preview on 4173, then probe:

```bash
$N node /Users/uzumakiruto017/.claude/plugins/cache/evondevkit/evon/0.3.13/skills/ui-ux/scripts/probe.mjs "http://localhost:4173/#templates" --widths 375,1280 --out .superpowers/sdd/2026-10-06-07-sp7-templates-mbc/probe/list --pw "$TMPDIR/evon-probe"
$N node /Users/uzumakiruto017/.claude/plugins/cache/evondevkit/evon/0.3.13/skills/ui-ux/scripts/probe.mjs "http://localhost:4173/#templates/SURVEY%23demo%231" --widths 375,1280 --out .superpowers/sdd/2026-10-06-07-sp7-templates-mbc/probe/editor --pw "$TMPDIR/evon-probe"
```

Expected: no horizontal scroll; screenshots match v0's list (search + rounded create button, 3-column cards, pagination) and editor (creator + three rounded buttons). Ledger look items; fix layout breaks. Stop the server.

- [ ] **Step 6: Commit and gate**

```bash
git add -A
git commit -m "feat(survey-web): add /templates and /mbc entries, deprecated subpaths and playground pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Standard gate (orchestrator): `pnpm verify` on React 19 and 18, restore, clean tree. Final whole-branch review; fix Critical/Important RED→GREEN. Tick SP7 in the orchestrator; `git switch main && git merge --ff-only sp7-templates-mbc`.
