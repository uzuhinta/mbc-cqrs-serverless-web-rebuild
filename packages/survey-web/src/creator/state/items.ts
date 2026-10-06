import type { SectionHeader, SurveyItem } from '../../schema/survey-schema'

export function isSection(item: SurveyItem | undefined): item is SectionHeader {
  return item?.type === 'section-header'
}

/** Index of the header governing `index` (the item itself if it is one); −1 before any header. */
export function headerIndexOf(
  items: readonly SurveyItem[],
  index: number
): number {
  for (let i = Math.min(index, items.length - 1); i >= 0; i -= 1) {
    if (isSection(items[i])) return i
  }
  return -1
}

/** First index after the section that contains `index`. */
export function sectionEndOf(
  items: readonly SurveyItem[],
  index: number
): number {
  for (let i = index + 1; i < items.length; i += 1) {
    if (isSection(items[i])) return i
  }
  return items.length
}

export function isInLockedSection(
  items: readonly SurveyItem[],
  index: number
): boolean {
  const header = items[headerIndexOf(items, index)]
  return isSection(header) && header.locked === true
}

export function sectionHeaders(items: readonly SurveyItem[]): SectionHeader[] {
  return items.filter(isSection)
}

/** Where a new question goes for this selection (`-1`: none or the title); `null` when that is inside a locked section. */
export function questionInsertIndex(
  items: readonly SurveyItem[],
  selectedIndex: number
): number | null {
  const at = selectedIndex >= 0 ? selectedIndex + 1 : items.length
  return isInLockedSection(items, at - 1) ? null : at
}

/** Where a new section goes: after the selection, or after the whole locked section it sits in. */
export function sectionInsertIndex(
  items: readonly SurveyItem[],
  selectedIndex: number
): number {
  if (selectedIndex < 0) return items.length
  return isInLockedSection(items, selectedIndex)
    ? sectionEndOf(items, selectedIndex)
    : selectedIndex + 1
}
