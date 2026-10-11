import {
  parseSurvey,
  validateAnswers,
} from '@mbc-cqrs-serverless/survey-web/core'
import {
  MASTER_FIELD_TYPES,
  parseBulkJson,
} from '@mbc-cqrs-serverless/master-web/core'
import {
  editorRenderers,
  JsonEditor,
} from '@mbc-cqrs-serverless/master-web/editors'
import { Button, buttonVariants } from '@mbc-cqrs-serverless/ui-web'

import { ClientScreens } from './client-screens'
import { MasterScreens } from './master-screens'
import { SAMPLE } from './sample'

/**
 * Server code: both `/core` entries run here; ui-web's Button and master-web's
 * editor renderers and JsonEditor cross as client references.
 */
export default function Page() {
  const parsed = parseSurvey(SAMPLE)
  if (!parsed.success) throw new Error('The sample survey is invalid')
  const errors = validateAnswers(parsed.data, {})
  const imported = parseBulkJson(
    JSON.stringify([{ code: 'PRODUCT', name: '商品', attributes: {} }]),
    { screen: 'settings' }
  )
  return (
    <main>
      <p className={buttonVariants({ variant: 'outline' })}>
        server-side validation errors: {Object.keys(errors).length}
      </p>
      <Button>Server-rendered client component</Button>
      <ClientScreens survey={parsed.data} />
      <p>master field types: {MASTER_FIELD_TYPES.length}</p>
      <p>master bulk items checked on the server: {imported.items.length}</p>
      <MasterScreens components={editorRenderers} jsonEditor={JsonEditor} />
    </main>
  )
}
