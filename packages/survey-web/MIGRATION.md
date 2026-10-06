# Migrating from survey-web 0.0.x to 1.0

1.0 is a rewrite with the same survey JSON and answer shapes. Most changes are in how you set it up.

## 1. Install and styles

`next`, `nuqs`, `sonner`, `aws-amplify` and the AppSync SDK are no longer needed by this package. The stylesheet import is unchanged:

```ts
import '@mbc-cqrs-serverless/survey-web/styles.css'
```

React 18 and 19 are both supported.

## 2. Environment variables → a client

```bash v0
NEXT_PUBLIC_API_URL=…
NEXT_PUBLIC_TENANT_CODE=…
NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT=…
NEXT_PUBLIC_AWS_APPSYNC_APIKEY=…
```

```tsx
'use client'
import { createMbcClient } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'

const client = createMbcClient({
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  tenantCode: process.env.NEXT_PUBLIC_TENANT_CODE!,
  realtime: {
    url: process.env.NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT!,
    auth: {
      type: 'API_KEY',
      apiKey: process.env.NEXT_PUBLIC_AWS_APPSYNC_APIKEY!,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return <MbcClientProvider client={client}>{children}</MbcClientProvider>
}
```

The package reads no environment variables; your app does.

## 3. Template pages

```tsx v0
import { SurveyTemplatePage } from '@mbc-cqrs-serverless/survey-web/SurveyTemplatePage'
import { EditSurveyTemplatePage } from '@mbc-cqrs-serverless/survey-web/EditSurveyTemplatePage'

export const List = () => <SurveyTemplatePage />
export const Edit = () => <EditSurveyTemplatePage /> // read the id with useParams()
```

```tsx
'use client'
import {
  MbcSurveyTemplateEditorPage,
  MbcSurveyTemplateListPage,
} from '@mbc-cqrs-serverless/survey-web/mbc'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function List() {
  const router = useRouter()
  return (
    <MbcSurveyTemplateListPage
      onCreate={() => router.push('/admin/survey-management/create')}
      onSelect={(item) =>
        router.push(`/admin/survey-management/${encodeURIComponent(item.id)}`)
      }
    />
  )
}

export function Edit() {
  const router = useRouter()
  const { id } = useParams<{ id?: string }>()
  return (
    <MbcSurveyTemplateEditorPage
      id={id}
      onSaved={() => {
        toast.success('保存しました')
        router.push('/admin/survey-management')
      }}
      onDeleted={() => router.push('/admin/survey-management')}
      onCancel={() => router.back()}
      onError={() => toast.error('保存に失敗しました')}
    />
  )
}
```

The package no longer navigates or shows toasts; your callbacks do. To keep page, page size and keyword in the URL as v0 did with `nuqs`, pass `state` and `onStateChange` to `MbcSurveyTemplateListPage`.

## 4. SurveyCreator props

```tsx v0
<SurveyCreator
  initialSchema={schema}
  onSchemaChange={setSchema}
  submitButtonRef={buttonRef}
  onSubmit={save}
/>
// buttonRef.current?.click() to submit
```

```tsx
'use client'
import { useRef } from 'react'
import {
  SurveyCreator,
  type Survey,
  type SurveyCreatorHandle,
} from '@mbc-cqrs-serverless/survey-web'

export function Editor({
  schema,
  save,
}: {
  schema: Survey
  save: (survey: Survey) => Promise<void>
}) {
  const creator = useRef<SurveyCreatorHandle>(null)
  return (
    <>
      <SurveyCreator
        ref={creator}
        defaultValue={schema}
        onChange={(survey) => console.info(survey)}
        onSubmit={save}
      />
      <button onClick={() => creator.current?.submit()}>Save</button>
    </>
  )
}
```

## 5. Imports

```tsx v0
import { SurveyForm } from '@mbc-cqrs-serverless/survey-web/SurveyForm'
import { SurveyCreator } from '@mbc-cqrs-serverless/survey-web/SurveyCreator'
```

```tsx
import { SurveyCreator, SurveyForm } from '@mbc-cqrs-serverless/survey-web'
```

The `/SurveyForm` and `/SurveyCreator` subpaths still work in 1.x but are deprecated. `SurveyTemplatePage` and `EditSurveyTemplatePage` are gone (section 3). `validateSurveyJson` still exists (deprecated, use `parseSurvey`); its `error` is now a zod 4 `ZodError` — read `error.issues`, not `error.errors`, and expect different message text.

## 6. Behaviour changes

Saved surveys and answers keep their shapes. What behaves differently:

**Answers**

- Answers in sections the respondent did not reach (an abandoned branch) are submitted as `undefined`.
- An untouched time or duration question is submitted as `undefined` (0.0.x sent empty parts).
- Linear scale starts at the schema's `min` (default 0); 0.0.x used `min || 1`.

**Form**

- Multiple choice keeps "Other" when a regular option is ticked.
- Rating is a keyboard-operable radio group.
- Date-time without a year writes year 0 consistently and ignores the stored year when reading.
- Placeholders and units come from the translatable `survey` messages (same Japanese text).
- Enter in a field on a non-final section goes to the next section instead of submitting.
- A second click of a double-click on Next is ignored (it could submit the next section).
- Option shuffling no longer reshuffles when the page re-renders.

**Creator**

- Changing between choice types keeps the options; switching to multiple choice drops `nextSectionId`; switching to a dropdown drops "Other"; switching from a non-choice type adds one option.
- "Submit form" after a section works.
- Reordering sections keeps questions placed before the first section header.
- Nothing can be added to a locked section, including duplicates of its questions.
- Errors are shown on the cards after a save attempt; missing branch targets show a warning.
- Option previews keep the schema order.
- A duplicated section's title gets a translated suffix.
- The preview's submit shows a note instead of `alert()`.
- Turning branching off clears every option's `nextSectionId`; turning the description off removes the key.
- Deleting or merging the selected item selects the item before it.

**Template screens**

- No routing or toasts inside the package (section 3).
- Back asks before discarding a changed new survey too (0.0.x asked only when editing).
- List state is internal unless you pass `state`.
- The list's error state has a retry button; pages are keyboard-reachable links.
- Saving unchanged data succeeds quietly (0.0.x reported a failure).
- A failed command status (`<step>:FAILED`) is reported through `onError` (0.0.x waited forever).
- Card dates follow the locale and appear after hydration.
- Ids in API paths are URL-encoded.
