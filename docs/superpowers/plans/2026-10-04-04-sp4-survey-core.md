# SP4 — `survey-web` Schema and Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The `@mbc-cqrs-serverless/survey-web` package exists with its v0-compatible survey schema (zod 4), answer types, a pure form engine (pages, navigation, validation, answer collection), and the `survey` message namespace — everything SP5's `SurveyForm` needs except UI.

**Architecture:** Pure TypeScript modules under `src/schema`, `src/answers`, `src/engine`, `src/i18n`, no React. The schema is proven v0-compatible by running v0's own zod 3 schema (installed as `zod-v3`) side by side on the same inputs. Validation returns message _keys_ with parameters; text is resolved from the `survey` messages at render time. A small `ui-web` task first applies the SP2-review items survey-web depends on.

**Tech Stack:** SP1 toolchain, `zod` ^4.6.5, `zod-v3` (npm alias of `zod@3.25.76`, dev only), `@mbc-cqrs-serverless/ui-web` (workspace).

**Spec:** `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md` §2 (package), §3.3 (i18n), §5.1 (schema, types, aliases, `validateAnswers`), §6.1–6.2 (registry shape, engine). Orchestrator SP4 notes (from the SP2 review). v0 sources: `../mbc-cqrs-serverless-web/packages/survey/src/types/schema.ts`, `src/forms/survey-form.tsx`, `src/renderers/question-types/*.tsx`, `__tests__/schema.test.ts`.

## Global Constraints

- Commands: `fnm exec --using=v24.13.0 -- <command>` (`$N`), from `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`.
- Survey JSON stays v0-compatible: every input v0 accepted parses to the same data; every input v0 rejected is rejected.
- Saved answers stay v0-compatible: single choice `string` (`'other'` / `'other:<text>'`), multiple choice `string[]` (same markers), linear scale / rating / dropdown `string`, date ISO `string` (year 0 when `includeYear` is false), time `{ hour, minute }`, duration `{ hours, minutes, seconds }` (all strings).
- No React in `src/schema`, `src/answers`, `src/engine` (they must run on a server).
- No `console.*`, `process.env`, React-19-only APIs. Prettier style. Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Per-task final test command (exit code): `$N pnpm build && $N pnpm vitest run`.

## Behaviour changes from v0 (spec-backed, listed for MIGRATION.md in SP8)

1. **Multiple-choice count rules are enforced** (`validation.custom` `min`/`max`/`exact`). v0's schema defined them; v0's renderer never checked them. Spec §6.2 ("choice count").
2. **Number rules parse strictly**: `Number(value.trim())`. v0 used `parseFloat`, so `"12abc"` passed as 12.
3. **Abandoned-branch answers are `undefined`** in `collectAnswers` (spec decision, approved).
4. **A jump or `nextSectionId` to a missing section falls back to the next section** instead of a dead end (spec §6.2).

## Review Focus

1. **v0 survey JSON with unknown fields, a dangling `nextSectionId`, or no leading section header** → parses like v0, builds pages, and navigation never throws or dead-ends. Pinned in Tasks 2, 4.
2. **A jump cycle (A → B → A)** → `resolvePath` terminates; it does not loop forever. Pinned in Task 4.
3. **`validateAnswers` run on a server with answers that skipped a section by branching** → required questions in the skipped section produce no error. Pinned in Task 5.
4. **Regex rule with an invalid pattern in the schema** → the answer is accepted (v0: "don't block the user for a bad schema"), nothing throws. Pinned in Task 5.
5. **Answers saved by v0 for a time / duration / "other" question** → validate and collect without type errors or data loss. Pinned in Tasks 5, 6.

---

## File Structure

```
packages/ui-web/src/…                       Task 1 (SP2-review items)
packages/survey-web/
├─ package.json, tsconfig*.json, tsdown.config.ts, vitest.config.ts       Task 1
├─ src/
│  ├─ index.ts                                core exports (grows)       Task 1
│  ├─ templates/index.ts, mbc/index.ts        empty entries (SP7)        Task 1
│  ├─ styles/index.css                        CSS entry (ui-web + survey) Task 1
│  ├─ schema/survey-schema.ts (+test)         zod 4 schemas, types       Task 2
│  ├─ schema/parse.ts                         parseSurvey, validateSurveyJson Task 2
│  ├─ schema/aliases.ts                       deprecated v0 type names   Task 2
│  ├─ answers/types.ts                        answer value types         Task 3
│  ├─ answers/choice.ts (+test)               "other" encoding helpers   Task 3
│  ├─ engine/pages.ts (+test)                 buildPages                 Task 4
│  ├─ engine/navigation.ts (+test)            resolveNext, resolvePath   Task 4
│  ├─ engine/validate.ts (+test)              validateAnswer, validateAnswers Task 5
│  ├─ engine/collect.ts (+test)               collectAnswers             Task 6
│  └─ i18n/survey-messages.ts, format-error.ts (+test)                   Task 7
└─ test/
   ├─ v0/schema-v0.ts                          v0 schema on zod-v3        Task 2
   ├─ v0/schema.test.ts                        v0 cases, ported           Task 2
   ├─ fixtures/surveys.ts                      compat fixtures            Task 2
   └─ build/output.test.ts                     CSS/JS checks              Task 1
```

---

### Task 1: `ui-web` adjustments and the `survey-web` package

**Files:**

- Modify: `packages/ui-web/src/components/field.tsx` (annotate `FieldLabel`), `src/components/label.tsx` (space before required text), `src/i18n/types.ts`, `src/i18n/catalog.ts`, `src/i18n/provider.tsx` (locale fallback, catalog typing), `src/components/calendar.tsx` (locale fallback), their tests; spec §3.3
- Create: `packages/survey-web/package.json`, `tsconfig.json`, `tsconfig.build.json`, `tsdown.config.ts`, `vitest.config.ts`, `test/setup.ts`, `src/index.ts`, `src/templates/index.ts`, `src/mbc/index.ts`, `src/styles/index.css`, `test/build/output.test.ts`

**Interfaces:**

- Produces (ui-web):
  - `defineMessages<K extends keyof MbcMessageRegistry>(namespace: K, locales: Record<Locale, MbcMessageRegistry[K]>): MessageCatalog<MbcMessageRegistry[K]>` — namespace typos fail to compile; catalogs may be typed with `interface`.
  - `MessageCatalog<T>` (no `MessageTree` constraint); `useMessages<T>(catalog: MessageCatalog<T>): T`; an unknown runtime locale falls back to `ja` (and Calendar to react-day-picker `ja`).
  - `FieldLabel: ForwardRefExoticComponent<LabelProps & RefAttributes<HTMLLabelElement>>`.
  - `Label` required text reads `" required"` / `" 必須"` (leading space).
- Produces (survey-web): the package with entries `.`, `/templates`, `/mbc`, `/styles.css`, `/styles.layer.css`; `src/index.ts` re-exports `MbcProvider`, `useMessages`, `type MbcProviderProps` from ui-web (one `MbcContext` even when a host imports the provider from survey-web).

- [ ] **Step 1: Branch**

```bash
git switch main && git switch -c sp4-survey-core
```

- [ ] **Step 2: Write the failing ui-web tests**

Append to `packages/ui-web/src/i18n/provider.test.tsx` (inside `describe('MbcProvider', …)`):

```tsx
it('falls back to Japanese for an unknown runtime locale', () => {
  render(
    <MbcProvider locale={'fr' as 'ja'}>
      <Probe />
    </MbcProvider>
  )
  expect(screen.getByText(/^fr\|閉じる\|/)).toBeInTheDocument()
})
```

Append to `packages/ui-web/src/components/label.test.tsx` (inside `describe('Label', …)`):

```tsx
it('separates the required text from the label in the accessible name', () => {
  render(
    <MbcProvider locale="en">
      <Label required htmlFor="x">
        Email
      </Label>
      <input id="x" />
    </MbcProvider>
  )
  expect(
    screen.getByRole('textbox', { name: 'Email required' })
  ).toBeInTheDocument()
})
```

Append to `packages/ui-web/src/components/calendar.test.tsx` (inside `describe('Calendar', …)`):

```tsx
it('falls back to Japanese for an unknown runtime locale', () => {
  render(
    <MbcProvider locale={'fr' as 'ja'}>
      <Calendar defaultMonth={OCTOBER} />
    </MbcProvider>
  )
  expect(screen.getByText('2026年10月')).toBeInTheDocument()
})
```

Create `packages/ui-web/src/i18n/catalog.test-d.ts` — a compile-time test run by `typecheck`:

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
  },
}

// Interface-typed catalogs are accepted.
export const ok = defineMessages('ui', { ja: messages, en: messages })

// @ts-expect-error unknown namespace
export const typo = defineMessages('uii', { ja: messages, en: messages })
```

and add `"src/**/*.test-d.ts"` to the `exclude` list of `packages/ui-web/tsconfig.build.json`, and `'!src/**/*.test-d.ts'` to the `entry` list in `scripts/tsdown-preset.ts` (type-only tests must not ship).

- [ ] **Step 3: Run them to verify they fail**

Run: `$N pnpm vitest run --project ui-web provider label calendar ; $N pnpm --filter @mbc-cqrs-serverless/ui-web typecheck`
Expected: the three new tests FAIL (`TypeError … reading 'close'` / name `Emailrequired` / calendar TypeError); typecheck FAILS on `catalog.test-d.ts` (index signature missing; unused `@ts-expect-error`).

- [ ] **Step 4: Implement the ui-web changes**

`src/i18n/types.ts` — drop the constraint on `MessageCatalog`:

```ts
export interface MessageCatalog<T> {
  readonly namespace: string
  readonly locales: Readonly<Record<Locale, T>>
}
```

`src/i18n/catalog.ts`:

```ts
import type { Locale, MbcMessageRegistry, MessageCatalog } from './types'

export function defineMessages<K extends keyof MbcMessageRegistry>(
  namespace: K,
  locales: Record<Locale, MbcMessageRegistry[K]>
): MessageCatalog<MbcMessageRegistry[K]> {
  return { namespace, locales }
}
```

`src/i18n/provider.tsx` — `useMessages` signature `useMessages<T>(catalog: MessageCatalog<T>): T` and its memo body:

```ts
return useMemo(
  () => mergeMessages(catalog.locales[locale] ?? catalog.locales.ja, override),
  [catalog, locale, override]
)
```

(remove the now-unused `MessageTree` import there).

`src/components/calendar.tsx`: `locale={DAY_PICKER_LOCALES[locale] ?? ja}` and `date.toLocaleString(INTL_LOCALES[locale] ?? 'ja-JP', …)`.

`src/components/label.tsx`: the sr-only span renders `{` ${t.required}`}` (leading space).

`src/components/field.tsx`: import `type ForwardRefExoticComponent, type RefAttributes` from `react` and annotate:

```ts
export const FieldLabel: ForwardRefExoticComponent<
  LabelProps & RefAttributes<HTMLLabelElement>
> = forwardRef<HTMLLabelElement, LabelProps>(function FieldLabel(props, ref) {
```

Spec §3.3: replace `useMessages(namespace)` with `useMessages(catalog)` and remove `MessagesFor<T>`; add: "`defineMessages(namespace, { ja, en })` — `namespace` must be a key of `MbcMessageRegistry`; an unknown runtime locale falls back to `ja`."

- [ ] **Step 5: Run them to verify they pass**

Run: `$N pnpm vitest run --project ui-web && $N pnpm --filter @mbc-cqrs-serverless/ui-web typecheck`
Expected: all ui-web tests pass (the `label` v0 test still passes — the label element's classes are unchanged); typecheck exit 0.

- [ ] **Step 6: Scaffold `packages/survey-web`**

`package.json`:

```json
{
  "name": "@mbc-cqrs-serverless/survey-web",
  "version": "0.0.0",
  "description": "Survey form, creator, and template screens for MBC CQRS Serverless web apps",
  "license": "MIT",
  "author": "Murakami Business Consulting, Inc.",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./templates": {
      "types": "./dist/templates/index.d.ts",
      "default": "./dist/templates/index.js"
    },
    "./mbc": {
      "types": "./dist/mbc/index.d.ts",
      "default": "./dist/mbc/index.js"
    },
    "./styles.css": "./dist/styles.css",
    "./styles.layer.css": "./dist/styles.layer.css",
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown && node ../../scripts/build-css.ts",
    "typecheck": "tsc -p tsconfig.json",
    "check:package": "publint --strict && attw --pack . --profile esm-only --exclude-entrypoints ./styles.css ./styles.layer.css ./package.json"
  },
  "dependencies": {
    "@mbc-cqrs-serverless/client-web": "workspace:^",
    "@mbc-cqrs-serverless/ui-web": "workspace:^",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "zod-v3": "npm:zod@3.25.76"
  },
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/mbc-net/mbc-cqrs-serverless-web.git",
    "directory": "packages/survey-web"
  }
}
```

(`react-hook-form`, `@hookform/resolvers`, `@dnd-kit/*`, `date-fns` are added by the sub-plans that first use them.)

`tsconfig.json`, `tsconfig.build.json`, `tsdown.config.ts`: copy `packages/ui-web`'s (the build tsconfig keeps `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.test-d.ts"]`).

`vitest.config.ts`:

```ts
import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'survey-web',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
})
```

`test/setup.ts`: copy `packages/ui-web/test/setup.ts` (jest-dom, cleanup, guarded DOM shims).

`src/index.ts`:

```ts
// One MbcContext: hosts may import the provider from here or from ui-web.
export {
  MbcProvider,
  useMessages,
  type MbcProviderProps,
} from '@mbc-cqrs-serverless/ui-web'
```

`src/templates/index.ts` and `src/mbc/index.ts`:

```ts
export {}
```

`src/styles/index.css` — ui-web's entry plus survey-web sources; ui-web's classes are scanned from its sources so this stylesheet is self-contained (spec §2):

```css
@layer theme, base, mbc, components, utilities;
@layer mbc.theme, mbc.base, mbc.utilities;

@import 'tailwindcss/theme.css' layer(mbc.theme) prefix(mbc);
@import 'tailwindcss/utilities.css' layer(mbc.utilities) prefix(mbc)
  source(none);
@import 'tw-animate-css/prefix';
@source '../';
@source '../../../ui-web/src';
@source not '../**/*.test.{ts,tsx}';
@source not '../../../ui-web/src/**/*.test.{ts,tsx}';

@import '../../../ui-web/src/styles/theme.css';
@import '../../../ui-web/src/styles/tokens.css' layer(mbc.base);
@import '../../../ui-web/src/styles/base.css' layer(mbc.base);
```

Add `"tw-animate-css": "^1.4.0"` to survey-web `devDependencies`, then run `$N pnpm install`.

- [ ] **Step 7: Write the build-output test `test/build/output.test.ts`**

```ts
// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  FORBIDDEN_JS_PATTERNS,
  listFiles,
  readText,
} from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  parseCss,
  unprefixedClasses,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))
const css = readText(dist, 'styles.css')

describe('survey-web output', () => {
  it('ships every entry point', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'templates/index.js', 'mbc/index.js'])
    )
    expect(listFiles(dist, '.css')).toEqual(['styles.css', 'styles.layer.css'])
  })

  it('includes ui-web primitives’ classes, so one stylesheet is enough', () => {
    expect(css).toContain('.mbc\\:bg-primary')
    expect(css).toContain('--mbc-primary:')
  })

  it('keeps the CSS prefixed and scoped', () => {
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

  it('contains no host-framework references', () => {
    for (const file of listFiles(dist, '.js')) {
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(readText(dist, file), `${file} ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
```

- [ ] **Step 8: Build and run**

Run: `$N pnpm build && $N pnpm vitest run --project survey-web && $N pnpm check:package`
Expected: build OK for all three packages; 4 tests pass; publint/attw green for survey-web.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(survey-web): scaffold package; tighten ui-web i18n and Field typing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Survey schema (zod 4) with v0 compatibility

**Files:**

- Create: `src/schema/survey-schema.ts`, `src/schema/parse.ts`, `src/schema/aliases.ts`, `src/schema/survey-schema.test.ts`, `test/v0/schema-v0.ts`, `test/v0/schema.test.ts`, `test/fixtures/surveys.ts`
- Modify: `src/index.ts`

**Interfaces:**

- Produces:
  - Schemas: `SurveySchema`, `SurveyItemSchema`, `SectionHeaderSchema`, `ShortTextQuestionSchema`, `LongTextQuestionSchema`, `LinearScaleQuestionSchema`, `SingleChoiceQuestionSchema`, `MultipleChoiceQuestionSchema`, `DropdownQuestionSchema`, `RatingQuestionSchema`, `DateQuestionSchema`, `TimeQuestionSchema`.
  - Types: `Survey`, `SurveyItem`, `SectionHeader`, `SurveyQuestion` (= `Exclude<SurveyItem, { type: 'section-header' }>`), `QuestionKind` (= `SurveyQuestion['type']`), `QuestionOption`, `CustomValidationRule`, `ShortTextQuestion`, `LongTextQuestion`, `LinearScaleQuestion`, `SingleChoiceQuestion`, `MultipleChoiceQuestion`, `DropdownQuestion`, `RatingQuestion`, `DateQuestion`, `TimeQuestion`.
  - `parseSurvey(json: unknown): { success: true; data: Survey } | { success: false; error: z.ZodError }`; `validateSurveyJson` (deprecated alias of `parseSurvey`).
  - Deprecated type aliases: `SurveySchemaType`, `SurveyItemType`, `SectionHeaderType`, `QuestionOptionType`, `ValidationRulesType`, `CustomValidationRuleType`, `SurveyQuestionItemType`, `ShortTextQuestionType`, `LongTextQuestionType`, `LinearScaleQuestionType`, `SingleChoiceQuestionType`, `MultipleChoiceQuestionType`, `DropdownQuestionType`, `RatingQuestionType`, `DateQuestionType`, `TimeQuestionType`.

- [ ] **Step 1: Install the v0 reference schema**

Run: `$N pnpm install` (the `zod-v3` alias from Task 1).

Copy v0's schema next to the tests, pointing it at the alias:

```bash
sed "s#from 'zod'#from 'zod-v3'#" ../mbc-cqrs-serverless-web/packages/survey/src/types/schema.ts > packages/survey-web/test/v0/schema-v0.ts
```

Expected: `grep -c "zod-v3" packages/survey-web/test/v0/schema-v0.ts` prints `1`.

- [ ] **Step 2: Port v0's schema tests (they must fail now)**

```bash
{ printf "import { describe, expect, it } from 'vitest'\n\n"; sed "s#from '../src/types/schema'#from '../../src/schema/survey-schema'#" ../mbc-cqrs-serverless-web/packages/survey/__tests__/schema.test.ts; } > packages/survey-web/test/v0/schema.test.ts
```

v0's file imports `validateSurveyJson` from the schema module; add it to the import target by changing `'../../src/schema/survey-schema'` to `'../../src/index'` in that one import line:

```bash
sed -i '' "s#from '../../src/schema/survey-schema'#from '../../src/index'#" packages/survey-web/test/v0/schema.test.ts
```

Run: `$N pnpm vitest run --project survey-web test/v0/schema`
Expected: FAIL — cannot resolve `../../src/index` exports (`SurveySchema` undefined).

- [ ] **Step 3: Write the compatibility fixtures `test/fixtures/surveys.ts`**

```ts
/** Inputs whose parse result must be identical under v0 (zod 3) and v1 (zod 4). */
export const COMPAT_INPUTS: Record<string, unknown> = {
  everyItemType: {
    title: '顧客満足度調査',
    description: 'ご協力ください',
    items: [
      {
        id: 'q_intro',
        type: 'short-text',
        label: 'お名前',
        validation: { required: true },
      },
      {
        id: 'sec_profile',
        type: 'section-header',
        title: 'プロフィール',
        description: '基本情報',
        locked: true,
        action: { type: 'jump', targetSectionId: 'sec_end' },
        legacyField: 'stripped',
      },
      {
        id: 'q_age',
        type: 'short-text',
        label: '年齢',
        validation: {
          required: true,
          custom: {
            type: 'number',
            rule: 'between',
            value: 18,
            value2: 65,
            customError: '18〜65',
          },
        },
      },
      {
        id: 'q_nan',
        type: 'short-text',
        label: 'NaN bounds',
        validation: { custom: { type: 'number', rule: 'gt', value: null } },
      },
      {
        id: 'q_mail',
        type: 'short-text',
        label: 'メール',
        locked: true,
        validation: { custom: { type: 'text', rule: 'is_email' } },
      },
      {
        id: 'q_bio',
        type: 'long-text',
        label: '自己紹介',
        validation: { custom: { type: 'length', rule: 'max', value: 200 } },
      },
      { id: 'q_scale', type: 'linear-scale', label: 'おすすめ度' },
      {
        id: 'q_scale_custom',
        type: 'linear-scale',
        label: 'Scale',
        min: 1,
        max: 5,
        minLabel: '低',
        maxLabel: '高',
      },
      {
        id: 'q_route',
        type: 'single-choice',
        label: '経路',
        options: [
          { value: 'a', label: 'A', nextSectionId: 'sec_end' },
          { value: 'other', label: 'その他', isOther: true },
        ],
        validation: { required: true, shuffleOptions: true },
      },
      {
        id: 'q_multi',
        type: 'multiple-choice',
        label: '複数',
        options: [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ],
        validation: { custom: { rule: 'max', value: 1 } },
      },
      {
        id: 'q_drop',
        type: 'dropdown',
        label: '選択',
        options: [{ value: 'd', label: 'D', nextSectionId: 'missing-section' }],
      },
      { id: 'q_rate', type: 'rating', label: '評価' },
      {
        id: 'q_rate2',
        type: 'rating',
        label: '評価2',
        levels: 10,
        symbol: 'heart',
      },
      { id: 'q_date', type: 'date', label: '日付' },
      {
        id: 'q_date2',
        type: 'date',
        label: '日時',
        includeTime: true,
        includeYear: false,
      },
      { id: 'q_time', type: 'time', label: '時刻' },
      { id: 'q_dur', type: 'time', label: '所要時間', answerType: 'duration' },
      {
        id: 'sec_end',
        type: 'section-header',
        title: '終わり',
        action: { type: 'submit' },
      },
    ],
  },
  noLeadingHeader: {
    title: 'No header',
    items: [{ id: 'q1', type: 'short-text', label: 'Q1' }],
  },
  optionWithUnknownKey: {
    title: 'Strict options',
    items: [
      {
        id: 'q1',
        type: 'single-choice',
        label: 'Q',
        options: [{ value: 'a', label: 'A', color: 'red' }],
      },
    ],
  },
  duplicateIds: {
    title: 'Dupes',
    items: [
      { id: 'q1', type: 'short-text', label: 'A' },
      { id: 'q1', type: 'long-text', label: 'B' },
    ],
  },
  jumpWithExtraKey: {
    title: 'Jump',
    items: [
      {
        id: 's1',
        type: 'section-header',
        title: 'S',
        action: { type: 'submit', extra: 1 },
      },
    ],
  },
  emptyOptionLabel: {
    title: 'Empty',
    items: [
      {
        id: 'q',
        type: 'dropdown',
        label: 'Q',
        options: [{ value: 'v', label: '' }],
      },
    ],
  },
  notAnObject: 'survey',
  nullInput: null,
}
```

- [ ] **Step 4: Write the failing compatibility test `src/schema/survey-schema.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { SurveySchema as SurveySchemaV0 } from '../../test/v0/schema-v0'
import { COMPAT_INPUTS } from '../../test/fixtures/surveys'
import { parseSurvey } from './parse'
import { SurveySchema } from './survey-schema'

describe('SurveySchema compatibility with v0', () => {
  for (const [name, input] of Object.entries(COMPAT_INPUTS)) {
    it(`parses "${name}" exactly like v0`, () => {
      const v0 = SurveySchemaV0.safeParse(input)
      const v1 = SurveySchema.safeParse(input)

      expect(v1.success).toBe(v0.success)
      if (v0.success && v1.success) expect(v1.data).toEqual(v0.data)
    })
  }

  it('reports duplicate ids on the second occurrence', () => {
    const result = parseSurvey(COMPAT_INPUTS.duplicateIds)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['items', 1, 'id'])
      expect(result.error.issues[0]?.message).toBe('Duplicate item id "q1".')
    }
  })
})
```

Run: `$N pnpm vitest run --project survey-web survey-schema`
Expected: FAIL — cannot resolve `./parse`.

- [ ] **Step 5: Implement `src/schema/survey-schema.ts`**

```ts
import { z } from 'zod'

const QuestionOptionSchema = z
  .object({
    value: z.string().min(1, "Option 'value' cannot be empty."),
    label: z.string().min(1, "Option 'label' cannot be empty."),
    nextSectionId: z.string().optional(),
    isOther: z.boolean().optional(),
  })
  .strict()

const BaseValidationRulesSchema = z.object({
  required: z.boolean().optional(),
})

/** v0 stores NaN/null bounds; both mean "no bound". */
const optionalBound = z
  .number()
  .nullish()
  .transform((value) =>
    value === null || (typeof value === 'number' && Number.isNaN(value))
      ? undefined
      : value
  )
  .optional()

const LengthRuleSchema = z.object({
  type: z.literal('length'),
  rule: z.enum(['min', 'max']),
  value: z.number().int().min(0),
  customError: z.string().optional(),
})

const RegexRuleSchema = z.object({
  type: z.literal('regex'),
  rule: z.enum(['contains', 'not_contains', 'matches', 'not_matches']),
  value: z.string(),
  customError: z.string().optional(),
})

const CustomValidationRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('number'),
    rule: z.enum([
      'gt',
      'gte',
      'lt',
      'lte',
      'eq',
      'neq',
      'between',
      'not_between',
      'is_number',
      'is_whole',
    ]),
    value: optionalBound,
    value2: optionalBound,
    customError: z.string().optional(),
  }),
  z.object({
    type: z.literal('text'),
    rule: z.enum(['contains', 'not_contains', 'is_email', 'is_url']),
    value: z.string().optional(),
    customError: z.string().optional(),
  }),
  LengthRuleSchema,
  RegexRuleSchema,
])

const MultipleChoiceValidationRuleSchema = z.object({
  rule: z.enum(['min', 'max', 'exact']),
  value: z.number().int().min(1, 'Value must be at least 1.'),
  customError: z.string().optional(),
})

const BaseQuestionSchema = z.object({
  id: z.string().min(1, "Question 'id' cannot be empty."),
  label: z.string(),
  description: z.string().optional(),
  validation: BaseValidationRulesSchema.optional(),
  locked: z.boolean().optional(),
})

export const SectionHeaderSchema = z.object({
  id: z.string().min(1),
  type: z.literal('section-header'),
  title: z.string().min(1),
  description: z.string().optional(),
  locked: z.boolean().optional(),
  action: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('submit') }).strict(),
      z
        .object({ type: z.literal('jump'), targetSectionId: z.string().min(1) })
        .strict(),
    ])
    .optional(),
})

export const ShortTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('short-text'),
  validation: BaseValidationRulesSchema.extend({
    custom: CustomValidationRuleSchema.optional(),
  }).optional(),
})

export const LongTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('long-text'),
  validation: BaseValidationRulesSchema.extend({
    custom: z
      .discriminatedUnion('type', [LengthRuleSchema, RegexRuleSchema])
      .optional(),
  }).optional(),
})

export const LinearScaleQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('linear-scale'),
  min: z.number().default(0),
  max: z.number().default(10),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  validation: BaseValidationRulesSchema.optional(),
})

const ShuffleValidationSchema = BaseValidationRulesSchema.extend({
  shuffleOptions: z.boolean().optional(),
})

export const SingleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('single-choice'),
  options: z
    .array(QuestionOptionSchema)
    .min(1, 'Single-choice questions must have at least one option.'),
  validation: ShuffleValidationSchema.optional(),
})

export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('multiple-choice'),
  options: z
    .array(QuestionOptionSchema.omit({ nextSectionId: true }))
    .min(1, 'Multiple-choice questions must have at least one option.'),
  validation: ShuffleValidationSchema.extend({
    custom: MultipleChoiceValidationRuleSchema.optional(),
  }).optional(),
})

export const DropdownQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('dropdown'),
  options: z
    .array(QuestionOptionSchema)
    .min(1, 'Dropdown questions must have at least one option.'),
  validation: ShuffleValidationSchema.optional(),
})

export const RatingQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('rating'),
  levels: z.number().min(2).max(10).default(5),
  symbol: z.enum(['star', 'heart', 'thumb']).default('star'),
  validation: BaseValidationRulesSchema.optional(),
})

export const DateQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('date'),
  includeTime: z.boolean().optional().default(false),
  includeYear: z.boolean().optional().default(true),
  validation: BaseValidationRulesSchema.optional(),
})

export const TimeQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('time'),
  answerType: z.enum(['time', 'duration']).default('time'),
  validation: BaseValidationRulesSchema.optional(),
})

export const SurveyItemSchema = z.discriminatedUnion('type', [
  SectionHeaderSchema,
  ShortTextQuestionSchema,
  LongTextQuestionSchema,
  LinearScaleQuestionSchema,
  SingleChoiceQuestionSchema,
  MultipleChoiceQuestionSchema,
  DropdownQuestionSchema,
  RatingQuestionSchema,
  DateQuestionSchema,
  TimeQuestionSchema,
])

export const SurveySchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    items: z.array(SurveyItemSchema),
  })
  .superRefine((survey, ctx) => {
    // Item ids are form field names and branching targets: duplicates collapse.
    const seen = new Set<string>()
    survey.items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'id'],
          message: `Duplicate item id "${item.id}".`,
        })
        return
      }
      seen.add(item.id)
    })
  })

export type Survey = z.infer<typeof SurveySchema>
export type SurveyItem = z.infer<typeof SurveyItemSchema>
export type SectionHeader = z.infer<typeof SectionHeaderSchema>
export type SurveyQuestion = Exclude<SurveyItem, { type: 'section-header' }>
export type QuestionKind = SurveyQuestion['type']
export type QuestionOption = z.infer<typeof QuestionOptionSchema>
export type CustomValidationRule = z.infer<typeof CustomValidationRuleSchema>
export type ShortTextQuestion = z.infer<typeof ShortTextQuestionSchema>
export type LongTextQuestion = z.infer<typeof LongTextQuestionSchema>
export type LinearScaleQuestion = z.infer<typeof LinearScaleQuestionSchema>
export type SingleChoiceQuestion = z.infer<typeof SingleChoiceQuestionSchema>
export type MultipleChoiceQuestion = z.infer<
  typeof MultipleChoiceQuestionSchema
>
export type DropdownQuestion = z.infer<typeof DropdownQuestionSchema>
export type RatingQuestion = z.infer<typeof RatingQuestionSchema>
export type DateQuestion = z.infer<typeof DateQuestionSchema>
export type TimeQuestion = z.infer<typeof TimeQuestionSchema>
export type ValidationRules = z.infer<typeof BaseValidationRulesSchema>
```

`src/schema/parse.ts`:

```ts
import type { z } from 'zod'

import { SurveySchema, type Survey } from './survey-schema'

export type ParseSurveyResult =
  { success: true; data: Survey } | { success: false; error: z.ZodError }

export function parseSurvey(json: unknown): ParseSurveyResult {
  const result = SurveySchema.safeParse(json)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

/** @deprecated Use `parseSurvey`. */
export const validateSurveyJson = parseSurvey
```

`src/schema/aliases.ts`:

```ts
import type * as S from './survey-schema'

/** @deprecated Use `Survey`. */
export type SurveySchemaType = S.Survey
/** @deprecated Use `SurveyItem`. */
export type SurveyItemType = S.SurveyItem
/** @deprecated Use `SectionHeader`. */
export type SectionHeaderType = S.SectionHeader
/** @deprecated Use `QuestionOption`. */
export type QuestionOptionType = S.QuestionOption
/** @deprecated Use `ValidationRules`. */
export type ValidationRulesType = S.ValidationRules
/** @deprecated Use `CustomValidationRule`. */
export type CustomValidationRuleType = S.CustomValidationRule
/** @deprecated Use `SurveyQuestion`. */
export type SurveyQuestionItemType = S.SurveyQuestion
/** @deprecated Use `ShortTextQuestion`. */
export type ShortTextQuestionType = S.ShortTextQuestion
/** @deprecated Use `LongTextQuestion`. */
export type LongTextQuestionType = S.LongTextQuestion
/** @deprecated Use `LinearScaleQuestion`. */
export type LinearScaleQuestionType = S.LinearScaleQuestion
/** @deprecated Use `SingleChoiceQuestion`. */
export type SingleChoiceQuestionType = S.SingleChoiceQuestion
/** @deprecated Use `MultipleChoiceQuestion`. */
export type MultipleChoiceQuestionType = S.MultipleChoiceQuestion
/** @deprecated Use `DropdownQuestion`. */
export type DropdownQuestionType = S.DropdownQuestion
/** @deprecated Use `RatingQuestion`. */
export type RatingQuestionType = S.RatingQuestion
/** @deprecated Use `DateQuestion`. */
export type DateQuestionType = S.DateQuestion
/** @deprecated Use `TimeQuestion`. */
export type TimeQuestionType = S.TimeQuestion
```

Append to `src/index.ts`:

```ts
export * from './schema/survey-schema'
export * from './schema/aliases'
export {
  parseSurvey,
  validateSurveyJson,
  type ParseSurveyResult,
} from './schema/parse'
```

- [ ] **Step 6: Run the schema tests to verify they pass**

Run: `$N pnpm vitest run --project survey-web schema`
Expected: PASS — every ported v0 case and every compatibility case. A compatibility failure means zod 4 behaves differently for that input (e.g. issue paths, defaults inside optional, `.strict()`); adjust the v1 schema until the outputs match — never the fixture.

- [ ] **Step 7: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0. (Lint may flag the copied `test/v0/schema-v0.ts`; add `'packages/*/test/v0/**'` to the `globalIgnores` list in `eslint.config.js` — it is a verbatim reference copy.)

```bash
git add -A
git commit -m "feat(survey-web): port the survey schema to zod 4 with v0 compatibility tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Answer types and "other" encoding

**Files:**

- Create: `src/answers/types.ts`, `src/answers/choice.ts`, `src/answers/choice.test.ts`
- Modify: `src/index.ts`

**Interfaces:**

- Produces:
  - `type TimeAnswer = { hour: string; minute: string }`, `type DurationAnswer = { hours: string; minutes: string; seconds: string }`
  - `type SurveyAnswerValue = string | string[] | TimeAnswer | DurationAnswer | undefined`
  - `type SurveyAnswers = Record<string, SurveyAnswerValue>`
  - `type SurveyAnswerMeta = { id: string; label: string; type: QuestionKind; value: SurveyAnswerValue }`
  - `OTHER_VALUE = 'other'`; `isOtherValue(value: string): boolean` (`'other'` or `'other:…'`); `otherText(value: string): string` (`''` for bare `'other'`); `toOtherValue(text: string): string` (`'other'` for blank text, else `'other:<text>'`).

- [ ] **Step 1: Write the failing test `src/answers/choice.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { isOtherValue, OTHER_VALUE, otherText, toOtherValue } from './choice'

describe('"other" answer encoding (v0-compatible)', () => {
  it('recognises bare and filled "other" values', () => {
    expect(isOtherValue('other')).toBe(true)
    expect(isOtherValue('other:自転車')).toBe(true)
    expect(isOtherValue('others')).toBe(false)
    expect(isOtherValue('a')).toBe(false)
  })

  it('reads and writes the free text', () => {
    expect(otherText('other:自転車: 速い')).toBe('自転車: 速い')
    expect(otherText(OTHER_VALUE)).toBe('')
    expect(toOtherValue('  ')).toBe('other')
    expect(toOtherValue('徒歩')).toBe('other:徒歩')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web choice`
Expected: FAIL — cannot resolve `./choice`.

- [ ] **Step 3: Implement**

`src/answers/types.ts`:

```ts
import type { QuestionKind } from '../schema/survey-schema'

/** `time` answers (v0 shape). */
export type TimeAnswer = { hour: string; minute: string }
/** `time` answers with `answerType: 'duration'` (v0 shape). */
export type DurationAnswer = { hours: string; minutes: string; seconds: string }

export type SurveyAnswerValue =
  string | string[] | TimeAnswer | DurationAnswer | undefined

export type SurveyAnswers = Record<string, SurveyAnswerValue>

/** Answers carry question ids as keys; meta says what was asked. */
export type SurveyAnswerMeta = {
  id: string
  label: string
  type: QuestionKind
  value: SurveyAnswerValue
}
```

`src/answers/choice.ts`:

```ts
/** v0 stores an "other" choice as `'other'` or `'other:<free text>'`. */
export const OTHER_VALUE = 'other'
const PREFIX = `${OTHER_VALUE}:`

export function isOtherValue(value: string): boolean {
  return value === OTHER_VALUE || value.startsWith(PREFIX)
}

export function otherText(value: string): string {
  return value.startsWith(PREFIX) ? value.slice(PREFIX.length) : ''
}

export function toOtherValue(text: string): string {
  return text.trim() ? `${PREFIX}${text}` : OTHER_VALUE
}
```

Append to `src/index.ts`:

```ts
export * from './answers/types'
export {
  isOtherValue,
  OTHER_VALUE,
  otherText,
  toOtherValue,
} from './answers/choice'
```

- [ ] **Step 4: Run it to verify it passes, commit**

Run: `$N pnpm vitest run --project survey-web choice`
Expected: PASS — 2 tests.

```bash
git add -A
git commit -m "feat(survey-web): add answer types and other-choice encoding

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pages and navigation

**Files:**

- Create: `src/engine/pages.ts`, `src/engine/pages.test.ts`, `src/engine/navigation.ts`, `src/engine/navigation.test.ts`
- Modify: `src/index.ts`

**Interfaces:**

- Consumes: `Survey`, `SurveyQuestion`, `SectionHeader`, `SurveyAnswers`.
- Produces:
  - `START_SECTION_ID = '__start'`
  - `type SurveyPage = { id: string; title: string; description?: string; questions: SurveyQuestion[]; action?: SectionHeader['action'] }`
  - `buildPages(survey: Survey): SurveyPage[]` — a leading page `{ id: START_SECTION_ID, title: survey.title, description: survey.description }` when the first item is not a section header (v0 behaviour; v0's id string is replaced by a stable constant).
  - `resolveNext(page: SurveyPage, answers: SurveyAnswers, pages: SurveyPage[]): string | null` — `null` means submit. Order: section `action` (`submit` → `null`; `jump` → target if it exists, else next in order); then the first answered `single-choice`/`dropdown` whose chosen option has a `nextSectionId` that exists; then the next page; `null` after the last.
  - `resolvePath(pages: SurveyPage[], answers: SurveyAnswers): string[]` — page ids visited from the first page; stops at `null` or at the first repeated id (cycle guard).

- [ ] **Step 1: Write the failing tests**

`src/engine/pages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { Survey } from '../schema/survey-schema'
import { buildPages, START_SECTION_ID } from './pages'

describe('buildPages', () => {
  it('groups questions under their section headers', () => {
    const survey: Survey = {
      title: 'S',
      items: [
        {
          id: 'a',
          type: 'section-header',
          title: 'A',
          action: { type: 'submit' },
        },
        { id: 'q1', type: 'short-text', label: 'Q1' },
        { id: 'b', type: 'section-header', title: 'B', description: 'd' },
        { id: 'q2', type: 'long-text', label: 'Q2' },
      ],
    }
    const pages = buildPages(survey)

    expect(
      pages.map((page) => [page.id, page.questions.map((q) => q.id)])
    ).toEqual([
      ['a', ['q1']],
      ['b', ['q2']],
    ])
    expect(pages[0]?.action).toEqual({ type: 'submit' })
    expect(pages[1]?.description).toBe('d')
  })

  it('adds a start page when the survey does not open with a header', () => {
    const pages = buildPages({
      title: 'Title',
      description: 'Intro',
      items: [{ id: 'q1', type: 'short-text', label: 'Q1' }],
    })
    expect(pages).toEqual([
      {
        id: START_SECTION_ID,
        title: 'Title',
        description: 'Intro',
        questions: [{ id: 'q1', type: 'short-text', label: 'Q1' }],
      },
    ])
  })

  it('returns no pages for an empty survey', () => {
    expect(buildPages({ title: 'Empty', items: [] })).toEqual([])
  })
})
```

`src/engine/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { Survey } from '../schema/survey-schema'
import { resolveNext, resolvePath } from './navigation'
import { buildPages } from './pages'

const survey: Survey = {
  title: 'Branching',
  items: [
    { id: 'start', type: 'section-header', title: 'Start' },
    {
      id: 'route',
      type: 'single-choice',
      label: 'Route',
      options: [
        { value: 'car', label: 'Car', nextSectionId: 'car' },
        { value: 'walk', label: 'Walk', nextSectionId: 'walk' },
        { value: 'ghost', label: 'Ghost', nextSectionId: 'nowhere' },
        { value: 'plain', label: 'Plain' },
      ],
    },
    {
      id: 'car',
      type: 'section-header',
      title: 'Car',
      action: { type: 'jump', targetSectionId: 'end' },
    },
    { id: 'q_car', type: 'short-text', label: 'Model' },
    {
      id: 'walk',
      type: 'section-header',
      title: 'Walk',
      action: { type: 'submit' },
    },
    { id: 'q_walk', type: 'short-text', label: 'Steps' },
    { id: 'end', type: 'section-header', title: 'End' },
    { id: 'q_end', type: 'short-text', label: 'Thanks' },
  ],
}
const pages = buildPages(survey)
const page = (id: string) => {
  const found = pages.find((p) => p.id === id)
  if (!found) throw new Error(id)
  return found
}

describe('resolveNext', () => {
  it('follows the chosen option', () => {
    expect(resolveNext(page('start'), { route: 'car' }, pages)).toBe('car')
    expect(resolveNext(page('start'), { route: 'walk' }, pages)).toBe('walk')
  })

  it('falls back to the next section for a missing target or no target', () => {
    expect(resolveNext(page('start'), { route: 'ghost' }, pages)).toBe('car')
    expect(resolveNext(page('start'), { route: 'plain' }, pages)).toBe('car')
    expect(resolveNext(page('start'), {}, pages)).toBe('car')
  })

  it('lets the section action win over options', () => {
    expect(resolveNext(page('car'), {}, pages)).toBe('end')
    expect(resolveNext(page('walk'), {}, pages)).toBeNull()
  })

  it('submits after the last section', () => {
    expect(resolveNext(page('end'), {}, pages)).toBeNull()
  })

  it('treats a jump to a missing section like no action', () => {
    const broken = buildPages({
      title: 'B',
      items: [
        {
          id: 'a',
          type: 'section-header',
          title: 'A',
          action: { type: 'jump', targetSectionId: 'x' },
        },
        { id: 'b', type: 'section-header', title: 'B' },
      ],
    })
    expect(resolveNext(broken[0]!, {}, broken)).toBe('b')
  })
})

describe('resolvePath', () => {
  it('lists the sections a set of answers visits', () => {
    expect(resolvePath(pages, { route: 'car' })).toEqual([
      'start',
      'car',
      'end',
    ])
    expect(resolvePath(pages, { route: 'walk' })).toEqual(['start', 'walk'])
  })

  it('stops at a cycle', () => {
    const loop = buildPages({
      title: 'Loop',
      items: [
        {
          id: 'a',
          type: 'section-header',
          title: 'A',
          action: { type: 'jump', targetSectionId: 'b' },
        },
        {
          id: 'b',
          type: 'section-header',
          title: 'B',
          action: { type: 'jump', targetSectionId: 'a' },
        },
      ],
    })
    expect(resolvePath(loop, {})).toEqual(['a', 'b'])
  })

  it('is empty for a survey without pages', () => {
    expect(resolvePath([], {})).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$N pnpm vitest run --project survey-web engine`
Expected: FAIL — cannot resolve `./pages`, `./navigation`.

- [ ] **Step 3: Implement**

`src/engine/pages.ts`:

```ts
import type {
  SectionHeader,
  Survey,
  SurveyQuestion,
} from '../schema/survey-schema'

export const START_SECTION_ID = '__start'

export type SurveyPage = {
  id: string
  title: string
  description?: string
  questions: SurveyQuestion[]
  action?: SectionHeader['action']
}

export function buildPages(survey: Survey): SurveyPage[] {
  const pages: SurveyPage[] = []
  let current: SurveyPage | undefined

  for (const item of survey.items) {
    if (item.type === 'section-header') {
      current = {
        id: item.id,
        title: item.title,
        questions: [],
        ...(item.description !== undefined && {
          description: item.description,
        }),
        ...(item.action !== undefined && { action: item.action }),
      }
      pages.push(current)
      continue
    }
    if (!current) {
      current = {
        id: START_SECTION_ID,
        title: survey.title,
        questions: [],
        ...(survey.description !== undefined && {
          description: survey.description,
        }),
      }
      pages.push(current)
    }
    current.questions.push(item)
  }
  return pages
}
```

`src/engine/navigation.ts`:

```ts
import type { SurveyAnswers } from '../answers/types'
import type { SurveyPage } from './pages'

function nextInOrder(page: SurveyPage, pages: SurveyPage[]): string | null {
  const index = pages.findIndex((candidate) => candidate.id === page.id)
  return pages[index + 1]?.id ?? null
}

/** The section after `page` for these answers; `null` means submit. */
export function resolveNext(
  page: SurveyPage,
  answers: SurveyAnswers,
  pages: SurveyPage[]
): string | null {
  const exists = (id: string) => pages.some((candidate) => candidate.id === id)

  if (page.action?.type === 'submit') return null
  if (page.action?.type === 'jump') {
    return exists(page.action.targetSectionId)
      ? page.action.targetSectionId
      : nextInOrder(page, pages)
  }

  for (const question of page.questions) {
    if (question.type !== 'single-choice' && question.type !== 'dropdown')
      continue
    const answer = answers[question.id]
    if (typeof answer !== 'string' || !answer) continue
    const target = question.options.find(
      (option) => option.value === answer
    )?.nextSectionId
    if (target && exists(target)) return target
  }

  return nextInOrder(page, pages)
}

/** Section ids visited from the first section; stops at submit or a cycle. */
export function resolvePath(
  pages: SurveyPage[],
  answers: SurveyAnswers
): string[] {
  const path: string[] = []
  let current = pages[0]
  while (current && !path.includes(current.id)) {
    path.push(current.id)
    const nextId = resolveNext(current, answers, pages)
    current =
      nextId === null ? undefined : pages.find((page) => page.id === nextId)
  }
  return path
}
```

Append to `src/index.ts`:

```ts
export { buildPages, START_SECTION_ID, type SurveyPage } from './engine/pages'
export { resolveNext, resolvePath } from './engine/navigation'
```

- [ ] **Step 4: Run them to verify they pass, commit**

Run: `$N pnpm vitest run --project survey-web engine`
Expected: PASS — 11 tests.

```bash
git add -A
git commit -m "feat(survey-web): add page building and branching navigation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Validation

**Files:**

- Create: `src/engine/validate.ts`, `src/engine/validate.test.ts`
- Modify: `src/index.ts`

**Interfaces:**

- Consumes: Tasks 2–4.
- Produces:
  - `type AnswerErrorKey = 'required' | 'requiredField' | 'requiredChoice' | 'requiredChoices' | 'otherRequired' | 'invalidNumber' | 'criteria' | 'length' | 'pattern' | 'choiceCount'`
  - `type AnswerError = { key: AnswerErrorKey; params?: { rule: 'min' | 'max' | 'exact'; value: number } } | { key: 'custom'; message: string }`
  - `validateAnswer(question: SurveyQuestion, value: SurveyAnswerValue): AnswerError | null`
  - `validateAnswers(survey: Survey, answers: SurveyAnswers): Record<string, AnswerError>` — only questions on `resolvePath(buildPages(survey), answers)`.
  - Rules (v0 parity unless listed under "Behaviour changes"): required messages per type (`short-text`/`long-text`/`linear-scale`/`rating`/`time` → `required`; `date` → `requiredField`; `single-choice`/`dropdown` → `requiredChoice`; `multiple-choice` → `requiredChoices`); a required single/multiple choice whose "other" has no text → `otherRequired`; custom rules run only on non-empty answers; `customError` → `{ key: 'custom', message }`; number rules: non-numeric → `invalidNumber` (always, even with `customError`, as v0), failed bound → `criteria`; text rules → `criteria`; length → `length`; regex → `pattern`, an invalid pattern accepts the answer; multiple-choice count → `choiceCount` with `{ rule, value }`.

- [ ] **Step 1: Write the failing test `src/engine/validate.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import type { Survey, SurveyQuestion } from '../schema/survey-schema'
import { validateAnswer, validateAnswers } from './validate'

const text = (custom?: unknown, required = false) =>
  ({
    id: 'q',
    type: 'short-text',
    label: 'Q',
    validation: { required, ...(custom ? { custom } : {}) },
  }) as SurveyQuestion

describe('validateAnswer — required', () => {
  it('uses the v0 message key for each question type', () => {
    const required = { required: true }
    const cases: [SurveyQuestion, string][] = [
      [
        { id: 'a', type: 'short-text', label: 'A', validation: required },
        'required',
      ],
      [
        { id: 'b', type: 'long-text', label: 'B', validation: required },
        'required',
      ],
      [
        {
          id: 'c',
          type: 'linear-scale',
          label: 'C',
          min: 0,
          max: 10,
          validation: required,
        },
        'required',
      ],
      [
        {
          id: 'd',
          type: 'rating',
          label: 'D',
          levels: 5,
          symbol: 'star',
          validation: required,
        },
        'required',
      ],
      [
        {
          id: 'e',
          type: 'date',
          label: 'E',
          includeTime: false,
          includeYear: true,
          validation: required,
        },
        'requiredField',
      ],
      [
        {
          id: 'f',
          type: 'time',
          label: 'F',
          answerType: 'time',
          validation: required,
        },
        'required',
      ],
      [
        {
          id: 'g',
          type: 'dropdown',
          label: 'G',
          options: [{ value: 'x', label: 'X' }],
          validation: required,
        },
        'requiredChoice',
      ],
      [
        {
          id: 'h',
          type: 'single-choice',
          label: 'H',
          options: [{ value: 'x', label: 'X' }],
          validation: required,
        },
        'requiredChoice',
      ],
      [
        {
          id: 'i',
          type: 'multiple-choice',
          label: 'I',
          options: [{ value: 'x', label: 'X' }],
          validation: required,
        },
        'requiredChoices',
      ],
    ]
    for (const [question, key] of cases) {
      expect(validateAnswer(question, undefined), question.type).toEqual({
        key,
      })
    }
    expect(validateAnswer(cases[0]![0], '')).toEqual({ key: 'required' })
    expect(validateAnswer(cases[8]![0], [])).toEqual({ key: 'requiredChoices' })
  })

  it('accepts empty optional answers', () => {
    expect(validateAnswer(text(), undefined)).toBeNull()
    expect(
      validateAnswer(text({ type: 'length', rule: 'min', value: 3 }), '')
    ).toBeNull()
  })

  it('requires "other" text only when the question is required', () => {
    const single: SurveyQuestion = {
      id: 's',
      type: 'single-choice',
      label: 'S',
      options: [{ value: 'other', label: 'Other', isOther: true }],
      validation: { required: true },
    }
    expect(validateAnswer(single, 'other')).toEqual({ key: 'otherRequired' })
    expect(validateAnswer(single, 'other:   ')).toEqual({
      key: 'otherRequired',
    })
    expect(validateAnswer(single, 'other:Bike')).toBeNull()
    expect(validateAnswer({ ...single, validation: {} }, 'other')).toBeNull()

    const multi: SurveyQuestion = {
      ...single,
      type: 'multiple-choice',
      options: [{ value: 'other', label: 'O' }],
    }
    expect(validateAnswer(multi, ['other'])).toEqual({ key: 'otherRequired' })
  })

  it('checks time and duration parts as v0 did', () => {
    const time: SurveyQuestion = {
      id: 't',
      type: 'time',
      label: 'T',
      answerType: 'time',
      validation: { required: true },
    }
    expect(validateAnswer(time, { hour: '09', minute: '' })).toEqual({
      key: 'required',
    })
    expect(validateAnswer(time, { hour: '09', minute: '30' })).toBeNull()

    const duration: SurveyQuestion = { ...time, answerType: 'duration' }
    expect(
      validateAnswer(duration, { hours: '', minutes: '', seconds: '' })
    ).toEqual({ key: 'required' })
    expect(
      validateAnswer(duration, { hours: '1', minutes: '0', seconds: '0' })
    ).toBeNull()
  })
})

describe('validateAnswer — custom rules', () => {
  it('validates numbers strictly', () => {
    const between = text({
      type: 'number',
      rule: 'between',
      value: 18,
      value2: 65,
    })
    expect(validateAnswer(between, '30')).toBeNull()
    expect(validateAnswer(between, '17')).toEqual({ key: 'criteria' })
    expect(validateAnswer(between, '12abc')).toEqual({ key: 'invalidNumber' })
    expect(
      validateAnswer(text({ type: 'number', rule: 'is_whole' }), '1.5')
    ).toEqual({ key: 'criteria' })
    expect(
      validateAnswer(
        text({ type: 'number', rule: 'not_between', value: 1, value2: 3 }),
        '2'
      )
    ).toEqual({ key: 'criteria' })
    expect(validateAnswer(text({ type: 'number', rule: 'gt' }), '2')).toBeNull()
  })

  it('validates text rules', () => {
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_email' }), 'a@b.co')
    ).toBeNull()
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_email' }), 'nope')
    ).toEqual({ key: 'criteria' })
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_url' }), 'https://x.jp')
    ).toBeNull()
    expect(
      validateAnswer(text({ type: 'text', rule: 'is_url' }), 'x.jp')
    ).toEqual({ key: 'criteria' })
    expect(
      validateAnswer(
        text({ type: 'text', rule: 'not_contains', value: 'spam' }),
        'no spam'
      )
    ).toEqual({ key: 'criteria' })
  })

  it('validates length and regex', () => {
    expect(
      validateAnswer(text({ type: 'length', rule: 'max', value: 3 }), 'abcd')
    ).toEqual({ key: 'length' })
    const matches = text({ type: 'regex', rule: 'matches', value: '[0-9]{3}' })
    expect(validateAnswer(matches, '123')).toBeNull()
    expect(validateAnswer(matches, '1234')).toEqual({ key: 'pattern' })
    expect(
      validateAnswer(
        text({ type: 'regex', rule: 'contains', value: 'a+' }),
        'xaay'
      )
    ).toBeNull()
    expect(
      validateAnswer(text({ type: 'regex', rule: 'matches', value: '(' }), 'x')
    ).toBeNull()
  })

  it('returns the custom error message', () => {
    expect(
      validateAnswer(
        text({
          type: 'length',
          rule: 'min',
          value: 5,
          customError: '5文字以上',
        }),
        'abc'
      )
    ).toEqual({ key: 'custom', message: '5文字以上' })
  })

  it('enforces multiple-choice counts', () => {
    const multi = (
      rule: 'min' | 'max' | 'exact',
      value: number
    ): SurveyQuestion => ({
      id: 'm',
      type: 'multiple-choice',
      label: 'M',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
      validation: { custom: { rule, value } },
    })
    expect(validateAnswer(multi('max', 1), ['a', 'b'])).toEqual({
      key: 'choiceCount',
      params: { rule: 'max', value: 1 },
    })
    expect(validateAnswer(multi('min', 2), ['a'])).toEqual({
      key: 'choiceCount',
      params: { rule: 'min', value: 2 },
    })
    expect(validateAnswer(multi('exact', 2), ['a', 'b'])).toBeNull()
    expect(validateAnswer(multi('min', 2), [])).toBeNull()
  })
})

describe('validateAnswers', () => {
  const survey: Survey = {
    title: 'S',
    items: [
      { id: 'start', type: 'section-header', title: 'Start' },
      {
        id: 'route',
        type: 'single-choice',
        label: 'Route',
        options: [
          { value: 'skip', label: 'Skip', nextSectionId: 'end' },
          { value: 'stay', label: 'Stay' },
        ],
        validation: { required: true },
      },
      { id: 'middle', type: 'section-header', title: 'Middle' },
      {
        id: 'q_middle',
        type: 'short-text',
        label: 'M',
        validation: { required: true },
      },
      { id: 'end', type: 'section-header', title: 'End' },
      {
        id: 'q_end',
        type: 'short-text',
        label: 'E',
        validation: { custom: { type: 'length', rule: 'max', value: 2 } },
      },
    ],
  }

  it('ignores questions in sections the answers skipped', () => {
    expect(validateAnswers(survey, { route: 'skip', q_end: 'ok' })).toEqual({})
  })

  it('reports errors on the visited path', () => {
    expect(validateAnswers(survey, { route: 'stay', q_end: 'long' })).toEqual({
      q_middle: { key: 'required' },
      q_end: { key: 'length' },
    })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web validate`
Expected: FAIL — cannot resolve `./validate`.

- [ ] **Step 3: Implement `src/engine/validate.ts`**

```ts
import { isOtherValue, otherText } from '../answers/choice'
import type {
  DurationAnswer,
  SurveyAnswers,
  SurveyAnswerValue,
  TimeAnswer,
} from '../answers/types'
import type {
  CustomValidationRule,
  Survey,
  SurveyQuestion,
} from '../schema/survey-schema'
import { resolvePath } from './navigation'
import { buildPages } from './pages'

export type AnswerErrorKey =
  | 'required'
  | 'requiredField'
  | 'requiredChoice'
  | 'requiredChoices'
  | 'otherRequired'
  | 'invalidNumber'
  | 'criteria'
  | 'length'
  | 'pattern'
  | 'choiceCount'

export type AnswerError =
  | {
      key: AnswerErrorKey
      params?: { rule: 'min' | 'max' | 'exact'; value: number }
    }
  | { key: 'custom'; message: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(key: AnswerErrorKey, customError?: string): AnswerError {
  return customError ? { key: 'custom', message: customError } : { key }
}

function isEmpty(value: SurveyAnswerValue): boolean {
  if (value === undefined || value === '') return true
  return Array.isArray(value) && value.length === 0
}

function timeComplete(
  question: SurveyQuestion,
  value: SurveyAnswerValue
): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  if (question.type === 'time' && question.answerType === 'duration') {
    const { hours, minutes, seconds } = value as DurationAnswer
    return (
      Boolean(hours || minutes || seconds) &&
      [hours, minutes, seconds].every(
        (part) => !Number.isNaN(Number.parseInt(part, 10))
      )
    )
  }
  const { hour, minute } = value as TimeAnswer
  return Boolean(hour && minute)
}

function requiredKey(question: SurveyQuestion): AnswerErrorKey {
  switch (question.type) {
    case 'date':
      return 'requiredField'
    case 'single-choice':
    case 'dropdown':
      return 'requiredChoice'
    case 'multiple-choice':
      return 'requiredChoices'
    default:
      return 'required'
  }
}

function checkNumber(
  rule: Extract<CustomValidationRule, { type: 'number' }>,
  input: string
): AnswerError | null {
  const trimmed = input.trim()
  const num = trimmed === '' ? Number.NaN : Number(trimmed)
  if (Number.isNaN(num)) return { key: 'invalidNumber' }
  const { value, value2 } = rule
  const broken = (() => {
    switch (rule.rule) {
      case 'gt':
        return value !== undefined && num <= value
      case 'gte':
        return value !== undefined && num < value
      case 'lt':
        return value !== undefined && num >= value
      case 'lte':
        return value !== undefined && num > value
      case 'eq':
        return value !== undefined && num !== value
      case 'neq':
        return value !== undefined && num === value
      case 'between':
        return (
          value !== undefined &&
          value2 !== undefined &&
          (num < value || num > value2)
        )
      case 'not_between':
        return (
          value !== undefined &&
          value2 !== undefined &&
          num >= value &&
          num <= value2
        )
      case 'is_number':
        return false
      case 'is_whole':
        return !Number.isInteger(num)
    }
  })()
  return broken ? fail('criteria', rule.customError) : null
}

function checkText(
  rule: Extract<CustomValidationRule, { type: 'text' }>,
  input: string
): AnswerError | null {
  const broken = (() => {
    switch (rule.rule) {
      case 'contains':
        return rule.value !== undefined && !input.includes(rule.value)
      case 'not_contains':
        return rule.value !== undefined && input.includes(rule.value)
      case 'is_email':
        return !EMAIL.test(input)
      case 'is_url':
        try {
          new URL(input)
          return false
        } catch {
          return true
        }
    }
  })()
  return broken ? fail('criteria', rule.customError) : null
}

function checkRegex(
  rule: Extract<CustomValidationRule, { type: 'regex' }>,
  input: string
): AnswerError | null {
  let regex: RegExp
  try {
    regex = new RegExp(rule.value)
  } catch {
    return null // A broken pattern in the schema must not block respondents.
  }
  const match = regex.exec(input)
  const whole = match !== null && match[0] === input
  const broken = (() => {
    switch (rule.rule) {
      case 'matches':
        return !whole
      case 'not_matches':
        return whole
      case 'contains':
        return !regex.test(input)
      case 'not_contains':
        return regex.test(input)
    }
  })()
  return broken ? fail('pattern', rule.customError) : null
}

function checkCustom(
  rule: CustomValidationRule,
  input: string
): AnswerError | null {
  switch (rule.type) {
    case 'number':
      return checkNumber(rule, input)
    case 'text':
      return checkText(rule, input)
    case 'length': {
      const broken =
        (rule.rule === 'max' && input.length > rule.value) ||
        (rule.rule === 'min' && input.length < rule.value)
      return broken ? fail('length', rule.customError) : null
    }
    case 'regex':
      return checkRegex(rule, input)
  }
}

export function validateAnswer(
  question: SurveyQuestion,
  value: SurveyAnswerValue
): AnswerError | null {
  const required = question.validation?.required === true

  if (question.type === 'time') {
    if (!required || value === undefined)
      return required ? { key: 'required' } : null
    return timeComplete(question, value) ? null : { key: 'required' }
  }

  if (isEmpty(value)) return required ? { key: requiredKey(question) } : null

  if (
    required &&
    (question.type === 'single-choice' || question.type === 'multiple-choice')
  ) {
    const values = Array.isArray(value) ? value : [value]
    const other = values.find(
      (item): item is string => typeof item === 'string' && isOtherValue(item)
    )
    if (other !== undefined && !otherText(other).trim())
      return { key: 'otherRequired' }
  }

  if (question.type === 'multiple-choice' && Array.isArray(value)) {
    const rule = question.validation?.custom
    if (rule) {
      const count = value.length
      const broken =
        (rule.rule === 'min' && count < rule.value) ||
        (rule.rule === 'max' && count > rule.value) ||
        (rule.rule === 'exact' && count !== rule.value)
      if (broken) {
        return rule.customError
          ? { key: 'custom', message: rule.customError }
          : {
              key: 'choiceCount',
              params: { rule: rule.rule, value: rule.value },
            }
      }
    }
    return null
  }

  if (
    (question.type === 'short-text' || question.type === 'long-text') &&
    typeof value === 'string'
  ) {
    const rule = question.validation?.custom
    return rule ? checkCustom(rule, value) : null
  }

  return null
}

/** Errors by question id, for the questions these answers actually reach. */
export function validateAnswers(
  survey: Survey,
  answers: SurveyAnswers
): Record<string, AnswerError> {
  const pages = buildPages(survey)
  const visited = new Set(resolvePath(pages, answers))
  const errors: Record<string, AnswerError> = {}
  for (const page of pages) {
    if (!visited.has(page.id)) continue
    for (const question of page.questions) {
      const error = validateAnswer(question, answers[question.id])
      if (error) errors[question.id] = error
    }
  }
  return errors
}
```

Append to `src/index.ts`:

```ts
export {
  validateAnswer,
  validateAnswers,
  type AnswerError,
  type AnswerErrorKey,
} from './engine/validate'
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web validate`
Expected: PASS — 11 tests. A type error in the test fixtures (e.g. a question literal missing a defaulted field) means the inferred `SurveyQuestion` is the zod _output_ type; add the missing defaulted field to the fixture.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `$N pnpm --filter @mbc-cqrs-serverless/survey-web typecheck && $N pnpm lint`
Expected: exit 0.

```bash
git add -A
git commit -m "feat(survey-web): add answer validation with v0 rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Collecting answers

**Files:**

- Create: `src/engine/collect.ts`, `src/engine/collect.test.ts`
- Modify: `src/index.ts`

**Interfaces:**

- Produces: `collectAnswers(pages: SurveyPage[], path: readonly string[], values: SurveyAnswers): { answers: SurveyAnswers; meta: SurveyAnswerMeta[] }` — one entry per question in schema order; questions in sections outside `path` get `undefined` (abandoned branches, deleted-then-restored answers); answers for ids no longer in the schema are dropped (v0 behaviour).

- [ ] **Step 1: Write the failing test `src/engine/collect.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { collectAnswers } from './collect'
import { buildPages } from './pages'

const pages = buildPages({
  title: 'S',
  items: [
    { id: 'a', type: 'section-header', title: 'A' },
    { id: 'q1', type: 'short-text', label: 'Name' },
    { id: 'b', type: 'section-header', title: 'B' },
    { id: 'q2', type: 'time', label: 'When', answerType: 'time' },
    { id: 'c', type: 'section-header', title: 'C' },
    {
      id: 'q3',
      type: 'multiple-choice',
      label: 'Pick',
      options: [{ value: 'other', label: 'O' }],
    },
  ],
})

describe('collectAnswers', () => {
  it('keeps answers on the path and clears abandoned sections', () => {
    const { answers, meta } = collectAnswers(pages, ['a', 'c'], {
      q1: 'Ann',
      q2: { hour: '09', minute: '30' },
      q3: ['other:Bike'],
      removed: 'gone',
    })

    expect(answers).toEqual({ q1: 'Ann', q2: undefined, q3: ['other:Bike'] })
    expect(Object.keys(answers)).toEqual(['q1', 'q2', 'q3'])
    expect(meta).toEqual([
      { id: 'q1', label: 'Name', type: 'short-text', value: 'Ann' },
      { id: 'q2', label: 'When', type: 'time', value: undefined },
      {
        id: 'q3',
        label: 'Pick',
        type: 'multiple-choice',
        value: ['other:Bike'],
      },
    ])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web collect`
Expected: FAIL — cannot resolve `./collect`.

- [ ] **Step 3: Implement `src/engine/collect.ts`**

```ts
import type { SurveyAnswerMeta, SurveyAnswers } from '../answers/types'
import type { SurveyPage } from './pages'

export function collectAnswers(
  pages: SurveyPage[],
  path: readonly string[],
  values: SurveyAnswers
): { answers: SurveyAnswers; meta: SurveyAnswerMeta[] } {
  const visited = new Set(path)
  const meta: SurveyAnswerMeta[] = pages.flatMap((page) =>
    page.questions.map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      value: visited.has(page.id) ? values[question.id] : undefined,
    }))
  )
  const answers: SurveyAnswers = Object.fromEntries(
    meta.map(({ id, value }) => [id, value])
  )
  return { answers, meta }
}
```

Append to `src/index.ts`:

```ts
export { collectAnswers } from './engine/collect'
```

- [ ] **Step 4: Run it to verify it passes, commit**

Run: `$N pnpm vitest run --project survey-web collect`
Expected: PASS — 1 test.

```bash
git add -A
git commit -m "feat(survey-web): collect answers along the visited path

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `survey` messages and error formatting

**Files:**

- Create: `src/i18n/survey-messages.ts`, `src/i18n/format-error.ts`, `src/i18n/format-error.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**

- Produces:
  - `type SurveyMessages = { validation: { required; requiredField; requiredChoice; requiredChoices; otherRequired; invalidNumber; criteria; length; pattern: string; choiceCount: (params: { rule: 'min' | 'max' | 'exact'; value: number }) => string }; form: { submit; next; back; empty; submitError: string } }`
  - `surveyMessages` (catalog for namespace `survey`, ja = v0 strings, en translations); module augmentation `MbcMessageRegistry['survey']`.
  - `formatAnswerError(error: AnswerError, messages: SurveyMessages['validation']): string`
  - SP5–SP7 extend `SurveyMessages` (creator, templates) in this file.

- [ ] **Step 1: Write the failing test `src/i18n/format-error.test.tsx`**

```tsx
import { MbcProvider, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { formatAnswerError } from './format-error'
import { surveyMessages } from './survey-messages'

function Probe() {
  const t = useMessages(surveyMessages)
  return (
    <p>
      {formatAnswerError({ key: 'required' }, t.validation)}|
      {formatAnswerError(
        { key: 'choiceCount', params: { rule: 'max', value: 2 } },
        t.validation
      )}
      |{formatAnswerError({ key: 'custom', message: '独自' }, t.validation)}|
      {t.form.submit}
    </p>
  )
}

describe('survey messages', () => {
  it('uses v0’s Japanese strings by default', () => {
    render(<Probe />)
    expect(
      screen.getByText(
        'この質問は必須です|2個以下で選択してください|独自|アンケートを送信'
      )
    ).toBeInTheDocument()
  })

  it('switches to English and accepts overrides', () => {
    render(
      <MbcProvider
        locale="en"
        messages={{ survey: { form: { submit: 'Send' } } }}
      >
        <Probe />
      </MbcProvider>
    )
    expect(
      screen.getByText(
        'This question is required|Select at most 2 options|独自|Send'
      )
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project survey-web format-error`
Expected: FAIL — cannot resolve `./format-error`.

- [ ] **Step 3: Implement**

`src/i18n/survey-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

type CountParams = { rule: 'min' | 'max' | 'exact'; value: number }

export type SurveyMessages = {
  validation: {
    required: string
    requiredField: string
    requiredChoice: string
    requiredChoices: string
    otherRequired: string
    invalidNumber: string
    criteria: string
    length: string
    pattern: string
    choiceCount: (params: CountParams) => string
  }
  form: {
    submit: string
    next: string
    back: string
    empty: string
    submitError: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    survey: SurveyMessages
  }
}

const ja: SurveyMessages = {
  validation: {
    required: 'この質問は必須です',
    requiredField: 'この項目は必須です',
    requiredChoice: 'オプションを選択してください',
    requiredChoices: '最低でも1つオプションを選択してください',
    otherRequired: 'その他の回答を入力してください',
    invalidNumber: '有効な数値を入力してください。',
    criteria: 'この回答は要件を満たしていません。',
    length: '文字数が規定の長さに合致していません',
    pattern: 'パターンに一致させてください',
    choiceCount: ({ rule, value }) =>
      rule === 'min'
        ? `${value}個以上選択してください`
        : rule === 'max'
          ? `${value}個以下で選択してください`
          : `${value}個選択してください`,
  },
  form: {
    submit: 'アンケートを送信',
    next: '次へ',
    back: '前へ',
    empty: 'このアンケートにはコンテンツがありません。',
    submitError: '送信に失敗しました。もう一度お試しください。',
  },
}

const en: SurveyMessages = {
  validation: {
    required: 'This question is required',
    requiredField: 'This field is required',
    requiredChoice: 'Please select an option',
    requiredChoices: 'Please select at least one option',
    otherRequired: 'Please enter your other answer',
    invalidNumber: 'Please enter a valid number.',
    criteria: 'This response does not meet the criteria.',
    length: 'The character count does not match the required length',
    pattern: 'Please match the pattern',
    choiceCount: ({ rule, value }) =>
      rule === 'min'
        ? `Select at least ${value} options`
        : rule === 'max'
          ? `Select at most ${value} options`
          : `Select exactly ${value} options`,
  },
  form: {
    submit: 'Submit survey',
    next: 'Next',
    back: 'Back',
    empty: 'This survey has no content.',
    submitError: 'Submission failed. Please try again.',
  },
}

export const surveyMessages = defineMessages('survey', { ja, en })
```

`src/i18n/format-error.ts`:

```ts
import type { AnswerError } from '../engine/validate'
import type { SurveyMessages } from './survey-messages'

export function formatAnswerError(
  error: AnswerError,
  messages: SurveyMessages['validation']
): string {
  if (error.key === 'custom') return error.message
  if (error.key === 'choiceCount' && error.params)
    return messages.choiceCount(error.params)
  return messages[error.key as Exclude<typeof error.key, 'choiceCount'>]
}
```

Append to `src/index.ts`:

```ts
export { surveyMessages, type SurveyMessages } from './i18n/survey-messages'
export { formatAnswerError } from './i18n/format-error'
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project survey-web format-error`
Expected: PASS — 2 tests. If `messages={{ survey: … }}` fails to typecheck in the test, the module augmentation did not apply — make sure `survey-messages.ts` is part of the compilation (it is imported by the test).

- [ ] **Step 5: Gate the sub-plan**

Run: `$N pnpm build && $N pnpm vitest run && $N pnpm typecheck && $N pnpm lint && $N pnpm check:package`
Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(survey-web): add survey messages and error formatting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Gate, review, merge

- [ ] **Step 1:** Standard gate (orchestrator): `pnpm verify` on React 19 and 18, restore, clean tree.
- [ ] **Step 2:** Final whole-branch review; fix Critical/Important RED→GREEN.
- [ ] **Step 3:** Tick SP4 in the orchestrator; `git switch main && git merge --ff-only sp4-survey-core`.
