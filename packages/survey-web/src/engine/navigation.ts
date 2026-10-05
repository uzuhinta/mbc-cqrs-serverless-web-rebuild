import type { SurveyAnswers } from '../answers/types'
import type { SurveyPage } from './pages'

function nextInOrder(page: SurveyPage, pages: SurveyPage[]): string | null {
  const index = pages.findIndex((candidate) => candidate.id === page.id)
  return pages[index + 1]?.id ?? null
}

/** The section after `page` for these answers; `null` means submit. */
export function resolveNext(
  page: SurveyPage,
  answers: SurveyAnswers,
  pages: SurveyPage[]
): string | null {
  const exists = (id: string) => pages.some((candidate) => candidate.id === id)

  if (page.action?.type === 'submit') return null
  if (page.action?.type === 'jump') {
    return exists(page.action.targetSectionId)
      ? page.action.targetSectionId
      : nextInOrder(page, pages)
  }

  for (const question of page.questions) {
    if (question.type !== 'single-choice' && question.type !== 'dropdown')
      continue
    const answer = answers[question.id]
    if (typeof answer !== 'string' || !answer) continue
    const target = question.options.find(
      (option) => option.value === answer
    )?.nextSectionId
    if (target && exists(target)) return target
  }

  return nextInOrder(page, pages)
}

/** Section ids visited from the first section; stops at submit or a cycle. */
export function resolvePath(
  pages: SurveyPage[],
  answers: SurveyAnswers
): string[] {
  const path: string[] = []
  let current = pages[0]
  while (current && !path.includes(current.id)) {
    path.push(current.id)
    const nextId = resolveNext(current, answers, pages)
    current =
      nextId === null ? undefined : pages.find((page) => page.id === nextId)
  }
  return path
}
