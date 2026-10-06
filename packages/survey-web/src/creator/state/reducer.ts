import type {
  QuestionKind,
  SectionHeader,
  Survey,
  SurveyItem,
  SurveyQuestion,
} from '../../schema/survey-schema'
import { changeQuestionType } from './defaults'
import { createId, type IdFactory } from './id'
import {
  isInLockedSection,
  isSection,
  questionInsertIndex,
  sectionEndOf,
  sectionInsertIndex,
} from './items'
import { canDelete, canDrag, canDuplicate, canEdit, canMerge } from './locks'
import type { CreatorState } from './types'

export { TITLE_ID, type CreatorState } from './types'

export type CreatorAction =
  | { type: 'select'; id: string | null }
  | { type: 'updateSurvey'; title?: string; description?: string }
  | { type: 'addQuestion'; question: SurveyQuestion }
  | { type: 'addSection'; section: SectionHeader }
  | { type: 'updateItem'; id: string; update: (item: SurveyItem) => SurveyItem }
  | { type: 'changeType'; id: string; kind: QuestionKind; optionLabel: string }
  | { type: 'duplicate'; id: string; copySuffix: string }
  | { type: 'remove'; id: string }
  | { type: 'mergeSection'; id: string }
  | { type: 'move'; id: string; overId: string }
  | { type: 'reorderSections'; order: readonly string[] }
  | { type: 'reset'; survey: Survey; selectedId: string | null }

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function insertAt<T>(list: readonly T[], at: number, added: readonly T[]): T[] {
  return [...list.slice(0, at), ...added, ...list.slice(at)]
}

function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) next.splice(to, 0, moved)
  return next
}

function withItems(
  state: CreatorState,
  items: SurveyItem[],
  selectedId: string | null = state.selectedId
): CreatorState {
  return { survey: { ...state.survey, items }, selectedId, dirty: true }
}

/** What to select when the selection was removed at `index`: the item before it, else after. */
function neighbourOf(
  items: readonly SurveyItem[],
  index: number
): string | null {
  return items[index - 1]?.id ?? items[index]?.id ?? null
}

function lockedContentChanged(item: SectionHeader, next: SurveyItem): boolean {
  return (
    !isSection(next) ||
    next.title !== item.title ||
    next.description !== item.description ||
    next.locked !== item.locked
  )
}

/** Pure. A refused or no-op action returns `state` itself. */
export function creatorReducer(
  state: CreatorState,
  action: CreatorAction,
  newId: IdFactory = createId
): CreatorState {
  const items = state.survey.items
  const indexOf = (id: string | null) =>
    id === null ? -1 : items.findIndex((item) => item.id === id)

  switch (action.type) {
    case 'select':
      return state.selectedId === action.id
        ? state
        : { ...state, selectedId: action.id }

    case 'updateSurvey':
      return {
        ...state,
        survey: {
          ...state.survey,
          ...(action.title !== undefined && { title: action.title }),
          ...(action.description !== undefined && {
            description: action.description,
          }),
        },
        dirty: true,
      }

    case 'addQuestion': {
      const at = questionInsertIndex(items, indexOf(state.selectedId))
      if (at === null) return state
      return withItems(
        state,
        insertAt(items, at, [action.question]),
        action.question.id
      )
    }

    case 'addSection': {
      const at = sectionInsertIndex(items, indexOf(state.selectedId))
      return withItems(
        state,
        insertAt(items, at, [action.section]),
        action.section.id
      )
    }

    case 'updateItem': {
      const index = indexOf(action.id)
      const item = items[index]
      if (!item) return state
      const next = action.update(item)
      if (next === item || next.id !== item.id || next.type !== item.type)
        return state
      if (
        isSection(item)
          ? item.locked && lockedContentChanged(item, next)
          : !canEdit(items, index)
      ) {
        return state
      }
      return withItems(
        state,
        items.map((entry, i) => (i === index ? next : entry))
      )
    }

    case 'changeType': {
      const index = indexOf(action.id)
      const item = items[index]
      if (
        !item ||
        isSection(item) ||
        item.type === action.kind ||
        !canEdit(items, index)
      ) {
        return state
      }
      const next = changeQuestionType(item, action.kind, action.optionLabel)
      return withItems(
        state,
        items.map((entry, i) => (i === index ? next : entry))
      )
    }

    case 'duplicate': {
      const index = indexOf(action.id)
      const item = items[index]
      if (!item || !canDuplicate(items, index)) return state
      if (!isSection(item)) {
        const copy = { ...clone(item), id: newId('q') }
        return withItems(state, insertAt(items, index + 1, [copy]), copy.id)
      }
      const end = sectionEndOf(items, index)
      const copies = items.slice(index, end).map((entry) => {
        const { locked: _locked, ...rest } = clone(entry)
        return isSection(entry)
          ? {
              ...rest,
              id: newId('sec'),
              title: `${entry.title}${action.copySuffix}`,
            }
          : { ...rest, id: newId('q') }
      }) as SurveyItem[]
      return withItems(
        state,
        insertAt(items, end, copies),
        copies[0]?.id ?? null
      )
    }

    case 'remove': {
      const index = indexOf(action.id)
      const item = items[index]
      if (!item || !canDelete(items, index)) return state
      const end = isSection(item) ? sectionEndOf(items, index) : index + 1
      const removed = new Set(items.slice(index, end).map((entry) => entry.id))
      const next = [...items.slice(0, index), ...items.slice(end)]
      return withItems(
        state,
        next,
        state.selectedId !== null && removed.has(state.selectedId)
          ? neighbourOf(next, index)
          : state.selectedId
      )
    }

    case 'mergeSection': {
      const index = indexOf(action.id)
      if (!canMerge(items, index)) return state
      const next = items.filter((_, i) => i !== index)
      return withItems(
        state,
        next,
        state.selectedId === action.id
          ? neighbourOf(next, index)
          : state.selectedId
      )
    }

    case 'move': {
      const from = indexOf(action.id)
      const to = indexOf(action.overId)
      if (
        from < 0 ||
        to <= 0 ||
        from === to ||
        !canDrag(items, from) ||
        isInLockedSection(items, to)
      ) {
        return state
      }
      return withItems(state, arrayMove(items, from, to))
    }

    case 'reorderSections': {
      const first = items.findIndex(isSection)
      if (first < 0) return state
      const groups = new Map<string, SurveyItem[]>()
      items.forEach((entry, i) => {
        if (isSection(entry))
          groups.set(entry.id, items.slice(i, sectionEndOf(items, i)))
      })
      const valid =
        action.order.length === groups.size &&
        new Set(action.order).size === groups.size &&
        action.order.every((id) => groups.has(id))
      if (!valid) return state
      const next = [
        ...items.slice(0, first),
        ...action.order.flatMap((id) => groups.get(id) ?? []),
      ]
      return next.every((entry, i) => entry === items[i])
        ? state
        : withItems(state, next)
    }

    case 'reset':
      return {
        survey: action.survey,
        selectedId: action.selectedId,
        dirty: false,
      }
  }
}
