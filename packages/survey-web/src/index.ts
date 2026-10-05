// One MbcContext: hosts may import the provider from here or from ui-web.
export {
  MbcProvider,
  useMessages,
  type MbcProviderProps,
} from '@mbc-cqrs-serverless/ui-web'
export * from './schema/survey-schema'
export * from './schema/aliases'
export {
  parseSurvey,
  validateSurveyJson,
  type ParseSurveyResult,
} from './schema/parse'
export * from './answers/types'
export {
  isOtherValue,
  OTHER_VALUE,
  otherText,
  toOtherValue,
} from './answers/choice'
export { buildPages, START_SECTION_ID, type SurveyPage } from './engine/pages'
export { resolveNext, resolvePath } from './engine/navigation'
export {
  validateAnswer,
  validateAnswers,
  type AnswerError,
  type AnswerErrorKey,
} from './engine/validate'
