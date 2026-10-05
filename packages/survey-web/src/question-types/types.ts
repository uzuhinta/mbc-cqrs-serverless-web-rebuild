import type { SurveyAnswerValue } from '../answers/types'
import type { SurveyQuestion } from '../schema/survey-schema'

/**
 * Renderers are controlled components: they know nothing about form state.
 * Hosts replace one with `<SurveyForm components={{ rating: MyRating }} />`.
 */
export type QuestionRendererProps<Q extends SurveyQuestion = SurveyQuestion> = {
  question: Q
  value: SurveyAnswerValue
  onChange: (value: SurveyAnswerValue) => void
  onBlur: () => void
  disabled: boolean
  invalid: boolean
}
