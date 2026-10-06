import type { SurveyInput } from '@mbc-cqrs-serverless/survey-web/core'

export const SAMPLE: SurveyInput = {
  title: 'Smoke',
  items: [
    { id: 'sec_1', type: 'section-header', title: 'One' },
    {
      id: 'q_name',
      type: 'short-text',
      label: 'Name',
      validation: { required: true },
    },
    { id: 'q_stars', type: 'rating', label: 'Stars' },
  ],
}
