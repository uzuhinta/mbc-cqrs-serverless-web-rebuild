import type { Survey } from '../../src/schema/survey-schema'

/** Branching survey: start → (car → end) | (walk, submits). */
export const BRANCHING: Survey = {
  title: '通勤アンケート',
  description: 'ご協力ください',
  items: [
    { id: 'start', type: 'section-header', title: 'はじめに' },
    {
      id: 'name',
      type: 'short-text',
      label: 'お名前',
      validation: { required: true },
    },
    {
      id: 'route',
      type: 'single-choice',
      label: '通勤手段',
      options: [
        { value: 'car', label: '車', nextSectionId: 'car' },
        { value: 'walk', label: '徒歩', nextSectionId: 'walk' },
      ],
      validation: { required: true },
    },
    {
      id: 'car',
      type: 'section-header',
      title: '車',
      action: { type: 'jump', targetSectionId: 'end' },
    },
    { id: 'model', type: 'short-text', label: '車種' },
    {
      id: 'walk',
      type: 'section-header',
      title: '徒歩',
      action: { type: 'submit' },
    },
    { id: 'steps', type: 'short-text', label: '歩数' },
    { id: 'end', type: 'section-header', title: 'おわり' },
    { id: 'score', type: 'rating', label: '満足度', levels: 5, symbol: 'star' },
  ],
}

/** One section holding v0-shaped answers for every special value type. */
export const SAVED_VALUES: Survey = {
  title: 'Saved',
  items: [
    { id: 'when', type: 'time', label: 'When', answerType: 'time' },
    {
      id: 'how',
      type: 'single-choice',
      label: 'How',
      options: [
        { value: 'a', label: 'A' },
        { value: 'other', label: 'Other', isOther: true },
      ],
    },
    { id: 'stars', type: 'rating', label: 'Stars', levels: 5, symbol: 'star' },
  ],
}
