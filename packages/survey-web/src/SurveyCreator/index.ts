import {
  SurveyCreator as RootSurveyCreator,
  type SurveyCreatorHandle as RootSurveyCreatorHandle,
  type SurveyCreatorProps as RootSurveyCreatorProps,
} from '../creator/survey-creator'

// Declarations (not re-exports), so `@deprecated` reaches the emitted types.

/** @deprecated Import `SurveyCreator` from `@mbc-cqrs-serverless/survey-web`. This subpath is kept through 1.x. */
export const SurveyCreator: typeof RootSurveyCreator = RootSurveyCreator

/** @deprecated Import `SurveyCreatorProps` from `@mbc-cqrs-serverless/survey-web`. */
export type SurveyCreatorProps = RootSurveyCreatorProps

/** @deprecated Import `SurveyCreatorHandle` from `@mbc-cqrs-serverless/survey-web`. */
export type SurveyCreatorHandle = RootSurveyCreatorHandle
