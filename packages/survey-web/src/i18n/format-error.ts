import type { AnswerError } from '../engine/validate'
import type { SurveyMessages } from './survey-messages'

export function formatAnswerError(
  error: AnswerError,
  messages: SurveyMessages['validation']
): string {
  if (error.key === 'custom') return error.message
  if (error.key === 'choiceCount' && error.params)
    return messages.choiceCount(error.params)
  return messages[error.key as Exclude<typeof error.key, 'choiceCount'>]
}
