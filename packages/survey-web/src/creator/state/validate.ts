import { SurveySchema, type Survey } from '../../schema/survey-schema'
import { isSection } from './items'
import { TITLE_ID } from './types'

export type CreatorIssueKey =
  | 'surveyTitle'
  | 'sectionTitle'
  | 'options'
  | 'optionLabel'
  | 'optionValue'
  | 'validationRule'
  | 'duplicateId'
  | 'invalid'

export type DraftReport = {
  valid: boolean
  data?: Survey
  /** By item id, or `TITLE_ID` for the title card. */
  errors: Record<string, CreatorIssueKey[]>
  warnings: Record<string, 'missingTarget'[]>
}

type Path = readonly PropertyKey[]

function issueKey(path: Path, code: string): CreatorIssueKey {
  const [, , field, , optionField] = path
  if (path.length === 1 && path[0] === 'title') return 'surveyTitle'
  if (field === 'title') return 'sectionTitle'
  if (field === 'id' && code === 'custom') return 'duplicateId'
  if (field === 'options') {
    if (optionField === undefined) return 'options'
    // A custom issue on a value is the uniqueness / reserved-value rule.
    return optionField === 'value' && code === 'custom'
      ? 'optionValue'
      : 'optionLabel'
  }
  if (field === 'validation') return 'validationRule'
  return 'invalid'
}

function add<K extends string>(map: Record<string, K[]>, id: string, key: K) {
  const list = (map[id] ??= [])
  if (!list.includes(key)) list.push(key)
}

/**
 * Runs the real schema so "valid" means "SurveyForm and the backend accept
 * it"; issues are reported on the card that owns them. Branch targets that
 * no longer exist are warnings: the form falls back to the next section.
 */
export function validateDraft(survey: Survey): DraftReport {
  const errors: Record<string, CreatorIssueKey[]> = {}
  const warnings: Record<string, 'missingTarget'[]> = {}

  const result = SurveySchema.safeParse(survey)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const [root, index] = issue.path
      const owner =
        root === 'items' && typeof index === 'number'
          ? survey.items[index]?.id
          : TITLE_ID
      add(errors, owner ?? TITLE_ID, issueKey(issue.path, issue.code))
    }
  }

  const sectionIds = new Set(survey.items.filter(isSection).map((s) => s.id))
  for (const item of survey.items) {
    if (isSection(item)) {
      if (
        item.action?.type === 'jump' &&
        !sectionIds.has(item.action.targetSectionId)
      ) {
        add(warnings, item.id, 'missingTarget')
      }
    } else if (item.type === 'single-choice' || item.type === 'dropdown') {
      if (
        item.options.some(
          (o) => o.nextSectionId && !sectionIds.has(o.nextSectionId)
        )
      ) {
        add(warnings, item.id, 'missingTarget')
      }
    }
  }

  return result.success
    ? { valid: true, data: result.data, errors, warnings }
    : { valid: false, errors, warnings }
}
