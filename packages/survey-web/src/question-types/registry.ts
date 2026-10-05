import type { ComponentType } from 'react'

import type { QuestionKind, SurveyQuestion } from '../schema/survey-schema'
import { DateRenderer } from './date'
import { DropdownRenderer } from './dropdown'
import { LinearScaleRenderer } from './linear-scale'
import { LongTextRenderer } from './long-text'
import { MultipleChoiceRenderer } from './multiple-choice'
import { RatingRenderer } from './rating'
import { ShortTextRenderer } from './short-text'
import { SingleChoiceRenderer } from './single-choice'
import { TimeRenderer } from './time'
import type { QuestionRendererProps } from './types'

export type QuestionRenderers = {
  [K in QuestionKind]: ComponentType<
    QuestionRendererProps<Extract<SurveyQuestion, { type: K }>>
  >
}

export const questionRenderers: QuestionRenderers = {
  'short-text': ShortTextRenderer,
  'long-text': LongTextRenderer,
  'single-choice': SingleChoiceRenderer,
  'multiple-choice': MultipleChoiceRenderer,
  dropdown: DropdownRenderer,
  'linear-scale': LinearScaleRenderer,
  rating: RatingRenderer,
  date: DateRenderer,
  time: TimeRenderer,
}
