import type { SurveyItem } from '../../schema/survey-schema'
import {
  isInLockedSection,
  isSection,
  sectionEndOf,
  sectionHeaders,
} from './items'

/** v0's lock rules, in one place: every UI entry point and the reducer ask these. */
export function canEdit(items: readonly SurveyItem[], index: number): boolean {
  const item = items[index]
  return item !== undefined && item.locked !== true
}

export function canDelete(
  items: readonly SurveyItem[],
  index: number
): boolean {
  const item = items[index]
  if (!item || item.locked) return false
  if (!isSection(item)) return true
  if (sectionHeaders(items).length <= 1) return false
  return !items
    .slice(index + 1, sectionEndOf(items, index))
    .some((entry) => entry.locked === true)
}

export function canDuplicate(
  items: readonly SurveyItem[],
  index: number
): boolean {
  const item = items[index]
  if (!item) return false
  if (isSection(item)) return true
  return item.locked !== true && !isInLockedSection(items, index)
}

export function canDrag(items: readonly SurveyItem[], index: number): boolean {
  const item = items[index]
  return (
    item !== undefined &&
    !isSection(item) &&
    item.locked !== true &&
    !isInLockedSection(items, index)
  )
}

export function canMerge(items: readonly SurveyItem[], index: number): boolean {
  const item = items[index]
  if (!isSection(item) || index === 0 || item.locked) return false
  if (sectionHeaders(items).length <= 1) return false
  return !isInLockedSection(items, index - 1)
}
