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
