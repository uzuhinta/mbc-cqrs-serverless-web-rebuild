import {
  parseSurvey,
  validateAnswers,
} from '@mbc-cqrs-serverless/survey-web/core'
import { Button, buttonVariants } from '@mbc-cqrs-serverless/ui-web'

import { ClientScreens } from './client-screens'
import { SAMPLE } from './sample'

/** Server code: `/core` runs here; ui-web's Button crosses as a client reference. */
export default function Page() {
  const parsed = parseSurvey(SAMPLE)
  if (!parsed.success) throw new Error('The sample survey is invalid')
  const errors = validateAnswers(parsed.data, {})
  return (
    <main>
      <p className={buttonVariants({ variant: 'outline' })}>
        server-side validation errors: {Object.keys(errors).length}
      </p>
      <Button>Server-rendered client component</Button>
      <ClientScreens survey={parsed.data} />
    </main>
  )
}
