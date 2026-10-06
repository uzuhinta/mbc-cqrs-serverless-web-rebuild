import { SurveyCreator, SurveyForm } from '@mbc-cqrs-serverless/survey-web'
import { SurveyTemplateEditor } from '@mbc-cqrs-serverless/survey-web/templates'
import { version } from 'react'

import { SAMPLE } from '../app/sample'

export default function Legacy() {
  return (
    <main>
      <p data-react-version="">{`react ${version}`}</p>
      <SurveyForm schema={SAMPLE} onSubmit={() => {}} />
      <SurveyCreator defaultValue={SAMPLE} />
      <SurveyTemplateEditor
        mode="create"
        onSave={() => {}}
        onCancel={() => {}}
      />
    </main>
  )
}
