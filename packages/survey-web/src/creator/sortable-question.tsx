'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo } from 'react'

import { QuestionCard } from './question/question-card'
import { isInLockedSection } from './state/items'
import { canDrag } from './state/locks'
import { useCreatorSelector } from './state/store'

/** Questions in locked sections are neither draggable nor drop targets (v0). */
export function SortableQuestion({ id }: { id: string }) {
  const flags = useCreatorSelector((state) => {
    const items = state.survey.items
    const index = items.findIndex((item) => item.id === id)
    return `${canDrag(items, index) ? 1 : 0}${isInLockedSection(items, index) ? 0 : 1}`
  })
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    // A boolean `disabled` only stops dragging in dnd-kit; state both.
  } = useSortable({
    id,
    disabled: { draggable: flags[0] !== '1', droppable: flags[1] !== '1' },
  })
  const handle = useMemo(
    () => ({ attributes, listeners, setActivatorNodeRef }),
    [attributes, listeners, setActivatorNodeRef]
  )
  return (
    <div
      ref={setNodeRef}
      data-sortable-question=""
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <QuestionCard id={id} handle={handle} />
    </div>
  )
}
