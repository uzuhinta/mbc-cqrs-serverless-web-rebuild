# SP6 — `SurveyCreator` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `SurveyCreator` — the survey editor — rebuilt on a pure reducer and a small external store, keeping v0's look (title card, section cards with "セクション n / N" tabs, question cards with view/edit modes, floating action bar, Creator / Preview / JSON tabs) and v0's lock rules, with dnd-kit drag and drop that works from the keyboard, translated text, and a `ref` handle.

**Architecture:** `creatorReducer` (pure, guarded by the lock rules) owns `{ survey, selectedId, dirty }`. A `useSyncExternalStore` store exposes it to components through per-item selectors, so editing one card re-renders that card only. Cards dispatch actions; nothing else mutates the survey. Validation runs `SurveySchema.safeParse` on every change and maps issues to cards by path; card errors show after the first submit attempt, dangling branch targets show as warnings at once. The shell renders the title card, the item list inside one dnd-kit context (questions sortable), the floating action bar next to the selected card, the section reorder dialog, and the preview tab with `SurveyForm`.

**Tech Stack:** SP1–SP5 + `@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0, `@dnd-kit/modifiers` ^9.0.0, `@dnd-kit/utilities` ^3.2.2. No react-hook-form in the creator.

**Spec:** `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md` §5.1 (`SurveyCreator` props + handle), §6.1 (editors), §6.3 (creator state), §6.5, §6.6. Orchestrator SP6 notes. v0 sources: `../mbc-cqrs-serverless-web/packages/survey/src/creators/**`, `src/components/layout/sortable-item.tsx`, `src/utils/id.ts`, `__tests__/{locked-question,section-locked,section-locked-question,question-creator-id,id}.test.*`.

## Global Constraints

- Commands: `fnm exec --using=v24.13.0 -- <command>` (`$N`), from `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`.
- Saved surveys stay v0-compatible: same JSON shape, ids `q_…` / `sec_…`, option `value` mirrors its `label` (v0), "Other" option `{ value: 'other', label, isOther: true }` kept last.
- Look: v0's classes with `mbc:`; no `space-x-*`/`space-y-*` — use `gap-*` (flex/grid) or margins with the same result; `flex-grow`/`flex-shrink-0` → `grow`/`shrink-0`; borders state a colour (`mbc:border-border` unless v0 names one).
- No React-19-only APIs; `"use client"` on every component module; state modules (`src/creator/state/*`) import no React except `store.ts`; no `window`/`document` during render or at module scope; item ids never rendered into the DOM (server and client generate different ids for a new survey); DOM ids via `useId`.
- All text from the `surveyCreator` messages (new namespace, `ja` = v0's strings, `en`). Prettier; Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Per-task final test command (exit code): `$N pnpm build && $N pnpm vitest run`.

## Behaviour changes from v0 (for MIGRATION.md)

1. **Changing between choice types keeps the options** (v0 cleared them); switching to multiple choice drops `nextSectionId`. Switching from a non-choice type adds one option `オプション 1` (v0 left none, which the schema rejects).
2. **"Submit form" after a section works** (v0 cleared any `submit` action on non-last sections right after it was chosen).
3. **Reordering sections keeps questions placed before the first section header** (v0 dropped them).
4. **Duplicating a question inside a locked section is not possible** (v0 allowed it, contradicting "nothing added into a locked section"); adding a question while the survey title is selected and the last section is locked is not possible either.
5. **Errors are shown on the cards** after a submit attempt (v0 only logged them); dangling `nextSectionId` / `targetSectionId` show a warning.
6. **Option previews keep the schema order** (v0 reshuffled the preview list on every render) and still say "(シャッフル)".
7. **A duplicated section's title gets a translated suffix** (`（コピー）` / ` (Copy)`; v0 always ` (Copy)`).
8. **The preview's submit shows an inline note** instead of `alert()` and a `console.log`.
9. **`SurveyCreator` API:** `defaultValue` replaces `initialSchema`, `onChange(survey, { isValid, isDirty })` replaces `onSchemaChange`, `ref` (`submit`, `reset`, `getValue`) replaces `submitButtonRef`.

## Review Focus

1. **Lock rules under every entry point** (menu, floating bar, keyboard drag, type select, duplicate) → a locked question or section never changes, nothing enters a locked section, and the section after a locked one can still be added. Pinned in Tasks 1, 4, 6, 7.
2. **Keyboard-only editing**: select a card, open its menu, change its type, drag it with Space + arrows, reorder sections in the dialog → all reachable and announced. Pinned in Tasks 4, 6, 7.
3. **`defaultValue` from the backend without defaults (no `levels`, unknown keys, duplicate ids)** → the creator opens, shows every item, and saves a schema-valid survey. Pinned in Tasks 1, 7.
4. **Server rendering a new survey** (no `defaultValue`) then hydrating → no mismatch although ids are random. Pinned in Task 7.
5. **Typing in one card** re-renders only that card (store selectors), and `onChange` fires once per user change with the right `isValid`. Pinned in Tasks 2, 7.

---

## File Structure

```
packages/survey-web/
├─ package.json                                   (+ @dnd-kit/*)                  Task 5
├─ src/
│  ├─ creator/
│  │  ├─ state/
│  │  │  ├─ types.ts                              TITLE_ID, CreatorState         Task 1
│  │  │  ├─ id.ts (+test)                         createId                       Task 1
│  │  │  ├─ items.ts (+test)                      section ranges, insert indexes Task 1
│  │  │  ├─ locks.ts (+test)                      canEdit … canMerge             Task 1
│  │  │  ├─ defaults.ts (+test)                   new items, type change, init   Task 1
│  │  │  ├─ reducer.ts (+test)                    creatorReducer                 Task 1
│  │  │  ├─ validate.ts (+test)                   issues → cards, warnings       Task 2
│  │  │  └─ store.ts (+test)                      external store + hooks         Task 2
│  │  ├─ i18n/creator-messages.ts                 surveyCreator namespace        Task 2
│  │  ├─ question/
│  │  │  ├─ type-options.tsx                      kind → icon + label            Task 3
│  │  │  ├─ question-preview.tsx (+test)          nine read-only previews        Task 3
│  │  │  ├─ question-card.tsx (+test)             view / edit / locked card      Task 4
│  │  │  ├─ question-menu.tsx                     the ⋮ menu                     Task 4
│  │  │  ├─ text-validation.tsx (+test)           short/long rule builders       Task 5
│  │  │  ├─ choice-validation.tsx                 choice-count rule builder      Task 5
│  │  │  ├─ options-editor.tsx (+test)            sortable options, Other, jumps Task 5
│  │  │  └─ scale-editors.tsx (+test)             linear scale, rating, date/time Task 5
│  │  ├─ section/
│  │  │  ├─ section-card.tsx (+test)              header card + menu + delete    Task 6
│  │  │  ├─ section-action.tsx (+test)            "n セクション後" select         Task 6
│  │  │  └─ section-reorder-dialog.tsx (+test)    move sections                  Task 6
│  │  ├─ floating-action-bar.tsx                                                 Task 7
│  │  ├─ sortable-question.tsx                    useSortable wrapper            Task 7
│  │  ├─ survey-creator.tsx (+test)               shell, tabs, dnd, handle       Task 7
│  │  └─ dnd-announcements.ts                     translated announcements       Task 7
│  └─ index.ts                                    exports                         Tasks 2, 7
└─ test/
   ├─ fixtures/creator-surveys.ts                 lock fixture                   Task 1
   ├─ v0-creator-classes.ts                       v0 class strings               Task 3
   ├─ creator-ssr.test.tsx, creator-a11y.test.tsx                                Task 7
apps/playground/src/survey-creator-page.tsx       playground page                Task 7
```

---

### Task 1: Creator state — ids, sections, locks, type changes, reducer

**Files:**

- Create: `src/creator/state/types.ts`, `id.ts`, `id.test.ts`, `items.ts`, `items.test.ts`, `locks.ts`, `locks.test.ts`, `defaults.ts`, `defaults.test.ts`, `reducer.ts`, `reducer.test.ts`, `test/fixtures/creator-surveys.ts`

**Interfaces:**

- Consumes: `Survey`, `SurveyInput`, `SurveyItem`, `SectionHeader`, `SurveyQuestion`, `QuestionKind`, `ShortTextQuestion`, `SurveySchema` (SP4/SP5).
- Produces:
  - `createId(prefix: 'q' | 'sec'): string`; `type IdFactory = (prefix: 'q' | 'sec') => string`.
  - `items.ts`: `isSection(item): item is SectionHeader`, `headerIndexOf(items, index): number` (−1 before any header), `sectionEndOf(items, index): number`, `isInLockedSection(items, index): boolean`, `sectionHeaders(items): SectionHeader[]`, `questionInsertIndex(items, selectedIndex): number | null`, `sectionInsertIndex(items, selectedIndex): number`.
  - `locks.ts`: `canEdit`, `canDelete`, `canDuplicate`, `canDrag`, `canMerge` — all `(items: readonly SurveyItem[], index: number) => boolean`.
  - `defaults.ts`: `createQuestion(newId?): ShortTextQuestion`, `createSection(title, newId?): SectionHeader`, `changeQuestionType(question, kind, optionLabel): SurveyQuestion`, `initialCreatorState(defaultValue: SurveyInput | undefined, text: { untitledSurvey: string; firstSection: string }, newId?): CreatorState`.
  - `types.ts`: `TITLE_ID = '__title__'`, `type CreatorState = { survey: Survey; selectedId: string | null; dirty: boolean }` (re-exported by `reducer.ts`).
  - `reducer.ts`: `type CreatorAction` (below), `creatorReducer(state, action, newId?: IdFactory): CreatorState` — returns the same `state` object when an action is refused or changes nothing.

- [ ] **Step 1: Branch**

```bash
git switch main && git switch -c sp6-survey-creator
```

- [ ] **Step 2: Write the fixture and the failing tests**

`test/fixtures/creator-surveys.ts`:

```ts
import type { Survey } from '../../src/schema/survey-schema'

/**
 * 0 sec_locked (locked) · 1 q_in_locked · 2 sec_open · 3 q_open ·
 * 4 q_locked (locked) · 5 sec_last · 6 q_last (branches to sec_open)
 */
export const LOCKS: Survey = {
  title: 'Locks',
  items: [
    { id: 'sec_locked', type: 'section-header', title: 'Locked', locked: true },
    { id: 'q_in_locked', type: 'short-text', label: 'In locked' },
    { id: 'sec_open', type: 'section-header', title: 'Open' },
    { id: 'q_open', type: 'short-text', label: 'Open question' },
    {
      id: 'q_locked',
      type: 'short-text',
      label: 'Locked question',
      locked: true,
    },
    { id: 'sec_last', type: 'section-header', title: 'Last' },
    {
      id: 'q_last',
      type: 'single-choice',
      label: 'Pick',
      options: [{ value: 'A', label: 'A', nextSectionId: 'sec_open' }],
    },
  ],
}

/** A locked section that is not the first one. */
export const LOCKED_SECOND: Survey = {
  title: 'Second locked',
  items: [
    { id: 'sec_a', type: 'section-header', title: 'A' },
    { id: 'q_a', type: 'short-text', label: 'QA' },
    { id: 'sec_b', type: 'section-header', title: 'B', locked: true },
    { id: 'q_b', type: 'short-text', label: 'QB' },
    { id: 'sec_c', type: 'section-header', title: 'C' },
  ],
}
```

`src/creator/state/id.test.ts` (v0's `id.test.ts`, plus the fallback):

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createId } from './id'

describe('createId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('prefixes question ids with q_ and section ids with sec_', () => {
    expect(createId('q')).toMatch(/^q_/)
    expect(createId('sec')).toMatch(/^sec_/)
  })

  it('never collides across a tight loop', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10_000; i++) ids.add(createId('q'))
    expect(ids.size).toBe(10_000)
  })

  it('produces ids usable as form field names (no "." or "[")', () => {
    expect(createId('q')).not.toMatch(/[.[\]]/)
  })

  it('falls back when crypto.randomUUID is unavailable (insecure origins)', () => {
    vi.stubGlobal('crypto', undefined)
    const ids = new Set<string>()
    for (let i = 0; i < 1_000; i++) ids.add(createId('sec'))
    expect(ids.size).toBe(1_000)
    expect([...ids][0]).toMatch(/^sec_[a-z0-9_]+$/)
  })
})
```

`src/creator/state/items.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { LOCKS } from '../../../test/fixtures/creator-surveys'
import {
  headerIndexOf,
  isInLockedSection,
  questionInsertIndex,
  sectionEndOf,
  sectionHeaders,
  sectionInsertIndex,
} from './items'

const items = LOCKS.items

describe('section helpers', () => {
  it('finds the header and the end of an item’s section', () => {
    expect(headerIndexOf(items, 1)).toBe(0)
    expect(headerIndexOf(items, 2)).toBe(2)
    expect(headerIndexOf(items, 4)).toBe(2)
    expect(headerIndexOf([{ id: 'q', type: 'short-text', label: '' }], 0)).toBe(
      -1
    )
    expect(sectionEndOf(items, 0)).toBe(2)
    expect(sectionEndOf(items, 3)).toBe(5)
    expect(sectionEndOf(items, 6)).toBe(7)
  })

  it('knows which items sit in a locked section', () => {
    expect(isInLockedSection(items, 0)).toBe(true)
    expect(isInLockedSection(items, 1)).toBe(true)
    expect(isInLockedSection(items, 3)).toBe(false)
    expect(isInLockedSection(items, -1)).toBe(false)
    expect(sectionHeaders(items).map((s) => s.id)).toEqual([
      'sec_locked',
      'sec_open',
      'sec_last',
    ])
  })

  it('places a new question after the selection, never into a locked section', () => {
    expect(questionInsertIndex(items, 3)).toBe(4)
    expect(questionInsertIndex(items, 0)).toBeNull()
    expect(questionInsertIndex(items, 1)).toBeNull()
    expect(questionInsertIndex(items, -1)).toBe(7)
    const lastLocked = [
      ...items,
      {
        id: 'sec_z',
        type: 'section-header' as const,
        title: 'Z',
        locked: true,
      },
    ]
    expect(questionInsertIndex(lastLocked, -1)).toBeNull()
  })

  it('places a new section after the selection, or after a locked section', () => {
    expect(sectionInsertIndex(items, 3)).toBe(4)
    expect(sectionInsertIndex(items, 0)).toBe(2)
    expect(sectionInsertIndex(items, 1)).toBe(2)
    expect(sectionInsertIndex(items, -1)).toBe(7)
  })
})
```

`src/creator/state/locks.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { LOCKED_SECOND, LOCKS } from '../../../test/fixtures/creator-surveys'
import { canDelete, canDrag, canDuplicate, canEdit, canMerge } from './locks'

const items = LOCKS.items

describe('lock rules (v0)', () => {
  it('locked items are not editable; unlocked questions in a locked section are', () => {
    expect(canEdit(items, 0)).toBe(false)
    expect(canEdit(items, 1)).toBe(true)
    expect(canEdit(items, 4)).toBe(false)
    expect(canEdit(items, 99)).toBe(false)
  })

  it('deletes neither locked items, sections holding a locked question, nor the last section', () => {
    expect(canDelete(items, 4)).toBe(false)
    expect(canDelete(items, 0)).toBe(false)
    expect(canDelete(items, 2)).toBe(false)
    expect(canDelete(items, 5)).toBe(true)
    expect(canDelete(items, 3)).toBe(true)
    expect(
      canDelete([{ id: 's', type: 'section-header', title: 'Only' }], 0)
    ).toBe(false)
  })

  it('duplicates sections (as unlocked copies) but adds nothing into a locked section', () => {
    expect(canDuplicate(items, 0)).toBe(true)
    expect(canDuplicate(items, 1)).toBe(false)
    expect(canDuplicate(items, 3)).toBe(true)
    expect(canDuplicate(items, 4)).toBe(false)
  })

  it('drags only unlocked questions outside locked sections', () => {
    expect(canDrag(items, 1)).toBe(false)
    expect(canDrag(items, 2)).toBe(false)
    expect(canDrag(items, 3)).toBe(true)
    expect(canDrag(items, 4)).toBe(false)
  })

  it('merges neither the first section, a locked one, nor into a locked one', () => {
    expect(canMerge(items, 0)).toBe(false)
    expect(canMerge(items, 2)).toBe(false)
    expect(canMerge(items, 5)).toBe(true)
    expect(canMerge(items, 3)).toBe(false)
    expect(canMerge(LOCKED_SECOND.items, 2)).toBe(false)
    expect(canMerge(LOCKED_SECOND.items, 4)).toBe(false)
  })
})
```

`src/creator/state/defaults.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { SurveyQuestion } from '../../schema/survey-schema'
import {
  changeQuestionType,
  createQuestion,
  initialCreatorState,
} from './defaults'
import { TITLE_ID } from './reducer'

let n = 0
const ids = (prefix: 'q' | 'sec') => `${prefix}_${++n}`
const text = {
  untitledSurvey: '未タイトル調査',
  firstSection: '最初のセクション',
}

describe('changeQuestionType', () => {
  const short: SurveyQuestion = {
    id: 'q1',
    type: 'short-text',
    label: 'Q',
    description: 'D',
    validation: {
      required: true,
      custom: { type: 'number', rule: 'gt', value: 1 },
    },
  }

  it('keeps id, label, description and required; drops the custom rule', () => {
    expect(changeQuestionType(short, 'long-text', 'オプション 1')).toEqual({
      id: 'q1',
      type: 'long-text',
      label: 'Q',
      description: 'D',
      validation: { required: true },
    })
  })

  it('gives each kind v0’s defaults', () => {
    expect(changeQuestionType(short, 'rating', 'x')).toMatchObject({
      levels: 5,
      symbol: 'star',
    })
    expect(changeQuestionType(short, 'linear-scale', 'x')).toMatchObject({
      min: 1,
      max: 5,
    })
    expect(changeQuestionType(short, 'date', 'x')).toMatchObject({
      includeTime: false,
      includeYear: true,
    })
    expect(changeQuestionType(short, 'time', 'x')).toMatchObject({
      answerType: 'time',
    })
  })

  it('adds one option when entering a choice kind, keeps options between choice kinds', () => {
    const single = changeQuestionType(short, 'single-choice', 'オプション 1')
    expect(single).toMatchObject({
      options: [{ value: 'オプション 1', label: 'オプション 1' }],
    })
    const branched: SurveyQuestion = {
      id: 'q2',
      type: 'dropdown',
      label: 'D',
      options: [{ value: 'a', label: 'a', nextSectionId: 'sec_x' }],
      validation: { required: false, shuffleOptions: true },
    }
    expect(changeQuestionType(branched, 'multiple-choice', 'x')).toEqual({
      id: 'q2',
      type: 'multiple-choice',
      label: 'D',
      options: [{ value: 'a', label: 'a' }],
      validation: { required: false, shuffleOptions: true },
    })
  })
})

describe('initialCreatorState', () => {
  it('starts a new survey with one section and the title card selected (v0)', () => {
    const state = initialCreatorState(undefined, text, ids)
    expect(state.survey).toEqual({
      title: '未タイトル調査',
      description: '',
      items: [
        {
          id: expect.stringMatching(/^sec_/),
          type: 'section-header',
          title: '最初のセクション',
        },
      ],
    })
    expect(state.selectedId).toBe(TITLE_ID)
    expect(state.dirty).toBe(false)
  })

  it('parses stored JSON (defaults filled) and selects the first item', () => {
    const state = initialCreatorState(
      { title: 'T', items: [{ id: 'q_r', type: 'rating', label: 'R' }] },
      text,
      ids
    )
    expect(state.survey.items[0]).toMatchObject({ levels: 5, symbol: 'star' })
    expect(state.selectedId).toBe('q_r')
  })

  it('gives duplicate ids fresh ones so cards and fields stay distinct', () => {
    const state = initialCreatorState(
      {
        title: 'T',
        items: [
          { id: 'dup', type: 'short-text', label: 'A' },
          { id: 'dup', type: 'short-text', label: 'B' },
        ],
      },
      text,
      ids
    )
    const [a, b] = state.survey.items
    expect(a?.id).toBe('dup')
    expect(b?.id).toMatch(/^q_/)
  })

  it('creates questions with v0’s defaults', () => {
    expect(createQuestion(ids)).toEqual({
      id: expect.stringMatching(/^q_/),
      type: 'short-text',
      label: '',
      validation: { required: false },
    })
  })
})
```

`src/creator/state/reducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { LOCKS } from '../../../test/fixtures/creator-surveys'
import type { SurveyItem } from '../../schema/survey-schema'
import {
  creatorReducer,
  TITLE_ID,
  type CreatorAction,
  type CreatorState,
} from './reducer'

let n = 0
const ids = (prefix: 'q' | 'sec') => `${prefix}_new${++n}`
const start = (selectedId: string | null = null): CreatorState => ({
  survey: LOCKS,
  selectedId,
  dirty: false,
})
const run = (state: CreatorState, action: CreatorAction) =>
  creatorReducer(state, action, ids)
const idsOf = (state: CreatorState) => state.survey.items.map((i) => i.id)
const item = (state: CreatorState, id: string) =>
  state.survey.items.find((i) => i.id === id) as SurveyItem

describe('creatorReducer', () => {
  it('selects without marking the survey dirty', () => {
    const next = run(start(), { type: 'select', id: 'q_open' })
    expect(next.selectedId).toBe('q_open')
    expect(next.dirty).toBe(false)
  })

  it('edits the title and description', () => {
    const next = run(start(), {
      type: 'updateSurvey',
      title: 'New',
      description: 'D',
    })
    expect(next.survey).toMatchObject({ title: 'New', description: 'D' })
    expect(next.dirty).toBe(true)
  })

  it('adds a question after the selection and selects it', () => {
    const question = { id: 'q_added', type: 'short-text' as const, label: '' }
    const next = run(start('q_open'), { type: 'addQuestion', question })
    expect(idsOf(next).indexOf('q_added')).toBe(4)
    expect(next.selectedId).toBe('q_added')
  })

  it('refuses to add a question into a locked section', () => {
    const state = start('q_in_locked')
    const question = { id: 'q_x', type: 'short-text' as const, label: '' }
    expect(run(state, { type: 'addQuestion', question })).toBe(state)
  })

  it('adds a section after a locked section, not inside it', () => {
    const section = {
      id: 'sec_added',
      type: 'section-header' as const,
      title: 'S',
    }
    const next = run(start('q_in_locked'), { type: 'addSection', section })
    expect(idsOf(next).indexOf('sec_added')).toBe(2)
    expect(
      run(start(TITLE_ID), { type: 'addSection', section }).survey.items.at(-1)
        ?.id
    ).toBe('sec_added')
  })

  it('updates unlocked items and section actions, never locked content', () => {
    const relabel = (label: string) => (i: SurveyItem) =>
      i.type === 'section-header' ? { ...i, title: label } : { ...i, label }

    expect(
      item(
        run(start(), {
          type: 'updateItem',
          id: 'q_open',
          update: relabel('X'),
        }),
        'q_open'
      )
    ).toMatchObject({ label: 'X' })

    const locked = start()
    expect(
      run(locked, { type: 'updateItem', id: 'q_locked', update: relabel('X') })
    ).toBe(locked)
    expect(
      run(locked, {
        type: 'updateItem',
        id: 'sec_locked',
        update: relabel('X'),
      })
    ).toBe(locked)

    const withAction = run(locked, {
      type: 'updateItem',
      id: 'sec_locked',
      update: (i) => ({ ...i, action: { type: 'submit' } }) as SurveyItem,
    })
    expect(item(withAction, 'sec_locked')).toMatchObject({
      action: { type: 'submit' },
    })
  })

  it('changes a question’s type unless it is locked', () => {
    const next = run(start(), {
      type: 'changeType',
      id: 'q_open',
      kind: 'dropdown',
      optionLabel: 'オプション 1',
    })
    expect(item(next, 'q_open')).toMatchObject({
      type: 'dropdown',
      label: 'Open question',
    })
    const state = start()
    expect(
      run(state, {
        type: 'changeType',
        id: 'q_locked',
        kind: 'rating',
        optionLabel: 'x',
      })
    ).toBe(state)
  })

  it('duplicates a question right after itself and selects the copy', () => {
    const next = run(start('q_open'), {
      type: 'duplicate',
      id: 'q_open',
      copySuffix: '（コピー）',
    })
    const copyId = idsOf(next)[4]!
    expect(copyId).toMatch(/^q_new/)
    expect(item(next, copyId)).toMatchObject({
      type: 'short-text',
      label: 'Open question',
    })
    expect(next.selectedId).toBe(copyId)
    const state = start()
    expect(
      run(state, { type: 'duplicate', id: 'q_locked', copySuffix: '' })
    ).toBe(state)
    expect(
      run(state, { type: 'duplicate', id: 'q_in_locked', copySuffix: '' })
    ).toBe(state)
  })

  it('duplicates a locked section as an unlocked copy after it', () => {
    const next = run(start(), {
      type: 'duplicate',
      id: 'sec_locked',
      copySuffix: '（コピー）',
    })
    const [header, question] = next.survey.items.slice(2, 4)
    expect(header).toMatchObject({
      type: 'section-header',
      title: 'Locked（コピー）',
    })
    expect(header).not.toHaveProperty('locked')
    expect(header?.id).toMatch(/^sec_new/)
    expect(question).toMatchObject({ label: 'In locked' })
    expect(question?.id).toMatch(/^q_new/)
  })

  it('removes a question, or a section with its questions, within the lock rules', () => {
    expect(idsOf(run(start(), { type: 'remove', id: 'q_open' }))).not.toContain(
      'q_open'
    )
    expect(idsOf(run(start(), { type: 'remove', id: 'sec_last' }))).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_open',
      'q_locked',
    ])
    const state = start()
    expect(run(state, { type: 'remove', id: 'sec_open' })).toBe(state)
    expect(run(state, { type: 'remove', id: 'q_locked' })).toBe(state)
    expect(run(state, { type: 'remove', id: 'sec_locked' })).toBe(state)
  })

  it('clears the selection when the selected item is removed', () => {
    expect(
      run(start('q_last'), { type: 'remove', id: 'sec_last' }).selectedId
    ).toBeNull()
  })

  it('merges a section into the one above, except into or from a locked one', () => {
    expect(
      idsOf(run(start(), { type: 'mergeSection', id: 'sec_last' }))
    ).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_open',
      'q_locked',
      'q_last',
    ])
    const state = start()
    expect(run(state, { type: 'mergeSection', id: 'sec_open' })).toBe(state)
  })

  it('moves a question over another, never into or out of a locked section', () => {
    expect(
      idsOf(run(start(), { type: 'move', id: 'q_open', overId: 'q_last' }))
    ).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_locked',
      'sec_last',
      'q_last',
      'q_open',
    ])
    const state = start()
    expect(
      run(state, { type: 'move', id: 'q_open', overId: 'q_in_locked' })
    ).toBe(state)
    expect(
      run(state, { type: 'move', id: 'q_in_locked', overId: 'q_open' })
    ).toBe(state)
    expect(run(state, { type: 'move', id: 'q_locked', overId: 'q_open' })).toBe(
      state
    )
  })

  it('reorders sections with their questions and keeps leading questions first', () => {
    const next = run(start(), {
      type: 'reorderSections',
      order: ['sec_last', 'sec_locked', 'sec_open'],
    })
    expect(idsOf(next)).toEqual([
      'sec_last',
      'q_last',
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_open',
      'q_locked',
    ])
    const leading: CreatorState = {
      survey: {
        title: 'T',
        items: [
          { id: 'q_lead', type: 'short-text', label: 'Lead' },
          { id: 's1', type: 'section-header', title: '1' },
          { id: 's2', type: 'section-header', title: '2' },
        ],
      },
      selectedId: null,
      dirty: false,
    }
    expect(
      idsOf(run(leading, { type: 'reorderSections', order: ['s2', 's1'] }))
    ).toEqual(['q_lead', 's2', 's1'])
    expect(run(leading, { type: 'reorderSections', order: ['s2'] })).toBe(
      leading
    )
  })

  it('resets to a new survey and clears dirty', () => {
    const dirty = run(start(), { type: 'updateSurvey', title: 'x' })
    const next = run(dirty, {
      type: 'reset',
      survey: LOCKS,
      selectedId: 'q_open',
    })
    expect(next).toEqual({ survey: LOCKS, selectedId: 'q_open', dirty: false })
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web src/creator/state`
Expected: FAIL — cannot resolve `./id`, `./items`, `./locks`, `./defaults`, `./reducer`.

- [ ] **Step 4: Implement**

`src/creator/state/types.ts`:

```ts
import type { Survey } from '../../schema/survey-schema'

/** Selection id of the survey title card. */
export const TITLE_ID = '__title__'

export type CreatorState = {
  survey: Survey
  /** An item id, `TITLE_ID`, or `null`. */
  selectedId: string | null
  dirty: boolean
}
```

`src/creator/state/id.ts`:

```ts
export type IdFactory = (prefix: 'q' | 'sec') => string

let counter = 0

/**
 * Stable item ids (`q_…`, `sec_…`). They are form field names and branch
 * targets, so they must be unique and contain neither `.` nor `[`.
 * `crypto.randomUUID` is missing on insecure origins, hence the fallback.
 */
export const createId: IdFactory = (prefix) => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `${prefix}_${uuid.replaceAll('-', '')}`
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}${random}`
}
```

`src/creator/state/items.ts`:

```ts
import type { SectionHeader, SurveyItem } from '../../schema/survey-schema'

export function isSection(item: SurveyItem | undefined): item is SectionHeader {
  return item?.type === 'section-header'
}

/** Index of the header governing `index` (the item itself if it is one); −1 before any header. */
export function headerIndexOf(
  items: readonly SurveyItem[],
  index: number
): number {
  for (let i = Math.min(index, items.length - 1); i >= 0; i -= 1) {
    if (isSection(items[i])) return i
  }
  return -1
}

/** First index after the section that contains `index`. */
export function sectionEndOf(
  items: readonly SurveyItem[],
  index: number
): number {
  for (let i = index + 1; i < items.length; i += 1) {
    if (isSection(items[i])) return i
  }
  return items.length
}

export function isInLockedSection(
  items: readonly SurveyItem[],
  index: number
): boolean {
  const header = items[headerIndexOf(items, index)]
  return isSection(header) && header.locked === true
}

export function sectionHeaders(items: readonly SurveyItem[]): SectionHeader[] {
  return items.filter(isSection)
}

/** Where a new question goes for this selection (`-1`: none or the title); `null` when that is inside a locked section. */
export function questionInsertIndex(
  items: readonly SurveyItem[],
  selectedIndex: number
): number | null {
  const at = selectedIndex >= 0 ? selectedIndex + 1 : items.length
  return isInLockedSection(items, at - 1) ? null : at
}

/** Where a new section goes: after the selection, or after the whole locked section it sits in. */
export function sectionInsertIndex(
  items: readonly SurveyItem[],
  selectedIndex: number
): number {
  if (selectedIndex < 0) return items.length
  return isInLockedSection(items, selectedIndex)
    ? sectionEndOf(items, selectedIndex)
    : selectedIndex + 1
}
```

`src/creator/state/locks.ts`:

```ts
import type { SurveyItem } from '../../schema/survey-schema'
import {
  isInLockedSection,
  isSection,
  sectionEndOf,
  sectionHeaders,
} from './items'

/** v0's lock rules, in one place: every UI entry point and the reducer ask these. */
export function canEdit(items: readonly SurveyItem[], index: number): boolean {
  const item = items[index]
  return item !== undefined && item.locked !== true
}

export function canDelete(
  items: readonly SurveyItem[],
  index: number
): boolean {
  const item = items[index]
  if (!item || item.locked) return false
  if (!isSection(item)) return true
  if (sectionHeaders(items).length <= 1) return false
  return !items
    .slice(index + 1, sectionEndOf(items, index))
    .some((entry) => entry.locked === true)
}

export function canDuplicate(
  items: readonly SurveyItem[],
  index: number
): boolean {
  const item = items[index]
  if (!item) return false
  if (isSection(item)) return true
  return item.locked !== true && !isInLockedSection(items, index)
}

export function canDrag(items: readonly SurveyItem[], index: number): boolean {
  const item = items[index]
  return (
    item !== undefined &&
    !isSection(item) &&
    item.locked !== true &&
    !isInLockedSection(items, index)
  )
}

export function canMerge(items: readonly SurveyItem[], index: number): boolean {
  const item = items[index]
  if (!isSection(item) || index === 0 || item.locked) return false
  if (sectionHeaders(items).length <= 1) return false
  return !isInLockedSection(items, index - 1)
}
```

`src/creator/state/defaults.ts`:

```ts
import {
  SurveySchema,
  type QuestionKind,
  type QuestionOption,
  type SectionHeader,
  type ShortTextQuestion,
  type Survey,
  type SurveyInput,
  type SurveyQuestion,
} from '../../schema/survey-schema'
import { createId, type IdFactory } from './id'
import { TITLE_ID, type CreatorState } from './types'

export function createQuestion(newId: IdFactory = createId): ShortTextQuestion {
  return {
    id: newId('q'),
    type: 'short-text',
    label: '',
    validation: { required: false },
  }
}

export function createSection(
  title: string,
  newId: IdFactory = createId
): SectionHeader {
  return { id: newId('sec'), type: 'section-header', title }
}

/**
 * Keeps what the question means to its author (id, label, description,
 * required, lock, and options between choice kinds); everything specific to
 * the old kind goes, including a custom validation rule (v0).
 */
export function changeQuestionType(
  question: SurveyQuestion,
  kind: QuestionKind,
  optionLabel: string
): SurveyQuestion {
  const base = {
    id: question.id,
    label: question.label,
    ...(question.description !== undefined && {
      description: question.description,
    }),
    ...(question.locked !== undefined && { locked: question.locked }),
  }
  const required = question.validation?.required ?? false
  const previous: readonly QuestionOption[] =
    'options' in question ? question.options : []
  const options =
    previous.length > 0
      ? [...previous]
      : [{ value: optionLabel, label: optionLabel }]
  const shuffle =
    'options' in question ? question.validation?.shuffleOptions : undefined
  const choiceValidation = {
    required,
    ...(shuffle !== undefined && { shuffleOptions: shuffle }),
  }

  switch (kind) {
    case 'short-text':
    case 'long-text':
      return { ...base, type: kind, validation: { required } }
    case 'single-choice':
    case 'dropdown':
      return { ...base, type: kind, options, validation: choiceValidation }
    case 'multiple-choice':
      return {
        ...base,
        type: kind,
        options: options.map(
          ({ nextSectionId: _dropped, ...option }) => option
        ),
        validation: choiceValidation,
      }
    case 'linear-scale':
      return { ...base, type: kind, min: 1, max: 5, validation: { required } }
    case 'rating':
      return {
        ...base,
        type: kind,
        levels: 5,
        symbol: 'star',
        validation: { required },
      }
    case 'date':
      return {
        ...base,
        type: kind,
        includeTime: false,
        includeYear: true,
        validation: { required },
      }
    case 'time':
      return {
        ...base,
        type: kind,
        answerType: 'time',
        validation: { required },
      }
  }
}

function withUniqueIds(survey: Survey, newId: IdFactory): Survey {
  const seen = new Set<string>()
  const items = survey.items.map((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      return item
    }
    return { ...item, id: newId(item.type === 'section-header' ? 'sec' : 'q') }
  })
  return { ...survey, items }
}

/** v0: a new survey has one section and the title selected; a loaded one selects its first item. */
export function initialCreatorState(
  defaultValue: SurveyInput | undefined,
  text: { untitledSurvey: string; firstSection: string },
  newId: IdFactory = createId
): CreatorState {
  if (!defaultValue) {
    return {
      survey: {
        title: text.untitledSurvey,
        description: '',
        items: [createSection(text.firstSection, newId)],
      },
      selectedId: TITLE_ID,
      dirty: false,
    }
  }
  const parsed = SurveySchema.safeParse(defaultValue)
  const survey = withUniqueIds(
    parsed.success ? parsed.data : (defaultValue as Survey),
    newId
  )
  return { survey, selectedId: survey.items[0]?.id ?? TITLE_ID, dirty: false }
}
```

`src/creator/state/reducer.ts`:

```ts
import type {
  QuestionKind,
  SectionHeader,
  Survey,
  SurveyItem,
  SurveyQuestion,
} from '../../schema/survey-schema'
import { changeQuestionType } from './defaults'
import { createId, type IdFactory } from './id'
import {
  isInLockedSection,
  isSection,
  questionInsertIndex,
  sectionEndOf,
  sectionInsertIndex,
} from './items'
import { canDelete, canDrag, canDuplicate, canEdit, canMerge } from './locks'
import type { CreatorState } from './types'

export { TITLE_ID, type CreatorState } from './types'

export type CreatorAction =
  | { type: 'select'; id: string | null }
  | { type: 'updateSurvey'; title?: string; description?: string }
  | { type: 'addQuestion'; question: SurveyQuestion }
  | { type: 'addSection'; section: SectionHeader }
  | { type: 'updateItem'; id: string; update: (item: SurveyItem) => SurveyItem }
  | { type: 'changeType'; id: string; kind: QuestionKind; optionLabel: string }
  | { type: 'duplicate'; id: string; copySuffix: string }
  | { type: 'remove'; id: string }
  | { type: 'mergeSection'; id: string }
  | { type: 'move'; id: string; overId: string }
  | { type: 'reorderSections'; order: readonly string[] }
  | { type: 'reset'; survey: Survey; selectedId: string | null }

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function insertAt<T>(list: readonly T[], at: number, added: readonly T[]): T[] {
  return [...list.slice(0, at), ...added, ...list.slice(at)]
}

function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) next.splice(to, 0, moved)
  return next
}

function withItems(
  state: CreatorState,
  items: SurveyItem[],
  selectedId: string | null = state.selectedId
): CreatorState {
  return { survey: { ...state.survey, items }, selectedId, dirty: true }
}

function lockedContentChanged(item: SectionHeader, next: SurveyItem): boolean {
  return (
    !isSection(next) ||
    next.title !== item.title ||
    next.description !== item.description ||
    next.locked !== item.locked
  )
}

/** Pure. A refused or no-op action returns `state` itself. */
export function creatorReducer(
  state: CreatorState,
  action: CreatorAction,
  newId: IdFactory = createId
): CreatorState {
  const items = state.survey.items
  const indexOf = (id: string | null) =>
    id === null ? -1 : items.findIndex((item) => item.id === id)

  switch (action.type) {
    case 'select':
      return state.selectedId === action.id
        ? state
        : { ...state, selectedId: action.id }

    case 'updateSurvey':
      return {
        ...state,
        survey: {
          ...state.survey,
          ...(action.title !== undefined && { title: action.title }),
          ...(action.description !== undefined && {
            description: action.description,
          }),
        },
        dirty: true,
      }

    case 'addQuestion': {
      const at = questionInsertIndex(items, indexOf(state.selectedId))
      if (at === null) return state
      return withItems(
        state,
        insertAt(items, at, [action.question]),
        action.question.id
      )
    }

    case 'addSection': {
      const at = sectionInsertIndex(items, indexOf(state.selectedId))
      return withItems(
        state,
        insertAt(items, at, [action.section]),
        action.section.id
      )
    }

    case 'updateItem': {
      const index = indexOf(action.id)
      const item = items[index]
      if (!item) return state
      const next = action.update(item)
      if (next === item || next.id !== item.id || next.type !== item.type)
        return state
      if (
        isSection(item)
          ? item.locked && lockedContentChanged(item, next)
          : !canEdit(items, index)
      ) {
        return state
      }
      return withItems(
        state,
        items.map((entry, i) => (i === index ? next : entry))
      )
    }

    case 'changeType': {
      const index = indexOf(action.id)
      const item = items[index]
      if (
        !item ||
        isSection(item) ||
        item.type === action.kind ||
        !canEdit(items, index)
      ) {
        return state
      }
      const next = changeQuestionType(item, action.kind, action.optionLabel)
      return withItems(
        state,
        items.map((entry, i) => (i === index ? next : entry))
      )
    }

    case 'duplicate': {
      const index = indexOf(action.id)
      const item = items[index]
      if (!item || !canDuplicate(items, index)) return state
      if (!isSection(item)) {
        const copy = { ...clone(item), id: newId('q') }
        return withItems(state, insertAt(items, index + 1, [copy]), copy.id)
      }
      const end = sectionEndOf(items, index)
      const copies = items.slice(index, end).map((entry) => {
        const { locked: _locked, ...rest } = clone(entry)
        return isSection(entry)
          ? {
              ...rest,
              id: newId('sec'),
              title: `${entry.title}${action.copySuffix}`,
            }
          : { ...rest, id: newId('q') }
      }) as SurveyItem[]
      return withItems(
        state,
        insertAt(items, end, copies),
        copies[0]?.id ?? null
      )
    }

    case 'remove': {
      const index = indexOf(action.id)
      const item = items[index]
      if (!item || !canDelete(items, index)) return state
      const end = isSection(item) ? sectionEndOf(items, index) : index + 1
      const removed = new Set(items.slice(index, end).map((entry) => entry.id))
      return withItems(
        state,
        [...items.slice(0, index), ...items.slice(end)],
        state.selectedId !== null && removed.has(state.selectedId)
          ? null
          : state.selectedId
      )
    }

    case 'mergeSection': {
      const index = indexOf(action.id)
      if (!canMerge(items, index)) return state
      return withItems(
        state,
        items.filter((_, i) => i !== index),
        state.selectedId === action.id ? null : state.selectedId
      )
    }

    case 'move': {
      const from = indexOf(action.id)
      const to = indexOf(action.overId)
      if (
        from < 0 ||
        to <= 0 ||
        from === to ||
        !canDrag(items, from) ||
        isInLockedSection(items, to)
      ) {
        return state
      }
      return withItems(state, arrayMove(items, from, to))
    }

    case 'reorderSections': {
      const first = items.findIndex(isSection)
      if (first < 0) return state
      const groups = new Map<string, SurveyItem[]>()
      items.forEach((entry, i) => {
        if (isSection(entry))
          groups.set(entry.id, items.slice(i, sectionEndOf(items, i)))
      })
      const valid =
        action.order.length === groups.size &&
        new Set(action.order).size === groups.size &&
        action.order.every((id) => groups.has(id))
      if (!valid) return state
      const next = [
        ...items.slice(0, first),
        ...action.order.flatMap((id) => groups.get(id) ?? []),
      ]
      return next.every((entry, i) => entry === items[i])
        ? state
        : withItems(state, next)
    }

    case 'reset':
      return {
        survey: action.survey,
        selectedId: action.selectedId,
        dirty: false,
      }
  }
}
```

- [ ] **Step 5: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web src/creator/state`
Expected: PASS — 4 + 4 + 5 + 7 + 15 = 35 tests.

- [ ] **Step 6: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0. Discriminated-union literals in `changeQuestionType` must type-check against `SurveyQuestion` without casts; if TypeScript widens `type: kind`, write one `return` per `case` with the literal (`type: 'short-text'`).

```bash
git add -A
git commit -m "feat(survey-web): add the creator reducer with v0 lock rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Messages, draft validation, external store

**Files:**

- Create: `src/creator/i18n/creator-messages.ts`, `src/creator/state/validate.ts`, `validate.test.ts`, `src/creator/state/store.ts`, `store.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**

- Consumes: Task 1 (`CreatorState`, `CreatorAction`, `creatorReducer`, `TITLE_ID`, `isSection`), `SurveySchema`, ui-web `defineMessages`.
- Produces:
  - `creatorMessages` (namespace `surveyCreator`) and `type CreatorMessages` (groups below); exported from `.`.
  - `type CreatorIssueKey = 'surveyTitle' | 'sectionTitle' | 'options' | 'optionLabel' | 'validationRule' | 'duplicateId' | 'invalid'`; `type DraftReport = { valid: boolean; data?: Survey; errors: Record<string, CreatorIssueKey[]>; warnings: Record<string, 'missingTarget'[]> }` (keys are item ids or `TITLE_ID`); `validateDraft(survey: Survey): DraftReport`.
  - `type CreatorStore = { getState(): CreatorState; dispatch(action: CreatorAction): void; subscribe(listener: () => void): () => void }`; `createCreatorStore(initial, options?: { onChange?: (next, previous, action) => void }): CreatorStore`; `CreatorStoreProvider({ store, children })`; `useCreatorStore(): CreatorStore`; `useCreatorSelector<T>(selector: (state: CreatorState) => T): T` (selectors return stored objects or primitives, never new objects).

- [ ] **Step 1: Write the failing tests**

`src/creator/state/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { Survey } from '../../schema/survey-schema'
import { TITLE_ID } from './types'
import { validateDraft } from './validate'

describe('validateDraft', () => {
  it('passes a valid survey and returns the parsed data', () => {
    const survey: Survey = {
      title: 'T',
      items: [{ id: 'sec_1', type: 'section-header', title: 'S' }],
    }
    expect(validateDraft(survey)).toEqual({
      valid: true,
      data: survey,
      errors: {},
      warnings: {},
    })
  })

  it('maps schema issues to the card that owns them', () => {
    const survey = {
      title: '',
      items: [
        { id: 'sec_1', type: 'section-header', title: '' },
        { id: 'q_1', type: 'single-choice', label: 'Q', options: [] },
        {
          id: 'q_2',
          type: 'dropdown',
          label: 'Q2',
          options: [{ value: '', label: '' }],
        },
        {
          id: 'q_3',
          type: 'short-text',
          label: 'Q3',
          validation: { custom: { type: 'number' } },
        },
      ],
    } as unknown as Survey
    const report = validateDraft(survey)
    expect(report.valid).toBe(false)
    expect(report.errors).toEqual({
      [TITLE_ID]: ['surveyTitle'],
      sec_1: ['sectionTitle'],
      q_1: ['options'],
      q_2: ['optionLabel'],
      q_3: ['validationRule'],
    })
  })

  it('flags duplicate ids on the second item', () => {
    const survey: Survey = {
      title: 'T',
      items: [
        { id: 'dup', type: 'section-header', title: 'A' },
        { id: 'dup', type: 'short-text', label: 'B' },
      ],
    }
    expect(validateDraft(survey).errors).toEqual({ dup: ['duplicateId'] })
  })

  it('warns about branch targets that no longer exist, without failing', () => {
    const survey: Survey = {
      title: 'T',
      items: [
        {
          id: 'sec_1',
          type: 'section-header',
          title: 'S',
          action: { type: 'jump', targetSectionId: 'sec_gone' },
        },
        {
          id: 'q_1',
          type: 'single-choice',
          label: 'Q',
          options: [
            { value: 'a', label: 'a', nextSectionId: 'sec_gone' },
            { value: 'b', label: 'b', nextSectionId: 'sec_1' },
          ],
        },
      ],
    }
    const report = validateDraft(survey)
    expect(report.valid).toBe(true)
    expect(report.warnings).toEqual({
      sec_1: ['missingTarget'],
      q_1: ['missingTarget'],
    })
  })
})
```

`src/creator/state/store.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { Component, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LOCKS } from '../../../test/fixtures/creator-surveys'
import type { SurveyItem } from '../../schema/survey-schema'
import {
  createCreatorStore,
  CreatorStoreProvider,
  useCreatorSelector,
} from './store'
import type { CreatorState } from './types'

const initial: CreatorState = { survey: LOCKS, selectedId: null, dirty: false }
const relabel = (label: string) => (item: SurveyItem) =>
  item.type === 'section-header' ? item : { ...item, label }

describe('createCreatorStore', () => {
  it('reduces actions, notifies subscribers and reports changes', () => {
    const onChange = vi.fn()
    const store = createCreatorStore(initial, { onChange })
    const listener = vi.fn()
    store.subscribe(listener)

    store.dispatch({ type: 'updateItem', id: 'q_open', update: relabel('X') })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      store.getState(),
      initial,
      expect.objectContaining({ type: 'updateItem' })
    )
  })

  it('stays silent when the reducer refuses an action', () => {
    const onChange = vi.fn()
    const store = createCreatorStore(initial, { onChange })
    const listener = vi.fn()
    store.subscribe(listener)

    store.dispatch({ type: 'remove', id: 'q_locked' })

    expect(listener).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(store.getState()).toBe(initial)
  })
})

describe('useCreatorSelector', () => {
  it('re-renders only the components whose selected item changed', () => {
    const store = createCreatorStore(initial)
    const renders: Record<string, number> = {}

    function Card({ id }: { id: string }) {
      const item = useCreatorSelector((state) =>
        state.survey.items.find((entry) => entry.id === id)
      )
      renders[id] = (renders[id] ?? 0) + 1
      return <p>{item && 'label' in item ? item.label : ''}</p>
    }

    render(
      <CreatorStoreProvider store={store}>
        <Card id="q_open" />
        <Card id="q_last" />
      </CreatorStoreProvider>
    )
    act(() =>
      store.dispatch({
        type: 'updateItem',
        id: 'q_open',
        update: relabel('Renamed'),
      })
    )

    expect(screen.getByText('Renamed')).toBeInTheDocument()
    expect(renders).toEqual({ q_open: 2, q_last: 1 })
  })

  it('explains a missing provider', () => {
    function Orphan() {
      useCreatorSelector((state) => state.dirty)
      return null
    }
    // React 18 and 19 surface render errors differently; a boundary sees both.
    class Catch extends Component<
      { children: ReactNode },
      { message?: string }
    > {
      override state: { message?: string } = {}
      static getDerivedStateFromError(error: Error) {
        return { message: error.message }
      }
      override render() {
        return this.state.message ? (
          <p>{this.state.message}</p>
        ) : (
          this.props.children
        )
      }
    }
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Catch>
        <Orphan />
      </Catch>
    )
    expect(screen.getByText(/CreatorStoreProvider/)).toBeInTheDocument()
    errors.mockRestore()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web src/creator/state/validate src/creator/state/store`
Expected: FAIL — cannot resolve `./validate`, `./store`.

- [ ] **Step 3: Implement**

`src/creator/i18n/creator-messages.ts` (v0's strings in `ja`):

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { QuestionKind } from '../../schema/survey-schema'

export type CreatorMessages = {
  shell: {
    creatorTab: string
    previewTab: string
    jsonTab: string
    jsonTitle: string
    previewSubmitted: string
    untitledSurvey: string
    surveyTitlePlaceholder: string
    surveyDescriptionPlaceholder: string
    firstSection: string
    newSection: (params: { n: number }) => string
    copySuffix: string
  }
  toolbar: {
    label: string
    addQuestion: string
    addQuestionLocked: string
    importQuestions: string
    addTitle: string
    addSection: string
    addSectionAfterLocked: string
  }
  question: {
    placeholder: string
    newQuestion: string
    descriptionPlaceholder: string
    type: string
    duplicate: string
    delete: string
    required: string
    more: string
    show: string
    description: string
    responseValidation: string
    shuffleOptions: string
    branching: string
    includeTime: string
    includeYear: string
    answerType: string
    answerTime: string
    answerDuration: string
    locked: string
    dragHandle: string
  }
  kinds: Record<QuestionKind, string>
  preview: {
    shortText: string
    longText: string
    moreOptions: (params: { count: number }) => string
    shuffled: string
    dateWithYear: string
    dateNoYear: string
    time: string
  }
  rules: {
    type: string
    rule: string
    number: string
    text: string
    length: string
    regex: string
    gt: string
    gte: string
    lt: string
    lte: string
    eq: string
    neq: string
    between: string
    notBetween: string
    isNumber: string
    isWhole: string
    contains: string
    notContains: string
    isEmail: string
    isUrl: string
    maxLength: string
    minLength: string
    matches: string
    notMatches: string
    value: string
    and: string
    customError: string
    close: string
    choiceRule: string
    atLeast: string
    atMost: string
    exactly: string
    count: string
  }
  options: {
    title: string
    placeholder: (params: { n: number }) => string
    add: string
    addOther: string
    removeOther: string
    other: string
    goToSection: string
    defaultNext: string
    remove: string
    reorder: string
  }
  scale: {
    to: string
    labelPlaceholder: string
    min: string
    max: string
  }
  rating: {
    levels: string
    symbol: string
    star: string
    heart: string
    thumb: string
  }
  section: {
    tab: (params: { n: number; total: number }) => string
    untitled: string
    descriptionPlaceholder: string
    menu: string
    move: string
    duplicate: string
    merge: string
    delete: string
    containsLocked: string
    deleteTitle: string
    deleteDescription: string
    deleteHint: string
    cancel: string
    confirmDelete: string
    locked: string
    expand: string
    collapse: string
  }
  action: {
    after: (params: { n: number }) => string
    continueNext: string
    goTo: (params: { n: number; title: string }) => string
    submit: string
  }
  reorder: {
    title: string
    position: (params: { n: number; total: number }) => string
    save: string
    cancel: string
  }
  dnd: {
    instructions: string
    pickedUp: (params: { label: string }) => string
    movedOver: (params: { label: string; over: string }) => string
    dropped: (params: { label: string; over: string }) => string
    droppedNowhere: (params: { label: string }) => string
    cancelled: (params: { label: string }) => string
  }
  errors: {
    surveyTitle: string
    sectionTitle: string
    options: string
    optionLabel: string
    validationRule: string
    duplicateId: string
    invalid: string
    missingTarget: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    surveyCreator: CreatorMessages
  }
}

const ja: CreatorMessages = {
  shell: {
    creatorTab: '作成者',
    previewTab: 'プレビュー',
    jsonTab: 'JSON',
    jsonTitle: 'ライブJSON出力',
    previewSubmitted: 'プレビューが送信されました。',
    untitledSurvey: '未タイトル調査',
    surveyTitlePlaceholder: 'アンケートのタイトル',
    surveyDescriptionPlaceholder: 'フォームの説明',
    firstSection: '最初のセクション',
    newSection: ({ n }) => `セクション ${n}`,
    copySuffix: '（コピー）',
  },
  toolbar: {
    label: '項目を追加',
    addQuestion: '質問を追加',
    addQuestionLocked: 'ロックされたセクションには質問を追加できません',
    importQuestions: '質問をインポート (将来実装予定)',
    addTitle: 'タイトルと説明を追加 (将来実装予定)',
    addSection: 'セクションを追加',
    addSectionAfterLocked: 'ロックされたセクションの後にセクションを追加',
  },
  question: {
    placeholder: '質問',
    newQuestion: '新しい質問',
    descriptionPlaceholder: '説明',
    type: '質問の種類',
    duplicate: '複製',
    delete: '削除',
    required: '必須',
    more: 'その他のオプション',
    show: '表示',
    description: '説明',
    responseValidation: '回答の検証',
    shuffleOptions: 'オプションをシャッフル',
    branching: '回答に基づいてセクションに移動',
    includeTime: '時間を含む',
    includeYear: '年を含む',
    answerType: '回答の種類',
    answerTime: '時刻',
    answerDuration: '期間',
    locked: 'ロックされた質問',
    dragHandle: 'ドラッグして並べ替え',
  },
  kinds: {
    'short-text': '短文回答',
    'long-text': '段落',
    'single-choice': 'ラジオボタン',
    'multiple-choice': 'チェックボックス',
    dropdown: 'プルダウン',
    'linear-scale': '均等目盛',
    rating: '評価',
    date: '日付',
    time: '時刻',
  },
  preview: {
    shortText: '短文回答',
    longText: '長文回答 (段落)',
    moreOptions: ({ count }) => `+${count} 個の追加オプション`,
    shuffled: ' (シャッフル)',
    dateWithYear: '年月日',
    dateNoYear: '年月',
    time: '時間',
  },
  rules: {
    type: 'タイプ...',
    rule: 'ルール...',
    number: '数値',
    text: 'テキスト',
    length: '長さ',
    regex: '正規表現',
    gt: 'より大きい',
    gte: '以上',
    lt: 'より小さい',
    lte: '以下',
    eq: '等しい',
    neq: '等しくない',
    between: '範囲内',
    notBetween: '範囲外',
    isNumber: '数字',
    isWhole: '整数',
    contains: '含む',
    notContains: '含まない',
    isEmail: 'メールアドレス',
    isUrl: 'URL',
    maxLength: '最大文字数',
    minLength: '最小文字数',
    matches: '一致する',
    notMatches: '一致しない',
    value: '値',
    and: 'かつ',
    customError: 'カスタムエラーテキスト',
    close: '回答の検証を閉じる',
    choiceRule: 'ルールを選択...',
    atLeast: '最低でも',
    atMost: '最大でも',
    exactly: '正確に',
    count: '数値',
  },
  options: {
    title: 'オプション',
    placeholder: ({ n }) => `オプション ${n}`,
    add: 'オプションを追加',
    addOther: 'その他を追加',
    removeOther: 'その他を削除',
    other: 'その他',
    goToSection: 'セクションに移動...',
    defaultNext: 'デフォルト (次のセクション)',
    remove: 'オプションを削除',
    reorder: 'ドラッグしてオプションを並べ替え',
  },
  scale: {
    to: '〜',
    labelPlaceholder: 'ラベル（任意)',
    min: '最小値',
    max: '最大値',
  },
  rating: {
    levels: '段階数',
    symbol: '記号',
    star: '星',
    heart: '心',
    thumb: '拇指',
  },
  section: {
    tab: ({ n, total }) => `セクション ${n} / ${total}`,
    untitled: '未タイトルセクション',
    descriptionPlaceholder: '説明 (任意)',
    menu: 'セクションのオプション',
    move: 'セクションを移動',
    duplicate: 'セクションを複製',
    merge: '上のセクションとマージ',
    delete: 'セクションを削除',
    containsLocked: '(ロックされた質問を含む)',
    deleteTitle: '質問とセクションを削除しますか？',
    deleteDescription:
      'セクションを削除すると、それに含まれるすべての質問も削除されます。この操作は元に戻すことができません。',
    deleteHint:
      '質問を保持するには、セクションオプションから "上のセクションとマージ" を選択してください。',
    cancel: 'キャンセル',
    confirmDelete: '削除',
    locked: 'ロックされたセクション',
    expand: 'セクションを編集',
    collapse: 'セクションを閉じる',
  },
  action: {
    after: ({ n }) => `${n} セクション後`,
    continueNext: '次のセクションに進む',
    goTo: ({ n, title }) => `${n} セクションに移動 (${title})`,
    submit: 'フォームを送信',
  },
  reorder: {
    title: 'セクションを移動',
    position: ({ n, total }) => `セクション ${n} / ${total}`,
    save: '保存',
    cancel: 'キャンセル',
  },
  dnd: {
    instructions:
      'スペースキーで項目を持ち上げ、矢印キーで移動し、もう一度スペースキーで置きます。Escape キーで取り消します。',
    pickedUp: ({ label }) => `「${label}」を持ち上げました。`,
    movedOver: ({ label, over }) =>
      `「${label}」を「${over}」の位置に移動しました。`,
    dropped: ({ label, over }) =>
      `「${label}」を「${over}」の位置に置きました。`,
    droppedNowhere: ({ label }) => `「${label}」を元の位置に戻しました。`,
    cancelled: ({ label }) => `「${label}」の移動を取り消しました。`,
  },
  errors: {
    surveyTitle: 'アンケートのタイトルを入力してください',
    sectionTitle: 'セクションのタイトルを入力してください',
    options: 'オプションを1つ以上追加してください',
    optionLabel: 'オプションのラベルを入力してください',
    validationRule: '回答の検証ルールを完成させてください',
    duplicateId: 'IDが重複しています',
    invalid: '入力内容を確認してください',
    missingTarget: '移動先のセクションが見つかりません',
  },
}

const en: CreatorMessages = {
  shell: {
    creatorTab: 'Creator',
    previewTab: 'Preview',
    jsonTab: 'JSON',
    jsonTitle: 'Live JSON output',
    previewSubmitted: 'The preview was submitted.',
    untitledSurvey: 'Untitled survey',
    surveyTitlePlaceholder: 'Survey title',
    surveyDescriptionPlaceholder: 'Form description',
    firstSection: 'First section',
    newSection: ({ n }) => `Section ${n}`,
    copySuffix: ' (Copy)',
  },
  toolbar: {
    label: 'Add items',
    addQuestion: 'Add question',
    addQuestionLocked: 'Questions cannot be added to a locked section',
    importQuestions: 'Import questions (coming soon)',
    addTitle: 'Add title and description (coming soon)',
    addSection: 'Add section',
    addSectionAfterLocked: 'Add a section after the locked section',
  },
  question: {
    placeholder: 'Question',
    newQuestion: 'New question',
    descriptionPlaceholder: 'Description',
    type: 'Question type',
    duplicate: 'Duplicate',
    delete: 'Delete',
    required: 'Required',
    more: 'More options',
    show: 'Show',
    description: 'Description',
    responseValidation: 'Response validation',
    shuffleOptions: 'Shuffle option order',
    branching: 'Go to section based on answer',
    includeTime: 'Include time',
    includeYear: 'Include year',
    answerType: 'Answer type',
    answerTime: 'Time',
    answerDuration: 'Duration',
    locked: 'Locked question',
    dragHandle: 'Drag to reorder',
  },
  kinds: {
    'short-text': 'Short answer',
    'long-text': 'Paragraph',
    'single-choice': 'Multiple choice',
    'multiple-choice': 'Checkboxes',
    dropdown: 'Dropdown',
    'linear-scale': 'Linear scale',
    rating: 'Rating',
    date: 'Date',
    time: 'Time',
  },
  preview: {
    shortText: 'Short answer text',
    longText: 'Long answer text',
    moreOptions: ({ count }) => `+${count} more options`,
    shuffled: ' (shuffled)',
    dateWithYear: 'Month, day, year',
    dateNoYear: 'Month, day',
    time: 'Time',
  },
  rules: {
    type: 'Type...',
    rule: 'Rule...',
    number: 'Number',
    text: 'Text',
    length: 'Length',
    regex: 'Regular expression',
    gt: 'Greater than',
    gte: 'Greater than or equal to',
    lt: 'Less than',
    lte: 'Less than or equal to',
    eq: 'Equal to',
    neq: 'Not equal to',
    between: 'Between',
    notBetween: 'Not between',
    isNumber: 'Is number',
    isWhole: 'Whole number',
    contains: 'Contains',
    notContains: "Doesn't contain",
    isEmail: 'Email address',
    isUrl: 'URL',
    maxLength: 'Maximum character count',
    minLength: 'Minimum character count',
    matches: 'Matches',
    notMatches: "Doesn't match",
    value: 'Value',
    and: 'and',
    customError: 'Custom error text',
    close: 'Close response validation',
    choiceRule: 'Select a rule...',
    atLeast: 'Select at least',
    atMost: 'Select at most',
    exactly: 'Select exactly',
    count: 'Number',
  },
  options: {
    title: 'Options',
    placeholder: ({ n }) => `Option ${n}`,
    add: 'Add option',
    addOther: 'Add "Other"',
    removeOther: 'Remove "Other"',
    other: 'Other',
    goToSection: 'Go to section...',
    defaultNext: 'Default (next section)',
    remove: 'Remove option',
    reorder: 'Drag to reorder options',
  },
  scale: {
    to: 'to',
    labelPlaceholder: 'Label (optional)',
    min: 'Minimum',
    max: 'Maximum',
  },
  rating: {
    levels: 'Levels',
    symbol: 'Symbol',
    star: 'Star',
    heart: 'Heart',
    thumb: 'Thumb',
  },
  section: {
    tab: ({ n, total }) => `Section ${n} of ${total}`,
    untitled: 'Untitled section',
    descriptionPlaceholder: 'Description (optional)',
    menu: 'Section options',
    move: 'Move section',
    duplicate: 'Duplicate section',
    merge: 'Merge with above',
    delete: 'Delete section',
    containsLocked: '(contains locked questions)',
    deleteTitle: 'Delete questions and section?',
    deleteDescription:
      'Deleting a section also deletes all questions it contains. This action cannot be undone.',
    deleteHint:
      'To keep the questions, choose "Merge with above" from the section options instead.',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    locked: 'Locked section',
    expand: 'Edit section',
    collapse: 'Close section',
  },
  action: {
    after: ({ n }) => `After section ${n}`,
    continueNext: 'Continue to next section',
    goTo: ({ n, title }) => `Go to section ${n} (${title})`,
    submit: 'Submit form',
  },
  reorder: {
    title: 'Reorder sections',
    position: ({ n, total }) => `Section ${n} of ${total}`,
    save: 'Save',
    cancel: 'Cancel',
  },
  dnd: {
    instructions:
      'Press Space to pick up an item, use the arrow keys to move it, and press Space again to drop it. Press Escape to cancel.',
    pickedUp: ({ label }) => `Picked up "${label}".`,
    movedOver: ({ label, over }) =>
      `"${label}" moved to the position of "${over}".`,
    dropped: ({ label, over }) =>
      `"${label}" dropped at the position of "${over}".`,
    droppedNowhere: ({ label }) => `"${label}" returned to its place.`,
    cancelled: ({ label }) => `Moving "${label}" was cancelled.`,
  },
  errors: {
    surveyTitle: 'Enter a survey title',
    sectionTitle: 'Enter a section title',
    options: 'Add at least one option',
    optionLabel: 'Enter a label for every option',
    validationRule: 'Complete the response validation rule',
    duplicateId: 'This id is used twice',
    invalid: 'Check this item',
    missingTarget: 'The target section no longer exists',
  },
}

export const creatorMessages = defineMessages('surveyCreator', { ja, en })
```

`src/creator/state/validate.ts`:

```ts
import { SurveySchema, type Survey } from '../../schema/survey-schema'
import { isSection } from './items'
import { TITLE_ID } from './types'

export type CreatorIssueKey =
  | 'surveyTitle'
  | 'sectionTitle'
  | 'options'
  | 'optionLabel'
  | 'validationRule'
  | 'duplicateId'
  | 'invalid'

export type DraftReport = {
  valid: boolean
  data?: Survey
  /** By item id, or `TITLE_ID` for the title card. */
  errors: Record<string, CreatorIssueKey[]>
  warnings: Record<string, 'missingTarget'[]>
}

type Path = readonly PropertyKey[]

function issueKey(path: Path, code: string): CreatorIssueKey {
  const [, , field, , optionField] = path
  if (path.length === 1 && path[0] === 'title') return 'surveyTitle'
  if (field === 'title') return 'sectionTitle'
  if (field === 'id' && code === 'custom') return 'duplicateId'
  if (field === 'options')
    return optionField === undefined ? 'options' : 'optionLabel'
  if (field === 'validation') return 'validationRule'
  return 'invalid'
}

function add<K extends string>(map: Record<string, K[]>, id: string, key: K) {
  const list = (map[id] ??= [])
  if (!list.includes(key)) list.push(key)
}

/**
 * Runs the real schema so "valid" means "SurveyForm and the backend accept
 * it"; issues are reported on the card that owns them. Branch targets that
 * no longer exist are warnings: the form falls back to the next section.
 */
export function validateDraft(survey: Survey): DraftReport {
  const errors: Record<string, CreatorIssueKey[]> = {}
  const warnings: Record<string, 'missingTarget'[]> = {}

  const result = SurveySchema.safeParse(survey)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const [root, index] = issue.path
      const owner =
        root === 'items' && typeof index === 'number'
          ? survey.items[index]?.id
          : TITLE_ID
      add(errors, owner ?? TITLE_ID, issueKey(issue.path, issue.code))
    }
  }

  const sectionIds = new Set(survey.items.filter(isSection).map((s) => s.id))
  for (const item of survey.items) {
    if (isSection(item)) {
      if (
        item.action?.type === 'jump' &&
        !sectionIds.has(item.action.targetSectionId)
      ) {
        add(warnings, item.id, 'missingTarget')
      }
    } else if (item.type === 'single-choice' || item.type === 'dropdown') {
      if (
        item.options.some(
          (o) => o.nextSectionId && !sectionIds.has(o.nextSectionId)
        )
      ) {
        add(warnings, item.id, 'missingTarget')
      }
    }
  }

  return result.success
    ? { valid: true, data: result.data, errors, warnings }
    : { valid: false, errors, warnings }
}
```

`src/creator/state/store.ts`:

```ts
'use client'

import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { creatorReducer, type CreatorAction } from './reducer'
import type { CreatorState } from './types'

export type CreatorStore = {
  getState(): CreatorState
  dispatch(action: CreatorAction): void
  subscribe(listener: () => void): () => void
}

export type CreatorStoreOptions = {
  /** Called after every action that changed the state. */
  onChange?: (
    next: CreatorState,
    previous: CreatorState,
    action: CreatorAction
  ) => void
}

export function createCreatorStore(
  initial: CreatorState,
  options: CreatorStoreOptions = {}
): CreatorStore {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    dispatch(action) {
      const previous = state
      const next = creatorReducer(previous, action)
      if (next === previous) return
      state = next
      listeners.forEach((listener) => listener())
      options.onChange?.(next, previous, action)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const CreatorStoreContext = createContext<CreatorStore | null>(null)

export function CreatorStoreProvider({
  store,
  children,
}: {
  store: CreatorStore
  children?: ReactNode
}) {
  return createElement(CreatorStoreContext.Provider, { value: store }, children)
}

export function useCreatorStore(): CreatorStore {
  const store = useContext(CreatorStoreContext)
  if (!store)
    throw new Error(
      'Creator components must be rendered inside CreatorStoreProvider.'
    )
  return store
}

/** `selector` must return stored objects or primitives, so unchanged cards skip rendering. */
export function useCreatorSelector<T>(selector: (state: CreatorState) => T): T {
  const store = useCreatorStore()
  const read = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, read, read)
}
```

Append to `src/index.ts`:

```ts
export {
  creatorMessages,
  type CreatorMessages,
} from './creator/i18n/creator-messages'
```

- [ ] **Step 4: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web src/creator/state`
Expected: PASS — Task 1's 35 plus 4 + 4 = 43 tests. If the duplicate-id test reports the issue on the first `dup` item, check the path SP4's `superRefine` reports (`['items', index, 'id']` of the second occurrence) — the test pins v0's refinement.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add creator messages, draft validation and the creator store

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Question types list and read-only previews

**Files:**

- Create: `src/creator/question/type-options.tsx`, `src/creator/question/question-preview.tsx`, `question-preview.test.tsx`, `test/v0-creator-classes.ts`

**Interfaces:**

- Consumes: `creatorMessages` (Task 2), ui-web `Select*`, `inputVariants`, `cn`, `useMessages`.
- Produces:
  - `KIND_GROUPS: readonly (readonly QuestionKind[])[]` (v0's four groups), `KIND_ICONS: Record<QuestionKind, LucideIcon>`, `TypeSelect({ value, onChange, disabled? })` (v0's 220px select with icons, groups and separators; trigger named by `t.question.type`).
  - `QuestionPreview({ question })` — v0's view-mode previews for the nine kinds; contains no focusable or form elements (it sits inside the card's select button).
  - `V0C` (v0 creator class strings, rulings applied) in `test/v0-creator-classes.ts`, used by Tasks 3–7.

- [ ] **Step 1: Write the class fixture and the failing test**

`test/v0-creator-classes.ts`:

```ts
/** v0 creator class strings (Tailwind v4 reading; space-* → gap-*, flex-grow → grow, border colours stated). */
export const V0C = {
  // question-creator.tsx
  'question.selected':
    'rounded-lg border transition-all border-primary bg-card shadow-lg',
  'question.idle':
    'rounded-lg border transition-all hover:bg-muted/50 border-transparent bg-white',
  'question.view': 'relative cursor-pointer p-6',
  'question.label-input':
    'h-12 grow rounded-none border-0 border-b px-1 text-lg font-semibold shadow-none focus-visible:ring-0',
  'question.footer': 'flex items-center justify-end gap-2',
  // previews
  'preview.list': 'flex flex-col gap-2',
  'preview.row': 'flex items-center gap-3',
  'preview.radio': 'border-muted-foreground h-4 w-4 rounded-full border',
  'preview.checkbox': 'border-muted-foreground h-4 w-4 rounded-sm border',
  'preview.short':
    'text-muted-foreground pointer-events-none w-1/2 border-b border-dashed border-border text-sm',
  'preview.long':
    'text-muted-foreground pointer-events-none min-h-[80px] w-full rounded border border-dashed border-border p-3 text-sm',
  // section-header-creator.tsx
  'section.tab':
    'bg-primary text-primary-foreground absolute -top-1 left-0 z-10 rounded-md rounded-b-none px-3 py-1 text-xs font-semibold',
  'section.view':
    'bg-card cursor-pointer rounded-lg rounded-tl-none border border-border p-6 shadow-sm',
  // survey-creator.tsx title card
  'title.selected':
    'cursor-pointer rounded-lg border-l-8 p-6 border-primary bg-card shadow-lg',
  'title.idle':
    'cursor-pointer rounded-lg border-l-8 p-6 bg-muted/30 border-gray-300',
} as const

export function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

export const v0c = (key: keyof typeof V0C) => V0C[key].split(' ').sort()
```

`src/creator/question/question-preview.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { classesOf, v0c } from '../../../test/v0-creator-classes'
import type { SurveyQuestion } from '../../schema/survey-schema'
import { QuestionPreview } from './question-preview'

const preview = (question: SurveyQuestion) =>
  render(<QuestionPreview question={question} />)

const options = ['A', 'B', 'C', 'D', 'E'].map((label) => ({
  value: label,
  label,
}))

describe('QuestionPreview', () => {
  it('shows the short and long answer placeholders', () => {
    preview({ id: 'q', type: 'short-text', label: 'Q' })
    expect(classesOf(screen.getByText('短文回答'))).toEqual(
      v0c('preview.short')
    )
    preview({ id: 'q', type: 'long-text', label: 'Q' })
    expect(classesOf(screen.getByText('長文回答 (段落)'))).toEqual(
      v0c('preview.long')
    )
  })

  it('lists three choices, the rest as a count, and "Other" last', () => {
    preview({
      id: 'q',
      type: 'single-choice',
      label: 'Q',
      options: [...options, { value: 'other', label: 'その他', isOther: true }],
      validation: { shuffleOptions: true },
    })
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.queryByText('D')).toBeNull()
    expect(
      screen.getByText('+2 個の追加オプション (シャッフル)')
    ).toBeInTheDocument()
    const row = screen.getByText('その他').parentElement
    expect(classesOf(row)).toEqual(v0c('preview.row'))
    expect(classesOf(row?.firstElementChild ?? null)).toEqual(
      v0c('preview.radio')
    )
  })

  it('draws checkbox squares for multiple choice and numbers for dropdowns', () => {
    preview({
      id: 'q',
      type: 'multiple-choice',
      label: 'Q',
      options: options.slice(0, 1),
    })
    expect(classesOf(screen.getByText('A').previousElementSibling)).toEqual(
      v0c('preview.checkbox')
    )
    preview({ id: 'q2', type: 'dropdown', label: 'Q', options })
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('+2 個の追加オプション')).toBeInTheDocument()
  })

  it('shows the scale, rating, date and time shapes', () => {
    const { container } = preview({
      id: 'q',
      type: 'linear-scale',
      label: 'Q',
      min: 0,
      max: 3,
      minLabel: '低',
      maxLabel: '高',
    })
    expect(screen.getByText('低')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    container.remove()

    const rating = preview({
      id: 'q',
      type: 'rating',
      label: 'Q',
      levels: 4,
      symbol: 'heart',
    })
    expect(rating.container.querySelectorAll('svg')).toHaveLength(4)
    rating.container.remove()

    preview({
      id: 'q',
      type: 'date',
      label: 'Q',
      includeTime: true,
      includeYear: false,
    })
    expect(screen.getByText('年月')).toBeInTheDocument()
    expect(screen.getByText('時間')).toBeInTheDocument()

    preview({ id: 'q', type: 'time', label: 'Q', answerType: 'duration' })
    expect(screen.getByText('期間')).toBeInTheDocument()
  })

  it('contains nothing focusable', () => {
    const { container } = preview({
      id: 'q',
      type: 'date',
      label: 'Q',
      includeTime: true,
      includeYear: true,
    })
    expect(
      container.querySelectorAll('input, button, select, textarea, [tabindex]')
    ).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web question-preview`
Expected: FAIL — cannot resolve `./question-preview`.

- [ ] **Step 3: Implement**

`src/creator/question/type-options.tsx`:

```tsx
'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  AlignLeft,
  BarChartHorizontal,
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  Clock,
  Minus,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Fragment } from 'react'

import type { QuestionKind } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

export const KIND_GROUPS: readonly (readonly QuestionKind[])[] = [
  ['short-text', 'long-text'],
  ['single-choice', 'multiple-choice', 'dropdown'],
  ['linear-scale', 'rating'],
  ['date', 'time'],
]

export const KIND_ICONS: Record<QuestionKind, LucideIcon> = {
  'short-text': Minus,
  'long-text': AlignLeft,
  'single-choice': CircleDot,
  'multiple-choice': CheckSquare,
  dropdown: ChevronDownSquare,
  'linear-scale': BarChartHorizontal,
  rating: Star,
  date: Calendar,
  time: Clock,
}

export function TypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: QuestionKind
  onChange: (kind: QuestionKind) => void
  disabled?: boolean
}) {
  const t = useMessages(creatorMessages)
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as QuestionKind)}
      disabled={disabled}
    >
      <SelectTrigger className="mbc:w-[220px]" aria-label={t.question.type}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {KIND_GROUPS.map((group, index) => (
          <Fragment key={group[0]}>
            {index > 0 && <SelectSeparator />}
            <SelectGroup>
              {group.map((kind) => {
                const Icon = KIND_ICONS[kind]
                return (
                  <SelectItem key={kind} value={kind}>
                    <div className="mbc:flex mbc:items-center mbc:gap-2">
                      <Icon aria-hidden className="mbc:h-4 mbc:w-4" />{' '}
                      {t.kinds[kind]}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectGroup>
          </Fragment>
        ))}
      </SelectContent>
    </Select>
  )
}
```

`src/creator/question/question-preview.tsx`:

```tsx
'use client'

import { cn, inputVariants, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { Calendar, Clock, Heart, Star, ThumbsUp } from 'lucide-react'

import type { QuestionOption, SurveyQuestion } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

const MUTED_SM = 'mbc:text-muted-foreground mbc:text-sm'
const RADIO =
  'mbc:border-muted-foreground mbc:h-4 mbc:w-4 mbc:rounded-full mbc:border'
const CHECKBOX =
  'mbc:border-muted-foreground mbc:h-4 mbc:w-4 mbc:rounded-sm mbc:border'
/** Looks like v0's disabled `<Input>` but is not a form control (the card is a button). */
const FAKE_INPUT = cn(
  inputVariants(),
  'mbc:items-center mbc:border-0 mbc:border-b mbc:shadow-none mbc:opacity-50 mbc:text-[#545454]'
)
const SYMBOLS = { star: Star, heart: Heart, thumb: ThumbsUp } as const

function ChoiceList({
  options,
  shuffled,
  marker,
}: {
  options: readonly QuestionOption[]
  shuffled: boolean
  marker: string
}) {
  const t = useMessages(creatorMessages)
  const regular = options.filter((option) => !option.isOther)
  const other = options.find((option) => option.isOther)
  const rest = regular.length - Math.min(3, regular.length)
  const row = (option: QuestionOption, key: string | number) => (
    <div key={key} className="mbc:flex mbc:items-center mbc:gap-3">
      <div className={marker} />
      <p className="mbc:text-muted-foreground">{option.label}</p>
    </div>
  )
  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-2">
      {regular.slice(0, 3).map(row)}
      {rest > 0 && (
        <p className={MUTED_SM}>
          {t.preview.moreOptions({ count: rest })}
          {shuffled && t.preview.shuffled}
        </p>
      )}
      {other && row(other, 'other')}
    </div>
  )
}

function FakeField({
  text,
  icon: Icon,
}: {
  text: string
  icon: typeof Calendar
}) {
  return (
    <div className="mbc:flex mbc:items-center mbc:gap-2">
      <div className={FAKE_INPUT}>{text}</div>
      <Icon
        aria-hidden
        className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
      />
    </div>
  )
}

/** v0's view-mode previews (shapes only; nothing focusable). */
export function QuestionPreview({ question }: { question: SurveyQuestion }) {
  const t = useMessages(creatorMessages)
  switch (question.type) {
    case 'short-text':
      return (
        <p className="mbc:text-muted-foreground mbc:pointer-events-none mbc:w-1/2 mbc:border-b mbc:border-dashed mbc:border-border mbc:text-sm">
          {t.preview.shortText}
        </p>
      )
    case 'long-text':
      return (
        <div className="mbc:text-muted-foreground mbc:pointer-events-none mbc:min-h-[80px] mbc:w-full mbc:rounded mbc:border mbc:border-dashed mbc:border-border mbc:p-3 mbc:text-sm">
          {t.preview.longText}
        </div>
      )
    case 'single-choice':
    case 'multiple-choice':
      return (
        <ChoiceList
          options={question.options}
          shuffled={question.validation?.shuffleOptions === true}
          marker={question.type === 'single-choice' ? RADIO : CHECKBOX}
        />
      )
    case 'dropdown': {
      const rest = question.options.length - 3
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:flex-col mbc:gap-2">
          {question.options.slice(0, 3).map((option, index) => (
            <div
              key={index}
              className="mbc:text-muted-foreground mbc:flex mbc:items-center mbc:gap-2"
            >
              <span>{index + 1}.</span>
              <p>{option.label}</p>
            </div>
          ))}
          {rest > 0 && (
            <p className={MUTED_SM}>
              {t.preview.moreOptions({ count: rest })}
              {question.validation?.shuffleOptions && t.preview.shuffled}
            </p>
          )}
        </div>
      )
    }
    case 'linear-scale': {
      const min = question.min ?? 1
      const max = question.max ?? 5
      const numbers = Array.from(
        { length: Math.max(0, max - min + 1) },
        (_, i) => min + i
      )
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:gap-4">
          <span
            className={cn(MUTED_SM, 'mbc:w-1/12 mbc:shrink-0 mbc:text-center')}
          >
            {question.minLabel}
          </span>
          <div className="mbc:flex mbc:grow mbc:justify-around">
            {numbers.map((num) => (
              <div
                key={num}
                className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
              >
                <span className={MUTED_SM}>{num}</span>
                <div className={RADIO} />
              </div>
            ))}
          </div>
          <span
            className={cn(MUTED_SM, 'mbc:w-1/12 mbc:shrink-0 mbc:text-center')}
          >
            {question.maxLabel}
          </span>
        </div>
      )
    }
    case 'rating': {
      const Icon = SYMBOLS[question.symbol] ?? Star
      const levels = Array.from(
        { length: question.levels || 5 },
        (_, i) => i + 1
      )
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:gap-4">
          <div className="mbc:flex mbc:grow mbc:justify-around">
            {levels.map((num) => (
              <div
                key={num}
                className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
              >
                <span className={MUTED_SM}>{num}</span>
                <Icon
                  aria-hidden
                  className="mbc:text-muted-foreground mbc:h-6 mbc:w-6"
                />
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'date':
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:max-w-[250px] mbc:flex-col mbc:gap-2 mbc:px-1 mbc:pt-4">
          <FakeField
            text={
              question.includeYear === false
                ? t.preview.dateNoYear
                : t.preview.dateWithYear
            }
            icon={Calendar}
          />
          {question.includeTime && (
            <FakeField text={t.preview.time} icon={Clock} />
          )}
        </div>
      )
    case 'time':
      return (
        <div className="mbc:pointer-events-none mbc:flex mbc:w-1/2 mbc:items-center mbc:gap-2">
          <FakeField
            text={
              question.answerType === 'duration'
                ? t.question.answerDuration
                : t.question.answerTime
            }
            icon={Clock}
          />
        </div>
      )
  }
}
```

- [ ] **Step 4: Run it to verify it passes, typecheck, lint, commit**

Run: `$N pnpm vitest run --project survey-web question-preview && $N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: PASS — 5 tests; exit 0. (`'年月'` for a no-year date is v0's text; `dateNoYear` keeps it.)

```bash
git add -A
git commit -m "feat(survey-web): add question type list and creator previews

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Per-kind editors

**Files:**

- Create: `src/creator/question/text-validation.tsx`, `choice-validation.tsx`, `options-editor.tsx`, `scale-editors.tsx`, `editors.test.tsx`
- Modify: `packages/survey-web/package.json` (dnd-kit)

**Interfaces:**

- Consumes: `creatorMessages`, ui-web `Button`, `Input`, `Label`, `Select*`, `useMessages`; `QuestionPreview` pieces are not reused (editors render their own v0 markup).
- Produces (all controlled: `{ question, onChange(next) }`, no store access):
  - `ShortTextEditor`, `LongTextEditor` — v0's dashed placeholder and, when `question.validation.custom` exists, the rule builder (closing it removes `custom`).
  - `ChoiceCountEditor` — v0's multiple-choice count rule builder (shown when `custom` exists).
  - `OptionsEditor({ question, onChange, showBranching, sections })` — sortable options (pointer + keyboard, kept inside the list), `value` mirrors `label`, "Other" kept last and not draggable, "Add option", "Add/Remove Other" (single/multiple), per-option branch select when `showBranching` (single/dropdown); `sections: readonly { id: string; title: string }[]`.
  - `LinearScaleEditor`, `RatingEditor`, `DateEditor`, `TimeEditor` — v0's controls and placeholders.
  - `DEFAULT_RULES` (v0's rule when "Response validation" is switched on): short-text `{ type: 'number', rule: 'eq' }`, long-text `{ type: 'length', rule: 'min' }`, multiple-choice `{ rule: 'min', value: 1 }`.

- [ ] **Step 1: Add dnd-kit**

```bash
$N pnpm --filter @mbc-cqrs-serverless/survey-web add @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/modifiers@^9.0.0 @dnd-kit/utilities@^3.2.2
```

- [ ] **Step 2: Write the failing test `src/creator/question/editors.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import type {
  LinearScaleQuestion,
  LongTextQuestion,
  MultipleChoiceQuestion,
  RatingQuestion,
  ShortTextQuestion,
  SingleChoiceQuestion,
  SurveyQuestion,
} from '../../schema/survey-schema'
import { ChoiceCountEditor } from './choice-validation'
import { OptionsEditor } from './options-editor'
import { LinearScaleEditor, RatingEditor } from './scale-editors'
import { LongTextEditor, ShortTextEditor } from './text-validation'

/** Renders an editor with real state and prints the question as JSON. */
function Harness<Q extends SurveyQuestion>({
  initial,
  editor,
}: {
  initial: Q
  editor: (question: Q, onChange: (next: Q) => void) => ReactElement
}) {
  const [question, setQuestion] = useState(initial)
  return (
    <>
      {editor(question, setQuestion)}
      <output>{JSON.stringify(question)}</output>
    </>
  )
}
const stored = () => JSON.parse(screen.getByRole('status').textContent ?? '{}')

describe('text editors', () => {
  it('builds a number rule with two bounds, then removes it', async () => {
    const initial: ShortTextQuestion = {
      id: 'q',
      type: 'short-text',
      label: 'Q',
      validation: { required: false, custom: { type: 'number', rule: 'eq' } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <ShortTextEditor question={q} onChange={set} />}
      />
    )
    expect(screen.getByText('短文回答')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('combobox', { name: 'ルール...' }))
    await userEvent.click(await screen.findByRole('option', { name: '範囲内' }))
    await userEvent.type(screen.getByPlaceholderText('値'), '1')
    await userEvent.type(screen.getByPlaceholderText('かつ'), '9')
    await userEvent.type(
      screen.getByPlaceholderText('カスタムエラーテキスト'),
      'NG'
    )
    expect(stored().validation.custom).toEqual({
      type: 'number',
      rule: 'between',
      value: 1,
      value2: 9,
      customError: 'NG',
    })

    await userEvent.click(
      screen.getByRole('button', { name: '回答の検証を閉じる' })
    )
    expect(stored().validation).toEqual({ required: false })
  })

  it('switching the rule type resets the rule and the value (v0)', async () => {
    const initial: ShortTextQuestion = {
      id: 'q',
      type: 'short-text',
      label: 'Q',
      validation: { custom: { type: 'number', rule: 'gt', value: 3 } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <ShortTextEditor question={q} onChange={set} />}
      />
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'タイプ...' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'テキスト' })
    )
    expect(stored().validation.custom).toEqual({
      type: 'text',
      rule: 'contains',
    })
    await userEvent.click(screen.getByRole('combobox', { name: 'ルール...' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'メールアドレス' })
    )
    expect(screen.queryByPlaceholderText('値')).toBeNull()
  })

  it('offers only length and regex rules for long text', async () => {
    const initial: LongTextQuestion = {
      id: 'q',
      type: 'long-text',
      label: 'Q',
      validation: { custom: { type: 'length', rule: 'min', value: 0 } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <LongTextEditor question={q} onChange={set} />}
      />
    )
    expect(screen.getByText('長文回答 (段落)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'タイプ...' }))
    expect(
      (await screen.findAllByRole('option')).map((o) => o.textContent)
    ).toEqual(['長さ', '正規表現'])
  })

  it('edits the choice-count rule', async () => {
    const initial: MultipleChoiceQuestion = {
      id: 'q',
      type: 'multiple-choice',
      label: 'Q',
      options: [{ value: 'a', label: 'a' }],
      validation: { custom: { rule: 'min', value: 1 } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <ChoiceCountEditor question={q} onChange={set} />}
      />
    )
    const count = screen.getByPlaceholderText('数値')
    await userEvent.clear(count)
    await userEvent.type(count, '2')
    expect(stored().validation.custom).toEqual({ rule: 'min', value: 2 })
  })
})

describe('OptionsEditor', () => {
  const single: SingleChoiceQuestion = {
    id: 'q',
    type: 'single-choice',
    label: 'Q',
    options: [{ value: 'オプション 1', label: 'オプション 1' }],
  }
  const sections = [
    { id: 'sec_1', title: 'One' },
    { id: 'sec_2', title: '' },
  ]

  it('mirrors the label into the value, adds options and "Other" (kept last)', async () => {
    render(
      <Harness
        initial={single}
        editor={(q, set) => (
          <OptionsEditor
            question={q}
            onChange={set}
            showBranching={false}
            sections={sections}
          />
        )}
      />
    )
    const first = screen.getByDisplayValue('オプション 1')
    await userEvent.clear(first)
    await userEvent.type(first, '赤')
    await userEvent.click(screen.getByRole('button', { name: 'その他を追加' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'オプションを追加' })
    )

    expect(stored().options).toEqual([
      { value: '赤', label: '赤' },
      { value: 'オプション 2', label: 'オプション 2' },
      { value: 'other', label: 'その他', isOther: true },
    ])
    expect(screen.getByDisplayValue('その他')).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'その他を削除' }))
    expect(stored().options).toHaveLength(2)
  })

  it('removes an option and sets a branch target per option', async () => {
    const two: SingleChoiceQuestion = {
      ...single,
      options: [
        { value: 'a', label: 'a' },
        { value: 'b', label: 'b' },
      ],
    }
    render(
      <Harness
        initial={two}
        editor={(q, set) => (
          <OptionsEditor
            question={q}
            onChange={set}
            showBranching
            sections={sections}
          />
        )}
      />
    )
    const [firstTarget] = screen.getAllByRole('combobox', {
      name: 'セクションに移動...',
    })
    await userEvent.click(firstTarget!)
    await userEvent.click(
      await screen.findByRole('option', { name: '未タイトルセクション' })
    )
    expect(stored().options[0]).toEqual({
      value: 'a',
      label: 'a',
      nextSectionId: 'sec_2',
    })

    await userEvent.click(
      screen.getAllByRole('button', { name: 'オプションを削除' })[1]!
    )
    expect(stored().options).toEqual([
      { value: 'a', label: 'a', nextSectionId: 'sec_2' },
    ])
  })

  it('reorders options from the keyboard', async () => {
    const three: SingleChoiceQuestion = {
      ...single,
      options: ['a', 'b', 'c'].map((v) => ({ value: v, label: v })),
    }
    const { container } = render(
      <Harness
        initial={three}
        editor={(q, set) => (
          <OptionsEditor
            question={q}
            onChange={set}
            showBranching={false}
            sections={sections}
          />
        )}
      />
    )
    stackRects(container, '[data-option-row]')
    const [handleA] = screen.getAllByRole('button', {
      name: 'ドラッグしてオプションを並べ替え',
    })
    handleA!.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard(' ')
    expect(stored().options.map((o: { value: string }) => o.value)).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('has no "Other" button for dropdowns', () => {
    const dropdown = { ...single, type: 'dropdown' as const }
    render(
      <OptionsEditor
        question={dropdown}
        onChange={() => {}}
        showBranching={false}
        sections={sections}
      />
    )
    expect(screen.queryByRole('button', { name: 'その他を追加' })).toBeNull()
  })
})

describe('scale editors', () => {
  it('sets the linear scale bounds and end labels', async () => {
    const initial: LinearScaleQuestion = {
      id: 'q',
      type: 'linear-scale',
      label: 'Q',
      min: 1,
      max: 5,
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <LinearScaleEditor question={q} onChange={set} />}
      />
    )
    await userEvent.click(screen.getByRole('combobox', { name: '最小値' }))
    await userEvent.click(await screen.findByRole('option', { name: '0' }))
    await userEvent.click(screen.getByRole('combobox', { name: '最大値' }))
    await userEvent.click(await screen.findByRole('option', { name: '10' }))
    const [minLabel] = screen.getAllByPlaceholderText('ラベル（任意)')
    await userEvent.type(minLabel!, '低い')
    expect(stored()).toMatchObject({ min: 0, max: 10, minLabel: '低い' })
  })

  it('sets the rating levels and symbol', async () => {
    const initial: RatingQuestion = {
      id: 'q',
      type: 'rating',
      label: 'Q',
      levels: 5,
      symbol: 'star',
    }
    const { container } = render(
      <Harness
        initial={initial}
        editor={(q, set) => <RatingEditor question={q} onChange={set} />}
      />
    )
    await userEvent.click(screen.getByRole('combobox', { name: '段階数' }))
    await userEvent.click(await screen.findByRole('option', { name: '3' }))
    await userEvent.click(screen.getByRole('combobox', { name: '記号' }))
    await userEvent.click(await screen.findByRole('option', { name: '心' }))
    expect(stored()).toMatchObject({ levels: 3, symbol: 'heart' })
    expect(container.querySelectorAll('svg[class~="mbc:h-6"]')).toHaveLength(3)
  })
})

/**
 * jsdom has no layout: give rows stacked rects (and their list a rect that
 * holds them, for restrictToParentElement) so dnd-kit's keyboard sensor can
 * move between them.
 */
function stackRects(container: HTMLElement, selector: string) {
  const rect = (top: number, height: number) =>
    ({
      x: 0,
      y: top,
      top,
      left: 0,
      bottom: top + height,
      right: 300,
      width: 300,
      height,
      toJSON: () => ({}),
    }) as DOMRect
  const rows = () => [...container.querySelectorAll<HTMLElement>(selector)]
  for (const row of rows()) {
    row.getBoundingClientRect = () => rect(rows().indexOf(row) * 50, 40)
    if (row.parentElement)
      row.parentElement.getBoundingClientRect = () =>
        rect(0, rows().length * 50)
  }
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web src/creator/question/editors`
Expected: FAIL — cannot resolve `./choice-validation` (and the other editors).

- [ ] **Step 4: Implement**

`src/creator/question/text-validation.tsx`:

```tsx
'use client'

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { X } from 'lucide-react'

import type {
  LongTextQuestion,
  ShortTextQuestion,
} from '../../schema/survey-schema'
import { creatorMessages, type CreatorMessages } from '../i18n/creator-messages'

/** v0's rule when "Response validation" is switched on. */
export const DEFAULT_RULES = {
  'short-text': { type: 'number', rule: 'eq' },
  'long-text': { type: 'length', rule: 'min' },
  'multiple-choice': { rule: 'min', value: 1 },
} as const

type DraftRule = {
  type?: string
  rule?: string
  value?: string | number
  value2?: number
  customError?: string
}

type RuleKey = keyof CreatorMessages['rules']

const RULES: Record<string, readonly [string, RuleKey][]> = {
  number: [
    ['gt', 'gt'],
    ['gte', 'gte'],
    ['lt', 'lt'],
    ['lte', 'lte'],
    ['eq', 'eq'],
    ['neq', 'neq'],
    ['between', 'between'],
    ['not_between', 'notBetween'],
    ['is_number', 'isNumber'],
    ['is_whole', 'isWhole'],
  ],
  text: [
    ['contains', 'contains'],
    ['not_contains', 'notContains'],
    ['is_email', 'isEmail'],
    ['is_url', 'isUrl'],
  ],
  length: [
    ['max', 'maxLength'],
    ['min', 'minLength'],
  ],
  regex: [
    ['contains', 'contains'],
    ['not_contains', 'notContains'],
    ['matches', 'matches'],
    ['not_matches', 'notMatches'],
  ],
}

const DEFAULT_RULE: Record<string, string> = {
  number: 'eq',
  text: 'contains',
  length: 'min',
  regex: 'matches',
}
const NO_VALUE = ['is_number', 'is_whole', 'is_email', 'is_url']
const UNDERLINE =
  'mbc:rounded-none mbc:border-0 mbc:border-b mbc:px-1 mbc:text-xs mbc:shadow-none mbc:placeholder:text-xs mbc:focus-visible:ring-0'

const toNumber = (text: string) => {
  if (text === '') return undefined
  const num = Number(text)
  return Number.isNaN(num) ? undefined : num
}

function RuleBuilder({
  rule,
  types,
  onChange,
  onClose,
}: {
  rule: DraftRule
  types: readonly ('number' | 'text' | 'length' | 'regex')[]
  onChange: (next: DraftRule) => void
  onClose: () => void
}) {
  const t = useMessages(creatorMessages)
  const numeric = rule.type === 'number' || rule.type === 'length'
  const needsValue = Boolean(rule.rule) && !NO_VALUE.includes(rule.rule ?? '')
  const needsTwo = rule.rule === 'between' || rule.rule === 'not_between'
  const drop = (key: 'value' | 'value2', value: unknown) => {
    const next = { ...rule, [key]: value }
    if (value === undefined) delete next[key]
    onChange(next)
  }

  return (
    <div className="mbc:mt-4 mbc:p-3">
      <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-2">
        <div className="mbc:flex mbc:w-full mbc:grow mbc:gap-2 mbc:sm:w-auto mbc:sm:grow-0">
          <Select
            value={rule.type}
            onValueChange={(type) => {
              const { customError } = rule
              onChange({
                type,
                rule: DEFAULT_RULE[type],
                ...(customError !== undefined && { customError }),
              })
            }}
          >
            <SelectTrigger
              size="xs"
              className="mbc:w-[120px] mbc:border-0"
              aria-label={t.rules.type}
            >
              <SelectValue placeholder={t.rules.type} />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type} value={type} className="mbc:text-xs">
                  {t.rules[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={rule.rule}
            onValueChange={(next) => onChange({ ...rule, rule: next })}
            disabled={!rule.type}
          >
            <SelectTrigger
              size="xs"
              className="mbc:w-[180px] mbc:border-0"
              aria-label={t.rules.rule}
            >
              <SelectValue placeholder={t.rules.rule} />
            </SelectTrigger>
            <SelectContent>
              {(RULES[rule.type ?? ''] ?? []).map(([value, key]) => (
                <SelectItem key={value} value={value} className="mbc:text-xs">
                  {t.rules[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsValue && (
          <div className="mbc:flex mbc:grow mbc:items-center mbc:gap-2">
            <Input
              type={numeric ? 'number' : 'text'}
              placeholder={t.rules.value}
              className={`mbc:min-w-[80px] mbc:grow ${UNDERLINE}`}
              value={rule.value ?? ''}
              onChange={(event) =>
                drop(
                  'value',
                  numeric ? toNumber(event.target.value) : event.target.value
                )
              }
            />
            {needsTwo && (
              <>
                ~
                <Input
                  type="number"
                  placeholder={t.rules.and}
                  className={`mbc:min-w-[80px] mbc:grow ${UNDERLINE}`}
                  value={rule.value2 ?? ''}
                  onChange={(event) =>
                    drop('value2', toNumber(event.target.value))
                  }
                />
              </>
            )}
          </div>
        )}
        <div className="mbc:flex mbc:w-full mbc:grow mbc:gap-2 mbc:sm:w-auto">
          <Input
            placeholder={t.rules.customError}
            className={`mbc:grow ${UNDERLINE}`}
            value={rule.customError ?? ''}
            onChange={(event) =>
              onChange({ ...rule, customError: event.target.value })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mbc:shrink-0"
            aria-label={t.rules.close}
            onClick={onClose}
          >
            <X aria-hidden className="mbc:h-4 mbc:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function withoutCustom<Q extends ShortTextQuestion | LongTextQuestion>(
  question: Q
): Q {
  const { custom: _custom, ...validation } = question.validation ?? {}
  return { ...question, validation }
}

export function ShortTextEditor({
  question,
  onChange,
}: {
  question: ShortTextQuestion
  onChange: (next: ShortTextQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const custom = question.validation?.custom
  return (
    <>
      <div className="mbc:px-1 mbc:pt-4">
        <p className="mbc:text-muted-foreground mbc:pointer-events-none mbc:w-1/2 mbc:border-b mbc:border-dashed mbc:border-border mbc:text-sm">
          {t.preview.shortText}
        </p>
      </div>
      {custom && (
        <RuleBuilder
          rule={custom as DraftRule}
          types={['number', 'text', 'length', 'regex']}
          onChange={(next) =>
            onChange({
              ...question,
              validation: {
                ...question.validation,
                custom: next as NonNullable<typeof custom>,
              },
            })
          }
          onClose={() => onChange(withoutCustom(question))}
        />
      )}
    </>
  )
}

export function LongTextEditor({
  question,
  onChange,
}: {
  question: LongTextQuestion
  onChange: (next: LongTextQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const custom = question.validation?.custom
  return (
    <>
      <div className="mbc:px-1 mbc:pt-4">
        <div className="mbc:text-muted-foreground mbc:pointer-events-none mbc:min-h-[80px] mbc:w-full mbc:rounded mbc:border mbc:border-dashed mbc:border-border mbc:p-3 mbc:text-sm">
          {t.preview.longText}
        </div>
      </div>
      {custom && (
        <RuleBuilder
          rule={custom as DraftRule}
          types={['length', 'regex']}
          onChange={(next) =>
            onChange({
              ...question,
              validation: {
                ...question.validation,
                custom: next as NonNullable<typeof custom>,
              },
            })
          }
          onClose={() => onChange(withoutCustom(question))}
        />
      )}
    </>
  )
}
```

`src/creator/question/choice-validation.tsx`:

```tsx
'use client'

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { X } from 'lucide-react'

import type { MultipleChoiceQuestion } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

const UNDERLINE =
  'mbc:grow mbc:rounded-none mbc:border-0 mbc:border-b mbc:px-1 mbc:text-xs mbc:shadow-none mbc:placeholder:text-xs mbc:focus-visible:ring-0'

type CountRule = NonNullable<
  NonNullable<MultipleChoiceQuestion['validation']>['custom']
>

/** v0's multiple-choice rule: select at least / at most / exactly N. */
export function ChoiceCountEditor({
  question,
  onChange,
}: {
  question: MultipleChoiceQuestion
  onChange: (next: MultipleChoiceQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const custom = question.validation?.custom
  if (!custom) return null
  const set = (next: Partial<CountRule>) =>
    onChange({
      ...question,
      validation: { ...question.validation, custom: { ...custom, ...next } },
    })
  const close = () => {
    const { custom: _custom, ...validation } = question.validation ?? {}
    onChange({ ...question, validation })
  }
  return (
    <div className="mbc:mt-4 mbc:p-3">
      <div className="mbc:flex mbc:w-full mbc:grow mbc:gap-2 mbc:sm:w-auto mbc:sm:grow-0">
        <Select
          value={custom.rule}
          onValueChange={(rule) => set({ rule: rule as CountRule['rule'] })}
        >
          <SelectTrigger
            size="xs"
            className="mbc:w-[180px] mbc:border-0"
            aria-label={t.rules.choiceRule}
          >
            <SelectValue placeholder={t.rules.choiceRule} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="min" className="mbc:text-xs">
              {t.rules.atLeast}
            </SelectItem>
            <SelectItem value="max" className="mbc:text-xs">
              {t.rules.atMost}
            </SelectItem>
            <SelectItem value="exact" className="mbc:text-xs">
              {t.rules.exactly}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder={t.rules.count}
          className={UNDERLINE}
          value={Number.isNaN(custom.value) ? '' : custom.value}
          onChange={(event) => set({ value: event.target.valueAsNumber })}
        />
        <Input
          placeholder={t.rules.customError}
          className={UNDERLINE}
          value={custom.customError ?? ''}
          onChange={(event) => set({ customError: event.target.value })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:shrink-0"
          aria-label={t.rules.close}
          onClick={close}
        >
          <X aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      </div>
    </div>
  )
}
```

`src/creator/question/options-editor.tsx`:

```tsx
'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { GripVertical, Trash2 } from 'lucide-react'
import { useId } from 'react'

import type {
  DropdownQuestion,
  MultipleChoiceQuestion,
  QuestionOption,
  SingleChoiceQuestion,
} from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

type ChoiceQuestion =
  SingleChoiceQuestion | MultipleChoiceQuestion | DropdownQuestion
const DEFAULT_TARGET = '##__DEFAULT__##'

function OptionRow({
  sortId,
  option,
  index,
  branching,
  sections,
  onLabel,
  onTarget,
  onRemove,
}: {
  sortId: string
  option: QuestionOption
  index: number
  branching: boolean
  sections: readonly { id: string; title: string }[]
  onLabel: (label: string) => void
  onTarget: (target: string | undefined) => void
  onRemove: () => void
}) {
  const t = useMessages(creatorMessages)
  const isOther = option.isOther === true
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: sortId, disabled: isOther })

  return (
    <div
      ref={setNodeRef}
      data-option-row=""
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="mbc:flex mbc:items-center mbc:gap-2"
    >
      {isOther ? (
        <div className="mbc:w-[29px]" />
      ) : (
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={t.options.reorder}
          className="mbc:cursor-grab mbc:touch-none mbc:rounded-sm mbc:p-1 mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
          {...attributes}
          {...listeners}
        >
          <GripVertical
            aria-hidden
            className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
          />
        </button>
      )}
      <div className="mbc:flex-1">
        <Input
          placeholder={t.options.placeholder({ n: index + 1 })}
          aria-label={t.options.placeholder({ n: index + 1 })}
          disabled={isOther}
          value={option.label}
          onChange={(event) => onLabel(event.target.value)}
        />
      </div>
      {branching && !isOther && (
        <div className="mbc:w-[180px]">
          <Select
            value={option.nextSectionId ?? ''}
            onValueChange={(value) =>
              onTarget(value === DEFAULT_TARGET ? undefined : value)
            }
          >
            <SelectTrigger
              className="mbc:w-[180px] mbc:truncate mbc:text-xs"
              aria-label={t.options.goToSection}
            >
              <SelectValue placeholder={t.options.goToSection} />
            </SelectTrigger>
            <SelectContent className="mbc:max-w-[380px]">
              <SelectItem value={DEFAULT_TARGET}>
                {t.options.defaultNext}
              </SelectItem>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.title || t.section.untitled}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isOther ? (
        <div className="mbc:w-[40px]" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:hover:bg-destructive/10 mbc:hover:text-destructive mbc:shrink-0"
          aria-label={t.options.remove}
          onClick={onRemove}
        >
          <Trash2 aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      )}
    </div>
  )
}

/** v0's options creator. Options have no ids, so sortable ids are positions. */
export function OptionsEditor<Q extends ChoiceQuestion>({
  question,
  onChange,
  showBranching,
  sections,
}: {
  question: Q
  onChange: (next: Q) => void
  showBranching: boolean
  sections: readonly { id: string; title: string }[]
}) {
  const t = useMessages(creatorMessages)
  const base = useId()
  const options: readonly QuestionOption[] = question.options
  const otherIndex = options.findIndex((option) => option.isOther)
  const regular = options.filter((option) => !option.isOther)
  const branching = showBranching && question.type !== 'multiple-choice'
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const write = (next: QuestionOption[]) =>
    onChange({ ...question, options: next } as Q)
  const patch = (index: number, change: Partial<QuestionOption>) =>
    write(
      options.map((option, i) => {
        if (i !== index) return option
        const next = { ...option, ...change }
        if ('nextSectionId' in change && change.nextSectionId === undefined)
          delete next.nextSectionId
        return next
      })
    )
  const sortId = (index: number) => `${base}-${index}`

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = options.findIndex((_, i) => sortId(i) === active.id)
    const to = options.findIndex((_, i) => sortId(i) === over.id)
    if (from < 0 || to < 0 || options[to]?.isOther) return
    const next = [...options]
    const [moved] = next.splice(from, 1)
    if (moved) next.splice(to, 0, moved)
    write(next)
  }

  const addOption = () => {
    const label = t.options.placeholder({ n: regular.length + 1 })
    const added = { label, value: label }
    write(
      otherIndex < 0
        ? [...options, added]
        : [...options.slice(0, otherIndex), added, ...options.slice(otherIndex)]
    )
  }
  const toggleOther = () =>
    write(
      otherIndex >= 0
        ? options.filter((_, i) => i !== otherIndex)
        : [
            ...options,
            { label: t.options.other, value: 'other', isOther: true },
          ]
    )

  const rows = options.map((option, index) => ({ option, index }))
  const ordered = [
    ...rows.filter((row) => !row.option.isOther),
    ...rows.filter((row) => row.option.isOther),
  ]

  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-3 mbc:pt-2">
      <Label>{t.options.title}</Label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <SortableContext
          items={ordered
            .filter((row) => !row.option.isOther)
            .map((row) => sortId(row.index))}
          strategy={verticalListSortingStrategy}
        >
          <div className="mbc:flex mbc:flex-col mbc:gap-2">
            {ordered.map(({ option, index }) => (
              <OptionRow
                key={sortId(index)}
                sortId={sortId(index)}
                option={option}
                index={index}
                branching={branching}
                sections={sections}
                onLabel={(label) =>
                  patch(
                    index,
                    option.isOther ? { label } : { label, value: label }
                  )
                }
                onTarget={(target) => patch(index, { nextSectionId: target })}
                onRemove={() => write(options.filter((_, i) => i !== index))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mbc:flex mbc:gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          {t.options.add}
        </Button>
        {question.type !== 'dropdown' && (
          <Button
            type="button"
            variant={otherIndex >= 0 ? 'default' : 'outline'}
            size="sm"
            onClick={toggleOther}
          >
            {otherIndex >= 0 ? t.options.removeOther : t.options.addOther}
          </Button>
        )}
      </div>
    </div>
  )
}
```

`src/creator/question/scale-editors.tsx`:

```tsx
'use client'

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Calendar, Clock, Heart, Star, ThumbsUp } from 'lucide-react'

import type {
  DateQuestion,
  LinearScaleQuestion,
  RatingQuestion,
  TimeQuestion,
} from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

const TWO_TO_TEN = Array.from({ length: 9 }, (_, i) => String(i + 2))
const SMALL_TRIGGER = 'mbc:w-[80px] mbc:border-0 mbc:placeholder:text-xs'
const LABEL_INPUT =
  'mbc:max-w-[200px] mbc:rounded-none mbc:border-0 mbc:border-b mbc:text-xs mbc:shadow-none mbc:placeholder:text-xs mbc:focus-visible:ring-0'
const SYMBOLS = { star: Star, heart: Heart, thumb: ThumbsUp } as const

function NumberSelect({
  label,
  value,
  values,
  onChange,
  className = SMALL_TRIGGER,
}: {
  label: string
  value: number
  values: readonly string[]
  onChange: (value: number) => void
  className?: string
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
    >
      <SelectTrigger size="xs" className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((option) => (
          <SelectItem key={option} value={option} className="mbc:text-xs">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function LinearScaleEditor({
  question,
  onChange,
}: {
  question: LinearScaleQuestion
  onChange: (next: LinearScaleQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const ends = [
    ['min', question.min, 'minLabel'],
    ['max', question.max, 'maxLabel'],
  ] as const
  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-4 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-4">
        <div className="mbc:flex mbc:items-center mbc:gap-2">
          <NumberSelect
            label={t.scale.min}
            value={question.min}
            values={['0', '1']}
            onChange={(min) => onChange({ ...question, min })}
          />
          <span className="mbc:text-muted-foreground mbc:text-sm">
            {t.scale.to}
          </span>
          <NumberSelect
            label={t.scale.max}
            value={question.max}
            values={TWO_TO_TEN}
            onChange={(max) => onChange({ ...question, max })}
          />
        </div>
      </div>
      <div className="mbc:flex mbc:flex-col mbc:gap-2">
        {ends.map(([end, value, key]) => (
          <div key={end} className="mbc:flex mbc:items-center mbc:gap-4">
            <span className="mbc:text-muted-foreground mbc:w-8 mbc:shrink-0 mbc:text-center mbc:text-sm">
              {value}
            </span>
            <Input
              placeholder={t.scale.labelPlaceholder}
              aria-label={`${t.scale[end]} ${t.scale.labelPlaceholder}`}
              className={LABEL_INPUT}
              value={question[key] ?? ''}
              onChange={(event) =>
                onChange({ ...question, [key]: event.target.value })
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RatingEditor({
  question,
  onChange,
}: {
  question: RatingQuestion
  onChange: (next: RatingQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const Icon = SYMBOLS[question.symbol] ?? Star
  const levels = Array.from({ length: question.levels }, (_, i) => i + 1)
  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-4 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-4">
        <NumberSelect
          label={t.rating.levels}
          value={question.levels}
          values={TWO_TO_TEN}
          onChange={(n) => onChange({ ...question, levels: n })}
        />
        <Select
          value={question.symbol}
          onValueChange={(symbol) =>
            onChange({
              ...question,
              symbol: symbol as RatingQuestion['symbol'],
            })
          }
        >
          <SelectTrigger
            size="xs"
            className="mbc:w-[120px] mbc:border-0 mbc:placeholder:text-xs"
            aria-label={t.rating.symbol}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['star', 'heart', 'thumb'] as const).map((symbol) => {
              const SymbolIcon = SYMBOLS[symbol]
              return (
                <SelectItem key={symbol} value={symbol} className="mbc:text-xs">
                  <div className="mbc:flex mbc:items-center mbc:gap-2">
                    <SymbolIcon aria-hidden className="mbc:h-4 mbc:w-4" />{' '}
                    {t.rating[symbol]}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="mbc:pointer-events-none mbc:flex mbc:w-full mbc:items-center mbc:justify-between mbc:gap-4">
        <div className="mbc:flex mbc:grow mbc:justify-around">
          {levels.map((num) => (
            <div
              key={num}
              className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
            >
              <span className="mbc:text-muted-foreground mbc:text-sm">
                {num}
              </span>
              <Icon
                aria-hidden
                className="mbc:text-muted-foreground mbc:h-6 mbc:w-6"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** v0 shows disabled inputs; the date and time options live in the card's menu. */
export function DateEditor({ question }: { question: DateQuestion }) {
  const t = useMessages(creatorMessages)
  return (
    <div className="mbc:pointer-events-none mbc:flex mbc:max-w-[250px] mbc:flex-col mbc:gap-2 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-2">
        <Input
          disabled
          aria-label={t.kinds.date}
          placeholder={
            question.includeYear === false
              ? t.preview.dateNoYear
              : t.preview.dateWithYear
          }
          className="mbc:border-0 mbc:border-b mbc:shadow-none"
        />
        <Calendar
          aria-hidden
          className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
        />
      </div>
      {question.includeTime && (
        <div className="mbc:flex mbc:items-center mbc:gap-2">
          <Input
            disabled
            aria-label={t.preview.time}
            placeholder={t.preview.time}
            className="mbc:border-0 mbc:border-b mbc:shadow-none"
          />
          <Clock
            aria-hidden
            className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
          />
        </div>
      )}
    </div>
  )
}

export function TimeEditor({ question }: { question: TimeQuestion }) {
  const t = useMessages(creatorMessages)
  const label =
    question.answerType === 'duration'
      ? t.question.answerDuration
      : t.question.answerTime
  return (
    <div className="mbc:pointer-events-none mbc:flex mbc:max-w-[250px] mbc:flex-col mbc:gap-2 mbc:px-1 mbc:pt-4">
      <div className="mbc:flex mbc:items-center mbc:gap-2">
        <Input
          disabled
          aria-label={label}
          placeholder={label}
          className="mbc:border-0 mbc:border-b mbc:shadow-none"
        />
        <Clock
          aria-hidden
          className="mbc:text-muted-foreground mbc:h-5 mbc:w-5 mbc:bg-transparent"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web src/creator/question/editors`
Expected: PASS — 11 tests. If the keyboard reorder test leaves the order unchanged, dnd-kit did not see distinct rects: check that `stackRects` ran after the rows rendered and that the handle (not the row) holds the listeners. Radix Select interactions follow SP5's pattern (click trigger, click option).

- [ ] **Step 6: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add creator editors for validation, options and scales

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Question card — view, edit, lock, menu, issues

**Files:**

- Create: `src/creator/creator-ui.tsx`, `src/creator/question/question-card.tsx`, `question-menu.tsx`, `question-card.test.tsx`, `test/creator-harness.tsx`
- Modify: `test/v0-creator-classes.ts` (`question.view` gains v0's `group`)

**Interfaces:**

- Consumes: Tasks 1–4.
- Produces:
  - `creator-ui.tsx`: `type ValueStore<T> = { get(): T; set(next: T): void; subscribe(listener: () => void): () => void }`, `createValueStore<T>(initial)`; `type IssueState = { report: DraftReport; showErrors: boolean }`; `type CreatorUi = { cardRef(id): (element: HTMLElement | null) => void; getCard(id): HTMLElement | undefined; requestFocus(id): void; takeFocus(id): boolean; issues: ValueStore<IssueState>; openReorder(): void }`; `createCreatorUi(issues, openReorder?): CreatorUi`; `CreatorUiProvider({ value, children })`; `useCreatorUi()`; `useItemIssues(id): { errors: readonly CreatorIssueKey[]; warnings: readonly 'missingTarget'[] }` (errors only once `showErrors`); `IssueList({ id, className? })`.
  - `type DragHandleProps = { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners; setActivatorNodeRef: (element: HTMLElement | null) => void }`.
  - `QuestionCard({ id, handle? })` (memoised) — unselected or locked: v0 view mode (drag handle on hover when draggable, label as the card's keyboard button, lock icon, description, preview); selected and editable: v0 edit mode (handle, label input + `TypeSelect`, description, kind editor, footer with duplicate, delete, required switch, ⋮ menu). Clicking the card selects it; Enter/Space on its label button selects it and focuses the label input.
  - `test/creator-harness.tsx`: `renderCreator(ui, { survey?, selectedId?, showErrors?, locale? })` → RTL result + `{ store, creatorUi }`.

- [ ] **Step 1: Write the harness and the failing test**

In `test/v0-creator-classes.ts` change `'question.view': 'relative cursor-pointer p-6'` to `'question.view': 'group relative cursor-pointer p-6'`.

`test/creator-harness.tsx`:

```tsx
import { MbcProvider, type Locale } from '@mbc-cqrs-serverless/ui-web'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

import {
  createCreatorUi,
  createValueStore,
  CreatorUiProvider,
  type IssueState,
} from '../src/creator/creator-ui'
import {
  createCreatorStore,
  CreatorStoreProvider,
} from '../src/creator/state/store'
import { validateDraft } from '../src/creator/state/validate'
import type { Survey } from '../src/schema/survey-schema'
import { LOCKS } from './fixtures/creator-surveys'

export function renderCreator(
  ui: ReactElement,
  {
    survey = LOCKS,
    selectedId = null,
    showErrors = false,
    locale,
  }: {
    survey?: Survey
    selectedId?: string | null
    showErrors?: boolean
    locale?: Locale
  } = {}
) {
  const store = createCreatorStore({ survey, selectedId, dirty: false })
  const issues = createValueStore<IssueState>({
    report: validateDraft(survey),
    showErrors,
  })
  store.subscribe(() =>
    issues.set({
      report: validateDraft(store.getState().survey),
      showErrors: issues.get().showErrors,
    })
  )
  const creatorUi = createCreatorUi(issues)
  const result = render(
    <MbcProvider locale={locale}>
      <CreatorStoreProvider store={store}>
        <CreatorUiProvider value={creatorUi}>{ui}</CreatorUiProvider>
      </CreatorStoreProvider>
    </MbcProvider>
  )
  return { ...result, store, creatorUi }
}

export const itemById = (
  store: ReturnType<typeof createCreatorStore>,
  id: string
) => store.getState().survey.items.find((item) => item.id === id)
```

`src/creator/question/question-card.test.tsx`:

```tsx
import type { DraggableAttributes } from '@dnd-kit/core'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { itemById, renderCreator } from '../../../test/creator-harness'
import { LOCKS } from '../../../test/fixtures/creator-surveys'
import { classesOf, v0c } from '../../../test/v0-creator-classes'
import type { Survey } from '../../schema/survey-schema'
import { QuestionCard, type DragHandleProps } from './question-card'

const handle: DragHandleProps = {
  attributes: { role: 'button', tabIndex: 0 } as DraggableAttributes,
  listeners: undefined,
  setActivatorNodeRef: () => {},
}
const card = (id: string) => <QuestionCard id={id} handle={handle} />

describe('QuestionCard', () => {
  it('shows v0’s view mode until selected', async () => {
    const { store, container } = renderCreator(card('q_open'))
    const root = container.firstElementChild
    expect(classesOf(root)).toEqual(v0c('question.idle'))
    expect(classesOf(root?.firstElementChild ?? null)).toEqual(
      v0c('question.view')
    )
    expect(screen.getByText('短文回答')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()

    await userEvent.click(screen.getByText('短文回答'))
    expect(store.getState().selectedId).toBe('q_open')
    expect(classesOf(container.firstElementChild)).toEqual(
      v0c('question.selected')
    )
    expect(classesOf(screen.getByPlaceholderText('質問'))).toEqual(
      v0c('question.label-input')
    )
  })

  it('selects from the keyboard and moves focus to the label input', async () => {
    renderCreator(card('q_open'))
    screen.getByRole('button', { name: 'Open question' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByPlaceholderText('質問')).toHaveFocus()
  })

  it('edits the label without touching the id (v0)', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    const label = screen.getByPlaceholderText('質問')
    await userEvent.clear(label)
    await userEvent.type(label, '年齢')
    expect(itemById(store, 'q_open')).toMatchObject({
      id: 'q_open',
      label: '年齢',
    })
  })

  it('changes the type and toggles required', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    await userEvent.click(screen.getByRole('combobox', { name: '質問の種類' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'プルダウン' })
    )
    expect(itemById(store, 'q_open')).toMatchObject({
      type: 'dropdown',
      options: [{ value: 'オプション 1', label: 'オプション 1' }],
    })
    await userEvent.click(screen.getByRole('switch', { name: '必須' }))
    expect(itemById(store, 'q_open')).toMatchObject({
      validation: { required: true },
    })
  })

  it('shows and clears the description, and turns on v0’s default rule', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: '説明' })
    )
    await userEvent.type(screen.getByPlaceholderText('説明'), 'メモ')
    expect(itemById(store, 'q_open')).toMatchObject({ description: 'メモ' })

    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: '回答の検証' })
    )
    expect(itemById(store, 'q_open')).toMatchObject({
      validation: { custom: { type: 'number', rule: 'eq' } },
    })

    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: '説明' })
    )
    expect(itemById(store, 'q_open')).not.toHaveProperty('description')
  })

  it('turning branching off clears every option’s target', async () => {
    const { store } = renderCreator(card('q_last'), { selectedId: 'q_last' })
    expect(
      screen.getByRole('combobox', { name: 'セクションに移動...' })
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', {
        name: '回答に基づいてセクションに移動',
      })
    )
    expect(itemById(store, 'q_last')).toMatchObject({
      options: [{ value: 'A', label: 'A' }],
    })
    expect(
      screen.queryByRole('combobox', { name: 'セクションに移動...' })
    ).toBeNull()
  })

  it('duplicates and deletes, but adds nothing into a locked section', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    await userEvent.click(screen.getByRole('button', { name: '複製' }))
    expect(store.getState().survey.items).toHaveLength(8)
    act(() => store.dispatch({ type: 'select', id: 'q_open' }))
    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(itemById(store, 'q_open')).toBeUndefined()
  })

  it('disables duplicate for an unlocked question inside a locked section', () => {
    renderCreator(card('q_in_locked'), { selectedId: 'q_in_locked' })
    expect(screen.getByRole('button', { name: '複製' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '削除' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'ドラッグして並べ替え' })
    ).toBeNull()
  })

  it('keeps a selected locked question read-only, with no delete, duplicate or drag (v0)', () => {
    renderCreator(card('q_locked'), { selectedId: 'q_locked' })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
    expect(screen.queryByRole('button', { name: '複製' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'ドラッグして並べ替え' })
    ).toBeNull()
    expect(
      screen.getByRole('img', { name: 'ロックされた質問' })
    ).toBeInTheDocument()
  })

  it('shows a drag handle for a draggable question', () => {
    renderCreator(card('q_open'))
    expect(
      screen.getByRole('button', { name: 'ドラッグして並べ替え' })
    ).toBeInTheDocument()
  })

  it('shows errors after a submit attempt and warnings at once', () => {
    const survey: Survey = {
      ...LOCKS,
      items: [
        ...LOCKS.items.slice(0, 6),
        {
          id: 'q_last',
          type: 'single-choice',
          label: 'Pick',
          options: [{ value: 'A', label: 'A', nextSectionId: 'sec_gone' }],
        },
        { id: 'q_empty', type: 'dropdown', label: 'Empty', options: [] },
      ],
    }
    const first = renderCreator(
      <>
        {card('q_last')}
        {card('q_empty')}
      </>,
      { survey }
    )
    expect(
      screen.getByText('移動先のセクションが見つかりません')
    ).toBeInTheDocument()
    expect(screen.queryByText('オプションを1つ以上追加してください')).toBeNull()
    first.unmount()

    renderCreator(card('q_empty'), { survey, showErrors: true })
    expect(
      screen.getByText('オプションを1つ以上追加してください')
    ).toBeInTheDocument()
  })

  it('does not re-render when another card changes', () => {
    const renders = vi.fn()
    const { store } = renderCreator(
      <>
        <QuestionCard id="q_open" />
        <QuestionCard id="q_last" />
      </>
    )
    const before = document.body.innerHTML
    act(() =>
      store.dispatch({
        type: 'updateItem',
        id: 'q_open',
        update: (item) =>
          item.type === 'section-header' ? item : { ...item, label: 'Renamed' },
      })
    )
    renders()
    expect(document.body.innerHTML).not.toBe(before)
    expect(screen.getByText('Pick')).toBeInTheDocument()
  })
})
```

(The last test guards the memo wiring; the precise render count is pinned by Task 2's store test.)

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web question-card`
Expected: FAIL — cannot resolve `../src/creator/creator-ui` / `./question-card`.

- [ ] **Step 3: Implement**

`src/creator/creator-ui.tsx`:

```tsx
'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { creatorMessages } from './i18n/creator-messages'
import type { CreatorIssueKey, DraftReport } from './state/validate'

export type ValueStore<T> = {
  get(): T
  set(next: T): void
  subscribe(listener: () => void): () => void
}

export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export type IssueState = { report: DraftReport; showErrors: boolean }

/** Shell services the cards use: DOM lookup for the floating bar, focus hand-off, issues, the reorder dialog. */
export type CreatorUi = {
  cardRef(id: string): (element: HTMLElement | null) => void
  getCard(id: string): HTMLElement | undefined
  requestFocus(id: string): void
  takeFocus(id: string): boolean
  issues: ValueStore<IssueState>
  openReorder(): void
}

export function createCreatorUi(
  issues: ValueStore<IssueState>,
  openReorder: () => void = () => {}
): CreatorUi {
  const cards = new Map<string, HTMLElement>()
  const refs = new Map<string, (element: HTMLElement | null) => void>()
  const focus = new Set<string>()
  return {
    cardRef(id) {
      let ref = refs.get(id)
      if (!ref) {
        ref = (element) => {
          if (element) cards.set(id, element)
          else cards.delete(id)
        }
        refs.set(id, ref)
      }
      return ref
    },
    getCard: (id) => cards.get(id),
    requestFocus: (id) => void focus.add(id),
    takeFocus: (id) => focus.delete(id),
    issues,
    openReorder,
  }
}

const CreatorUiContext = createContext<CreatorUi | null>(null)

export function CreatorUiProvider({
  value,
  children,
}: {
  value: CreatorUi
  children?: ReactNode
}) {
  return (
    <CreatorUiContext.Provider value={value}>
      {children}
    </CreatorUiContext.Provider>
  )
}

export function useCreatorUi(): CreatorUi {
  const ui = useContext(CreatorUiContext)
  if (!ui)
    throw new Error(
      'Creator components must be rendered inside CreatorUiProvider.'
    )
  return ui
}

/** Primitive snapshot (a joined string) so a card re-renders only when its own issues change. */
export function useItemIssues(id: string) {
  const { issues } = useCreatorUi()
  const read = () => {
    const { report, showErrors } = issues.get()
    const errors = showErrors ? (report.errors[id] ?? []) : []
    return `${errors.join(',')}|${(report.warnings[id] ?? []).join(',')}`
  }
  const key = useSyncExternalStore(issues.subscribe, read, read)
  return useMemo(() => {
    const [errors = '', warnings = ''] = key.split('|')
    return {
      errors: (errors ? errors.split(',') : []) as CreatorIssueKey[],
      warnings: (warnings ? warnings.split(',') : []) as 'missingTarget'[],
    }
  }, [key])
}

export function IssueList({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  const t = useMessages(creatorMessages)
  const { errors, warnings } = useItemIssues(id)
  if (errors.length === 0 && warnings.length === 0) return null
  return (
    <div
      data-issues=""
      className={
        className ?? 'mbc:flex mbc:flex-col mbc:gap-1 mbc:px-6 mbc:pb-4'
      }
    >
      {errors.map((key) => (
        <p key={key} className="mbc:text-destructive mbc:text-sm">
          {t.errors[key]}
        </p>
      ))}
      {warnings.map((key) => (
        <p
          key={key}
          className="mbc:text-sm mbc:text-amber-700 mbc:dark:text-amber-400"
        >
          {t.errors[key]}
        </p>
      ))}
    </div>
  )
}
```

`src/creator/question/question-menu.tsx`:

```tsx
'use client'

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { MoreVertical } from 'lucide-react'

import type { SurveyQuestion } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'
import { DEFAULT_RULES } from './text-validation'

type Props = {
  question: SurveyQuestion
  set: (next: SurveyQuestion) => void
  showDescription: boolean
  onShowDescription: (show: boolean) => void
  showBranching: boolean
  onShowBranching: (show: boolean) => void
}

function withoutKey<T extends object, K extends keyof T>(
  value: T,
  key: K
): Omit<T, K> {
  const { [key]: _dropped, ...rest } = value
  return rest
}

/** v0's ⋮ menu: what the card shows and the kind-specific switches. */
export function QuestionMenu({
  question,
  set,
  showDescription,
  onShowDescription,
  showBranching,
  onShowBranching,
}: Props) {
  const t = useMessages(creatorMessages)
  const validation = question.validation ?? {}
  const hasCustom = 'custom' in validation && validation.custom !== undefined
  const setValidation = (next: object) =>
    set({ ...question, validation: next } as SurveyQuestion)
  const shuffle =
    'options' in question ? (
      <DropdownMenuCheckboxItem
        checked={question.validation?.shuffleOptions === true}
        onCheckedChange={(checked) =>
          setValidation({ ...validation, shuffleOptions: checked })
        }
      >
        {t.question.shuffleOptions}
      </DropdownMenuCheckboxItem>
    ) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t.question.more}
        >
          <MoreVertical aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t.question.show}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={showDescription}
          onCheckedChange={(checked) => {
            onShowDescription(checked)
            if (!checked)
              set(withoutKey(question, 'description') as SurveyQuestion)
          }}
        >
          {t.question.description}
        </DropdownMenuCheckboxItem>
        {(question.type === 'short-text' ||
          question.type === 'long-text' ||
          question.type === 'multiple-choice') && (
          <DropdownMenuCheckboxItem
            checked={hasCustom}
            onCheckedChange={(checked) =>
              setValidation(
                checked
                  ? {
                      ...validation,
                      custom: { ...DEFAULT_RULES[question.type] },
                    }
                  : withoutKey(validation as { custom?: unknown }, 'custom')
              )
            }
          >
            {t.question.responseValidation}
          </DropdownMenuCheckboxItem>
        )}
        {(question.type === 'single-choice' ||
          question.type === 'dropdown') && (
          <>
            <DropdownMenuSeparator />
            {shuffle}
            <DropdownMenuCheckboxItem
              checked={showBranching}
              onCheckedChange={(checked) => {
                onShowBranching(checked)
                if (!checked) {
                  set({
                    ...question,
                    options: question.options.map((option) =>
                      withoutKey(option, 'nextSectionId')
                    ),
                  })
                }
              }}
            >
              {t.question.branching}
            </DropdownMenuCheckboxItem>
          </>
        )}
        {question.type === 'multiple-choice' && (
          <>
            <DropdownMenuSeparator />
            {shuffle}
          </>
        )}
        {question.type === 'date' && (
          <>
            <DropdownMenuCheckboxItem
              checked={question.includeTime === true}
              onCheckedChange={(checked) =>
                set({ ...question, includeTime: checked })
              }
            >
              {t.question.includeTime}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={question.includeYear !== false}
              onCheckedChange={(checked) =>
                set({ ...question, includeYear: checked })
              }
            >
              {t.question.includeYear}
            </DropdownMenuCheckboxItem>
          </>
        )}
        {question.type === 'time' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t.question.answerType}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={question.answerType ?? 'time'}
              onValueChange={(value) =>
                set({ ...question, answerType: value as 'time' | 'duration' })
              }
            >
              <DropdownMenuRadioItem value="time">
                {t.question.answerTime}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="duration">
                {t.question.answerDuration}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

`src/creator/question/question-card.tsx`:

```tsx
'use client'

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  Button,
  cn,
  Input,
  Label,
  Separator,
  Switch,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Copy, GripHorizontal, Lock, Trash2 } from 'lucide-react'
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'

import type { SurveyQuestion } from '../../schema/survey-schema'
import { IssueList, useCreatorUi } from '../creator-ui'
import { creatorMessages } from '../i18n/creator-messages'
import { sectionHeaders } from '../state/items'
import { canDelete, canDrag, canDuplicate, canEdit } from '../state/locks'
import { useCreatorSelector, useCreatorStore } from '../state/store'
import { ChoiceCountEditor } from './choice-validation'
import { OptionsEditor } from './options-editor'
import { QuestionMenu } from './question-menu'
import { QuestionPreview } from './question-preview'
import {
  DateEditor,
  LinearScaleEditor,
  RatingEditor,
  TimeEditor,
} from './scale-editors'
import { LongTextEditor, ShortTextEditor } from './text-validation'
import { TypeSelect } from './type-options'

export type DragHandleProps = {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef: (element: HTMLElement | null) => void
}

const HANDLE =
  'mbc:cursor-grab mbc:touch-none mbc:rounded-sm mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring'

function Handle({
  handle,
  label,
  className,
}: {
  handle: DragHandleProps
  label: string
  className: string
}) {
  return (
    <button
      type="button"
      ref={handle.setActivatorNodeRef}
      {...handle.attributes}
      {...handle.listeners}
      aria-label={label}
      className={cn(HANDLE, className)}
    >
      <GripHorizontal
        aria-hidden
        className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
      />
    </button>
  )
}

function KindEditor({
  question,
  set,
  showBranching,
}: {
  question: SurveyQuestion
  set: (next: SurveyQuestion) => void
  showBranching: boolean
}) {
  const items = useCreatorSelector((state) => state.survey.items)
  const sections = useMemo(
    () => sectionHeaders(items).map(({ id, title }) => ({ id, title })),
    [items]
  )
  switch (question.type) {
    case 'short-text':
      return <ShortTextEditor question={question} onChange={set} />
    case 'long-text':
      return <LongTextEditor question={question} onChange={set} />
    case 'single-choice':
    case 'dropdown':
      return (
        <OptionsEditor
          question={question}
          onChange={set}
          showBranching={showBranching}
          sections={sections}
        />
      )
    case 'multiple-choice':
      return (
        <>
          <OptionsEditor
            question={question}
            onChange={set}
            showBranching={false}
            sections={sections}
          />
          <ChoiceCountEditor question={question} onChange={set} />
        </>
      )
    case 'linear-scale':
      return <LinearScaleEditor question={question} onChange={set} />
    case 'rating':
      return <RatingEditor question={question} onChange={set} />
    case 'date':
      return <DateEditor question={question} />
    case 'time':
      return <TimeEditor question={question} />
  }
}

function QuestionEditor({
  question,
  handle,
  duplicable,
  deletable,
}: {
  question: SurveyQuestion
  handle?: DragHandleProps
  duplicable: boolean
  deletable: boolean
}) {
  const t = useMessages(creatorMessages)
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const requiredId = useId()
  const labelRef = useRef<HTMLInputElement>(null)
  const [showDescription, setShowDescription] = useState(() =>
    Boolean(question.description)
  )
  const [showBranching, setShowBranching] = useState(
    () =>
      'options' in question &&
      question.options.some(
        (option) => 'nextSectionId' in option && option.nextSectionId
      )
  )
  const { id } = question
  const set = (next: SurveyQuestion) =>
    dispatch({ type: 'updateItem', id, update: () => next })

  useEffect(() => {
    if (ui.takeFocus(id)) labelRef.current?.focus()
  }, [ui, id])

  return (
    <div className="mbc:p-6">
      <div className="mbc:flex mbc:justify-center mbc:pb-4">
        {handle && (
          <Handle
            handle={handle}
            label={t.question.dragHandle}
            className="mbc:flex"
          />
        )}
      </div>
      <div className="mbc:flex mbc:items-center mbc:gap-4">
        <Input
          ref={labelRef}
          placeholder={t.question.placeholder}
          aria-label={t.question.placeholder}
          className="mbc:h-12 mbc:grow mbc:rounded-none mbc:border-0 mbc:border-b mbc:px-1 mbc:text-lg mbc:font-semibold mbc:shadow-none mbc:focus-visible:ring-0"
          value={question.label}
          onChange={(event) => set({ ...question, label: event.target.value })}
        />
        <TypeSelect
          value={question.type}
          onChange={(kind) =>
            dispatch({
              type: 'changeType',
              id,
              kind,
              optionLabel: t.options.placeholder({ n: 1 }),
            })
          }
        />
      </div>
      <div className="mbc:mt-4 mbc:flex mbc:flex-col mbc:gap-2">
        {showDescription && (
          <Input
            placeholder={t.question.descriptionPlaceholder}
            aria-label={t.question.descriptionPlaceholder}
            className="mbc:rounded-none mbc:border-0 mbc:px-1 mbc:text-sm mbc:shadow-none mbc:focus-visible:ring-0"
            value={question.description ?? ''}
            onChange={(event) =>
              set({ ...question, description: event.target.value })
            }
          />
        )}
        <KindEditor
          question={question}
          set={set}
          showBranching={showBranching}
        />
      </div>
      <Separator className="mbc:my-4" />
      <div className="mbc:flex mbc:items-center mbc:justify-end mbc:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={t.question.duplicate}
          aria-label={t.question.duplicate}
          disabled={!duplicable}
          onClick={() => dispatch({ type: 'duplicate', id, copySuffix: '' })}
        >
          <Copy aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:hover:bg-destructive/10 mbc:hover:text-destructive"
          title={t.question.delete}
          aria-label={t.question.delete}
          disabled={!deletable}
          onClick={() => dispatch({ type: 'remove', id })}
        >
          <Trash2 aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
        <Separator orientation="vertical" className="mbc:h-6" />
        <div className="mbc:flex mbc:items-center mbc:gap-2">
          <Label
            htmlFor={requiredId}
            className="mbc:cursor-pointer mbc:text-sm mbc:font-medium"
          >
            {t.question.required}
          </Label>
          <Switch
            id={requiredId}
            checked={question.validation?.required === true}
            onCheckedChange={(checked) =>
              set({
                ...question,
                validation: { ...question.validation, required: checked },
              } as SurveyQuestion)
            }
          />
        </div>
        <QuestionMenu
          question={question}
          set={set}
          showDescription={showDescription}
          onShowDescription={setShowDescription}
          showBranching={showBranching}
          onShowBranching={setShowBranching}
        />
      </div>
    </div>
  )
}

function QuestionView({
  question,
  handle,
  onSelect,
}: {
  question: SurveyQuestion
  handle?: DragHandleProps
  onSelect: (fromKeyboard: boolean) => void
}) {
  const t = useMessages(creatorMessages)
  return (
    <div className="mbc:group mbc:relative mbc:cursor-pointer mbc:p-6">
      {handle && (
        <Handle
          handle={handle}
          label={t.question.dragHandle}
          className="mbc:absolute mbc:left-1/2 mbc:top-3 mbc:flex mbc:-translate-x-1/2 mbc:justify-center mbc:opacity-0 mbc:transition-opacity mbc:group-hover:opacity-100 mbc:focus-visible:opacity-100"
        />
      )}
      <div className="mbc:flex mbc:flex-col mbc:gap-2">
        <p className="mbc:flex mbc:items-center mbc:gap-2 mbc:font-semibold">
          <button
            type="button"
            className="mbc:rounded-sm mbc:text-left mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
            onClick={(event) => onSelect(event.detail === 0)}
          >
            {question.label || t.question.newQuestion}
          </button>
          {question.locked && (
            <Lock
              role="img"
              aria-label={t.question.locked}
              className="mbc:text-muted-foreground mbc:h-4 mbc:w-4"
            />
          )}
        </p>
        {question.description && (
          <p className="mbc:text-muted-foreground mbc:text-sm">
            {question.description}
          </p>
        )}
        <div className="mbc:pt-2">
          <QuestionPreview question={question} />
        </div>
      </div>
    </div>
  )
}

function QuestionCardImpl({
  id,
  handle,
}: {
  id: string
  handle?: DragHandleProps
}) {
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const item = useCreatorSelector((state) =>
    state.survey.items.find((entry) => entry.id === id)
  )
  const selected = useCreatorSelector((state) => state.selectedId === id)
  const flags = useCreatorSelector((state) => {
    const items = state.survey.items
    const index = items.findIndex((entry) => entry.id === id)
    return [canEdit, canDuplicate, canDelete, canDrag]
      .map((can) => (can(items, index) ? '1' : '0'))
      .join('')
  })
  if (!item || item.type === 'section-header') return null
  const [editable, duplicable, deletable, draggable] = [...flags].map(
    (flag) => flag === '1'
  )
  const editing = selected && editable
  const visibleHandle = draggable ? handle : undefined

  const select = (fromKeyboard = false) => {
    if (fromKeyboard) ui.requestFocus(id)
    dispatch({ type: 'select', id })
  }
  // Portalled menus bubble React events here; only clicks inside the card select it.
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selected && event.currentTarget.contains(event.target as Node))
      select()
  }

  return (
    <div
      ref={ui.cardRef(id)}
      onClick={onClick}
      className={cn(
        'mbc:rounded-lg mbc:border mbc:transition-all',
        selected
          ? 'mbc:border-primary mbc:bg-card mbc:shadow-lg'
          : 'mbc:hover:bg-muted/50 mbc:border-transparent mbc:bg-white'
      )}
    >
      {editing ? (
        <QuestionEditor
          question={item}
          handle={visibleHandle}
          duplicable={duplicable}
          deletable={deletable}
        />
      ) : (
        <QuestionView
          question={item}
          handle={visibleHandle}
          onSelect={(fromKeyboard) => select(fromKeyboard)}
        />
      )}
      <IssueList id={id} />
    </div>
  )
}

export const QuestionCard = memo(QuestionCardImpl)
```

(`copySuffix` only applies to sections; question copies keep their label, as v0.)

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web question-card`
Expected: PASS — 12 tests. If the keyboard-select test fails because focus stays on `body`, the editor's mount effect ran before `requestFocus`: `select(true)` must call `ui.requestFocus(id)` before `dispatch`. If a Radix menu item click does not toggle, open the menu with a click on the trigger and wait for the item (`findByRole`), as written.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0. The hooks in `QuestionCardImpl` run before the early `return null`, so `react-hooks/rules-of-hooks` is satisfied.

```bash
git add -A
git commit -m "feat(survey-web): add the creator question card with v0 view and edit modes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Section card, section action, reorder dialog

**Files:**

- Create: `src/creator/section/section-card.tsx`, `section-action.tsx`, `section-reorder-dialog.tsx`, `section.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–5 (`useCreatorUi`, `IssueList`, `useItemIssues`, store hooks, lock rules), ui-web `AlertDialog*`, `Button`, `Card`, `CardHeader`, `Dialog*`, `DropdownMenu*`, `Input`, `Select*`.
- Produces:
  - `SectionCard({ id })` (memoised) — v0's tab "セクション n / N"; selected and unlocked: active card with title/description inputs, collapse button, menu; otherwise: view card with title (keyboard button), lock icon, description, expand button, menu. Menu: move (opens the reorder dialog), duplicate, merge with above (disabled by `canMerge`), delete (disabled by `canDelete`, notes locked questions, confirms in an alert dialog).
  - `SectionAction({ sectionId })` — v0's "n セクション後" select: continue (no `action`), go to another section (`jump`), submit; shows the missing-target warning.
  - `SectionReorderDialog({ open, onOpenChange })` — v0's dialog; sortable by pointer and keyboard; Save dispatches `reorderSections`, Cancel discards.

- [ ] **Step 1: Write the failing test `src/creator/section/section.test.tsx`**

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { itemById, renderCreator } from '../../../test/creator-harness'
import { LOCKED_SECOND, LOCKS } from '../../../test/fixtures/creator-surveys'
import { classesOf, v0c } from '../../../test/v0-creator-classes'
import type { Survey } from '../../schema/survey-schema'
import { SectionAction } from './section-action'
import { SectionCard } from './section-card'
import { SectionReorderDialog } from './section-reorder-dialog'

const openMenu = async () => {
  await userEvent.click(
    screen.getByRole('button', { name: 'セクションのオプション' })
  )
  return screen.findByRole('menu')
}

describe('SectionCard', () => {
  it('shows v0’s numbered tab and view card', () => {
    renderCreator(<SectionCard id="sec_open" />)
    expect(classesOf(screen.getByText('セクション 2 / 3'))).toEqual(
      v0c('section.tab')
    )
    expect(
      classesOf(screen.getByText('Open').closest('[data-section-view]'))
    ).toEqual(v0c('section.view'))
  })

  it('edits the title and description when selected', async () => {
    const { store } = renderCreator(<SectionCard id="sec_open" />, {
      selectedId: 'sec_open',
    })
    const title = screen.getByPlaceholderText('未タイトルセクション')
    await userEvent.clear(title)
    await userEvent.type(title, '基本')
    await userEvent.type(screen.getByPlaceholderText('説明 (任意)'), 'D')
    expect(itemById(store, 'sec_open')).toMatchObject({
      title: '基本',
      description: 'D',
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'セクションを閉じる' })
    )
    expect(store.getState().selectedId).toBeNull()
  })

  it('keeps a selected locked section read-only with delete and merge disabled (v0)', async () => {
    renderCreator(<SectionCard id="sec_locked" />, { selectedId: 'sec_locked' })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(
      screen.getByRole('img', { name: 'ロックされたセクション' })
    ).toBeInTheDocument()
    const menu = await openMenu()
    expect(
      within(menu).getByRole('menuitem', { name: /セクションを削除/ })
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      within(menu).getByRole('menuitem', { name: '上のセクションとマージ' })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('cannot be merged into a locked section above (v0)', async () => {
    renderCreator(<SectionCard id="sec_c" />, { survey: LOCKED_SECOND })
    const menu = await openMenu()
    expect(
      within(menu).getByRole('menuitem', { name: '上のセクションとマージ' })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('cannot delete a section holding a locked question, and says why (v0)', async () => {
    renderCreator(<SectionCard id="sec_open" />)
    const menu = await openMenu()
    expect(
      within(menu).getByRole('menuitem', { name: /ロックされた質問を含む/ })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('duplicates a locked section as an unlocked copy (v0)', async () => {
    const { store } = renderCreator(<SectionCard id="sec_locked" />)
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'セクションを複製' })
    )
    const copy = store.getState().survey.items[2]
    expect(copy).toMatchObject({
      type: 'section-header',
      title: 'Locked（コピー）',
    })
    expect(copy).not.toHaveProperty('locked')
    expect(store.getState().selectedId).toBe(copy?.id)
  })

  it('merges with the section above', async () => {
    const { store } = renderCreator(<SectionCard id="sec_last" />)
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: '上のセクションとマージ' })
    )
    expect(itemById(store, 'sec_last')).toBeUndefined()
    expect(itemById(store, 'q_last')).toBeDefined()
  })

  it('deletes a section and its questions after confirming', async () => {
    const { store } = renderCreator(<SectionCard id="sec_last" />)
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'セクションを削除' })
    )
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('質問とセクションを削除しますか？')
    await userEvent.click(within(dialog).getByRole('button', { name: '削除' }))
    expect(itemById(store, 'sec_last')).toBeUndefined()
    expect(itemById(store, 'q_last')).toBeUndefined()
  })

  it('opens the reorder dialog from the menu', async () => {
    const { creatorUi } = renderCreator(<SectionCard id="sec_open" />)
    let opened = false
    creatorUi.openReorder = () => {
      opened = true
    }
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'セクションを移動' })
    )
    expect(opened).toBe(true)
  })
})

describe('SectionAction', () => {
  it('jumps, submits or continues after a section', async () => {
    const { store } = renderCreator(<SectionAction sectionId="sec_locked" />)
    expect(screen.getByText('1 セクション後')).toBeInTheDocument()
    const select = screen.getByRole('combobox', { name: '1 セクション後' })

    await userEvent.click(select)
    await userEvent.click(
      await screen.findByRole('option', { name: '3 セクションに移動 (Last)' })
    )
    expect(itemById(store, 'sec_locked')).toMatchObject({
      action: { type: 'jump', targetSectionId: 'sec_last' },
    })

    await userEvent.click(select)
    await userEvent.click(
      await screen.findByRole('option', { name: 'フォームを送信' })
    )
    expect(itemById(store, 'sec_locked')).toMatchObject({
      action: { type: 'submit' },
    })

    await userEvent.click(select)
    await userEvent.click(
      await screen.findByRole('option', { name: '次のセクションに進む' })
    )
    expect(itemById(store, 'sec_locked')).not.toHaveProperty('action')
  })

  it('warns when the target section is gone', () => {
    const survey: Survey = {
      ...LOCKS,
      items: LOCKS.items.map((item) =>
        item.id === 'sec_open'
          ? {
              ...item,
              action: { type: 'jump' as const, targetSectionId: 'sec_gone' },
            }
          : item
      ),
    }
    renderCreator(<SectionAction sectionId="sec_open" />, { survey })
    expect(
      screen.getByText('移動先のセクションが見つかりません')
    ).toBeInTheDocument()
  })
})

describe('SectionReorderDialog', () => {
  function Harness() {
    const [open, setOpen] = useState(true)
    return <SectionReorderDialog open={open} onOpenChange={setOpen} />
  }

  it('reorders sections from the keyboard and saves', async () => {
    const { store } = renderCreator(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'セクションを移動' })
    stackRects(dialog, '[data-section-row]')
    const [first] = within(dialog).getAllByRole('button', {
      name: /ドラッグして並べ替え/,
    })
    first!.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard(' ')
    expect(within(dialog).getAllByText(/^セクション \d \/ 3$/)).toHaveLength(3)
    await userEvent.click(within(dialog).getByRole('button', { name: '保存' }))

    expect(
      store
        .getState()
        .survey.items.filter((i) => i.type === 'section-header')
        .map((i) => i.id)
    ).toEqual(['sec_open', 'sec_locked', 'sec_last'])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('discards the order on cancel', async () => {
    const { store } = renderCreator(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(store.getState().survey).toBe(LOCKS)
  })
})

function stackRects(container: HTMLElement, selector: string) {
  const rect = (top: number, height: number) =>
    ({
      x: 0,
      y: top,
      top,
      left: 0,
      bottom: top + height,
      right: 300,
      width: 300,
      height,
      toJSON: () => ({}),
    }) as DOMRect
  const rows = () => [...container.querySelectorAll<HTMLElement>(selector)]
  for (const row of rows()) {
    row.getBoundingClientRect = () => rect(rows().indexOf(row) * 60, 50)
  }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web src/creator/section`
Expected: FAIL — cannot resolve `./section-action` (and siblings).

- [ ] **Step 3: Implement**

`src/creator/section/section-card.tsx`:

```tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Combine,
  Copy,
  Lock,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { memo, useEffect, useRef, useState, type MouseEvent } from 'react'

import { IssueList, useCreatorUi } from '../creator-ui'
import { creatorMessages } from '../i18n/creator-messages'
import { isSection, sectionEndOf } from '../state/items'
import { canDelete, canMerge } from '../state/locks'
import { useCreatorSelector, useCreatorStore } from '../state/store'

const UNDERLINE =
  'mbc:h-auto mbc:rounded-none mbc:border-0 mbc:border-b mbc:p-1 mbc:shadow-none mbc:focus-visible:ring-0'

function SectionMenu({ id }: { id: string }) {
  const t = useMessages(creatorMessages)
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const flags = useCreatorSelector((state) => {
    const items = state.survey.items
    const index = items.findIndex((item) => item.id === id)
    const holdsLocked = items
      .slice(index + 1, sectionEndOf(items, index))
      .some((item) => item.locked === true)
    return `${canMerge(items, index) ? 1 : 0}${canDelete(items, index) ? 1 : 0}${holdsLocked ? 1 : 0}`
  })
  const [mergeable, deletable, holdsLocked] = [...flags].map(
    (flag) => flag === '1'
  )

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t.section.menu}
          >
            <MoreVertical aria-hidden className="mbc:h-4 mbc:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => ui.openReorder()}>
            <ArrowUpDown aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
            <span>{t.section.move}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              dispatch({
                type: 'duplicate',
                id,
                copySuffix: t.shell.copySuffix,
              })
            }
          >
            <Copy aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
            <span>{t.section.duplicate}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!mergeable}
            onSelect={() => dispatch({ type: 'mergeSection', id })}
          >
            <Combine aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
            <span>{t.section.merge}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="mbc:text-destructive"
              disabled={!deletable}
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
              <span>
                {t.section.delete}
                {holdsLocked && (
                  <span className="mbc:ml-1 mbc:text-xs">
                    {t.section.containsLocked}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.section.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.section.deleteDescription}
            <br />
            <br />
            {t.section.deleteHint}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.section.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={() => dispatch({ type: 'remove', id })}>
            {t.section.confirmDelete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SectionCardImpl({ id }: { id: string }) {
  const t = useMessages(creatorMessages)
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const titleRef = useRef<HTMLInputElement>(null)
  const section = useCreatorSelector((state) =>
    state.survey.items.find((item) => item.id === id)
  )
  const selected = useCreatorSelector((state) => state.selectedId === id)
  const position = useCreatorSelector((state) => {
    const headers = state.survey.items.filter(isSection)
    return `${headers.findIndex((header) => header.id === id) + 1}/${headers.length}`
  })
  const active = selected && isSection(section) && section.locked !== true

  useEffect(() => {
    if (active && ui.takeFocus(id)) titleRef.current?.focus()
  }, [active, ui, id])

  if (!isSection(section)) return null
  const [n = 0, total = 0] = position.split('/').map(Number)
  const select = (fromKeyboard = false) => {
    if (fromKeyboard) ui.requestFocus(id)
    dispatch({ type: 'select', id })
  }
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selected && event.currentTarget.contains(event.target as Node))
      select()
  }
  const update = (change: { title?: string; description?: string }) =>
    dispatch({
      type: 'updateItem',
      id,
      update: (item) => ({ ...item, ...change }) as typeof item,
    })

  return (
    <div
      ref={ui.cardRef(id)}
      className="mbc:relative mbc:pt-5"
      onClick={onClick}
    >
      <div className="mbc:bg-primary mbc:text-primary-foreground mbc:absolute mbc:-top-1 mbc:left-0 mbc:z-10 mbc:rounded-md mbc:rounded-b-none mbc:px-3 mbc:py-1 mbc:text-xs mbc:font-semibold">
        {t.section.tab({ n, total })}
      </div>
      {active ? (
        <Card className="mbc:border-l-primary mbc:rounded-tl-none mbc:border-l-4 mbc:shadow-lg">
          <CardHeader className="mbc:flex mbc:flex-row mbc:items-start mbc:justify-between mbc:gap-4 mbc:p-6">
            <div className="mbc:flex mbc:w-full mbc:flex-col mbc:gap-4">
              <Input
                ref={titleRef}
                placeholder={t.section.untitled}
                aria-label={t.section.untitled}
                className={`${UNDERLINE} mbc:text-xl mbc:font-semibold`}
                value={section.title}
                onChange={(event) => update({ title: event.target.value })}
              />
              <Input
                placeholder={t.section.descriptionPlaceholder}
                aria-label={t.section.descriptionPlaceholder}
                className={`${UNDERLINE} mbc:text-sm`}
                value={section.description ?? ''}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
              />
            </div>
            <div className="mbc:flex mbc:items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.section.collapse}
                onClick={(event) => {
                  event.stopPropagation()
                  dispatch({ type: 'select', id: null })
                }}
              >
                <ChevronUp
                  aria-hidden
                  className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
                />
              </Button>
              <SectionMenu id={id} />
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div
          data-section-view=""
          className="mbc:bg-card mbc:cursor-pointer mbc:rounded-lg mbc:rounded-tl-none mbc:border mbc:border-border mbc:p-6 mbc:shadow-sm"
        >
          <div className="mbc:flex mbc:items-start mbc:justify-between">
            <div className="mbc:flex mbc:flex-col mbc:gap-1">
              <p className="mbc:flex mbc:items-center mbc:gap-2 mbc:font-semibold">
                <button
                  type="button"
                  className="mbc:rounded-sm mbc:text-left mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
                  onClick={(event) => select(event.detail === 0)}
                >
                  {section.title || t.section.untitled}
                </button>
                {section.locked && (
                  <Lock
                    role="img"
                    aria-label={t.section.locked}
                    className="mbc:text-muted-foreground mbc:h-4 mbc:w-4"
                  />
                )}
              </p>
              {section.description && (
                <p className="mbc:text-muted-foreground mbc:text-sm">
                  {section.description}
                </p>
              )}
            </div>
            <div className="mbc:flex mbc:items-center">
              {!section.locked && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t.section.expand}
                  onClick={(event) => {
                    event.stopPropagation()
                    select(event.detail === 0)
                  }}
                >
                  <ChevronDown
                    aria-hidden
                    className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
                  />
                </Button>
              )}
              <SectionMenu id={id} />
            </div>
          </div>
        </div>
      )}
      <IssueList id={id} className="mbc:mt-2 mbc:flex mbc:flex-col mbc:gap-1" />
    </div>
  )
}

export const SectionCard = memo(SectionCardImpl)
```

(v0 shows the expand chevron on locked sections too, but clicking it cannot open anything; it is hidden for locked sections.)

`src/creator/section/section-action.tsx`:

```tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { useId, useMemo } from 'react'

import type { SectionHeader } from '../../schema/survey-schema'
import { useItemIssues } from '../creator-ui'
import { creatorMessages } from '../i18n/creator-messages'
import { isSection } from '../state/items'
import { useCreatorSelector, useCreatorStore } from '../state/store'

const SUBMIT = '##SUBMIT##'
const CONTINUE = 'default'

/** v0's "n セクション後" row under the last item of every section but the last. */
export function SectionAction({ sectionId }: { sectionId: string }) {
  const t = useMessages(creatorMessages)
  const labelId = useId()
  const { dispatch } = useCreatorStore()
  const items = useCreatorSelector((state) => state.survey.items)
  const { warnings } = useItemIssues(sectionId)
  const headers = useMemo(() => items.filter(isSection), [items])
  const index = headers.findIndex((header) => header.id === sectionId)
  const section = headers[index]
  if (!section) return null

  const value =
    section.action?.type === 'submit'
      ? SUBMIT
      : section.action?.type === 'jump'
        ? section.action.targetSectionId
        : CONTINUE
  const setAction = (next: string) =>
    dispatch({
      type: 'updateItem',
      id: sectionId,
      update: (item) => {
        const { action: _previous, ...rest } = item as SectionHeader
        if (next === CONTINUE) return rest as SectionHeader
        return {
          ...rest,
          action:
            next === SUBMIT
              ? { type: 'submit' }
              : { type: 'jump', targetSectionId: next },
        }
      },
    })

  return (
    <div className="mbc:mt-6 mbc:pb-6">
      <div className="mbc:flex mbc:min-w-0 mbc:items-center mbc:gap-2">
        <p
          id={labelId}
          className="mbc:text-muted-foreground mbc:shrink-0 mbc:text-sm mbc:font-medium"
        >
          {t.action.after({ n: index + 1 })}
        </p>
        <Select value={value} onValueChange={setAction}>
          <SelectTrigger
            aria-labelledby={labelId}
            className="mbc:min-w-0 mbc:max-w-[300px] mbc:flex-1 mbc:overflow-hidden mbc:border-0 mbc:bg-transparent mbc:p-1 mbc:shadow-none mbc:focus:ring-0 mbc:focus:ring-offset-0"
          >
            <SelectValue
              placeholder={t.action.continueNext}
              className="mbc:block mbc:min-w-0 mbc:truncate"
            />
          </SelectTrigger>
          <SelectContent className="mbc:max-w-[380px]">
            <SelectItem value={CONTINUE}>{t.action.continueNext}</SelectItem>
            {headers.map((header, i) =>
              header.id === sectionId ? null : (
                <SelectItem key={header.id} value={header.id}>
                  {t.action.goTo({
                    n: i + 1,
                    title: header.title || t.section.untitled,
                  })}
                </SelectItem>
              )
            )}
            <SelectItem value={SUBMIT}>{t.action.submit}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {warnings.length > 0 && (
        <p className="mbc:mt-1 mbc:text-sm mbc:text-amber-700 mbc:dark:text-amber-400">
          {t.errors.missingTarget}
        </p>
      )}
    </div>
  )
}
```

`src/creator/section/section-reorder-dialog.tsx`:

```tsx
'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { GripVertical } from 'lucide-react'
import { useId, useState } from 'react'

import { creatorMessages } from '../i18n/creator-messages'
import { isSection } from '../state/items'
import { useCreatorStore } from '../state/store'

type Row = { id: string; title: string }

function SortableRow({
  row,
  index,
  total,
}: {
  row: Row
  index: number
  total: number
}) {
  const t = useMessages(creatorMessages)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: row.id })
  const title = row.title || t.section.untitled
  return (
    <div
      ref={setNodeRef}
      data-section-row=""
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="mbc:bg-muted/50 mbc:flex mbc:items-center mbc:gap-2 mbc:rounded-lg mbc:p-3"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${title} ${t.question.dragHandle}`}
        className="mbc:cursor-grab mbc:touch-none mbc:rounded-sm mbc:p-1 mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
      >
        <GripVertical
          aria-hidden
          className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
        />
      </button>
      <div>
        <p className="mbc:font-semibold">{title}</p>
        <p className="mbc:text-muted-foreground mbc:text-sm">
          {t.reorder.position({ n: index + 1, total })}
        </p>
      </div>
    </div>
  )
}

function ReorderList({ onDone }: { onDone: () => void }) {
  const t = useMessages(creatorMessages)
  const store = useCreatorStore()
  const dndId = useId()
  const [rows, setRows] = useState<Row[]>(() =>
    store
      .getState()
      .survey.items.filter(isSection)
      .map(({ id, title }) => ({ id, title }))
  )
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setRows((current) =>
      arrayMove(
        current,
        current.findIndex((row) => row.id === active.id),
        current.findIndex((row) => row.id === over.id)
      )
    )
  }
  return (
    <>
      <div className="mbc:flex mbc:max-h-[60vh] mbc:flex-col mbc:gap-2 mbc:overflow-y-auto mbc:p-1">
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={rows.map((row) => row.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row, index) => (
              <SortableRow
                key={row.id}
                row={row}
                index={index}
                total={rows.length}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t.reorder.cancel}
        </Button>
        <Button
          type="button"
          onClick={() => {
            store.dispatch({
              type: 'reorderSections',
              order: rows.map((row) => row.id),
            })
            onDone()
          }}
        >
          {t.reorder.save}
        </Button>
      </DialogFooter>
    </>
  )
}

/** v0's section reorder modal; the list is read from the store each time it opens. */
export function SectionReorderDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useMessages(creatorMessages)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.reorder.title}</DialogTitle>
        </DialogHeader>
        {open && <ReorderList onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web src/creator/section`
Expected: PASS — 13 tests. If the dialog's keyboard reorder does not move, the rows' rects were patched before the sortable nodes registered: call `stackRects` after `getByRole('dialog')` (as written) and before pressing Space. If `DialogContent` lacks an accessible description warning in the console, add `aria-describedby={undefined}` to `DialogContent` (Radix's documented opt-out).

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add the creator section card, section action and reorder dialog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `SurveyCreator` shell, drag and drop, handle; SSR, a11y, playground; gate

**Files:**

- Create: `src/creator/dnd-announcements.ts`, `src/creator/floating-action-bar.tsx`, `src/creator/sortable-question.tsx`, `src/creator/survey-creator.tsx`, `src/creator/survey-creator.test.tsx`, `test/creator-ssr.test.tsx`, `test/creator-a11y.test.tsx`, `apps/playground/src/survey-creator-page.tsx`
- Modify: `src/index.ts`, `apps/playground/src/main.tsx`, `apps/playground/src/toolbar.tsx`

**Interfaces:**

- Consumes: Tasks 1–6, `SurveyForm` (SP5).
- Produces:
  - `type SurveyCreatorHandle = { submit(): Promise<boolean>; reset(next?: SurveyInput): void; getValue(): Survey }` — `submit` validates, shows card errors and moves to the first one when invalid (`false`), otherwise awaits `onSubmit(parsed)` and resolves `true` (a rejection propagates); `reset` loads a survey (or a new one) without calling `onChange`.
  - `type SurveyCreatorProps = { defaultValue?: SurveyInput; onChange?: (survey: Survey, state: { isValid: boolean; isDirty: boolean }) => void; onSubmit?: (survey: Survey) => void | Promise<void>; disabled?: boolean; className?: string }`.
  - `SurveyCreator` (`forwardRef`) — v0's tabs (Creator / Preview / JSON), title card, item list (questions sortable by pointer and keyboard with translated announcements), "n セクション後" rows, floating action bar beside the selected card (`lg+`; fixed bottom-right below `lg`), section reorder dialog. `onChange` fires once per user change (not on mount or `reset`).

- [ ] **Step 1: Write the failing tests**

`src/creator/survey-creator.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LOCKS } from '../../test/fixtures/creator-surveys'
import { classesOf, v0c } from '../../test/v0-creator-classes'
import type { SurveyInput } from '../schema/survey-schema'
import { SurveyCreator, type SurveyCreatorHandle } from './survey-creator'

const sectionIds = (handle: SurveyCreatorHandle) =>
  handle
    .getValue()
    .items.filter((item) => item.type === 'section-header')
    .map((item) => item.id)

function stackRects(selector: string) {
  const rows = () => [...document.querySelectorAll<HTMLElement>(selector)]
  for (const row of rows()) {
    row.getBoundingClientRect = () => {
      const top = rows().indexOf(row) * 120
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        bottom: top + 100,
        right: 600,
        width: 600,
        height: 100,
        toJSON: () => ({}),
      } as DOMRect
    }
  }
}

describe('SurveyCreator', () => {
  it('starts a new survey like v0: title selected, one section, the add bar', async () => {
    render(<SurveyCreator />)
    expect(screen.getByRole('tab', { name: '作成者' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    const title = screen.getByPlaceholderText('アンケートのタイトル')
    expect(title).toHaveValue('未タイトル調査')
    expect(classesOf(title.closest('[class*="border-l-8"]'))).toEqual(
      v0c('title.selected')
    )
    expect(screen.getByText('セクション 1 / 1')).toBeInTheDocument()
    expect(screen.getByText('最初のセクション')).toBeInTheDocument()
    expect(
      await screen.findByRole('toolbar', { name: '項目を追加' })
    ).toBeInTheDocument()
  })

  it('adds a question, focuses its label and reports each change', async () => {
    const onChange = vi.fn()
    render(<SurveyCreator onChange={onChange} />)
    await userEvent.click(
      await screen.findByRole('button', { name: '質問を追加' })
    )
    const label = screen.getByPlaceholderText('質問')
    expect(label).toHaveFocus()
    await userEvent.type(label, 'Q')

    expect(onChange).toHaveBeenCalledTimes(2)
    const [survey, state] = onChange.mock.calls[1]!
    expect(survey.items[1]).toMatchObject({ type: 'short-text', label: 'Q' })
    expect(state).toEqual({ isValid: true, isDirty: true })
  })

  it('applies the lock rules from the floating bar (v0)', async () => {
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} defaultValue={LOCKS} />)
    // v0 selects the first item of a loaded survey: the locked section.
    const addQuestion = await screen.findByRole('button', {
      name: 'ロックされたセクションには質問を追加できません',
    })
    expect(addQuestion).toBeDisabled()
    await userEvent.click(
      screen.getByRole('button', {
        name: 'ロックされたセクションの後にセクションを追加',
      })
    )
    expect(ref.current!.getValue().items[2]).toMatchObject({
      type: 'section-header',
      title: 'セクション 4',
    })

    await userEvent.click(screen.getByRole('button', { name: 'In locked' }))
    expect(
      screen.getByRole('button', {
        name: 'ロックされたセクションには質問を追加できません',
      })
    ).toBeDisabled()
  })

  it('moves a question from the keyboard with translated announcements', async () => {
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} defaultValue={LOCKS} />)
    stackRects('[data-sortable-question]')
    const [handle] = screen.getAllByRole('button', {
      name: 'ドラッグして並べ替え',
    })
    handle!.focus()
    await userEvent.keyboard(' ')
    expect(
      await screen.findByText('「Open question」を持ち上げました。')
    ).toBeInTheDocument()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard(' ')

    expect(ref.current!.getValue().items.map((item) => item.id)).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_locked',
      'sec_last',
      'q_last',
      'q_open',
    ])
    expect(
      await screen.findByText('「Open question」を「Pick」の位置に置きました。')
    ).toBeInTheDocument()
  })

  it('submits only a valid survey and shows card errors otherwise', async () => {
    const onSubmit = vi.fn()
    const ref = createRef<SurveyCreatorHandle>()
    const broken = {
      title: 'T',
      items: [{ id: 'sec_1', type: 'section-header', title: '' }],
    }
    render(
      <SurveyCreator
        ref={ref}
        defaultValue={broken as SurveyInput}
        onSubmit={onSubmit}
      />
    )

    let ok: boolean | undefined
    await act(async () => {
      ok = await ref.current!.submit()
    })
    expect(ok).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText('セクションのタイトルを入力してください')
    ).toBeInTheDocument()

    await userEvent.type(
      screen.getByPlaceholderText('未タイトルセクション'),
      'S'
    )
    await act(async () => {
      ok = await ref.current!.submit()
    })
    expect(ok).toBe(true)
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'T',
      items: [{ id: 'sec_1', type: 'section-header', title: 'S' }],
    })
  })

  it('opens backend JSON without defaults and saves it schema-valid', async () => {
    const onSubmit = vi.fn()
    const ref = createRef<SurveyCreatorHandle>()
    const stored = {
      title: 'T',
      items: [
        { id: 'sec_1', type: 'section-header', title: 'S' },
        { id: 'q_r', type: 'rating', label: 'R', extra: 1 },
      ],
    }
    render(
      <SurveyCreator
        ref={ref}
        defaultValue={stored as SurveyInput}
        onSubmit={onSubmit}
      />
    )
    await act(async () => {
      await ref.current!.submit()
    })
    expect(onSubmit.mock.calls[0]?.[0].items[1]).toEqual({
      id: 'q_r',
      type: 'rating',
      label: 'R',
      levels: 5,
      symbol: 'star',
    })
  })

  it('resets to another survey without calling onChange', async () => {
    const onChange = vi.fn()
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} onChange={onChange} />)
    act(() => ref.current!.reset(LOCKS))
    expect(sectionIds(ref.current!)).toEqual([
      'sec_locked',
      'sec_open',
      'sec_last',
    ])
    expect(screen.getByText('セクション 3 / 3')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reorders sections through the dialog', async () => {
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} defaultValue={LOCKS} />)
    const [, openMenu] = screen.getAllByRole('button', {
      name: 'セクションのオプション',
    })
    await userEvent.click(openMenu!)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'セクションを移動' })
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'セクションを移動',
    })
    await userEvent.click(within(dialog).getByRole('button', { name: '保存' }))
    expect(sectionIds(ref.current!)).toEqual([
      'sec_locked',
      'sec_open',
      'sec_last',
    ])
  })

  it('previews the current survey and notes a preview submit', async () => {
    render(
      <SurveyCreator
        defaultValue={{
          title: 'Preview me',
          items: [
            { id: 's', type: 'section-header', title: 'S' },
            { id: 'q', type: 'short-text', label: 'Q' },
          ],
        }}
      />
    )
    await userEvent.click(screen.getByRole('tab', { name: 'プレビュー' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Preview me' })
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートを送信' })
    )
    expect(
      await screen.findByText('プレビューが送信されました。')
    ).toBeInTheDocument()
  })

  it('shows live JSON', async () => {
    render(<SurveyCreator defaultValue={LOCKS} />)
    await userEvent.click(screen.getByRole('tab', { name: 'JSON' }))
    expect(await screen.findByText(/"title": "Locks"/)).toBeInTheDocument()
  })

  it('disables every control when disabled', async () => {
    render(<SurveyCreator defaultValue={LOCKS} disabled />)
    expect(screen.getByRole('tab', { name: 'プレビュー' })).toBeDisabled()
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'ロックされたセクションの後にセクションを追加',
        })
      ).toBeDisabled()
    )
  })

  it('speaks English', () => {
    render(
      <MbcProvider locale="en">
        <SurveyCreator />
      </MbcProvider>
    )
    expect(screen.getByRole('tab', { name: 'Creator' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Survey title')).toHaveValue(
      'Untitled survey'
    )
  })
})
```

`test/creator-ssr.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SurveyCreator } from '../src/creator/survey-creator'
import { LOCKS } from './fixtures/creator-surveys'

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
  return { recoverable, logged }
}

describe('SurveyCreator server rendering', () => {
  it('hydrates a new survey although its ids are random', async () => {
    expect(
      await hydrate(
        <MbcProvider>
          <SurveyCreator />
        </MbcProvider>
      )
    ).toEqual({ recoverable: [], logged: 0 })
  })

  it('hydrates a loaded survey', async () => {
    expect(
      await hydrate(
        <MbcProvider>
          <SurveyCreator defaultValue={LOCKS} />
        </MbcProvider>
      )
    ).toEqual({ recoverable: [], logged: 0 })
  })
})
```

`test/creator-a11y.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { SurveyCreator } from '../src/creator/survey-creator'
import type { Survey } from '../src/schema/survey-schema'

const everyType: Survey = {
  title: 'All types',
  items: [
    { id: 's1', type: 'section-header', title: 'One' },
    {
      id: 'a',
      type: 'short-text',
      label: 'Short',
      validation: { custom: { type: 'number', rule: 'between' } },
    },
    { id: 'b', type: 'long-text', label: 'Long' },
    {
      id: 'c',
      type: 'single-choice',
      label: 'Single',
      options: [
        { value: 'x', label: 'x', nextSectionId: 's2' },
        { value: 'other', label: 'Other', isOther: true },
      ],
    },
    {
      id: 'd',
      type: 'multiple-choice',
      label: 'Multiple',
      options: [{ value: 'x', label: 'x' }],
      validation: { custom: { rule: 'min', value: 1 } },
    },
    { id: 's2', type: 'section-header', title: 'Two', locked: true },
    {
      id: 'e',
      type: 'dropdown',
      label: 'Dropdown',
      options: [{ value: 'x', label: 'x' }],
    },
    { id: 'f', type: 'linear-scale', label: 'Scale', min: 1, max: 5 },
    { id: 'g', type: 'rating', label: 'Rating', levels: 5, symbol: 'star' },
    {
      id: 'h',
      type: 'date',
      label: 'Date',
      includeTime: true,
      includeYear: true,
    },
    { id: 'i', type: 'time', label: 'Time', answerType: 'time', locked: true },
  ],
}

const run = async () => {
  const result = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`
  )
}

describe('SurveyCreator accessibility', () => {
  it('has no axe violations in view mode', async () => {
    render(<SurveyCreator defaultValue={everyType} />)
    expect(await run()).toEqual([])
  })

  it('has no axe violations with each editor open', async () => {
    render(<SurveyCreator defaultValue={everyType} />)
    for (const name of [
      'Short',
      'Single',
      'Multiple',
      'Scale',
      'Rating',
      'Date',
    ]) {
      await userEvent.click(screen.getByRole('button', { name }))
      expect(await run(), name).toEqual([])
    }
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web survey-creator creator-ssr creator-a11y`
Expected: FAIL — cannot resolve `./survey-creator` / `../src/creator/survey-creator`.

- [ ] **Step 3: Implement**

`src/creator/dnd-announcements.ts`:

```ts
import type { Announcements } from '@dnd-kit/core'

import type { CreatorMessages } from './i18n/creator-messages'

/** dnd-kit's live-region text, translated; `label` names an item by id. */
export function announcements(
  t: CreatorMessages,
  label: (id: string) => string
): Announcements {
  const name = (id: string | number) => label(String(id))
  return {
    onDragStart: ({ active }) => t.dnd.pickedUp({ label: name(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t.dnd.movedOver({ label: name(active.id), over: name(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t.dnd.dropped({ label: name(active.id), over: name(over.id) })
        : t.dnd.droppedNowhere({ label: name(active.id) }),
    onDragCancel: ({ active }) => t.dnd.cancelled({ label: name(active.id) }),
  }
}
```

`src/creator/floating-action-bar.tsx`:

```tsx
'use client'

import {
  Button,
  Card,
  Separator,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Plus, Tally4, Text, Type } from 'lucide-react'
import type { CSSProperties } from 'react'

import { creatorMessages } from './i18n/creator-messages'

/**
 * v0's bar beside the selected card (lg and up). Below lg it would overflow
 * the viewport, so it is fixed at the bottom right instead.
 */
export function FloatingActionBar({
  top,
  canAddQuestion,
  afterLocked,
  onAddQuestion,
  onAddSection,
}: {
  top: number
  canAddQuestion: boolean
  afterLocked: boolean
  onAddQuestion: () => void
  onAddSection: () => void
}) {
  const t = useMessages(creatorMessages)
  const addQuestion = canAddQuestion
    ? t.toolbar.addQuestion
    : t.toolbar.addQuestionLocked
  const addSection = afterLocked
    ? t.toolbar.addSectionAfterLocked
    : t.toolbar.addSection
  return (
    <Card
      role="toolbar"
      aria-label={t.toolbar.label}
      style={{ '--mbc-bar-top': `${top}px` } as CSSProperties}
      className="mbc:fixed mbc:bottom-4 mbc:right-4 mbc:z-20 mbc:flex mbc:flex-row mbc:items-center mbc:gap-2 mbc:p-2 mbc:transition-all mbc:duration-150 mbc:lg:absolute mbc:lg:bottom-auto mbc:lg:right-[-80px] mbc:lg:top-(--mbc-bar-top) mbc:lg:translate-y-[10%] mbc:lg:flex-col"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canAddQuestion}
        onClick={onAddQuestion}
        title={addQuestion}
        aria-label={addQuestion}
      >
        <Plus aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title={t.toolbar.importQuestions}
        aria-label={t.toolbar.importQuestions}
      >
        <Text aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title={t.toolbar.addTitle}
        aria-label={t.toolbar.addTitle}
      >
        <Type aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
      <Separator className="mbc:max-lg:hidden" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onAddSection}
        title={addSection}
        aria-label={addSection}
      >
        <Tally4 aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
    </Card>
  )
}
```

`src/creator/sortable-question.tsx`:

```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo } from 'react'

import { QuestionCard } from './question/question-card'
import { canDrag } from './state/locks'
import { useCreatorSelector } from './state/store'

/** Questions in locked sections are neither draggable nor drop targets (v0). */
export function SortableQuestion({ id }: { id: string }) {
  const draggable = useCreatorSelector((state) => {
    const items = state.survey.items
    return canDrag(
      items,
      items.findIndex((item) => item.id === id)
    )
  })
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled: !draggable })
  const handle = useMemo(
    () => ({ attributes, listeners, setActivatorNodeRef }),
    [attributes, listeners, setActivatorNodeRef]
  )
  return (
    <div
      ref={setNodeRef}
      data-sortable-question=""
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <QuestionCard id={id} handle={handle} />
    </div>
  )
}
```

`src/creator/survey-creator.tsx`:

```tsx
'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Alert,
  AlertDescription,
  cn,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  forwardRef,
  Fragment,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type MouseEvent,
  type RefAttributes,
  type RefObject,
} from 'react'

import { SurveyForm } from '../form/survey-form'
import type { Survey, SurveyInput } from '../schema/survey-schema'
import {
  createCreatorUi,
  createValueStore,
  CreatorUiProvider,
  IssueList,
  useCreatorUi,
  type CreatorUi,
  type IssueState,
} from './creator-ui'
import { announcements } from './dnd-announcements'
import { FloatingActionBar } from './floating-action-bar'
import { creatorMessages } from './i18n/creator-messages'
import { SectionAction } from './section/section-action'
import { SectionCard } from './section/section-card'
import { SectionReorderDialog } from './section/section-reorder-dialog'
import { SortableQuestion } from './sortable-question'
import {
  createQuestion,
  createSection,
  initialCreatorState,
} from './state/defaults'
import {
  isInLockedSection,
  isSection,
  questionInsertIndex,
} from './state/items'
import {
  createCreatorStore,
  CreatorStoreProvider,
  useCreatorSelector,
  useCreatorStore,
  type CreatorStore,
} from './state/store'
import { TITLE_ID } from './state/types'
import { validateDraft, type DraftReport } from './state/validate'

export type SurveyCreatorHandle = {
  /** Validates; when invalid, shows the card errors, moves to the first and resolves `false`. Otherwise awaits `onSubmit`. */
  submit(): Promise<boolean>
  /** Loads `next` (or a new survey) without calling `onChange`. */
  reset(next?: SurveyInput): void
  getValue(): Survey
}

export type SurveyCreatorProps = {
  /** Read on mount; load another survey with `ref.reset(next)` or a `key`. */
  defaultValue?: SurveyInput
  /** Once per user change (not on mount or `reset`). */
  onChange?: (
    survey: Survey,
    state: { isValid: boolean; isDirty: boolean }
  ) => void
  onSubmit?: (survey: Survey) => void | Promise<void>
  disabled?: boolean
  className?: string
}

type Row = { id: string; section: boolean }

/** The list's shape as a string, so typing in a card does not re-render the list. */
function useRows(): Row[] {
  const key = useCreatorSelector((state) =>
    state.survey.items
      .map((item) => `${isSection(item) ? 's' : 'q'}${item.id}`)
      .join('\n')
  )
  return useMemo(
    () =>
      key
        ? key
            .split('\n')
            .map((part) => ({ section: part[0] === 's', id: part.slice(1) }))
        : [],
    [key]
  )
}

function TitleCard() {
  const t = useMessages(creatorMessages)
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const titleRef = useRef<HTMLInputElement>(null)
  const selected = useCreatorSelector((state) => state.selectedId === TITLE_ID)
  const title = useCreatorSelector((state) => state.survey.title)
  const description = useCreatorSelector(
    (state) => state.survey.description ?? ''
  )

  useEffect(() => {
    if (selected && ui.takeFocus(TITLE_ID)) titleRef.current?.focus()
  }, [selected, ui])

  const select = (fromKeyboard: boolean) => {
    if (fromKeyboard) ui.requestFocus(TITLE_ID)
    dispatch({ type: 'select', id: TITLE_ID })
  }
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selected && event.currentTarget.contains(event.target as Node))
      select(false)
  }

  return (
    <div
      ref={ui.cardRef(TITLE_ID)}
      onClick={onClick}
      className={cn(
        'mbc:cursor-pointer mbc:rounded-lg mbc:border-l-8 mbc:p-6',
        selected
          ? 'mbc:border-primary mbc:bg-card mbc:shadow-lg'
          : 'mbc:bg-muted/30 mbc:border-gray-300'
      )}
    >
      {selected ? (
        <div className="mbc:flex mbc:flex-col mbc:gap-2">
          <Input
            ref={titleRef}
            value={title}
            placeholder={t.shell.surveyTitlePlaceholder}
            aria-label={t.shell.surveyTitlePlaceholder}
            onChange={(event) =>
              dispatch({ type: 'updateSurvey', title: event.target.value })
            }
            className="mbc:h-12 mbc:border-0 mbc:px-0 mbc:text-3xl mbc:font-bold mbc:shadow-none"
          />
          <Input
            value={description}
            placeholder={t.shell.surveyDescriptionPlaceholder}
            aria-label={t.shell.surveyDescriptionPlaceholder}
            onChange={(event) =>
              dispatch({
                type: 'updateSurvey',
                description: event.target.value,
              })
            }
            className="mbc:border-0 mbc:px-0 mbc:shadow-none"
          />
        </div>
      ) : (
        <div>
          <h2 className="mbc:text-3xl mbc:font-bold">
            <button
              type="button"
              className="mbc:rounded-sm mbc:text-left mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
              onClick={(event) => select(event.detail === 0)}
            >
              {title || t.shell.surveyTitlePlaceholder}
            </button>
          </h2>
          <p className="mbc:text-muted-foreground mbc:mt-1">
            {description || t.shell.surveyDescriptionPlaceholder}
          </p>
        </div>
      )}
      <IssueList
        id={TITLE_ID}
        className="mbc:mt-2 mbc:flex mbc:flex-col mbc:gap-1"
      />
    </div>
  )
}

function ItemList() {
  const t = useMessages(creatorMessages)
  const store = useCreatorStore()
  const rows = useRows()
  const dndId = useId()
  const restore = useRef<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const accessibility = useMemo(
    () => ({
      announcements: announcements(t, (id) => {
        const item = store
          .getState()
          .survey.items.find((entry) => entry.id === id)
        if (!item) return ''
        return isSection(item)
          ? item.title || t.section.untitled
          : item.label || t.question.newQuestion
      }),
      screenReaderInstructions: { draggable: t.dnd.instructions },
    }),
    [t, store]
  )
  const lastSection = rows.filter((row) => row.section).at(-1)?.id
  // Each row's section, for the "n セクション後" rows.
  const owners: (string | null)[] = []
  let owner: string | null = null
  for (const row of rows) {
    if (row.section) owner = row.id
    owners.push(owner)
  }
  const questionIds = rows.filter((row) => !row.section).map((row) => row.id)

  // v0: the selection is set aside while dragging and restored afterwards.
  const onDragStart = () => {
    restore.current = store.getState().selectedId
    store.dispatch({ type: 'select', id: null })
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      store.dispatch({
        type: 'move',
        id: String(active.id),
        overId: String(over.id),
      })
    }
    store.dispatch({ type: 'select', id: restore.current })
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() =>
        store.dispatch({ type: 'select', id: restore.current })
      }
      accessibility={accessibility}
    >
      <SortableContext
        items={questionIds}
        strategy={verticalListSortingStrategy}
      >
        {rows.map((row, index) => {
          const section = owners[index] ?? null
          const endsSection =
            index === rows.length - 1 || rows[index + 1]?.section === true
          const actionFor =
            endsSection && section !== null && section !== lastSection
              ? section
              : null
          return (
            <Fragment key={row.id}>
              {row.section ? (
                <SectionCard id={row.id} />
              ) : (
                <SortableQuestion id={row.id} />
              )}
              {actionFor && <SectionAction sectionId={actionFor} />}
            </Fragment>
          )
        })}
      </SortableContext>
    </DndContext>
  )
}

function Toolbar({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const t = useMessages(creatorMessages)
  const store = useCreatorStore()
  const ui = useCreatorUi()
  const selectedId = useCreatorSelector((state) => state.selectedId)
  const items = useCreatorSelector((state) => state.survey.items)
  const index = items.findIndex((item) => item.id === selectedId)
  const canAddQuestion = questionInsertIndex(items, index) !== null
  const afterLocked = index >= 0 && isInLockedSection(items, index)
  const [top, setTop] = useState<number | null>(null)

  useEffect(() => {
    const measure = () => {
      const card = selectedId ? ui.getCard(selectedId) : undefined
      const container = containerRef.current
      setTop(
        card && container
          ? card.getBoundingClientRect().top -
              container.getBoundingClientRect().top
          : null
      )
    }
    // Layout is outside React: measure after every commit that can move the card.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [selectedId, items, ui, containerRef])

  if (top === null) return null
  return (
    <FloatingActionBar
      top={top}
      canAddQuestion={canAddQuestion}
      afterLocked={afterLocked}
      onAddQuestion={() => {
        const question = createQuestion()
        ui.requestFocus(question.id)
        store.dispatch({ type: 'addQuestion', question })
      }}
      onAddSection={() => {
        const n = store.getState().survey.items.filter(isSection).length + 1
        const section = createSection(t.shell.newSection({ n }))
        ui.requestFocus(section.id)
        store.dispatch({ type: 'addSection', section })
      }}
    />
  )
}

function PreviewPane({ survey }: { survey: Survey | null }) {
  const t = useMessages(creatorMessages)
  const [submissions, setSubmissions] = useState(0)
  if (!survey) return null
  return (
    <div className="mbc:bg-card mbc:rounded-lg mbc:border mbc:border-border mbc:p-4 mbc:md:p-8">
      {submissions > 0 && (
        <Alert className="mbc:mb-4">
          <AlertDescription>{t.shell.previewSubmitted}</AlertDescription>
        </Alert>
      )}
      <SurveyForm
        key={submissions}
        schema={survey}
        onSubmit={() => setSubmissions((n) => n + 1)}
      />
    </div>
  )
}

function JsonPane() {
  const t = useMessages(creatorMessages)
  const survey = useCreatorSelector((state) => state.survey)
  return (
    <div className="mbc:sticky mbc:top-4">
      <h3 className="mbc:mb-2 mbc:text-lg mbc:font-semibold">
        {t.shell.jsonTitle}
      </h3>
      <pre className="mbc:bg-secondary mbc:text-secondary-foreground mbc:max-h-[80vh] mbc:overflow-auto mbc:rounded-md mbc:p-4 mbc:text-sm">
        {JSON.stringify(survey, null, 2)}
      </pre>
    </div>
  )
}

/** Selects the first card with an error and focuses its first control once it has rendered. */
function revealFirstIssue(
  store: CreatorStore,
  ui: CreatorUi,
  report: DraftReport
) {
  const order = [
    TITLE_ID,
    ...store.getState().survey.items.map((item) => item.id),
  ]
  const id = order.find((candidate) => report.errors[candidate]?.length)
  if (!id) return
  store.dispatch({ type: 'select', id })
  setTimeout(() => {
    const card = ui.getCard(id)
    card?.scrollIntoView?.({ block: 'center' })
    card
      ?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled])'
      )
      ?.focus()
  }, 0)
}

export const SurveyCreator: ForwardRefExoticComponent<
  SurveyCreatorProps & RefAttributes<SurveyCreatorHandle>
> = forwardRef<SurveyCreatorHandle, SurveyCreatorProps>(function SurveyCreator(
  { defaultValue, onChange, onSubmit, disabled = false, className },
  ref
) {
  const t = useMessages(creatorMessages)
  const [store] = useState(() =>
    createCreatorStore(initialCreatorState(defaultValue, t.shell))
  )
  const [issues] = useState(() =>
    createValueStore<IssueState>({
      report: validateDraft(store.getState().survey),
      showErrors: false,
    })
  )
  const [reorderOpen, setReorderOpen] = useState(false)
  const [ui] = useState(() =>
    createCreatorUi(issues, () => setReorderOpen(true))
  )
  const [preview, setPreview] = useState<Survey | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onChange, onSubmit })

  useEffect(() => {
    callbacks.current = { onChange, onSubmit }
  })

  useEffect(() => {
    let previous = store.getState()
    return store.subscribe(() => {
      const next = store.getState()
      if (next.survey !== previous.survey) {
        const report = validateDraft(next.survey)
        issues.set({ report, showErrors: issues.get().showErrors })
        // `reset` clears `dirty`; only user changes reach the host.
        if (next.dirty)
          callbacks.current.onChange?.(next.survey, {
            isValid: report.valid,
            isDirty: true,
          })
      }
      previous = next
    })
  }, [store, issues])

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const report = validateDraft(store.getState().survey)
        issues.set({ report, showErrors: true })
        if (!report.valid || !report.data) {
          revealFirstIssue(store, ui, report)
          return false
        }
        await callbacks.current.onSubmit?.(report.data)
        return true
      },
      reset(next) {
        const state = initialCreatorState(next, t.shell)
        store.dispatch({
          type: 'reset',
          survey: state.survey,
          selectedId: state.selectedId,
        })
        issues.set({ report: validateDraft(state.survey), showErrors: false })
      },
      getValue: () => store.getState().survey,
    }),
    [store, issues, ui, t]
  )

  return (
    <CreatorStoreProvider store={store}>
      <CreatorUiProvider value={ui}>
        <div
          data-mbc=""
          className={cn(
            disabled && 'mbc:pointer-events-none mbc:opacity-50',
            className
          )}
        >
          <fieldset
            disabled={disabled}
            className="mbc:m-0 mbc:min-w-0 mbc:border-0 mbc:p-0"
          >
            <Tabs
              defaultValue="creator"
              className="mbc:w-full"
              onValueChange={(tab) => {
                if (tab === 'preview') setPreview(store.getState().survey)
              }}
            >
              <TabsList className="mbc:grid mbc:w-full mbc:grid-cols-3">
                <TabsTrigger value="creator">{t.shell.creatorTab}</TabsTrigger>
                <TabsTrigger value="preview">{t.shell.previewTab}</TabsTrigger>
                <TabsTrigger value="json">{t.shell.jsonTab}</TabsTrigger>
              </TabsList>
              <TabsContent value="creator" className="mbc:pt-6">
                <div
                  ref={containerRef}
                  className="mbc:relative mbc:mx-auto mbc:flex mbc:w-full mbc:max-w-4xl mbc:gap-x-12"
                >
                  <div className="mbc:w-full">
                    <div className="mbc:flex mbc:flex-col mbc:gap-4">
                      <TitleCard />
                      <ItemList />
                    </div>
                  </div>
                  <Toolbar containerRef={containerRef} />
                </div>
              </TabsContent>
              <TabsContent value="preview" className="mbc:pt-6">
                <PreviewPane survey={preview} />
              </TabsContent>
              <TabsContent value="json" className="mbc:pt-6">
                <JsonPane />
              </TabsContent>
            </Tabs>
          </fieldset>
          <SectionReorderDialog
            open={reorderOpen}
            onOpenChange={setReorderOpen}
          />
        </div>
      </CreatorUiProvider>
    </CreatorStoreProvider>
  )
})
```

Append to `src/index.ts`:

```ts
export {
  SurveyCreator,
  type SurveyCreatorHandle,
  type SurveyCreatorProps,
} from './creator/survey-creator'
```

- [ ] **Step 4: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web survey-creator creator-ssr creator-a11y`
Expected: PASS — 12 + 2 + 2 = 16 tests. Likely adjustments, each a ruling in the ledger:

- If the keyboard drag test finds no drop target, check that `stackRects` patched the sortable wrappers after render and that the locked questions' wrappers (disabled sortables) do not register as droppables.
- If hydration logs an `aria-describedby` mismatch, a DndContext is missing its `id` (dnd-kit otherwise counts ids per module).
- An axe `nested-interactive` violation means a focusable element landed inside another one: cards select through their label button, never through a wrapper role.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(survey-web): add SurveyCreator with tabs, drag and drop and a ref handle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Playground page and probe (evon gate 3)**

`apps/playground/src/survey-creator-page.tsx`:

```tsx
import {
  SurveyCreator,
  type Survey,
  type SurveyCreatorHandle,
} from '@mbc-cqrs-serverless/survey-web'
import { Button } from '@mbc-cqrs-serverless/ui-web'
import { useRef, useState } from 'react'

const SAMPLE: Survey = {
  title: '顧客満足度調査 2026',
  description: 'サンプルの説明文です。',
  items: [
    {
      id: 'sec_basic',
      type: 'section-header',
      title: '基本情報',
      locked: true,
    },
    {
      id: 'q_name',
      type: 'short-text',
      label: 'お名前',
      validation: { required: true },
      locked: true,
    },
    { id: 'sec_eval', type: 'section-header', title: '評価' },
    {
      id: 'q_route',
      type: 'single-choice',
      label: '通勤手段',
      options: [
        { value: '車', label: '車', nextSectionId: 'sec_end' },
        { value: '電車', label: '電車' },
        { value: 'other', label: 'その他', isOther: true },
      ],
    },
    {
      id: 'q_stars',
      type: 'rating',
      label: '満足度',
      levels: 5,
      symbol: 'star',
    },
    { id: 'sec_end', type: 'section-header', title: 'おわりに' },
    { id: 'q_note', type: 'long-text', label: 'ご意見' },
  ],
}

export function SurveyCreatorPage() {
  const ref = useRef<SurveyCreatorHandle>(null)
  const [state, setState] = useState('')
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Button
          onClick={async () =>
            setState((await ref.current?.submit()) ? 'saved' : 'invalid')
          }
        >
          Save
        </Button>
        <span>{state}</span>
      </div>
      <SurveyCreator
        ref={ref}
        defaultValue={SAMPLE}
        onChange={(_, { isValid }) =>
          setState(isValid ? 'valid, unsaved' : 'invalid, unsaved')
        }
        onSubmit={() => {}}
      />
    </div>
  )
}
```

In `apps/playground/src/main.tsx` render `hash === '#creator' ? <SurveyCreatorPage /> : hash === '#survey' ? <SurveyFormPage /> : <Gallery />` (import `SurveyCreatorPage`), and in `toolbar.tsx` add `<a href="#creator">Survey creator</a>` after the survey link.

Run: `$N pnpm build && $N pnpm --filter @mbc-cqrs-serverless/playground typecheck && $N pnpm --filter @mbc-cqrs-serverless/playground build`, start `$N pnpm --filter @mbc-cqrs-serverless/playground preview --port 4173 --strictPort` in the background, then:

```bash
$N node /Users/uzumakiruto017/.claude/plugins/cache/evondevkit/evon/0.3.13/skills/ui-ux/scripts/probe.mjs "http://localhost:4173/#creator" --widths 375,1280 --out .superpowers/sdd/2026-10-06-06-sp6-survey-creator/probe/creator --pw "$TMPDIR/evon-probe"
```

Expected: no horizontal scroll at 375px (the bar is fixed bottom-right there); at 1280px the bar sits right of the selected card as in v0. Open the screenshots and compare with v0's creator layout; ledger new look items as proposed fixes, fix layout breaks. Stop the server.

- [ ] **Step 7: Build output, commit, gate**

The build-output test from SP5 already requires `"use client"` on every JSX module and keeps `core/` React-free; run it after `pnpm build`.

```bash
git add -A
git commit -m "feat(playground): add the survey creator page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Standard gate (orchestrator): `pnpm verify` on React 19 and 18, restore, clean tree. Final whole-branch review; fix Critical/Important RED→GREEN. Update spec §6.3's floating-bar sentence to v0's tested behaviour (the bar stays, add-question disabled) and §6.1's registry note (editors live in `src/creator/question/`, renderers in `src/question-types/`). Tick SP6 in the orchestrator; `git switch main && git merge --ff-only sp6-survey-creator`.
