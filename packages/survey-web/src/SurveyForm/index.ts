import type {
  SurveyAnswerMeta as RootSurveyAnswerMeta,
  SurveyAnswers as RootSurveyAnswers,
} from '../answers/types'
import {
  SurveyForm as RootSurveyForm,
  type SurveyFormProps as RootSurveyFormProps,
} from '../form/survey-form'

// Declarations (not re-exports), so `@deprecated` reaches the emitted types.

/** @deprecated Import `SurveyForm` from `@mbc-cqrs-serverless/survey-web`. This subpath is kept through 1.x. */
export const SurveyForm: typeof RootSurveyForm = RootSurveyForm

/** @deprecated Import `SurveyFormProps` from `@mbc-cqrs-serverless/survey-web`. */
export type SurveyFormProps = RootSurveyFormProps

/** @deprecated Import `SurveyAnswers` from `@mbc-cqrs-serverless/survey-web`. */
export type SurveyAnswers = RootSurveyAnswers

/** @deprecated Import `SurveyAnswerMeta` from `@mbc-cqrs-serverless/survey-web`. */
export type SurveyAnswerMeta = RootSurveyAnswerMeta
