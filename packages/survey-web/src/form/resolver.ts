import type { FieldErrors, Resolver } from 'react-hook-form'

import type { SurveyAnswers } from '../answers/types'
import { validateAnswer } from '../engine/validate'
import { formatAnswerError } from '../i18n/format-error'
import type { SurveyMessages } from '../i18n/survey-messages'
import type { SurveyQuestion } from '../schema/survey-schema'

/**
 * Validates the questions of the section on screen; other sections were
 * validated when left. react-hook-form reads `resolver` on every render, so
 * memoise one per section and locale.
 */
export function createSectionResolver(
  questions: readonly SurveyQuestion[],
  messages: SurveyMessages['validation']
): Resolver<SurveyAnswers> {
  return async (values) => {
    const errors: FieldErrors<SurveyAnswers> = {}
    for (const question of questions) {
      const error = validateAnswer(question, values[question.id])
      if (error) {
        errors[question.id] = {
          type: error.key,
          message: formatAnswerError(error, messages),
        }
      }
    }
    return Object.keys(errors).length > 0
      ? { values: {}, errors }
      : { values, errors: {} }
  }
}
