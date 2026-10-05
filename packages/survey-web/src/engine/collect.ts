import type { SurveyAnswerMeta, SurveyAnswers } from '../answers/types'
import type { SurveyPage } from './pages'

export function collectAnswers(
  pages: SurveyPage[],
  path: readonly string[],
  values: SurveyAnswers
): { answers: SurveyAnswers; meta: SurveyAnswerMeta[] } {
  const visited = new Set(path)
  const meta: SurveyAnswerMeta[] = pages.flatMap((page) =>
    page.questions.map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      value: visited.has(page.id) ? values[question.id] : undefined,
    }))
  )
  const answers: SurveyAnswers = Object.fromEntries(
    meta.map(({ id, value }) => [id, value])
  )
  return { answers, meta }
}
