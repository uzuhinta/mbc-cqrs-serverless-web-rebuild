'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { GripVertical } from 'lucide-react'
import { useId, useState } from 'react'

import { announcements } from '../dnd-announcements'
import { creatorMessages } from '../i18n/creator-messages'
import { isSection } from '../state/items'
import { useCreatorStore } from '../state/store'

type Row = { id: string; title: string }

function SortableRow({
  row,
  index,
  total,
}: {
  row: Row
  index: number
  total: number
}) {
  const t = useMessages(creatorMessages)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id: row.id,
    attributes: { roleDescription: t.dnd.roleDescription },
  })
  const title = row.title || t.section.untitled
  return (
    <div
      ref={setNodeRef}
      data-section-row=""
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="mbc:bg-muted/50 mbc:flex mbc:items-center mbc:gap-2 mbc:rounded-lg mbc:p-3"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${title} ${t.question.dragHandle}`}
        className="mbc:cursor-grab mbc:touch-none mbc:rounded-sm mbc:p-1 mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
      >
        <GripVertical
          aria-hidden
          className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
        />
      </button>
      <div>
        <p className="mbc:font-semibold">{title}</p>
        <p className="mbc:text-muted-foreground mbc:text-sm">
          {t.reorder.position({ n: index + 1, total })}
        </p>
      </div>
    </div>
  )
}

function ReorderList({ onDone }: { onDone: () => void }) {
  const t = useMessages(creatorMessages)
  const store = useCreatorStore()
  const dndId = useId()
  const [rows, setRows] = useState<Row[]>(() =>
    store
      .getState()
      .survey.items.filter(isSection)
      .map(({ id, title }) => ({ id, title }))
  )
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setRows((current) =>
      arrayMove(
        current,
        current.findIndex((row) => row.id === active.id),
        current.findIndex((row) => row.id === over.id)
      )
    )
  }
  return (
    <>
      <div className="mbc:flex mbc:max-h-[60vh] mbc:flex-col mbc:gap-2 mbc:overflow-y-auto mbc:p-1">
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements: announcements(
              t,
              (id) =>
                rows.find((row) => row.id === id)?.title || t.section.untitled
            ),
            screenReaderInstructions: { draggable: t.dnd.instructions },
          }}
        >
          <SortableContext
            items={rows.map((row) => row.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row, index) => (
              <SortableRow
                key={row.id}
                row={row}
                index={index}
                total={rows.length}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t.reorder.cancel}
        </Button>
        <Button
          type="button"
          onClick={() => {
            store.dispatch({
              type: 'reorderSections',
              order: rows.map((row) => row.id),
            })
            onDone()
          }}
        >
          {t.reorder.save}
        </Button>
      </DialogFooter>
    </>
  )
}

/** v0's section reorder modal; the list is read from the store each time it opens. */
export function SectionReorderDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useMessages(creatorMessages)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.reorder.title}</DialogTitle>
        </DialogHeader>
        {open && <ReorderList onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
