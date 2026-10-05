import type { QuestionKind } from '../schema/survey-schema'

/** `time` answers (v0 shape). */
export type TimeAnswer = { hour: string; minute: string }
/** `time` answers with `answerType: 'duration'` (v0 shape). */
export type DurationAnswer = { hours: string; minutes: string; seconds: string }

/** v0 shapes: rating and linear-scale answers are numbers. */
export type SurveyAnswerValue =
  string | number | string[] | TimeAnswer | DurationAnswer | undefined

export type SurveyAnswers = Record<string, SurveyAnswerValue>

/** Answers carry question ids as keys; meta says what was asked. */
export type SurveyAnswerMeta = {
  id: string
  label: string
  type: QuestionKind
  value: SurveyAnswerValue
}
