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
