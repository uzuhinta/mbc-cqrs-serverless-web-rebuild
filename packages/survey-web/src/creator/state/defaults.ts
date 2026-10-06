import {
  SurveySchema,
  type QuestionKind,
  type QuestionOption,
  type SectionHeader,
  type ShortTextQuestion,
  type Survey,
  type SurveyInput,
  type SurveyQuestion,
} from '../../schema/survey-schema'
import { createId, type IdFactory } from './id'
import { TITLE_ID, type CreatorState } from './types'

export function createQuestion(newId: IdFactory = createId): ShortTextQuestion {
  return {
    id: newId('q'),
    type: 'short-text',
    label: '',
    validation: { required: false },
  }
}

export function createSection(
  title: string,
  newId: IdFactory = createId
): SectionHeader {
  return { id: newId('sec'), type: 'section-header', title }
}

/**
 * Keeps what the question means to its author (id, label, description,
 * required, lock, and options between choice kinds); everything specific to
 * the old kind goes, including a custom validation rule (v0).
 */
export function changeQuestionType(
  question: SurveyQuestion,
  kind: QuestionKind,
  optionLabel: string
): SurveyQuestion {
  const base = {
    id: question.id,
    label: question.label,
    ...(question.description !== undefined && {
      description: question.description,
    }),
    ...(question.locked !== undefined && { locked: question.locked }),
  }
  const required = question.validation?.required ?? false
  const previous: readonly QuestionOption[] =
    'options' in question ? question.options : []
  const options =
    previous.length > 0
      ? [...previous]
      : [{ value: optionLabel, label: optionLabel }]
  const shuffle =
    'options' in question ? question.validation?.shuffleOptions : undefined
  const choiceValidation = {
    required,
    ...(shuffle !== undefined && { shuffleOptions: shuffle }),
  }

  switch (kind) {
    case 'short-text':
    case 'long-text':
      return { ...base, type: kind, validation: { required } }
    case 'single-choice':
    case 'dropdown':
      return { ...base, type: kind, options, validation: choiceValidation }
    case 'multiple-choice':
      return {
        ...base,
        type: kind,
        options: options.map(
          ({ nextSectionId: _dropped, ...option }) => option
        ),
        validation: choiceValidation,
      }
    case 'linear-scale':
      return { ...base, type: kind, min: 1, max: 5, validation: { required } }
    case 'rating':
      return {
        ...base,
        type: kind,
        levels: 5,
        symbol: 'star',
        validation: { required },
      }
    case 'date':
      return {
        ...base,
        type: kind,
        includeTime: false,
        includeYear: true,
        validation: { required },
      }
    case 'time':
      return {
        ...base,
        type: kind,
        answerType: 'time',
        validation: { required },
      }
  }
}

function withUniqueIds(survey: Survey, newId: IdFactory): Survey {
  const seen = new Set<string>()
  const items = survey.items.map((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      return item
    }
    return { ...item, id: newId(item.type === 'section-header' ? 'sec' : 'q') }
  })
  return { ...survey, items }
}

/** v0: a new survey has one section and the title selected; a loaded one selects its first item. */
export function initialCreatorState(
  defaultValue: SurveyInput | undefined,
  text: { untitledSurvey: string; firstSection: string },
  newId: IdFactory = createId
): CreatorState {
  if (!defaultValue) {
    return {
      survey: {
        title: text.untitledSurvey,
        description: '',
        items: [createSection(text.firstSection, newId)],
      },
      selectedId: TITLE_ID,
      dirty: false,
    }
  }
  const parsed = SurveySchema.safeParse(defaultValue)
  const survey = withUniqueIds(
    parsed.success ? parsed.data : (defaultValue as Survey),
    newId
  )
  return { survey, selectedId: survey.items[0]?.id ?? TITLE_ID, dirty: false }
}
