# @mbc-cqrs-serverless/survey-web

Surveys for MBC CQRS Serverless apps: the respondent form (`SurveyForm`), the survey editor (`SurveyCreator`), template list and editor screens, and the backend integration. React 18 and 19, ESM-only, SSR-safe, Japanese and English. Upgrading from 0.0.x? Read [MIGRATION.md](./MIGRATION.md).

## Install

```bash
pnpm add @mbc-cqrs-serverless/survey-web react react-dom
```

`@mbc-cqrs-serverless/ui-web` and `@mbc-cqrs-serverless/client-web` come with it. The three packages are released with one version — keep them on the same version, because survey-web's stylesheet is compiled from the ui-web it was built with.

```ts
import '@mbc-cqrs-serverless/survey-web/styles.css'
```

(See ui-web's README for `styles.layer.css`, Tailwind v3 and theming.)

## Entry points

| Import                            | Contents                                                               | Needs the backend client |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| `@mbc-cqrs-serverless/survey-web` | `SurveyForm`, `SurveyCreator`, schema, engine, messages                | no                       |
| `…/core`                          | schema, answer helpers, validation engine — no React, for servers      | no                       |
| `…/templates`                     | `SurveyTemplateList`, `SurveyTemplateEditor` (data and callbacks only) | no                       |
| `…/mbc`                           | API, hooks and connected pages on `client-web`                         | yes                      |
| `…/SurveyForm`, `…/SurveyCreator` | deprecated aliases of the root exports                                 | no                       |

## SurveyForm

```tsx
'use client'
import {
  SurveyForm,
  type Survey,
  type SurveyAnswers,
} from '@mbc-cqrs-serverless/survey-web'

export function Answer({
  survey,
  saved,
}: {
  survey: Survey
  saved?: SurveyAnswers
}) {
  return (
    <SurveyForm
      schema={survey}
      defaultValues={saved}
      onSubmit={async (answers, meta) => {
        await fetch('/api/answers', {
          method: 'POST',
          body: JSON.stringify({ answers, meta }),
        })
      }}
      onSubmitError={(error) => console.error(error)}
    />
  )
}
```

- Sections with Back / Next / Submit, branching by option or section action; answers in sections the respondent did not visit are submitted as `undefined`.
- `onSubmit` may return a promise: the button shows a loading state, a rejection shows a translated error and calls `onSubmitError`.
- Also: `disabled`, `submitLabel`, `children` (above the questions), `onSectionChange(sectionId)`, `className`, and `components` to replace a question renderer (`QuestionRendererProps`).
- `schema` may be stored JSON: it is parsed (defaults filled); items that fail validation render with v0's fallbacks.

## SurveyCreator

```tsx
'use client'
import { useRef } from 'react'
import {
  SurveyCreator,
  type SurveyCreatorHandle,
} from '@mbc-cqrs-serverless/survey-web'

export function Editor({ stored }: { stored?: unknown }) {
  const creator = useRef<SurveyCreatorHandle>(null)
  return (
    <>
      <SurveyCreator
        ref={creator}
        defaultValue={stored as never}
        onChange={(survey, { isValid, isDirty }) =>
          console.info(isValid, isDirty)
        }
        onSubmit={async (survey) => {
          await fetch('/api/templates', {
            method: 'POST',
            body: JSON.stringify(survey),
          })
        }}
      />
      <button onClick={() => creator.current?.submit()}>Save</button>
    </>
  )
}
```

`ref`: `submit()` validates (errors appear on the cards and focus moves to the first) and resolves `false` when invalid; `reset(next?)` loads another survey; `getValue()` returns the current one. Locked questions and sections (`locked: true`) cannot be changed, deleted or moved into; the creator keeps v0's lock rules.

## Template screens (`/templates`)

Prop-driven; bring your own data and navigation:

```tsx
'use client'
import { SurveyTemplateList } from '@mbc-cqrs-serverless/survey-web/templates'

export function Templates(props: { items: []; total: number }) {
  return (
    <SurveyTemplateList
      items={props.items}
      total={props.total}
      page={1}
      pageSize={10}
      keyword=""
      onPageChange={() => {}}
      onKeywordChange={() => {}}
      onSelect={(item) => console.info(item.id)}
      onCreate={() => {}}
    />
  )
}
```

`SurveyTemplateEditor` takes `mode`, `defaultValue`, `loading`, `error`, `saving`, `deleting`, `onSave`, `onDelete`, `onCancel`, `onRetry`.

## mbc-cqrs-serverless backend (`/mbc`)

```tsx
'use client'
import { createMbcClient } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import {
  MbcSurveyTemplateEditorPage,
  MbcSurveyTemplateListPage,
} from '@mbc-cqrs-serverless/survey-web/mbc'

const client = createMbcClient({
  apiUrl: 'https://api.example.com',
  tenantCode: 'my-tenant',
})

export function TemplateList({ go }: { go: (path: string) => void }) {
  return (
    <MbcClientProvider client={client}>
      <MbcSurveyTemplateListPage
        onCreate={() => go('/surveys/new')}
        onSelect={(item) => go(`/surveys/${encodeURIComponent(item.id)}`)}
      />
    </MbcClientProvider>
  )
}

export function TemplateEditor({
  id,
  go,
}: {
  id?: string
  go: (path: string) => void
}) {
  return (
    <MbcClientProvider client={client}>
      <MbcSurveyTemplateEditorPage
        id={id}
        onSaved={() => go('/surveys')}
        onDeleted={() => go('/surveys')}
        onCancel={() => go('/surveys')}
        onError={(error) => console.error(error)}
      />
    </MbcClientProvider>
  )
}
```

Pass `state` and `onStateChange` to `MbcSurveyTemplateListPage` to keep page, page size and keyword in the URL. Pass `MbcSurveyTemplateEditorPage` the **decoded** id (it encodes ids in API paths itself; mbc ids contain `#`). A `MbcTimeoutError` from a save means the outcome is unknown: reload before retrying a create, or you may create a duplicate.

To submit answers from a `SurveyForm` and keep its error state, throw when the command fails (`run` resolves `undefined` instead of throwing):

```tsx
'use client'
import { SurveyForm, type Survey } from '@mbc-cqrs-serverless/survey-web'
import { useSubmitSurveyAnswer } from '@mbc-cqrs-serverless/survey-web/mbc'

export function Respond({
  surveyId,
  survey,
}: {
  surveyId: string
  survey: Survey
}) {
  const submit = useSubmitSurveyAnswer()
  return (
    <SurveyForm
      schema={survey}
      onSubmit={async (answer) => {
        // The command's error is in submit.error on the next render.
        if (!(await submit.run({ surveyId, answer })))
          throw new Error('The answer was not sent')
      }}
    />
  )
}
```

Lower-level pieces: `createSurveyTemplateApi(client)`, `submitSurveyAnswer(client, { surveyId, answer, email })`, `useSurveyTemplates`, `useSurveyTemplate`, `useSurveyTemplateMutations`, `useSubmitSurveyAnswer`.

## Validating answers on a server (`/core`)

```ts
import {
  collectAnswers,
  buildPages,
  parseSurvey,
  resolvePath,
  validateAnswers,
} from '@mbc-cqrs-serverless/survey-web/core'

export function check(storedSurvey: unknown, answers: Record<string, unknown>) {
  const parsed = parseSurvey(storedSurvey)
  if (!parsed.success) throw parsed.error
  const errors = validateAnswers(parsed.data, answers) // {} when valid
  const pages = buildPages(parsed.data)
  const { answers: clean } = collectAnswers(
    pages,
    resolvePath(pages, answers),
    answers as never
  )
  return { errors, clean } // clean: unvisited sections' answers are undefined
}
```

`/core` imports only zod, so it loads fast and needs no React.

## Text

Japanese by default; `<MbcProvider locale="en">` switches every screen. Override any string through `messages` — namespaces `survey` (form), `surveyCreator`, `surveyTemplates`, plus ui-web's `ui`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/survey-web'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MbcProvider
      locale="ja"
      messages={{ survey: { form: { submit: '回答する' } } }}
    >
      {children}
    </MbcProvider>
  )
}
```

## Data

- Surveys keep v0's JSON shape; question ids must not contain `.`, `[` or `]` (they are form field names).
- Answers keep v0's shapes: text and choices are strings (`'other:<text>'` for "Other"), multiple choice `string[]`, rating and linear scale numbers, time `{ hour, minute }`, duration `{ hours, minutes, seconds }`, dates ISO strings (year 0 when the question has no year).

## Next.js

Components are client components: render them from files marked `'use client'` (or pass them server data as props). `/core` is safe in Server Components and route handlers.
