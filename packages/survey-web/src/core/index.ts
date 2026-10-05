// React-free entry for servers (e.g. validating submitted answers on Lambda):
// imports nothing but zod, so it loads in milliseconds without React installed.
export * from '../schema/survey-schema'
export * from '../schema/aliases'
export {
  parseSurvey,
  validateSurveyJson,
  type ParseSurveyResult,
} from '../schema/parse'
export * from '../answers/types'
export {
  isOtherValue,
  OTHER_VALUE,
  otherText,
  toOtherValue,
} from '../answers/choice'
export { buildPages, START_SECTION_ID, type SurveyPage } from '../engine/pages'
export { resolveNext, resolvePath } from '../engine/navigation'
export {
  validateAnswer,
  validateAnswers,
  type AnswerError,
  type AnswerErrorKey,
} from '../engine/validate'
export { collectAnswers } from '../engine/collect'
export { formatAnswerError } from '../i18n/format-error'
