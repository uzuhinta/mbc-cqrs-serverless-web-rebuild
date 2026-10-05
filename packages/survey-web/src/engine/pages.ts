import type {
  SectionHeader,
  Survey,
  SurveyQuestion,
} from '../schema/survey-schema'

export const START_SECTION_ID = '__start'

export type SurveyPage = {
  id: string
  title: string
  description?: string
  questions: SurveyQuestion[]
  action?: SectionHeader['action']
}

export function buildPages(survey: Survey): SurveyPage[] {
  const pages: SurveyPage[] = []
  let current: SurveyPage | undefined

  for (const item of survey.items) {
    if (item.type === 'section-header') {
      current = {
        id: item.id,
        title: item.title,
        questions: [],
        ...(item.description !== undefined && {
          description: item.description,
        }),
        ...(item.action !== undefined && { action: item.action }),
      }
      pages.push(current)
      continue
    }
    if (!current) {
      current = {
        id: START_SECTION_ID,
        title: survey.title,
        questions: [],
        ...(survey.description !== undefined && {
          description: survey.description,
        }),
      }
      pages.push(current)
    }
    current.questions.push(item)
  }
  return pages
}
