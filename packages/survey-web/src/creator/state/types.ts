import type { Survey } from '../../schema/survey-schema'

/** Selection id of the survey title card. */
export const TITLE_ID = '__title__'

export type CreatorState = {
  survey: Survey
  /** An item id, `TITLE_ID`, or `null`. */
  selectedId: string | null
  dirty: boolean
}
