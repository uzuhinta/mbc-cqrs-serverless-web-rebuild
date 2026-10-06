'use client'

import { createMbcClient } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import {
  MbcProvider,
  SurveyCreator,
  SurveyForm,
  type Survey,
} from '@mbc-cqrs-serverless/survey-web'
import { MbcSurveyTemplateListPage } from '@mbc-cqrs-serverless/survey-web/mbc'
import { SurveyCreator as LegacySurveyCreator } from '@mbc-cqrs-serverless/survey-web/SurveyCreator'
import { SurveyForm as LegacySurveyForm } from '@mbc-cqrs-serverless/survey-web/SurveyForm'
import { SurveyTemplateList } from '@mbc-cqrs-serverless/survey-web/templates'

const client = createMbcClient({
  apiUrl: 'https://example.invalid',
  tenantCode: 'smoke',
  fetch: async () =>
    new Response(JSON.stringify({ items: [], total: 0 }), {
      headers: { 'content-type': 'application/json' },
    }),
})

/** Every UI entry point, rendered from a client component. */
export function ClientScreens({ survey }: { survey: Survey }) {
  return (
    <MbcProvider locale="ja">
      <MbcClientProvider client={client}>
        <SurveyForm schema={survey} onSubmit={() => {}} />
        <SurveyCreator defaultValue={survey} />
        <SurveyTemplateList
          items={[]}
          total={0}
          page={1}
          pageSize={10}
          keyword=""
          onPageChange={() => {}}
          onKeywordChange={() => {}}
          onSelect={() => {}}
        />
        <MbcSurveyTemplateListPage onSelect={() => {}} />
        <LegacySurveyForm schema={survey} onSubmit={() => {}} />
        <LegacySurveyCreator defaultValue={survey} />
      </MbcClientProvider>
    </MbcProvider>
  )
}
