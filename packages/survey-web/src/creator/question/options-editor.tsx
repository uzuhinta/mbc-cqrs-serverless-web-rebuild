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
import { restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { GripVertical, Trash2 } from 'lucide-react'
import { useId } from 'react'

import type {
  DropdownQuestion,
  MultipleChoiceQuestion,
  QuestionOption,
  SingleChoiceQuestion,
} from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'

type ChoiceQuestion =
  SingleChoiceQuestion | MultipleChoiceQuestion | DropdownQuestion
const DEFAULT_TARGET = '##__DEFAULT__##'

function OptionRow({
  sortId,
  option,
  index,
  branching,
  sections,
  onLabel,
  onTarget,
  onRemove,
}: {
  sortId: string
  option: QuestionOption
  index: number
  branching: boolean
  sections: readonly { id: string; title: string }[]
  onLabel: (label: string) => void
  onTarget: (target: string | undefined) => void
  onRemove: () => void
}) {
  const t = useMessages(creatorMessages)
  const isOther = option.isOther === true
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id: sortId,
    disabled: { draggable: isOther, droppable: isOther },
  })

  return (
    <div
      ref={setNodeRef}
      data-option-row=""
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="mbc:flex mbc:items-center mbc:gap-2"
    >
      {isOther ? (
        <div className="mbc:w-[29px]" />
      ) : (
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={t.options.reorder}
          className="mbc:cursor-grab mbc:touch-none mbc:rounded-sm mbc:p-1 mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
          {...attributes}
          {...listeners}
        >
          <GripVertical
            aria-hidden
            className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
          />
        </button>
      )}
      <div className="mbc:flex-1">
        <Input
          placeholder={t.options.placeholder({ n: index + 1 })}
          aria-label={t.options.placeholder({ n: index + 1 })}
          disabled={isOther}
          value={option.label}
          onChange={(event) => onLabel(event.target.value)}
        />
      </div>
      {branching && !isOther && (
        <div className="mbc:w-[180px]">
          <Select
            value={option.nextSectionId ?? ''}
            onValueChange={(value) =>
              onTarget(value === DEFAULT_TARGET ? undefined : value)
            }
          >
            <SelectTrigger
              className="mbc:w-[180px] mbc:truncate mbc:text-xs"
              aria-label={t.options.goToSection}
            >
              <SelectValue placeholder={t.options.goToSection} />
            </SelectTrigger>
            <SelectContent className="mbc:max-w-[380px]">
              <SelectItem value={DEFAULT_TARGET}>
                {t.options.defaultNext}
              </SelectItem>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.title || t.section.untitled}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isOther ? (
        <div className="mbc:w-[40px]" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:hover:bg-destructive/10 mbc:hover:text-destructive mbc:shrink-0"
          aria-label={t.options.remove}
          onClick={onRemove}
        >
          <Trash2 aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      )}
    </div>
  )
}

/** v0's options creator. Options have no ids, so sortable ids are positions. */
export function OptionsEditor<Q extends ChoiceQuestion>({
  question,
  onChange,
  showBranching,
  sections,
}: {
  question: Q
  onChange: (next: Q) => void
  showBranching: boolean
  sections: readonly { id: string; title: string }[]
}) {
  const t = useMessages(creatorMessages)
  const base = useId()
  const options: readonly QuestionOption[] = question.options
  const otherIndex = options.findIndex((option) => option.isOther)
  const regular = options.filter((option) => !option.isOther)
  const branching = showBranching && question.type !== 'multiple-choice'
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const write = (next: QuestionOption[]) =>
    onChange({ ...question, options: next } as Q)
  const patch = (index: number, change: Partial<QuestionOption>) =>
    write(
      options.map((option, i) => {
        if (i !== index) return option
        const next = { ...option, ...change }
        if ('nextSectionId' in change && change.nextSectionId === undefined)
          delete next.nextSectionId
        return next
      })
    )
  const sortId = (index: number) => `${base}-${index}`

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = options.findIndex((_, i) => sortId(i) === active.id)
    const to = options.findIndex((_, i) => sortId(i) === over.id)
    if (from < 0 || to < 0 || options[to]?.isOther) return
    const next = [...options]
    const [moved] = next.splice(from, 1)
    if (moved) next.splice(to, 0, moved)
    write(next)
  }

  const addOption = () => {
    const label = t.options.placeholder({ n: regular.length + 1 })
    const added = { label, value: label }
    write(
      otherIndex < 0
        ? [...options, added]
        : [...options.slice(0, otherIndex), added, ...options.slice(otherIndex)]
    )
  }
  const toggleOther = () =>
    write(
      otherIndex >= 0
        ? options.filter((_, i) => i !== otherIndex)
        : [
            ...options,
            { label: t.options.other, value: 'other', isOther: true },
          ]
    )

  const rows = options.map((option, index) => ({ option, index }))
  const ordered = [
    ...rows.filter((row) => !row.option.isOther),
    ...rows.filter((row) => row.option.isOther),
  ]

  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-3 mbc:pt-2">
      <Label>{t.options.title}</Label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <SortableContext
          items={ordered
            .filter((row) => !row.option.isOther)
            .map((row) => sortId(row.index))}
          strategy={verticalListSortingStrategy}
        >
          <div className="mbc:flex mbc:flex-col mbc:gap-2">
            {ordered.map(({ option, index }) => (
              <OptionRow
                key={sortId(index)}
                sortId={sortId(index)}
                option={option}
                index={index}
                branching={branching}
                sections={sections}
                onLabel={(label) =>
                  patch(
                    index,
                    option.isOther ? { label } : { label, value: label }
                  )
                }
                onTarget={(target) => patch(index, { nextSectionId: target })}
                onRemove={() => write(options.filter((_, i) => i !== index))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mbc:flex mbc:gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          {t.options.add}
        </Button>
        {question.type !== 'dropdown' && (
          <Button
            type="button"
            variant={otherIndex >= 0 ? 'default' : 'outline'}
            size="sm"
            onClick={toggleOther}
          >
            {otherIndex >= 0 ? t.options.removeOther : t.options.addOther}
          </Button>
        )}
      </div>
    </div>
  )
}
