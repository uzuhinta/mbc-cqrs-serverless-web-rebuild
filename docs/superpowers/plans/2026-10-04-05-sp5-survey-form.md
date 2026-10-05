# SP5 — `SurveyForm` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `SurveyForm` — the respondent-facing form — rebuilt on `ui-web` and the SP4 engine: sections with Back/Next/Submit and branching, nine question renderers that keep v0's look, async submit with error handling, focus management, server-rendering safety, and translated text.

**Architecture:** Renderers are small controlled components (`value`, `onChange`, `onBlur`, `disabled`, `invalid`) registered per question kind; they know nothing about react-hook-form, so hosts can replace one through `components`. `SurveyForm` owns react-hook-form, wraps each question in `QuestionField` (v0's card, label, description, error — built on ui-web `Field`), validates the current section through a resolver built on `validateAnswer`, keeps the visited-section history, and submits `collectAnswers(pages, history, values)`.

**Tech Stack:** SP1–SP4 + `react-hook-form` ^7.89.0. Dates use `Intl.DateTimeFormat` (no date-fns).

**Spec:** `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md` §5.1 (`SurveyForm`), §6.1, §6.2, §6.4–6.6. Orchestrator SP5 notes (SP2 review). v0 sources: `../mbc-cqrs-serverless-web/packages/survey/src/forms/survey-form.tsx`, `src/renderers/question-wrapper.tsx`, `src/renderers/question-types/*.tsx`, `src/components/Date*PickerWithYearControl.tsx`.

## Global Constraints

- Commands: `fnm exec --using=v24.13.0 -- <command>` (`$N`), from `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`.
- Saved answers stay v0-compatible (SP4 Global Constraints) plus: linear scale and rating answers are **numbers** (v0 `parseInt` / `onChange(num)`).
- Look: v0's classes with `mbc:`; no `space-x-*`/`space-y-*` (zero-specificity, SP1 review) — use `gap-*` or margins with the same result; borders state `mbc:border-border`.
- No React-19-only APIs; `"use client"` on every component module; no `window`/`document` during render or at module scope; generated ids via `useId`.
- All text from `survey` / `ui` messages. Prettier; Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Per-task final test command (exit code): `$N pnpm build && $N pnpm vitest run`.

## Behaviour changes from v0 (for MIGRATION.md)

1. **Linear scale starts at the schema's `min`** (default 0). v0 used `min || 1`, so `0` was never selectable and a 0–10 scale showed 1–10.
2. **Multiple choice keeps "Other" when a regular option is ticked.** v0 removed it on every regular tick.
3. **Rating is a keyboard-operable radio group** (v0: clickable `div`s, mouse only). Same icons and colours.
4. **Date-time without a year writes year 0 consistently** (v0 wrote 2000 from the calendar and 0 from the time selects); for questions with `includeYear: false` the year is ignored when reading.
5. **Hard-coded Japanese placeholders and units come from the `survey` messages** (same Japanese defaults).
6. **Enter in a field on a non-final section goes to the next section** (v0 submitted the whole survey from any section).

## Review Focus

1. **`renderToString` of a survey with `shuffleOptions`, then hydration** → identical markup on server and first client render (shuffle runs after mount), no `window` access. Pinned in Task 7.
2. **Next with an invalid required field** → stays on the section, shows the translated error, and focus lands on that field with `aria-describedby` already pointing at the error. Pinned in Task 6.
3. **Branch A filled, Back, branch B submitted** → A's answers are `undefined` in `answers` and `meta`. Pinned in Task 6.
4. **`onSubmit` rejects** → values stay, a translated error shows, buttons re-enable, `onSubmitError` gets the error; a second click submits again. Pinned in Task 6.
5. **`defaultValues` from v0 (time object, `other:` text, numeric rating)** → shown in the right controls and resubmitted unchanged. Pinned in Tasks 3–6.

---

## File Structure

```
packages/survey-web/
├─ package.json                                  (+ react-hook-form)           Task 1
├─ src/
│  ├─ i18n/survey-messages.ts                     (+ form placeholders, units) Task 1
│  ├─ question-types/
│  │  ├─ types.ts                                 QuestionRendererProps        Task 1
│  │  ├─ use-shuffled.ts (+test)                  shuffle after mount          Task 1
│  │  ├─ short-text.tsx, long-text.tsx (+test)                                 Task 2
│  │  ├─ single-choice.tsx, multiple-choice.tsx, dropdown.tsx (+test)           Task 3
│  │  ├─ linear-scale.tsx, rating.tsx (+test)                                  Task 4
│  │  ├─ date.tsx, time.tsx (+test)                                            Task 5
│  │  └─ registry.ts                              kind → renderer              Task 5
│  ├─ form/
│  │  ├─ question-field.tsx (+test)               v0 QuestionWrapper on Field   Task 1
│  │  ├─ resolver.ts (+test)                      section-scoped RHF resolver   Task 6
│  │  ├─ survey-form.tsx (+test)                  SurveyForm                    Task 6
│  │  └─ focus.ts                                 focus first invalid field     Task 6
│  └─ index.ts                                    exports                       Tasks 1–7
└─ test/
   ├─ fixtures/form-surveys.ts                    sample surveys for form tests Task 6
   ├─ ssr.test.tsx, a11y.test.tsx                                              Task 7
apps/playground/src/survey-form-page.tsx          playground page               Task 7
```

---

### Task 1: Foundations — messages, renderer contract, `QuestionField`, shuffling

**Files:**

- Modify: `packages/survey-web/package.json`, `src/i18n/survey-messages.ts`, `src/index.ts`
- Create: `src/question-types/types.ts`, `src/question-types/use-shuffled.ts`, `src/question-types/use-shuffled.test.ts`, `src/form/question-field.tsx`, `src/form/question-field.test.tsx`, `test/v0-classes.ts`

**Interfaces:**

- Produces:
  - `SurveyMessages['form']` gains `placeholder`, `otherPlaceholder`, `selectPlaceholder`, `datePlaceholder`, `datePlaceholderNoYear`, `dateTimePlaceholder`, `dateTimePlaceholderNoYear`, `hour`, `minute`, `hours`, `minutes`, `seconds`, `rating: (params: { value: number; max: number }) => string`.
  - `type QuestionRendererProps<Q extends SurveyQuestion = SurveyQuestion> = { question: Q; value: SurveyAnswerValue; onChange: (value: SurveyAnswerValue) => void; onBlur: () => void; disabled: boolean; invalid: boolean }`
  - `useShuffled<T>(items: readonly T[], enabled: boolean, random?: () => number): readonly T[]` — returns `items` on the first render (server and hydration agree), a shuffled copy after mount when `enabled`.
  - `QuestionField({ questionId, label, description?, required?, error?, children })` — v0's card (`data-question-id`), `Field` with `FieldLabel` (required asterisk), `FieldDescription`, `FieldError` (`role="alert"`), children container.
  - `V0` fixture (survey-web) with v0 class strings used by Tasks 1–6.

- [ ] **Step 1: Branch and dependency**

```bash
git switch main && git switch -c sp5-survey-form
$N pnpm --filter @mbc-cqrs-serverless/survey-web add react-hook-form@^7.89.0
```

`SurveyAnswerValue` already includes `number` (SP4 review fix), and `validateAnswer` accepts finite numbers for rating and linear scale. Run `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck` — expected exit 0.

- [ ] **Step 2: Extend the messages**

In `src/i18n/survey-messages.ts`, add to `SurveyMessages['form']`:

```ts
placeholder: string
otherPlaceholder: string
selectPlaceholder: string
datePlaceholder: string
datePlaceholderNoYear: string
dateTimePlaceholder: string
dateTimePlaceholderNoYear: string
hour: string
minute: string
hours: string
minutes: string
seconds: string
rating: (params: { value: number; max: number }) => string
```

`ja.form` additions (v0's strings):

```ts
    placeholder: '回答を入力...',
    otherPlaceholder: 'その他の回答を入力...',
    selectPlaceholder: 'オプションを選択してください...',
    datePlaceholder: '年月日を選択してください',
    datePlaceholderNoYear: '月日を選択してください',
    dateTimePlaceholder: '年月日時を選択してください',
    dateTimePlaceholderNoYear: '月日時を選択してください',
    hour: '時',
    minute: '分',
    hours: '時間',
    minutes: '分',
    seconds: '秒',
    rating: ({ value, max }) => `${max}段階中${value}`,
```

`en.form` additions:

```ts
    placeholder: 'Enter your answer...',
    otherPlaceholder: 'Enter your other answer...',
    selectPlaceholder: 'Choose an option...',
    datePlaceholder: 'Select a date',
    datePlaceholderNoYear: 'Select a month and day',
    dateTimePlaceholder: 'Select a date and time',
    dateTimePlaceholderNoYear: 'Select a month, day and time',
    hour: 'h',
    minute: 'min',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    rating: ({ value, max }) => `${value} of ${max}`,
```

- [ ] **Step 3: Write the failing tests**

`test/v0-classes.ts` (survey-web) — v0 strings with SP5's rulings (space-* → gap/margins, `border-border` added):

```ts
/** v0 class strings for survey-web components (Tailwind v4 reading, rulings applied). */
export const V0 = {
  // renderers/question-wrapper.tsx
  'question.card':
    'bg-card text-card-foreground focus-within:ring-ring mb-8 rounded-lg border border-border p-6 shadow-sm transition-all duration-300 ease-in-out focus-within:ring-2',
  'question.label': 'text-lg font-semibold leading-relaxed tracking-tight',
  'question.description': 'text-muted-foreground mb-4 mt-1 text-sm font-normal',
  'question.body': 'mt-4',
  'question.error':
    'text-destructive dark:text-red-400 mt-2 text-sm font-medium',
} as const
```

`src/question-types/use-shuffled.test.ts`:

```ts
import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { useShuffled } from './use-shuffled'

const ITEMS = ['a', 'b', 'c', 'd']
const reverse = (() => {
  let call = 0
  // Math.random sequence that makes Fisher–Yates reverse the array.
  return () => [0.99, 0, 0.99, 0][call++ % 4] ?? 0
})()

describe('useShuffled', () => {
  it('renders the original order on the server', () => {
    function Probe() {
      return createElement('p', null, useShuffled(ITEMS, true).join(''))
    }
    expect(renderToString(createElement(Probe))).toBe('<p>abcd</p>')
  })

  it('shuffles after mount when enabled', () => {
    const { result } = renderHook(() => useShuffled(ITEMS, true, () => 0))
    expect(result.current).not.toEqual(ITEMS)
    expect([...result.current].sort()).toEqual(ITEMS)
  })

  it('keeps the order when disabled, and is stable across re-renders', () => {
    const disabled = renderHook(() => useShuffled(ITEMS, false))
    expect(disabled.result.current).toEqual(ITEMS)

    const enabled = renderHook(() => useShuffled(ITEMS, true, reverse))
    const first = enabled.result.current
    enabled.rerender()
    expect(enabled.result.current).toBe(first)
  })
})
```

`src/form/question-field.test.tsx`:

```tsx
import { Input } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { V0 } from '../../test/v0-classes'
import { QuestionField } from './question-field'

function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

describe('QuestionField', () => {
  it('renders v0’s card with label, description and error wired to the control', () => {
    const { container } = render(
      <QuestionField
        questionId="q1"
        label="Email"
        description="Work address"
        required
        error="This question is required"
      >
        <Input />
      </QuestionField>
    )
    const card = container.querySelector('[data-question-id="q1"]')
    const input = screen.getByRole('textbox', { name: /Email/ })

    expect(classesOf(card)).toEqual(V0['question.card'].split(' ').sort())
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'Work address This question is required'
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This question is required'
    )
    expect(classesOf(screen.getByRole('alert'))).toEqual(
      V0['question.error'].split(' ').sort()
    )
    expect(classesOf(screen.getByText('Work address'))).toEqual(
      V0['question.description'].split(' ').sort()
    )
  })

  it('omits the error when there is none', () => {
    render(
      <QuestionField questionId="q1" label="Name">
        <Input />
      </QuestionField>
    )
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')
  })
})
```

- [ ] **Step 4: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web use-shuffled question-field`
Expected: FAIL — cannot resolve `./use-shuffled`, `./question-field`.

- [ ] **Step 5: Implement**

`src/question-types/types.ts`:

```ts
import type { SurveyAnswerValue } from '../answers/types'
import type { SurveyQuestion } from '../schema/survey-schema'

/**
 * Renderers are controlled components: they know nothing about form state.
 * Hosts replace one with `<SurveyForm components={{ rating: MyRating }} />`.
 */
export type QuestionRendererProps<Q extends SurveyQuestion = SurveyQuestion> = {
  question: Q
  value: SurveyAnswerValue
  onChange: (value: SurveyAnswerValue) => void
  onBlur: () => void
  disabled: boolean
  invalid: boolean
}
```

`src/question-types/use-shuffled.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = result[i] as T
    result[i] = result[j] as T
    result[j] = swap
  }
  return result
}

/**
 * The first render keeps the original order, so server HTML and hydration
 * agree; the shuffle happens once after mount (and when the items change).
 */
export function useShuffled<T>(
  items: readonly T[],
  enabled: boolean,
  random: () => number = Math.random
): readonly T[] {
  const [order, setOrder] = useState<readonly T[]>(items)
  useEffect(() => {
    setOrder(enabled ? shuffle(items, random) : items)
    // `random` is a test seam; reshuffling when it changes identity is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, enabled])
  return order
}
```

`src/form/question-field.tsx`:

```tsx
'use client'

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@mbc-cqrs-serverless/ui-web'
import type { ReactNode } from 'react'

export type QuestionFieldProps = {
  questionId: string
  label: string
  description?: string
  required?: boolean
  error?: string
  children: ReactNode
}

/** v0's QuestionWrapper (card, label, description, error) on ui-web's Field. */
export function QuestionField({
  questionId,
  label,
  description,
  required,
  error,
  children,
}: QuestionFieldProps) {
  return (
    <Field
      invalid={Boolean(error)}
      data-question-id={questionId}
      className="mbc:block mbc:bg-card mbc:text-card-foreground mbc:focus-within:ring-ring mbc:mb-8 mbc:rounded-lg mbc:border mbc:border-border mbc:p-6 mbc:shadow-sm mbc:transition-all mbc:duration-300 mbc:ease-in-out mbc:focus-within:ring-2"
    >
      <FieldLabel
        required={required}
        className="mbc:text-lg mbc:font-semibold mbc:leading-relaxed mbc:tracking-tight"
      >
        {label}
      </FieldLabel>
      {description && (
        <FieldDescription className="mbc:text-muted-foreground mbc:mb-4 mbc:mt-1">
          {description}
        </FieldDescription>
      )}
      <div className="mbc:mt-4">{children}</div>
      <FieldError role="alert" className="mbc:mt-2 mbc:font-medium">
        {error}
      </FieldError>
    </Field>
  )
}
```

(The card's classes replace `Field`'s `grid gap-2` through `cn`: `mbc:block` wins over `mbc:grid`; the stray `gap-2` has no effect on a block. Verify with the class test.)

Append to `src/index.ts`:

```ts
export type { QuestionRendererProps } from './question-types/types'
```

- [ ] **Step 6: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web use-shuffled question-field`
Expected: PASS — 5 tests. If the card's class list still contains `grid`/`gap-2`, the `cn` merge did not replace them: pass `className` through `cn` in `Field` (it does) and check the order of classes in `Field`'s `cn(...)` call; the test pins the result.

- [ ] **Step 7: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add renderer contract, QuestionField and shuffling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Text renderers

**Files:**

- Create: `src/question-types/short-text.tsx`, `src/question-types/long-text.tsx`, `src/question-types/text.test.tsx`

**Interfaces:**

- Consumes: `QuestionRendererProps`, ui-web `Input`, `Textarea`, `useMessages`, `surveyMessages`.
- Produces: `ShortTextRenderer`, `LongTextRenderer` (`QuestionRendererProps<ShortTextQuestion | LongTextQuestion>`); value is a `string` (`''` when empty).

- [ ] **Step 1: Write the failing test `src/question-types/text.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type {
  LongTextQuestion,
  ShortTextQuestion,
} from '../schema/survey-schema'
import { LongTextRenderer } from './long-text'
import { ShortTextRenderer } from './short-text'

function Harness<Q extends ShortTextQuestion | LongTextQuestion>({
  Renderer,
  question,
}: {
  Renderer: typeof ShortTextRenderer | typeof LongTextRenderer
  question: Q
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(undefined)
  return (
    <>
      <Renderer
        question={question as never}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

describe('text renderers', () => {
  it('edits a short answer with v0’s placeholder', async () => {
    render(
      <Harness
        Renderer={ShortTextRenderer}
        question={{ id: 'q', type: 'short-text', label: 'Q' }}
      />
    )
    await userEvent.type(screen.getByPlaceholderText('回答を入力...'), 'Ann')
    expect(screen.getByRole('status')).toHaveTextContent('"Ann"')
  })

  it('edits a long answer in a 5-row resizable textarea', async () => {
    render(
      <Harness
        Renderer={LongTextRenderer}
        question={{ id: 'q', type: 'long-text', label: 'Q' }}
      />
    )
    const textarea = screen.getByPlaceholderText('回答を入力...')
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toHaveClass('mbc:min-h-[120px]', 'mbc:resize-y')
    await userEvent.type(textarea, 'Line')
    expect(screen.getByRole('status')).toHaveTextContent('"Line"')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web text.test`
Expected: FAIL — cannot resolve `./long-text`.

- [ ] **Step 3: Implement**

`src/question-types/short-text.tsx`:

```tsx
'use client'

import { Input, useMessages } from '@mbc-cqrs-serverless/ui-web'

import { surveyMessages } from '../i18n/survey-messages'
import type { ShortTextQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

export function ShortTextRenderer({
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<ShortTextQuestion>) {
  const t = useMessages(surveyMessages)
  return (
    <Input
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={t.form.placeholder}
    />
  )
}
```

`src/question-types/long-text.tsx`:

```tsx
'use client'

import { Textarea, useMessages } from '@mbc-cqrs-serverless/ui-web'

import { surveyMessages } from '../i18n/survey-messages'
import type { LongTextQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

export function LongTextRenderer({
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<LongTextQuestion>) {
  const t = useMessages(surveyMessages)
  return (
    <Textarea
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={t.form.placeholder}
      className="mbc:min-h-[120px] mbc:resize-y"
      rows={5}
    />
  )
}
```

- [ ] **Step 4: Run it to verify it passes, commit**

Run: `$N pnpm vitest run --project survey-web text.test`
Expected: PASS — 2 tests.

```bash
git add -A
git commit -m "feat(survey-web): add short and long text renderers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Choice renderers

**Files:**

- Create: `src/question-types/single-choice.tsx`, `multiple-choice.tsx`, `dropdown.tsx`, `choice.test.tsx`
- Modify: `test/v0-classes.ts`

**Interfaces:**

- Consumes: `QuestionRendererProps`, `useShuffled`, `isOtherValue`/`otherText`/`toOtherValue`/`OTHER_VALUE` (SP4), ui-web `RadioGroup`, `RadioGroupItem`, `FieldGroup`, `Checkbox`, `Label`, `Input`, `Select*`.
- Produces: `SingleChoiceRenderer` (value `string`), `MultipleChoiceRenderer` (value `string[]`), `DropdownRenderer` (value `string`). Regular options are shuffled after mount when `validation.shuffleOptions`; an `isOther` option is always last, with an inline text input while selected. Option ids are `${useId()}-${index}`.

- [ ] **Step 1: Add the Task 3 entries to `V0` (survey-web)**

```ts
  // single-choice / multiple-choice option rows — space-x-2 → gap-2
  'choice.row':
    'hover:bg-muted flex items-center gap-2 rounded-md p-2 transition-colors',
  'choice.other-row':
    'hover:bg-muted flex min-w-0 items-center gap-2 rounded-md p-2 transition-colors',
  'choice.label': 'w-full cursor-pointer font-normal',
  'choice.other-label': 'shrink-0 cursor-pointer whitespace-nowrap font-normal',
  'choice.other-input': 'ml-2 min-w-0 flex-1',
  // single-choice RadioGroup — space-y-1 → gap-1 (flex column)
  'single.group': 'flex flex-col gap-1',
```

- [ ] **Step 2: Write the failing test `src/question-types/choice.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentType } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type { SurveyQuestion } from '../schema/survey-schema'
import { DropdownRenderer } from './dropdown'
import { MultipleChoiceRenderer } from './multiple-choice'
import { SingleChoiceRenderer } from './single-choice'
import type { QuestionRendererProps } from './types'

function Harness({
  Renderer,
  question,
  initial,
}: {
  Renderer: ComponentType<QuestionRendererProps<never>>
  question: SurveyQuestion
  initial?: SurveyAnswerValue
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <Renderer
        question={question as never}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

const options = [
  { value: 'bus', label: 'バス' },
  { value: 'car', label: '車' },
  { value: 'other', label: 'その他', isOther: true },
]

describe('SingleChoiceRenderer', () => {
  const question: SurveyQuestion = {
    id: 'route',
    type: 'single-choice',
    label: 'Route',
    options,
  }

  it('selects an option and writes "other:<text>"', async () => {
    render(
      <Harness Renderer={SingleChoiceRenderer as never} question={question} />
    )
    await userEvent.click(screen.getByRole('radio', { name: '車' }))
    expect(screen.getByRole('status')).toHaveTextContent('"car"')

    await userEvent.click(screen.getByRole('radio', { name: 'その他' }))
    expect(screen.getByRole('status')).toHaveTextContent('"other"')
    await userEvent.type(
      screen.getByPlaceholderText('その他の回答を入力...'),
      '徒歩'
    )
    expect(screen.getByRole('status')).toHaveTextContent('"other:徒歩"')
  })

  it('shows a v0 "other" answer in the text input', () => {
    render(
      <Harness
        Renderer={SingleChoiceRenderer as never}
        question={question}
        initial="other:自転車"
      />
    )
    expect(screen.getByRole('radio', { name: 'その他' })).toBeChecked()
    expect(screen.getByPlaceholderText('その他の回答を入力...')).toHaveValue(
      '自転車'
    )
  })

  it('keeps "other" last when shuffling', () => {
    const shuffled: SurveyQuestion = {
      ...question,
      validation: { shuffleOptions: true },
    } as SurveyQuestion
    render(
      <Harness Renderer={SingleChoiceRenderer as never} question={shuffled} />
    )
    const labels = screen
      .getAllByRole('radio')
      .map((radio) => radio.getAttribute('aria-label') ?? radio.id)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getAllByRole('radio').at(-1)).toBe(
      screen.getByRole('radio', { name: 'その他' })
    )
    expect(labels).toHaveLength(3)
  })
})

describe('MultipleChoiceRenderer', () => {
  const question: SurveyQuestion = {
    id: 'pick',
    type: 'multiple-choice',
    label: 'Pick',
    options,
  }

  it('toggles options and keeps "other" when a regular option is ticked', async () => {
    render(
      <Harness Renderer={MultipleChoiceRenderer as never} question={question} />
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'その他' }))
    await userEvent.type(
      screen.getByPlaceholderText('その他の回答を入力...'),
      'Walk'
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'バス' }))

    expect(screen.getByRole('status')).toHaveTextContent('["other:Walk","bus"]')

    await userEvent.click(screen.getByRole('checkbox', { name: 'その他' }))
    expect(screen.getByRole('status')).toHaveTextContent('["bus"]')
  })
})

describe('DropdownRenderer', () => {
  it('chooses an option from the list', async () => {
    const question: SurveyQuestion = {
      id: 'drop',
      type: 'dropdown',
      label: 'Drop',
      options: options.slice(0, 2),
    }
    render(<Harness Renderer={DropdownRenderer as never} question={question} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: '車' }))

    expect(screen.getByRole('status')).toHaveTextContent('"car"')
    expect(screen.getByRole('combobox')).toHaveTextContent('車')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web choice.test`
Expected: FAIL — cannot resolve `./dropdown`.

- [ ] **Step 4: Implement**

`src/question-types/single-choice.tsx`:

```tsx
'use client'

import {
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { useId } from 'react'

import {
  isOtherValue,
  OTHER_VALUE,
  otherText,
  toOtherValue,
} from '../answers/choice'
import { surveyMessages } from '../i18n/survey-messages'
import type { SingleChoiceQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'
import { useShuffled } from './use-shuffled'

const ROW =
  'mbc:hover:bg-muted mbc:flex mbc:items-center mbc:gap-2 mbc:rounded-md mbc:p-2 mbc:transition-colors'

export function SingleChoiceRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<SingleChoiceQuestion>) {
  const t = useMessages(surveyMessages)
  const baseId = useId()
  const regular = useShuffled(
    question.options.filter((option) => !option.isOther),
    question.validation?.shuffleOptions === true
  )
  const other = question.options.find((option) => option.isOther)
  const current = typeof value === 'string' ? value : ''
  const otherSelected = current !== '' && isOtherValue(current)

  return (
    <RadioGroup
      value={otherSelected ? OTHER_VALUE : current}
      onValueChange={(next) => onChange(next)}
      onBlur={onBlur}
      disabled={disabled}
      className="mbc:flex mbc:flex-col mbc:gap-1"
    >
      {regular.map((option, index) => (
        <div key={option.value} className={ROW}>
          <RadioGroupItem value={option.value} id={`${baseId}-${index}`} />
          <Label
            htmlFor={`${baseId}-${index}`}
            className="mbc:w-full mbc:cursor-pointer mbc:font-normal"
          >
            {option.label}
          </Label>
        </div>
      ))}
      {other && (
        <div className={`${ROW} mbc:min-w-0`}>
          <RadioGroupItem value={OTHER_VALUE} id={`${baseId}-other`} />
          <Label
            htmlFor={`${baseId}-other`}
            className="mbc:shrink-0 mbc:cursor-pointer mbc:whitespace-nowrap mbc:font-normal"
          >
            {other.label}
          </Label>
          {otherSelected && (
            <Input
              value={otherText(current)}
              onChange={(event) => onChange(toOtherValue(event.target.value))}
              placeholder={t.form.otherPlaceholder}
              disabled={disabled}
              className="mbc:ml-2 mbc:min-w-0 mbc:flex-1"
            />
          )}
        </div>
      )}
    </RadioGroup>
  )
}
```

`src/question-types/multiple-choice.tsx`:

```tsx
'use client'

import {
  Checkbox,
  FieldGroup,
  Input,
  Label,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { useId } from 'react'

import {
  isOtherValue,
  OTHER_VALUE,
  otherText,
  toOtherValue,
} from '../answers/choice'
import { surveyMessages } from '../i18n/survey-messages'
import type { MultipleChoiceQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'
import { useShuffled } from './use-shuffled'

const ROW =
  'mbc:hover:bg-muted mbc:flex mbc:items-center mbc:gap-2 mbc:rounded-md mbc:p-2 mbc:transition-colors'

export function MultipleChoiceRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<MultipleChoiceQuestion>) {
  const t = useMessages(surveyMessages)
  const baseId = useId()
  const regular = useShuffled(
    question.options.filter((option) => !option.isOther),
    question.validation?.shuffleOptions === true
  )
  const other = question.options.find((option) => option.isOther)
  const values = Array.isArray(value) ? value : []
  const otherValue = values.find(isOtherValue)

  const toggle = (optionValue: string, checked: boolean) => {
    onChange(
      checked
        ? [...values, optionValue]
        : values.filter((item) => item !== optionValue)
    )
  }
  const toggleOther = (checked: boolean) => {
    const rest = values.filter((item) => !isOtherValue(item))
    onChange(checked ? [...rest, OTHER_VALUE] : rest)
  }
  const setOtherText = (text: string) => {
    onChange(
      values.map((item) => (isOtherValue(item) ? toOtherValue(text) : item))
    )
  }

  return (
    <FieldGroup onBlur={onBlur}>
      {regular.map((option, index) => (
        <div key={option.value} className={ROW}>
          <Checkbox
            id={`${baseId}-${index}`}
            checked={values.includes(option.value)}
            onCheckedChange={(checked) =>
              toggle(option.value, checked === true)
            }
            disabled={disabled}
          />
          <Label
            htmlFor={`${baseId}-${index}`}
            className="mbc:w-full mbc:cursor-pointer mbc:font-normal"
          >
            {option.label}
          </Label>
        </div>
      ))}
      {other && (
        <div className={`${ROW} mbc:min-w-0`}>
          <Checkbox
            id={`${baseId}-other`}
            checked={otherValue !== undefined}
            onCheckedChange={(checked) => toggleOther(checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor={`${baseId}-other`}
            className="mbc:shrink-0 mbc:cursor-pointer mbc:whitespace-nowrap mbc:font-normal"
          >
            {other.label}
          </Label>
          {otherValue !== undefined && (
            <Input
              value={otherText(otherValue)}
              onChange={(event) => setOtherText(event.target.value)}
              placeholder={t.form.otherPlaceholder}
              disabled={disabled}
              className="mbc:ml-2 mbc:min-w-0 mbc:flex-1"
            />
          )}
        </div>
      )}
    </FieldGroup>
  )
}
```

`src/question-types/dropdown.tsx`:

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

import { surveyMessages } from '../i18n/survey-messages'
import type { DropdownQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'
import { useShuffled } from './use-shuffled'

export function DropdownRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<DropdownQuestion>) {
  const t = useMessages(surveyMessages)
  const options = useShuffled(
    question.options,
    question.validation?.shuffleOptions === true
  )
  return (
    <Select
      value={typeof value === 'string' && value ? value : undefined}
      onValueChange={(next) => onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger onBlur={onBlur}>
        <SelectValue placeholder={t.form.selectPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web choice.test`
Expected: PASS — 5 tests. The shuffle test only asserts "other stays last"; with `Math.random` the regular order varies by design.

- [ ] **Step 6: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add single, multiple choice and dropdown renderers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Linear scale and rating

**Files:**

- Create: `src/question-types/linear-scale.tsx`, `src/question-types/rating.tsx`, `src/question-types/scale.test.tsx`
- Modify: `packages/survey-web/package.json` (`@radix-ui/react-radio-group` `1.4.7`, exact — the same pin as ui-web), `test/v0-classes.ts`

**Interfaces:**

- Consumes: `QuestionRendererProps`, ui-web `RadioGroup`, `RadioGroupItem`, `Label`, `useFieldControl`, `cn`.
- Produces: `LinearScaleRenderer` (value `number`, options `min..max` from the schema), `RatingRenderer` (value `number` 1..`levels`; a horizontal radio group whose items are star/heart/thumb icons, filled up to the hovered or selected value; each item named by `t.form.rating({ value, max })`).

- [ ] **Step 1: Add the dependency and the Task 4 `V0` entries**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web add @radix-ui/react-radio-group@1.4.7`
Then make the version exact (`"1.4.7"`, no caret) in `packages/survey-web/package.json`.

`V0` additions:

```ts
  // linear-scale-renderer.tsx — flex-shrink-0/flex-grow (removed in Tailwind v4) → shrink-0/grow; space-y-2 → gap-2
  'scale.row': 'flex items-center justify-between gap-4',
  'scale.end-label': 'w-1/12 shrink-0 text-center text-sm',
  'scale.options': 'flex grow justify-around',
  'scale.option': 'flex flex-col items-center gap-2',
  'scale.number': 'text-muted-foreground text-sm',
  // rating-renderer.tsx icon
  'rating.icon': 'h-7 w-7 transition-colors sm:h-8 sm:w-8',
```

- [ ] **Step 2: Write the failing test `src/question-types/scale.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type {
  LinearScaleQuestion,
  RatingQuestion,
} from '../schema/survey-schema'
import { LinearScaleRenderer } from './linear-scale'
import { RatingRenderer } from './rating'

function Scale({
  question,
  initial,
}: {
  question: LinearScaleQuestion
  initial?: number
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <LinearScaleRenderer
        question={question}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

function Rating({
  question,
  initial,
}: {
  question: RatingQuestion
  initial?: number
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <RatingRenderer
        question={question}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

describe('LinearScaleRenderer', () => {
  it('offers min..max including 0 and stores a number', async () => {
    render(
      <Scale
        question={{
          id: 's',
          type: 'linear-scale',
          label: 'S',
          min: 0,
          max: 3,
          minLabel: '低',
          maxLabel: '高',
        }}
      />
    )
    expect(
      screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))
    ).toEqual(['0', '1', '2', '3'])
    expect(screen.getByText('低')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: '0' }))
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })

  it('moves with arrow keys', async () => {
    render(
      <Scale
        question={{ id: 's', type: 'linear-scale', label: 'S', min: 1, max: 3 }}
        initial={1}
      />
    )
    screen.getByRole('radio', { name: '1' }).focus()
    await userEvent.keyboard('{ArrowRight>}')
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })
})

describe('RatingRenderer', () => {
  const question: RatingQuestion = {
    id: 'r',
    type: 'rating',
    label: 'R',
    levels: 5,
    symbol: 'heart',
  }

  it('is a radio group named per level, storing a number', async () => {
    render(<Rating question={question} />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    await userEvent.click(screen.getByRole('radio', { name: '5段階中4' }))
    expect(screen.getByRole('status')).toHaveTextContent('4')
  })

  it('fills icons up to the selected value', () => {
    const { container } = render(<Rating question={question} initial={2} />)
    const icons = container.querySelectorAll('svg')
    expect(icons[1]).toHaveClass('mbc:fill-red-500')
    expect(icons[2]).toHaveClass('mbc:text-muted-foreground')
  })

  it('is operable from the keyboard', async () => {
    render(<Rating question={question} initial={1} />)
    screen.getByRole('radio', { name: '5段階中1' }).focus()
    await userEvent.keyboard('{ArrowRight>}')
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web scale.test`
Expected: FAIL — cannot resolve `./linear-scale`.

- [ ] **Step 4: Implement**

`src/question-types/linear-scale.tsx`:

```tsx
'use client'

import { Label, RadioGroup, RadioGroupItem } from '@mbc-cqrs-serverless/ui-web'
import { useId } from 'react'

import type { LinearScaleQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

export function LinearScaleRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<LinearScaleQuestion>) {
  const baseId = useId()
  const count = Math.max(0, question.max - question.min + 1)
  const options = Array.from({ length: count }, (_, i) => question.min + i)

  return (
    <RadioGroup
      value={typeof value === 'number' ? String(value) : ''}
      onValueChange={(next) => onChange(Number(next))}
      onBlur={onBlur}
      disabled={disabled}
      orientation="horizontal"
      className="mbc:w-full"
    >
      <div className="mbc:flex mbc:items-center mbc:justify-between mbc:gap-4">
        <Label className="mbc:w-1/12 mbc:shrink-0 mbc:text-center mbc:text-sm">
          {question.minLabel}
        </Label>
        <div className="mbc:flex mbc:grow mbc:justify-around">
          {options.map((num) => (
            <div
              key={num}
              className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
            >
              <Label
                htmlFor={`${baseId}-${num}`}
                className="mbc:text-muted-foreground mbc:text-sm"
              >
                {num}
              </Label>
              <RadioGroupItem value={String(num)} id={`${baseId}-${num}`} />
            </div>
          ))}
        </div>
        <Label className="mbc:w-1/12 mbc:shrink-0 mbc:text-center mbc:text-sm">
          {question.maxLabel}
        </Label>
      </div>
    </RadioGroup>
  )
}
```

`src/question-types/rating.tsx`:

```tsx
'use client'

import { cn, useFieldControl, useMessages } from '@mbc-cqrs-serverless/ui-web'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Heart, Star, ThumbsUp } from 'lucide-react'
import { useState } from 'react'

import { surveyMessages } from '../i18n/survey-messages'
import type { RatingQuestion } from '../schema/survey-schema'
import type { QuestionRendererProps } from './types'

const SYMBOLS = {
  star: { Icon: Star, filled: 'mbc:text-yellow-500 mbc:fill-yellow-400' },
  heart: { Icon: Heart, filled: 'mbc:text-red-600 mbc:fill-red-500' },
  thumb: { Icon: ThumbsUp, filled: 'mbc:text-blue-600 mbc:fill-blue-500' },
} as const

export function RatingRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<RatingQuestion>) {
  const t = useMessages(surveyMessages)
  const [hover, setHover] = useState<number | null>(null)
  const groupProps = useFieldControl({}, { group: true })
  const { Icon, filled } = SYMBOLS[question.symbol]
  const levels = Array.from({ length: question.levels }, (_, i) => i + 1)
  const shown = hover ?? (typeof value === 'number' ? value : 0)

  return (
    <RadioGroupPrimitive.Root
      {...groupProps}
      data-mbc=""
      value={typeof value === 'number' ? String(value) : ''}
      onValueChange={(next) => onChange(Number(next))}
      onBlur={onBlur}
      disabled={disabled}
      orientation="horizontal"
      className="mbc:flex mbc:grow mbc:justify-around"
      onMouseLeave={() => setHover(null)}
    >
      {levels.map((level) => (
        <div
          key={level}
          className="mbc:flex mbc:flex-col mbc:items-center mbc:gap-2"
          onMouseEnter={() => setHover(level)}
        >
          <span aria-hidden className="mbc:text-muted-foreground mbc:text-sm">
            {level}
          </span>
          <RadioGroupPrimitive.Item
            value={String(level)}
            aria-label={t.form.rating({ value: level, max: question.levels })}
            className="mbc:cursor-pointer mbc:rounded-md mbc:outline-none mbc:focus-visible:ring-[3px] mbc:focus-visible:ring-ring/50 mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50"
          >
            <Icon
              aria-hidden
              className={cn(
                'mbc:h-7 mbc:w-7 mbc:transition-colors mbc:sm:h-8 mbc:sm:w-8',
                shown >= level ? filled : 'mbc:text-muted-foreground'
              )}
            />
          </RadioGroupPrimitive.Item>
        </div>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
```

Add `lucide-react` (same range as ui-web, `^1.52.0`) to survey-web `dependencies`, and `"react-hook-form"` already added in Task 1.

- [ ] **Step 5: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web scale.test`
Expected: PASS — 5 tests. The arrow-key tests hold the key (`{ArrowRight>}`) for the same Radix timing reason recorded in SP2 Task 3.

- [ ] **Step 6: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add linear scale and keyboard-operable rating renderers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Date and time renderers, renderer registry

**Files:**

- Create: `src/question-types/date-value.ts`, `src/question-types/date-value.test.ts`, `src/question-types/date.tsx`, `src/question-types/time.tsx`, `src/question-types/date-time.test.tsx`, `src/question-types/registry.ts`
- Modify: `src/index.ts`

**Interfaces:**

- Consumes: ui-web `Button`, `Calendar`, `Popover*`, `Select*`, `useLocale`; `surveyMessages`.
- Produces:
  - `date-value.ts` (pure): `readDate(value: unknown, includeYear: boolean, today?: Date): Date | null` (invalid → `null`; with `includeYear: false` the year is replaced by `today`'s so the calendar opens on a sensible month), `writeDate(date: Date, includeYear: boolean): string` (ISO; year 0 when `includeYear` is false), `formatDate(date: Date, includeYear: boolean, locale: Locale): string` (`ja`: `2026年10月15日` / `10月15日`).
  - `DateRenderer` (date or date-time per `includeTime`), `TimeRenderer` (`TimeAnswer` or `DurationAnswer` per `answerType`).
  - `type QuestionRenderers = { [K in QuestionKind]: ComponentType<QuestionRendererProps<Extract<SurveyQuestion, { type: K }>>> }`; `questionRenderers: QuestionRenderers`.

- [ ] **Step 1: Write the failing tests**

`src/question-types/date-value.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { formatDate, readDate, writeDate } from './date-value'

describe('date values (v0-compatible ISO strings)', () => {
  const today = new Date(2026, 9, 4)

  it('round-trips a full date', () => {
    const date = new Date(2026, 9, 15, 9, 30)
    expect(readDate(writeDate(date, true), true, today)?.getTime()).toBe(
      date.getTime()
    )
  })

  it('writes year 0 without a year and reads it into the current year', () => {
    const written = writeDate(new Date(2026, 9, 15), false)
    expect(new Date(written).getFullYear()).toBe(0)
    const read = readDate(written, false, today)
    expect([read?.getFullYear(), read?.getMonth(), read?.getDate()]).toEqual([
      2026, 9, 15,
    ])
  })

  it('ignores the year v0 wrote (2000) for no-year date-time answers', () => {
    const v0 = new Date(2000, 2, 3, 8, 15).toISOString()
    const read = readDate(v0, false, today)
    expect([
      read?.getFullYear(),
      read?.getMonth(),
      read?.getDate(),
      read?.getHours(),
    ]).toEqual([2026, 2, 3, 8])
  })

  it('returns null for empty or invalid values', () => {
    expect(readDate(undefined, true, today)).toBeNull()
    expect(readDate('not a date', true, today)).toBeNull()
    expect(readDate(42, true, today)).toBeNull()
  })

  it('formats like v0 in Japanese and naturally in English', () => {
    const date = new Date(2026, 9, 15)
    expect(formatDate(date, true, 'ja')).toBe('2026年10月15日')
    expect(formatDate(date, false, 'ja')).toBe('10月15日')
    expect(formatDate(date, true, 'en')).toBe('October 15, 2026')
  })
})
```

`src/question-types/date-time.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type { DateQuestion, TimeQuestion } from '../schema/survey-schema'
import { DateRenderer } from './date'
import { TimeRenderer } from './time'

function DateHarness({
  question,
  initial,
}: {
  question: DateQuestion
  initial?: string
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <DateRenderer
        question={question}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

function TimeHarness({
  question,
  initial,
}: {
  question: TimeQuestion
  initial?: SurveyAnswerValue
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(initial)
  return (
    <>
      <TimeRenderer
        question={question}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

const dateQuestion: DateQuestion = {
  id: 'd',
  type: 'date',
  label: 'D',
  includeTime: false,
  includeYear: true,
}

describe('DateRenderer', () => {
  it('shows the placeholder, then a picked date, stored as ISO', async () => {
    render(
      <DateHarness
        question={dateQuestion}
        initial={new Date(2026, 9, 1).toISOString()}
      />
    )
    expect(
      screen.getByRole('button', { name: /2026年10月1日/ })
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /2026年10月1日/ }))
    await userEvent.click(await screen.findByRole('button', { name: /15/ }))

    const stored = JSON.parse(
      screen.getByRole('status').textContent ?? 'null'
    ) as string
    expect(new Date(stored).getDate()).toBe(15)
  })

  it('uses the no-year placeholder', () => {
    render(<DateHarness question={{ ...dateQuestion, includeYear: false }} />)
    expect(
      screen.getByRole('button', { name: /月日を選択してください/ })
    ).toBeInTheDocument()
  })

  it('sets the time of a date-time answer from the selects', async () => {
    render(
      <DateHarness
        question={{ ...dateQuestion, includeTime: true }}
        initial={new Date(2026, 9, 15, 0, 0).toISOString()}
      />
    )
    const [hour] = screen.getAllByRole('combobox')
    await userEvent.click(hour!)
    await userEvent.click(await screen.findByRole('option', { name: '09' }))

    const stored = JSON.parse(
      screen.getByRole('status').textContent ?? 'null'
    ) as string
    expect(new Date(stored).getHours()).toBe(9)
    expect(new Date(stored).getDate()).toBe(15)
  })
})

describe('TimeRenderer', () => {
  it('stores { hour, minute } like v0', async () => {
    render(
      <TimeHarness
        question={{ id: 't', type: 'time', label: 'T', answerType: 'time' }}
      />
    )
    const [hour, minute] = screen.getAllByRole('combobox')
    await userEvent.click(hour!)
    await userEvent.click(await screen.findByRole('option', { name: '07' }))
    await userEvent.click(minute!)
    await userEvent.click(await screen.findByRole('option', { name: '45' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      '{"hour":"07","minute":"45"}'
    )
  })

  it('shows a saved duration in its three selects', () => {
    render(
      <TimeHarness
        question={{ id: 't', type: 'time', label: 'T', answerType: 'duration' }}
        initial={{ hours: '01', minutes: '30', seconds: '00' }}
      />
    )
    const selects = screen.getAllByRole('combobox')
    expect(selects.map((select) => select.textContent)).toEqual([
      '01',
      '30',
      '00',
    ])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web date-value date-time`
Expected: FAIL — cannot resolve `./date-value`, `./date`.

- [ ] **Step 3: Implement**

`src/question-types/date-value.ts`:

```ts
import type { Locale } from '@mbc-cqrs-serverless/ui-web'

const INTL_LOCALES: Record<Locale, string> = { ja: 'ja-JP', en: 'en-US' }

/** Reads a stored answer. Without a year, any stored year (v0 wrote 0 or 2000) is replaced. */
export function readDate(
  value: unknown,
  includeYear: boolean,
  today: Date = new Date()
): Date | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (!includeYear) date.setFullYear(today.getFullYear())
  return date
}

/** v0's storage format: ISO string, year 0 when the question has no year. */
export function writeDate(date: Date, includeYear: boolean): string {
  const copy = new Date(date)
  if (!includeYear) copy.setFullYear(0)
  return copy.toISOString()
}

export function formatDate(
  date: Date,
  includeYear: boolean,
  locale: Locale
): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? 'ja-JP', {
    ...(includeYear && { year: 'numeric' }),
    month: 'long',
    day: 'numeric',
  }).format(date)
}
```

`src/question-types/time-selects.tsx` (shared by date-time and time):

```tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mbc-cqrs-serverless/ui-web'

const pad = (n: number) => String(n).padStart(2, '0')
export const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
export const SIXTY = Array.from({ length: 60 }, (_, i) => pad(i))

export function TimeSelect({
  value,
  options,
  placeholder,
  onChange,
  disabled,
  className,
}: {
  value: string
  options: readonly string[]
  placeholder: string
  onChange: (value: string) => void
  disabled: boolean
  className?: string
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="mbc:max-h-60 mbc:overflow-y-auto">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** v0's hour/minute pair used by time and date-time questions. */
export const CLOCK_TRIGGER =
  'mbc:w-full mbc:max-w-[120px] mbc:justify-between mbc:bg-white'
```

Add `src/question-types/time-selects.tsx` to this task's **Files** list.

`src/question-types/date.tsx`:

```tsx
'use client'

import {
  Button,
  Calendar,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useLocale,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { CalendarIcon } from 'lucide-react'

import { surveyMessages } from '../i18n/survey-messages'
import type { DateQuestion } from '../schema/survey-schema'
import { formatDate, readDate, writeDate } from './date-value'
import { CLOCK_TRIGGER, HOURS, SIXTY, TimeSelect } from './time-selects'
import type { QuestionRendererProps } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function DateRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<DateQuestion>) {
  const t = useMessages(surveyMessages)
  const locale = useLocale()
  const date = readDate(value, question.includeYear)
  const placeholder = question.includeTime
    ? question.includeYear
      ? t.form.dateTimePlaceholder
      : t.form.dateTimePlaceholderNoYear
    : question.includeYear
      ? t.form.datePlaceholder
      : t.form.datePlaceholderNoYear

  const pickDay = (day: Date | undefined) => {
    if (!day) {
      onChange(undefined)
      return
    }
    const next = new Date(day)
    next.setHours(date?.getHours() ?? 0, date?.getMinutes() ?? 0, 0, 0)
    onChange(writeDate(next, question.includeYear))
  }

  const setTime = (part: 'hours' | 'minutes', text: string) => {
    const next = date ? new Date(date) : new Date()
    if (part === 'hours') next.setHours(Number(text))
    else next.setMinutes(Number(text))
    onChange(writeDate(next, question.includeYear))
  }

  const picker = (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          onBlur={onBlur}
          className={cn(
            'mbc:w-full mbc:pl-3 mbc:text-left mbc:font-normal',
            question.includeTime && 'mbc:justify-start mbc:md:col-span-2',
            !date && 'mbc:text-muted-foreground'
          )}
        >
          {date ? (
            formatDate(date, question.includeYear, locale)
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon
            aria-hidden
            className="mbc:ml-auto mbc:h-4 mbc:w-4 mbc:opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="mbc:w-auto mbc:p-0" align="start">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          defaultMonth={date ?? undefined}
          onSelect={pickDay}
          disabled={disabled}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )

  if (!question.includeTime) return picker

  return (
    <div className="mbc:w-full">
      <div className="mbc:grid mbc:grid-cols-1 mbc:gap-8 mbc:md:grid-cols-4">
        {picker}
        <div className="mbc:flex mbc:items-center mbc:gap-2 mbc:md:col-span-1">
          <TimeSelect
            value={date ? pad(date.getHours()) : ''}
            options={HOURS}
            placeholder={t.form.hour}
            onChange={(text) => setTime('hours', text)}
            disabled={disabled || !date}
            className={CLOCK_TRIGGER}
          />
          <span className="mbc:mr-8 mbc:font-normal mbc:text-gray-500">
            {t.form.hour}
          </span>
          <TimeSelect
            value={date ? pad(date.getMinutes()) : ''}
            options={SIXTY}
            placeholder={t.form.minute}
            onChange={(text) => setTime('minutes', text)}
            disabled={disabled || !date}
            className={CLOCK_TRIGGER}
          />
          <span className="mbc:font-normal mbc:text-gray-500">
            {t.form.minute}
          </span>
        </div>
      </div>
    </div>
  )
}
```

`src/question-types/time.tsx`:

```tsx
'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import type { DurationAnswer, TimeAnswer } from '../answers/types'
import { surveyMessages } from '../i18n/survey-messages'
import type { TimeQuestion } from '../schema/survey-schema'
import { CLOCK_TRIGGER, HOURS, SIXTY, TimeSelect } from './time-selects'
import type { QuestionRendererProps } from './types'

function asRecord(value: unknown): Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {}
}

export function TimeRenderer({
  question,
  value,
  onChange,
  onBlur,
  disabled,
}: QuestionRendererProps<TimeQuestion>) {
  const t = useMessages(surveyMessages)
  const current = asRecord(value)

  if (question.answerType === 'duration') {
    const update = (part: keyof DurationAnswer, text: string) =>
      onChange({
        hours: '',
        minutes: '',
        seconds: '',
        ...current,
        [part]: text,
      } as DurationAnswer)
    return (
      <div
        className="mbc:flex mbc:max-w-sm mbc:items-center mbc:gap-2"
        onBlur={onBlur}
      >
        <div className="mbc:flex-1">
          <TimeSelect
            value={current.hours ?? ''}
            options={HOURS}
            placeholder={t.form.hours}
            onChange={(text) => update('hours', text)}
            disabled={disabled}
            className="mbc:w-full"
          />
        </div>
        <span className="mbc:text-muted-foreground">:</span>
        <div className="mbc:flex-1">
          <TimeSelect
            value={current.minutes ?? ''}
            options={SIXTY}
            placeholder={t.form.minutes}
            onChange={(text) => update('minutes', text)}
            disabled={disabled}
            className="mbc:w-full"
          />
        </div>
        <span className="mbc:text-muted-foreground">:</span>
        <div className="mbc:flex-1">
          <TimeSelect
            value={current.seconds ?? ''}
            options={SIXTY}
            placeholder={t.form.seconds}
            onChange={(text) => update('seconds', text)}
            disabled={disabled}
            className="mbc:w-full"
          />
        </div>
      </div>
    )
  }

  const update = (part: keyof TimeAnswer, text: string) =>
    onChange({ hour: '', minute: '', ...current, [part]: text } as TimeAnswer)
  return (
    <div
      className="mbc:flex mbc:max-w-sm mbc:items-center mbc:gap-2"
      onBlur={onBlur}
    >
      <div>
        <TimeSelect
          value={current.hour ?? ''}
          options={HOURS}
          placeholder={t.form.hour}
          onChange={(text) => update('hour', text)}
          disabled={disabled}
          className={CLOCK_TRIGGER}
        />
      </div>
      <span className="mbc:mr-8 mbc:font-normal mbc:text-gray-500">
        {t.form.hour}
      </span>
      <div>
        <TimeSelect
          value={current.minute ?? ''}
          options={SIXTY}
          placeholder={t.form.minute}
          onChange={(text) => update('minute', text)}
          disabled={disabled}
          className={CLOCK_TRIGGER}
        />
      </div>
      <span className="mbc:font-normal mbc:text-gray-500">{t.form.minute}</span>
    </div>
  )
}
```

`src/question-types/registry.ts`:

```ts
import type { ComponentType } from 'react'

import type { QuestionKind, SurveyQuestion } from '../schema/survey-schema'
import { DateRenderer } from './date'
import { DropdownRenderer } from './dropdown'
import { LinearScaleRenderer } from './linear-scale'
import { LongTextRenderer } from './long-text'
import { MultipleChoiceRenderer } from './multiple-choice'
import { RatingRenderer } from './rating'
import { ShortTextRenderer } from './short-text'
import { SingleChoiceRenderer } from './single-choice'
import { TimeRenderer } from './time'
import type { QuestionRendererProps } from './types'

export type QuestionRenderers = {
  [K in QuestionKind]: ComponentType<
    QuestionRendererProps<Extract<SurveyQuestion, { type: K }>>
  >
}

export const questionRenderers: QuestionRenderers = {
  'short-text': ShortTextRenderer,
  'long-text': LongTextRenderer,
  'single-choice': SingleChoiceRenderer,
  'multiple-choice': MultipleChoiceRenderer,
  dropdown: DropdownRenderer,
  'linear-scale': LinearScaleRenderer,
  rating: RatingRenderer,
  date: DateRenderer,
  time: TimeRenderer,
}
```

Append to `src/index.ts`:

```ts
export type { QuestionRenderers } from './question-types/registry'
```

- [ ] **Step 4: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web date-value date-time`
Expected: PASS — 10 tests. `formatDate(..., 'en')` depends on Node's ICU; Node 24 ships full ICU, so `October 15, 2026` is stable.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add date, time renderers and the renderer registry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

---

### Task 6: `SurveyForm`

**Files:**

- Create: `src/form/resolver.ts`, `src/form/resolver.test.ts`, `src/form/focus.ts`, `src/form/survey-form.tsx`, `src/form/survey-form.test.tsx`, `test/fixtures/form-surveys.ts`
- Modify: `src/schema/survey-schema.ts`, `src/index.ts`, `test/v0-classes.ts`

**Interfaces:**

- Consumes: SP4 engine (`buildPages`, `resolveNext`, `collectAnswers`, `validateAnswer`, `formatAnswerError`), Tasks 1–5.
- Produces:
  - `createSectionResolver(getQuestions: () => readonly SurveyQuestion[], getMessages: () => SurveyMessages['validation']): Resolver<SurveyAnswers>` — validates only the current section's questions.
  - `focusFirstInvalid(root: HTMLElement | null): void` — focuses the first invalid question's control (`[aria-invalid="true"]` if focusable, else the card's first focusable element).
  - `type SurveyInput = z.input<typeof SurveySchema>` (exported from `.` and `/core`) — a survey as stored, before defaults; `Survey` is assignable to it.
  - `SurveyForm(props: SurveyFormProps)`; `SurveyFormProps = { schema: SurveyInput; onSubmit: (answers: SurveyAnswers, meta: SurveyAnswerMeta[]) => void | Promise<void>; onSubmitError?: (error: unknown) => void; defaultValues?: SurveyAnswers; disabled?: boolean; submitLabel?: ReactNode; children?: ReactNode; onSectionChange?: (sectionId: string) => void; components?: Partial<QuestionRenderers>; className?: string }`.
  - Behaviour: the `schema` prop is parsed with `SurveySchema.safeParse` (hosts pass backend JSON cast to `Survey`, so defaults such as rating `levels` may be missing; an invalid schema is used as given); v0 layout (title block, section heading with `border-b`, `children` above the questions, Back left / Next or Submit right); the right-hand button is always `type="submit"` and the form's submit handler decides Next vs Submit, so Enter inside a field moves to the next section instead of submitting the whole survey (v0 submitted); focus moves to the section heading on navigation and to the first invalid field after a failed Next/Submit (after `FieldError` has registered); while `onSubmit`'s promise is pending the submit button shows its loading state and controls are disabled; a rejection shows `t.form.submitError` in a destructive `Alert` and calls `onSubmitError`.

- [ ] **Step 1: Add the Task 6 `V0` entries**

```ts
  // forms/survey-form.tsx — space-y-8 → explicit margins with the same collapsed result
  'form.root': 'mx-auto my-12 max-w-3xl',
  'form.header': 'mb-10 text-center',
  'form.title': 'text-4xl font-bold tracking-tight',
  'form.description': 'text-muted-foreground mt-2 text-lg',
  'form.section-title': 'mb-6 border-b border-border pb-2 text-2xl font-semibold outline-none',
  'form.section-description': 'text-muted-foreground mb-6',
  'form.actions': 'mt-8 flex justify-between pt-4',
```

- [ ] **Step 2: Create `test/fixtures/form-surveys.ts`**

```ts
import type { Survey } from '../../src/schema/survey-schema'

/** Branching survey: start → (car → end) | (walk, submits). */
export const BRANCHING: Survey = {
  title: '通勤アンケート',
  description: 'ご協力ください',
  items: [
    { id: 'start', type: 'section-header', title: 'はじめに' },
    {
      id: 'name',
      type: 'short-text',
      label: 'お名前',
      validation: { required: true },
    },
    {
      id: 'route',
      type: 'single-choice',
      label: '通勤手段',
      options: [
        { value: 'car', label: '車', nextSectionId: 'car' },
        { value: 'walk', label: '徒歩', nextSectionId: 'walk' },
      ],
      validation: { required: true },
    },
    {
      id: 'car',
      type: 'section-header',
      title: '車',
      action: { type: 'jump', targetSectionId: 'end' },
    },
    { id: 'model', type: 'short-text', label: '車種' },
    {
      id: 'walk',
      type: 'section-header',
      title: '徒歩',
      action: { type: 'submit' },
    },
    { id: 'steps', type: 'short-text', label: '歩数' },
    { id: 'end', type: 'section-header', title: 'おわり' },
    { id: 'score', type: 'rating', label: '満足度', levels: 5, symbol: 'star' },
  ],
}

/** One section holding v0-shaped answers for every special value type. */
export const SAVED_VALUES: Survey = {
  title: 'Saved',
  items: [
    { id: 'when', type: 'time', label: 'When', answerType: 'time' },
    {
      id: 'how',
      type: 'single-choice',
      label: 'How',
      options: [
        { value: 'a', label: 'A' },
        { value: 'other', label: 'Other', isOther: true },
      ],
    },
    { id: 'stars', type: 'rating', label: 'Stars', levels: 5, symbol: 'star' },
  ],
}
```

- [ ] **Step 3: Write the failing tests**

`src/form/resolver.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { surveyMessages } from '../i18n/survey-messages'
import type { SurveyQuestion } from '../schema/survey-schema'
import { createSectionResolver } from './resolver'

const questions: SurveyQuestion[] = [
  { id: 'a', type: 'short-text', label: 'A', validation: { required: true } },
  { id: 'b', type: 'short-text', label: 'B' },
]
const resolver = createSectionResolver(
  () => questions,
  () => surveyMessages.locales.ja.validation
)

describe('createSectionResolver', () => {
  it('reports translated errors for the current section only', async () => {
    const result = await resolver({ a: '', other: '' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    })
    expect(result.errors).toEqual({
      a: { type: 'required', message: 'この質問は必須です' },
    })
  })

  it('returns the values when the section is valid', async () => {
    const result = await resolver({ a: 'x' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    })
    expect(result).toEqual({ values: { a: 'x' }, errors: {} })
  })
})
```

`src/form/survey-form.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BRANCHING, SAVED_VALUES } from '../../test/fixtures/form-surveys'
import { V0 } from '../../test/v0-classes'
import type { QuestionRendererProps } from '../question-types/types'
import type { SurveyInput } from '../schema/survey-schema'
import { SurveyForm } from './survey-form'

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

const v0 = (key: keyof typeof V0) => V0[key].split(' ').sort()

describe('SurveyForm', () => {
  it('keeps v0’s layout classes', () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} />)
    const title = screen.getByRole('heading', { level: 1 })
    expect(classesOf(screen.getByRole('form'))).toEqual(v0('form.root'))
    expect(classesOf(title.parentElement)).toEqual(v0('form.header'))
    expect(classesOf(title)).toEqual(v0('form.title'))
    expect(classesOf(screen.getByText('ご協力ください'))).toEqual(
      v0('form.description')
    )
    expect(classesOf(screen.getByRole('heading', { level: 2 }))).toEqual(
      v0('form.section-title')
    )
    expect(
      classesOf(screen.getByRole('button', { name: '次へ' }).parentElement)
    ).toEqual(v0('form.actions'))
  })

  it('shows the survey and its first section', () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} />)
    expect(
      screen.getByRole('heading', { level: 1, name: '通勤アンケート' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'はじめに' })
    ).toBeInTheDocument()
    expect(screen.getByRole('form')).toHaveAttribute('data-mbc', '')
  })

  it('keeps the section, shows the error and focuses the field on an invalid Next', async () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))

    const name = screen.getByRole('textbox', { name: /お名前/ })
    expect(
      screen.getByRole('heading', { level: 2, name: 'はじめに' })
    ).toBeInTheDocument()
    expect(await screen.findAllByText('この質問は必須です')).not.toHaveLength(0)
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAccessibleDescription('この質問は必須です')
  })

  it('follows branches, goes back, and clears abandoned answers on submit', async () => {
    const onSubmit = vi.fn()
    const onSectionChange = vi.fn()
    render(
      <SurveyForm
        schema={BRANCHING}
        onSubmit={onSubmit}
        onSectionChange={onSectionChange}
      />
    )

    await userEvent.type(screen.getByRole('textbox', { name: /お名前/ }), 'Ann')
    await userEvent.click(screen.getByRole('radio', { name: '車' }))
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: '車' })
    ).toHaveFocus()
    await userEvent.type(screen.getByRole('textbox', { name: '車種' }), 'Mini')

    await userEvent.click(screen.getByRole('button', { name: '前へ' }))
    expect(screen.getByRole('textbox', { name: /お名前/ })).toHaveValue('Ann')
    await userEvent.click(screen.getByRole('radio', { name: '徒歩' }))
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: '歩数' }),
      '8000'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートを送信' })
    )

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const [answers, meta] = onSubmit.mock.calls[0] as [
      Record<string, unknown>,
      { id: string; value: unknown }[],
    ]
    expect(answers).toEqual({
      name: 'Ann',
      route: 'walk',
      model: undefined,
      steps: '8000',
      score: undefined,
    })
    expect(meta.map((entry) => entry.id)).toEqual([
      'name',
      'route',
      'model',
      'steps',
      'score',
    ])
    expect(meta.find((entry) => entry.id === 'model')).toMatchObject({
      value: undefined,
    })
    expect(onSectionChange.mock.calls.map(([id]) => id)).toEqual([
      'car',
      'start',
      'walk',
    ])
  })

  it('moves to the next section when Enter is pressed in a field', async () => {
    const onSubmit = vi.fn()
    render(<SurveyForm schema={BRANCHING} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('radio', { name: '車' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: /お名前/ }),
      'Ann{Enter}'
    )

    expect(
      await screen.findByRole('heading', { level: 2, name: '車' })
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows and resubmits v0-shaped saved answers', async () => {
    const onSubmit = vi.fn()
    const saved = {
      when: { hour: '09', minute: '30' },
      how: 'other:自転車',
      stars: 4,
    }
    render(
      <SurveyForm
        schema={SAVED_VALUES}
        defaultValues={saved}
        onSubmit={onSubmit}
      />
    )

    expect(screen.getByDisplayValue('自転車')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5段階中4' })).toBeChecked()
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートを送信' })
    )

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(saved)
  })

  it('waits for an async onSubmit, reports a rejection, and allows a retry', async () => {
    const attempts = [deferred(), deferred()]
    const onSubmit = vi.fn(
      () => attempts[onSubmit.mock.calls.length - 1]!.promise
    )
    const onSubmitError = vi.fn()
    render(
      <SurveyForm
        schema={SAVED_VALUES}
        onSubmit={onSubmit}
        onSubmitError={onSubmitError}
        submitLabel="送る"
      />
    )
    const submit = screen.getByRole('button', { name: '送る' })

    await userEvent.click(submit)
    await waitFor(() => expect(submit).toBeDisabled())
    attempts[0]!.reject(new Error('offline'))
    expect(
      await screen.findByText('送信に失敗しました。もう一度お試しください。')
    ).toBeInTheDocument()
    expect(onSubmitError).toHaveBeenCalledWith(new Error('offline'))
    await waitFor(() => expect(submit).toBeEnabled())

    await userEvent.click(submit)
    attempts[1]!.resolve()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
  })

  it('fills schema defaults for unparsed backend JSON', () => {
    const stored = {
      title: 'T',
      items: [{ id: 'r', type: 'rating', label: 'R' }],
    }
    render(<SurveyForm schema={stored as SurveyInput} onSubmit={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('uses a host renderer from components', () => {
    function MyRating({ question }: QuestionRendererProps) {
      return <p>custom {question.id}</p>
    }
    render(
      <SurveyForm
        schema={SAVED_VALUES}
        onSubmit={() => {}}
        components={{ rating: MyRating }}
      />
    )
    expect(screen.getByText('custom stars')).toBeInTheDocument()
  })

  it('translates its buttons and shows the empty state', () => {
    render(
      <MbcProvider locale="en">
        <SurveyForm
          schema={{ title: 'Empty', items: [] }}
          onSubmit={() => {}}
        />
      </MbcProvider>
    )
    expect(screen.getByText('This survey has no content.')).toBeInTheDocument()
  })

  it('disables every control when disabled', () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} disabled />)
    expect(screen.getByRole('textbox', { name: /お名前/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
  })
})
```

- [ ] **Step 4: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web resolver survey-form`
Expected: FAIL — cannot resolve `./resolver`, `./survey-form`.

- [ ] **Step 5: Implement**

Append to `src/schema/survey-schema.ts`:

```ts
/** A survey as stored (before defaults); `Survey` is assignable to it. */
export type SurveyInput = z.input<typeof SurveySchema>
```

`src/form/resolver.ts`:

```ts
import type { FieldErrors, Resolver } from 'react-hook-form'

import type { SurveyAnswers } from '../answers/types'
import { validateAnswer } from '../engine/validate'
import { formatAnswerError } from '../i18n/format-error'
import type { SurveyMessages } from '../i18n/survey-messages'
import type { SurveyQuestion } from '../schema/survey-schema'

/** Validates the questions of the section on screen; other sections were validated when left. */
export function createSectionResolver(
  getQuestions: () => readonly SurveyQuestion[],
  getMessages: () => SurveyMessages['validation']
): Resolver<SurveyAnswers> {
  return async (values) => {
    const errors: FieldErrors<SurveyAnswers> = {}
    for (const question of getQuestions()) {
      const error = validateAnswer(question, values[question.id])
      if (error) {
        errors[question.id] = {
          type: error.key,
          message: formatAnswerError(error, getMessages()),
        }
      }
    }
    return Object.keys(errors).length > 0
      ? { values: {}, errors }
      : { values, errors: {} }
  }
}
```

`src/form/focus.ts`:

```ts
const FOCUSABLE =
  'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [role="radio"]:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Focuses the first invalid question's control inside `root`. */
export function focusFirstInvalid(root: HTMLElement | null): void {
  const card = root?.querySelector<HTMLElement>(
    '[data-question-id][data-invalid]'
  )
  if (!card) return
  const invalid = card.querySelector<HTMLElement>('[aria-invalid="true"]')
  const target =
    invalid && invalid.matches(FOCUSABLE)
      ? invalid
      : card.querySelector<HTMLElement>(FOCUSABLE)
  target?.focus()
}
```

`src/form/survey-form.tsx`:

```tsx
'use client'

import {
  Alert,
  AlertDescription,
  Button,
  cn,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import type { SurveyAnswerMeta, SurveyAnswers } from '../answers/types'
import { collectAnswers } from '../engine/collect'
import { resolveNext } from '../engine/navigation'
import { buildPages } from '../engine/pages'
import { surveyMessages } from '../i18n/survey-messages'
import {
  questionRenderers,
  type QuestionRenderers,
} from '../question-types/registry'
import type { QuestionRendererProps } from '../question-types/types'
import {
  SurveySchema,
  type Survey,
  type SurveyInput,
  type SurveyQuestion,
} from '../schema/survey-schema'
import { focusFirstInvalid } from './focus'
import { QuestionField } from './question-field'
import { createSectionResolver } from './resolver'

export type SurveyFormProps = {
  /** Parsed here, so stored JSON without defaults is fine. */
  schema: SurveyInput
  onSubmit: (
    answers: SurveyAnswers,
    meta: SurveyAnswerMeta[]
  ) => void | Promise<void>
  onSubmitError?: (error: unknown) => void
  /** Read once on mount: render after the answer has loaded, or remount with `key`. */
  defaultValues?: SurveyAnswers
  disabled?: boolean
  submitLabel?: ReactNode
  children?: ReactNode
  onSectionChange?: (sectionId: string) => void
  components?: Partial<QuestionRenderers>
  className?: string
}

type Status = 'idle' | 'submitting' | 'failed'

export function SurveyForm({
  schema,
  onSubmit,
  onSubmitError,
  defaultValues,
  disabled = false,
  submitLabel,
  children,
  onSectionChange,
  components,
  className,
}: SurveyFormProps) {
  const t = useMessages(surveyMessages)
  const survey = useMemo(() => {
    const parsed = SurveySchema.safeParse(schema)
    return parsed.success ? parsed.data : (schema as Survey)
  }, [schema])
  const pages = useMemo(() => buildPages(survey), [survey])
  const [history, setHistory] = useState<string[]>(() =>
    pages[0] ? [pages[0].id] : []
  )
  const [status, setStatus] = useState<Status>('idle')
  const [focusRequest, setFocusRequest] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const navigated = useRef(false)

  const current = pages.find((page) => page.id === history.at(-1))
  const questionsRef = useRef<readonly SurveyQuestion[]>([])
  const messagesRef = useRef(t.validation)
  useEffect(() => {
    questionsRef.current = current?.questions ?? []
    messagesRef.current = t.validation
  })

  const resolver = useMemo(
    () =>
      createSectionResolver(
        () => questionsRef.current,
        () => messagesRef.current
      ),
    []
  )
  const { control, handleSubmit, trigger, getValues } = useForm<SurveyAnswers>({
    defaultValues,
    resolver,
    // Renderers take no ref; focusFirstInvalid moves focus once the error is described.
    shouldFocusError: false,
  })

  const branchIds = useMemo(
    () =>
      (current?.questions ?? [])
        .filter((q) => q.type === 'single-choice' || q.type === 'dropdown')
        .map((q) => q.id),
    [current]
  )
  const branchValues = useWatch({ control, name: branchIds })
  const isFinal = useMemo(() => {
    if (!current) return true
    const answers = Object.fromEntries(
      branchIds.map((id, i) => [id, branchValues[i]])
    )
    return resolveNext(current, answers, pages) === null
  }, [current, branchIds, branchValues, pages])

  useEffect(() => {
    if (!navigated.current || !current) return
    headingRef.current?.focus()
    onSectionChange?.(current.id)
    // Only navigation, not callback identity, should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  useEffect(() => {
    if (focusRequest === 0) return
    // FieldError registers its id one commit after it renders; focus after that.
    const timer = setTimeout(() => focusFirstInvalid(formRef.current), 0)
    return () => clearTimeout(timer)
  }, [focusRequest])

  const requestFocus = () => setFocusRequest((n) => n + 1)

  const goNext = async () => {
    if (!current) return
    const valid = await trigger(current.questions.map((q) => q.id))
    if (!valid) {
      requestFocus()
      return
    }
    const nextId = resolveNext(current, getValues(), pages)
    if (nextId) {
      navigated.current = true
      setHistory((previous) => [...previous, nextId])
    }
  }

  const goBack = () => {
    navigated.current = true
    setHistory((previous) =>
      previous.length > 1 ? previous.slice(0, -1) : previous
    )
  }

  const submit = handleSubmit(
    async (values) => {
      const { answers, meta } = collectAnswers(pages, history, values)
      setStatus('submitting')
      try {
        await onSubmit(answers, meta)
        setStatus('idle')
      } catch (error) {
        setStatus('failed')
        onSubmitError?.(error)
      }
    },
    () => requestFocus()
  )

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isFinal) void submit(event)
    else void goNext()
  }

  if (!current) {
    return (
      <div data-mbc="" className="mbc:p-8 mbc:text-center">
        {t.form.empty}
      </div>
    )
  }

  const busy = disabled || status === 'submitting'

  return (
    <form
      ref={formRef}
      data-mbc=""
      aria-label={survey.title}
      noValidate
      onSubmit={onFormSubmit}
      className={cn(
        'mbc:mx-auto mbc:my-12 mbc:max-w-3xl',
        disabled && 'mbc:pointer-events-none mbc:opacity-50',
        className
      )}
    >
      <div className="mbc:mb-10 mbc:text-center">
        <h1 className="mbc:text-4xl mbc:font-bold mbc:tracking-tight">
          {survey.title}
        </h1>
        {survey.description && (
          <p className="mbc:text-muted-foreground mbc:mt-2 mbc:text-lg">
            {survey.description}
          </p>
        )}
      </div>

      <div key={current.id} className="mbc:mt-8">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mbc:mb-6 mbc:border-b mbc:border-border mbc:pb-2 mbc:text-2xl mbc:font-semibold mbc:outline-none"
        >
          {current.title}
        </h2>
        {current.description && (
          <p className="mbc:text-muted-foreground mbc:mb-6">
            {current.description}
          </p>
        )}
        {children}
        {current.questions.map((question) => {
          const Renderer = (components?.[question.type] ??
            questionRenderers[
              question.type
            ]) as ComponentType<QuestionRendererProps>
          return (
            <Controller
              key={question.id}
              name={question.id}
              control={control}
              render={({ field, fieldState }) => (
                <QuestionField
                  questionId={question.id}
                  label={question.label}
                  description={question.description}
                  required={question.validation?.required}
                  error={fieldState.error?.message}
                >
                  <Renderer
                    question={question}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={busy}
                    invalid={Boolean(fieldState.error)}
                  />
                </QuestionField>
              )}
            />
          )
        })}
      </div>

      {status === 'failed' && (
        <Alert variant="destructive" className="mbc:mt-8">
          <AlertDescription>{t.form.submitError}</AlertDescription>
        </Alert>
      )}

      <div className="mbc:mt-8 mbc:flex mbc:justify-between mbc:pt-4">
        <div>
          {history.length > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={busy}
            >
              {t.form.back}
            </Button>
          )}
        </div>
        {/* One submit button: it is the form's default button, so Enter in any
            field goes through onFormSubmit (Next, or Submit on the last section). */}
        <Button type="submit" disabled={busy} loading={status === 'submitting'}>
          {isFinal ? (submitLabel ?? t.form.submit) : t.form.next}
        </Button>
      </div>
    </form>
  )
}
```

Append to `src/index.ts`:

```ts
export { SurveyForm, type SurveyFormProps } from './form/survey-form'
```

- [ ] **Step 6: Run them to verify they pass**

Run: `$N pnpm vitest run --project survey-web resolver survey-form`
Expected: PASS — 13 tests. If the focus test sees the field focused but `aria-describedby` missing, the focus ran before `FieldError` registered: keep `setTimeout(…, 0)` and make sure the effect depends only on `focusRequest`. If the "Enter" test submits, the form's `onSubmit` is not intercepting (check `isFinal` for the first section — it must be `false` once a branch is chosen).

- [ ] **Step 7: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0. React Compiler lint rules may flag the ref writes in the effect or `navigated.current` reads; refs written inside effects/handlers are allowed — fix any real "ref read during render" by moving the read into the effect.

```bash
git add -A
git commit -m "feat(survey-web): add SurveyForm with sections, branching and async submit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: SSR, accessibility, playground, build output; gate

**Files:**

- Create: `packages/survey-web/test/ssr.test.tsx`, `packages/survey-web/test/a11y.test.tsx`, `apps/playground/src/survey-form-page.tsx`
- Modify: `packages/survey-web/test/build/output.test.ts`, `apps/playground/package.json`, `apps/playground/src/main.tsx`, `apps/playground/src/toolbar.tsx`

**Interfaces:**

- Consumes: everything above.

- [ ] **Step 1: Write the SSR and accessibility tests**

`test/ssr.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SurveyForm } from '../src/form/survey-form'
import type { Survey } from '../src/schema/survey-schema'

const survey: Survey = {
  title: 'SSR',
  items: [
    {
      id: 'pick',
      type: 'single-choice',
      label: 'Pick',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
      validation: { shuffleOptions: true },
    },
    {
      id: 'when',
      type: 'date',
      label: 'When',
      includeTime: true,
      includeYear: false,
    },
    { id: 'stars', type: 'rating', label: 'Stars', levels: 5, symbol: 'star' },
  ],
}

describe('server rendering', () => {
  it('hydrates without mismatches', async () => {
    const element = (
      <MbcProvider>
        <SurveyForm schema={survey} onSubmit={() => {}} />
      </MbcProvider>
    )
    const html = renderToString(element)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      hydrateRoot(container, element)
    })

    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
    container.remove()
  })
})
```

`test/a11y.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { SurveyForm } from '../src/form/survey-form'
import type { Survey } from '../src/schema/survey-schema'

const everyType: Survey = {
  title: 'All types',
  items: [
    {
      id: 'a',
      type: 'short-text',
      label: 'Short',
      validation: { required: true },
    },
    { id: 'b', type: 'long-text', label: 'Long' },
    {
      id: 'c',
      type: 'single-choice',
      label: 'Single',
      options: [
        { value: 'x', label: 'X' },
        { value: 'other', label: 'Other', isOther: true },
      ],
    },
    {
      id: 'd',
      type: 'multiple-choice',
      label: 'Multiple',
      options: [{ value: 'x', label: 'X' }],
    },
    {
      id: 'e',
      type: 'dropdown',
      label: 'Dropdown',
      options: [{ value: 'x', label: 'X' }],
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
    { id: 'i', type: 'time', label: 'Time', answerType: 'duration' },
  ],
}

describe('SurveyForm accessibility', () => {
  it('has no axe violations', async () => {
    render(<SurveyForm schema={everyType} onSubmit={() => {}} />)
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(
      result.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`
      )
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Run them**

Run: `$N pnpm vitest run --project survey-web ssr a11y`
Expected: PASS — 2 tests. A hydration error names the mismatching text (shuffle, ids, or a date rendered with the current time); fix the component, not the test. An axe violation is a component defect: fix it and add the case to that renderer's test.

- [ ] **Step 3: Extend the build-output test**

Append to `packages/survey-web/test/build/output.test.ts` (inside the describe):

```ts
it('marks component modules as client modules and keeps the engine free of React', () => {
  for (const file of listFiles(dist, '.js')) {
    const source = readText(dist, file)
    if (/from\s*["']react\/jsx-runtime["']/.test(source)) {
      expect(hasUseClientDirective(source), file).toBe(true)
    }
    if (/^(engine|schema|answers)\//.test(file)) {
      expect(hasUseClientDirective(source), file).toBe(false)
      expect(source, file).not.toMatch(/from\s*["']react/)
    }
  }
})
```

and add `hasUseClientDirective` to the import from `scripts/build-output`.

- [ ] **Step 4: Playground page**

`apps/playground/package.json`: add `"@mbc-cqrs-serverless/survey-web": "workspace:*"` to `dependencies`; run `$N pnpm install`.

`apps/playground/src/survey-form-page.tsx`:

```tsx
import { SurveyForm, type Survey } from '@mbc-cqrs-serverless/survey-web'
import { useState } from 'react'

const SAMPLE: Survey = {
  title: '顧客満足度調査 2026',
  description:
    'とても長い説明文がどのように折り返されるかを確認するためのサンプルです。所要時間は約3分です。',
  items: [
    { id: 's1', type: 'section-header', title: '基本情報' },
    {
      id: 'name',
      type: 'short-text',
      label: 'お名前',
      validation: { required: true },
    },
    {
      id: 'mail',
      type: 'short-text',
      label: 'メールアドレス',
      validation: { custom: { type: 'text', rule: 'is_email' } },
    },
    {
      id: 'bio',
      type: 'long-text',
      label: '自己紹介',
      description: '200文字以内',
      validation: { custom: { type: 'length', rule: 'max', value: 200 } },
    },
    {
      id: 'route',
      type: 'single-choice',
      label: '通勤手段',
      options: [
        { value: 'car', label: '車', nextSectionId: 's2' },
        { value: 'train', label: '電車' },
        { value: 'other', label: 'その他', isOther: true },
      ],
      validation: { required: true, shuffleOptions: true },
    },
    { id: 's2', type: 'section-header', title: '評価' },
    {
      id: 'tools',
      type: 'multiple-choice',
      label: '利用したツール',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'other', label: 'その他', isOther: true },
      ],
      validation: { custom: { rule: 'max', value: 2 } },
    },
    {
      id: 'plan',
      type: 'dropdown',
      label: 'プラン',
      options: [
        { value: 'free', label: '無料' },
        { value: 'pro', label: 'プロ' },
      ],
    },
    {
      id: 'nps',
      type: 'linear-scale',
      label: 'おすすめ度',
      min: 0,
      max: 10,
      minLabel: '低い',
      maxLabel: '高い',
    },
    { id: 'stars', type: 'rating', label: '満足度', levels: 5, symbol: 'star' },
    {
      id: 'when',
      type: 'date',
      label: '来店日時',
      includeTime: true,
      includeYear: true,
    },
    { id: 'stay', type: 'time', label: '滞在時間', answerType: 'duration' },
  ],
}

export function SurveyFormPage() {
  const [result, setResult] = useState<unknown>(null)
  return (
    <div style={{ padding: 16 }}>
      <SurveyForm
        schema={SAMPLE}
        onSubmit={(answers, meta) => setResult({ answers, meta })}
      />
      {result !== null && (
        <pre
          style={{ maxWidth: 768, margin: '0 auto', whiteSpace: 'pre-wrap' }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
```

`apps/playground/src/main.tsx`: swap the stylesheet (survey-web's `styles.css` already contains every ui-web class it uses, and the gallery's) and route on the hash:

```tsx
import '@mbc-cqrs-serverless/survey-web/styles.css'

import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Gallery } from './gallery'
import { SurveyFormPage } from './survey-form-page'
import { Toolbar, type Settings } from './toolbar'

function useHash() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const update = () => setHash(location.hash)
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return hash
}

export function App() {
  const hash = useHash()
  const [settings, setSettings] = useState<Settings>({
    locale: 'ja',
    dark: new URLSearchParams(location.search).has('dark'),
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.dark)
    document.body.style.background = settings.dark ? '#020817' : '#ffffff'
    document.body.style.color = settings.dark ? '#f8fafc' : '#020817'
  }, [settings.dark])

  return (
    <MbcProvider locale={settings.locale}>
      <Toolbar settings={settings} onChange={setSettings} />
      {hash === '#survey' ? <SurveyFormPage /> : <Gallery />}
    </MbcProvider>
  )
}

const root = document.getElementById('root')
if (root && !root.dataset.fixture) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
```

The gallery's classes come from ui-web sources, which survey-web's stylesheet `@source`s, so the gallery keeps its look; the probe in Step 5 confirms it. In `toolbar.tsx`, after the preflight-fixture link, add:

```tsx
      <a href="#">Gallery</a>
      <a href="#survey">Survey form</a>
```

Run: `$N pnpm build && $N pnpm --filter @mbc-cqrs-serverless/playground typecheck && $N pnpm --filter @mbc-cqrs-serverless/playground build`
Expected: exit 0.

- [ ] **Step 5: Probe the survey page (evon gate 3)**

Start `$N pnpm --filter @mbc-cqrs-serverless/playground preview --port 4173 --strictPort` in the background, then:

```bash
$N node /Users/uzumakiruto017/.claude/plugins/cache/evondevkit/evon/0.3.13/skills/ui-ux/scripts/probe.mjs "http://localhost:4173/#survey" --widths 375,1280 --out .superpowers/sdd/2026-10-04-05-sp5-survey-form/probe/survey --pw "$TMPDIR/evon-probe"
$N node /Users/uzumakiruto017/.claude/plugins/cache/evondevkit/evon/0.3.13/skills/ui-ux/scripts/probe.mjs "http://localhost:4173/" --widths 375,1280 --out .superpowers/sdd/2026-10-04-05-sp5-survey-form/probe/gallery --pw "$TMPDIR/evon-probe"
```

Expected: the gallery screenshots match SP2's (`.superpowers/sdd/2026-10-04-02-sp2-ui-web/probe*/`) now that it loads survey-web's stylesheet; no horizontal scroll at 375px; open the screenshots and check the form against v0's layout (title block, section heading rule, cards, Back/Next row). Ledger any new v0-look items as proposed fixes; fix layout breaks. Stop the server afterwards.

- [ ] **Step 6: Commit and gate**

```bash
git add -A
git commit -m "test(survey-web): add SSR, a11y and build checks; playground survey page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Standard gate (orchestrator): `pnpm verify` on React 19 and 18, restore, clean tree. Final whole-branch review; fix Critical/Important RED→GREEN. Tick SP5 in the orchestrator; `git switch main && git merge --ff-only sp5-survey-form`.
