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
import { useId, useState, type ChangeEvent } from 'react'

import type {
  DropdownQuestion,
  MultipleChoiceQuestion,
  QuestionOption,
  SingleChoiceQuestion,
} from '../../schema/survey-schema'
import { optionValueProblems } from '../../schema/option-values'
import { announcements } from '../dnd-announcements'
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
  invalid,
  onLabel,
  onValue,
  onTarget,
  onRemove,
}: {
  sortId: string
  option: QuestionOption
  index: number
  branching: boolean
  sections: readonly { id: string; title: string }[]
  invalid: boolean
  onLabel: (label: string) => void
  onValue: (value: string) => void
  onTarget: (target: string | undefined) => void
  onRemove: () => void
}) {
  const t = useMessages(creatorMessages)
  const valueId = useId()
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
    attributes: { roleDescription: t.dnd.roleDescription },
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
      <Label
        htmlFor={valueId}
        className="mbc:text-muted-foreground mbc:shrink-0 mbc:text-xs"
      >
        {t.options.value}
      </Label>
      {/* Input renders its own w-full wrapper, so the width lives out here (v0). */}
      <div className="mbc:w-[90px] mbc:shrink-0">
        <Input
          id={valueId}
          className="mbc:text-center"
          aria-invalid={invalid || undefined}
          // The "Other" option's value is always `other` (v0 0.0.50).
          {...(isOther
            ? { value: 'other', disabled: true, readOnly: true }
            : {
                value: option.value,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onValue(event.target.value),
              })}
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
        <div className="mbc:w-9 mbc:shrink-0" />
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
  showValueErrors = false,
}: {
  question: Q
  onChange: (next: Q) => void
  showBranching: boolean
  sections: readonly { id: string; title: string }[]
  /** Marks the values the schema rejects; on once the card shows its errors. */
  showValueErrors?: boolean
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

  // Stable keys per option (not stored in the JSON): React keys and sortable
  // ids follow the option, so focus stays on a moved option's handle.
  const [keyState, setKeyState] = useState(() => ({
    keys: options.map((_, i) => `${base}-${i}`),
    next: options.length,
  }))
  if (keyState.keys.length !== options.length) {
    // Options changed outside this editor (type change, reset): realign by count.
    const keys = keyState.keys.slice(0, options.length)
    let next = keyState.next
    while (keys.length < options.length) keys.push(`${base}-${next++}`)
    setKeyState({ keys, next })
  }
  const { keys } = keyState
  const newKey = () => `${base}-${keyState.next}`

  const write = (next: QuestionOption[], nextKeys: string[]) => {
    setKeyState((current) => ({
      keys: nextKeys,
      next: Math.max(current.next, keyState.next + 1),
    }))
    onChange({ ...question, options: next } as Q)
  }
  const patch = (index: number, change: Partial<QuestionOption>) =>
    onChange({
      ...question,
      options: options.map((option, i) => {
        if (i !== index) return option
        const next = { ...option, ...change }
        if ('nextSectionId' in change && change.nextSectionId === undefined)
          delete next.nextSectionId
        return next
      }),
    } as Q)
  const sortId = (index: number) => keys[index] ?? `${base}-${index}`
  const without = <T,>(list: readonly T[], index: number) =>
    list.filter((_, i) => i !== index)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = keys.indexOf(String(active.id))
    const to = keys.indexOf(String(over.id))
    if (from < 0 || to < 0 || options[to]?.isOther) return
    const move = <T,>(list: readonly T[]) => {
      const next = [...list]
      const [moved] = next.splice(from, 1)
      if (moved !== undefined) next.splice(to, 0, moved)
      return next
    }
    write(move(options), move(keys))
  }

  const addOption = () => {
    const label = t.options.placeholder({ n: regular.length + 1 })
    // One past the highest whole-number value, so deleting never causes a clash (v0 0.0.50).
    const highest = Math.max(
      0,
      ...options.map((option) => Number(option.value)).filter(Number.isInteger)
    )
    const added = { label, value: String(highest + 1) }
    const at = otherIndex < 0 ? options.length : otherIndex
    write(
      [...options.slice(0, at), added, ...options.slice(at)],
      [...keys.slice(0, at), newKey(), ...keys.slice(at)]
    )
  }
  const toggleOther = () =>
    otherIndex >= 0
      ? write(without(options, otherIndex), without(keys, otherIndex))
      : write(
          [
            ...options,
            { label: t.options.other, value: 'other', isOther: true },
          ],
          [...keys, newKey()]
        )

  const problems = showValueErrors ? optionValueProblems(options) : []
  const rows = options.map((option, index) => ({ option, index }))
  const ordered = [
    ...rows.filter((row) => !row.option.isOther),
    ...rows.filter((row) => row.option.isOther),
  ]

  return (
    <div className="mbc:flex mbc:flex-col mbc:gap-3 mbc:pt-2">
      <Label>{t.options.title}</Label>
      <DndContext
        // A stable id: dnd-kit's own counter differs between server and client.
        id={base}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        modifiers={[restrictToParentElement]}
        accessibility={{
          announcements: announcements(t, (id) => {
            const index = options.findIndex((_, i) => sortId(i) === id)
            return (
              options[index]?.label || t.options.placeholder({ n: index + 1 })
            )
          }),
          screenReaderInstructions: { draggable: t.dnd.instructions },
        }}
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
                invalid={problems[index] !== undefined}
                onLabel={(label) => patch(index, { label })}
                onValue={(value) => patch(index, { value })}
                onTarget={(target) => patch(index, { nextSectionId: target })}
                onRemove={() =>
                  write(without(options, index), without(keys, index))
                }
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
