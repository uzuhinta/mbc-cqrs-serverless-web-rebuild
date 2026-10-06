// One MbcContext: hosts may import the provider from here or from ui-web.
export {
  MbcProvider,
  useMessages,
  type MbcProviderProps,
} from '@mbc-cqrs-serverless/ui-web'
export * from './core'
export { surveyMessages, type SurveyMessages } from './i18n/survey-messages'
export type { QuestionRendererProps } from './question-types/types'
export type { QuestionRenderers } from './question-types/registry'
export { SurveyForm, type SurveyFormProps } from './form/survey-form'
export {
  creatorMessages,
  type CreatorMessages,
} from './creator/i18n/creator-messages'
export {
  SurveyCreator,
  type SurveyCreatorHandle,
  type SurveyCreatorProps,
} from './creator/survey-creator'
