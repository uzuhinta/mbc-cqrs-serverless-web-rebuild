/** What the template screens show; `/mbc` maps backend entities to it. */
export type SurveyTemplateSummary = {
  id: string
  name: string
  description?: string
  version: number
  createdAt?: string
  updatedAt?: string
  questionCount?: number
  sectionCount?: number
}
