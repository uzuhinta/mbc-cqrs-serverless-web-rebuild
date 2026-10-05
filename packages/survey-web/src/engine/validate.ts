import { isOtherValue, otherText } from '../answers/choice'
import type {
  DurationAnswer,
  SurveyAnswers,
  SurveyAnswerValue,
  TimeAnswer,
} from '../answers/types'
import type {
  CustomValidationRule,
  Survey,
  SurveyQuestion,
} from '../schema/survey-schema'
import { resolvePath } from './navigation'
import { buildPages } from './pages'

export type AnswerErrorKey =
  | 'required'
  | 'requiredField'
  | 'requiredChoice'
  | 'requiredChoices'
  | 'otherRequired'
  | 'invalidNumber'
  | 'criteria'
  | 'length'
  | 'pattern'
  | 'choiceCount'

export type AnswerError =
  | {
      key: AnswerErrorKey
      params?: { rule: 'min' | 'max' | 'exact'; value: number }
    }
  | { key: 'custom'; message: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(key: AnswerErrorKey, customError?: string): AnswerError {
  return customError ? { key: 'custom', message: customError } : { key }
}

function isEmpty(value: SurveyAnswerValue): boolean {
  if (value === undefined || value === '') return true
  return Array.isArray(value) && value.length === 0
}

function timeComplete(
  question: SurveyQuestion,
  value: SurveyAnswerValue
): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  if (question.type === 'time' && question.answerType === 'duration') {
    const { hours, minutes, seconds } = value as DurationAnswer
    return (
      Boolean(hours || minutes || seconds) &&
      [hours, minutes, seconds].every(
        (part) => !Number.isNaN(Number.parseInt(part, 10))
      )
    )
  }
  const { hour, minute } = value as TimeAnswer
  return Boolean(hour && minute)
}

function requiredKey(question: SurveyQuestion): AnswerErrorKey {
  switch (question.type) {
    case 'date':
      return 'requiredField'
    case 'single-choice':
    case 'dropdown':
      return 'requiredChoice'
    case 'multiple-choice':
      return 'requiredChoices'
    default:
      return 'required'
  }
}

function checkNumber(
  rule: Extract<CustomValidationRule, { type: 'number' }>,
  input: string
): AnswerError | null {
  const trimmed = input.trim()
  const num = trimmed === '' ? Number.NaN : Number(trimmed)
  if (Number.isNaN(num)) return { key: 'invalidNumber' }
  const { value, value2 } = rule
  const broken = (() => {
    switch (rule.rule) {
      case 'gt':
        return value !== undefined && num <= value
      case 'gte':
        return value !== undefined && num < value
      case 'lt':
        return value !== undefined && num >= value
      case 'lte':
        return value !== undefined && num > value
      case 'eq':
        return value !== undefined && num !== value
      case 'neq':
        return value !== undefined && num === value
      case 'between':
        return (
          value !== undefined &&
          value2 !== undefined &&
          (num < value || num > value2)
        )
      case 'not_between':
        return (
          value !== undefined &&
          value2 !== undefined &&
          num >= value &&
          num <= value2
        )
      case 'is_number':
        return false
      case 'is_whole':
        return !Number.isInteger(num)
    }
  })()
  return broken ? fail('criteria', rule.customError) : null
}

function checkText(
  rule: Extract<CustomValidationRule, { type: 'text' }>,
  input: string
): AnswerError | null {
  const broken = (() => {
    switch (rule.rule) {
      case 'contains':
        return rule.value !== undefined && !input.includes(rule.value)
      case 'not_contains':
        return rule.value !== undefined && input.includes(rule.value)
      case 'is_email':
        return !EMAIL.test(input)
      case 'is_url':
        try {
          new URL(input)
          return false
        } catch {
          return true
        }
    }
  })()
  return broken ? fail('criteria', rule.customError) : null
}

function checkRegex(
  rule: Extract<CustomValidationRule, { type: 'regex' }>,
  input: string
): AnswerError | null {
  let regex: RegExp
  try {
    regex = new RegExp(rule.value)
  } catch {
    return null // A broken pattern in the schema must not block respondents.
  }
  const match = regex.exec(input)
  const whole = match !== null && match[0] === input
  const broken = (() => {
    switch (rule.rule) {
      case 'matches':
        return !whole
      case 'not_matches':
        return whole
      case 'contains':
        return !regex.test(input)
      case 'not_contains':
        return regex.test(input)
    }
  })()
  return broken ? fail('pattern', rule.customError) : null
}

function checkCustom(
  rule: CustomValidationRule,
  input: string
): AnswerError | null {
  switch (rule.type) {
    case 'number':
      return checkNumber(rule, input)
    case 'text':
      return checkText(rule, input)
    case 'length': {
      const broken =
        (rule.rule === 'max' && input.length > rule.value) ||
        (rule.rule === 'min' && input.length < rule.value)
      return broken ? fail('length', rule.customError) : null
    }
    case 'regex':
      return checkRegex(rule, input)
  }
}

export function validateAnswer(
  question: SurveyQuestion,
  value: SurveyAnswerValue
): AnswerError | null {
  const required = question.validation?.required === true

  if (question.type === 'time') {
    if (!required || value === undefined)
      return required ? { key: 'required' } : null
    return timeComplete(question, value) ? null : { key: 'required' }
  }

  if (isEmpty(value)) return required ? { key: requiredKey(question) } : null

  if (
    required &&
    (question.type === 'single-choice' || question.type === 'multiple-choice')
  ) {
    const values = Array.isArray(value) ? value : [value]
    const other = values.find(
      (item): item is string => typeof item === 'string' && isOtherValue(item)
    )
    if (other !== undefined && !otherText(other).trim())
      return { key: 'otherRequired' }
  }

  if (question.type === 'multiple-choice' && Array.isArray(value)) {
    const rule = question.validation?.custom
    if (rule) {
      const count = value.length
      const broken =
        (rule.rule === 'min' && count < rule.value) ||
        (rule.rule === 'max' && count > rule.value) ||
        (rule.rule === 'exact' && count !== rule.value)
      if (broken) {
        return rule.customError
          ? { key: 'custom', message: rule.customError }
          : {
              key: 'choiceCount',
              params: { rule: rule.rule, value: rule.value },
            }
      }
    }
    return null
  }

  if (
    (question.type === 'short-text' || question.type === 'long-text') &&
    typeof value === 'string'
  ) {
    const rule = question.validation?.custom
    return rule ? checkCustom(rule, value) : null
  }

  return null
}

/** Errors by question id, for the questions these answers actually reach. */
export function validateAnswers(
  survey: Survey,
  answers: SurveyAnswers
): Record<string, AnswerError> {
  const pages = buildPages(survey)
  const visited = new Set(resolvePath(pages, answers))
  const errors: Record<string, AnswerError> = {}
  for (const page of pages) {
    if (!visited.has(page.id)) continue
    for (const question of page.questions) {
      const error = validateAnswer(question, answers[question.id])
      if (error) errors[question.id] = error
    }
  }
  return errors
}
