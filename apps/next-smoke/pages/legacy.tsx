import { SurveyCreator, SurveyForm } from '@mbc-cqrs-serverless/survey-web'
import { SurveyTemplateEditor } from '@mbc-cqrs-serverless/survey-web/templates'
import {
  editorRenderers,
  JsonEditor,
} from '@mbc-cqrs-serverless/master-web/editors'
import { version } from 'react'

import { MasterScreens } from '../app/master-screens'

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
      {/* master-web on the app's React (18 in the React 18 leg). */}
      <MasterScreens components={editorRenderers} jsonEditor={JsonEditor} />
    </main>
  )
}
