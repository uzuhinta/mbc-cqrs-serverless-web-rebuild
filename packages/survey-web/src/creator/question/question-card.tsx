'use client'

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  Button,
  cn,
  Input,
  Label,
  Separator,
  Switch,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Copy, GripHorizontal, Lock, Trash2 } from 'lucide-react'
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'

import type { SurveyQuestion } from '../../schema/survey-schema'
import { IssueList, useCreatorUi } from '../creator-ui'
import { creatorMessages } from '../i18n/creator-messages'
import { sectionHeaders } from '../state/items'
import { canDelete, canDrag, canDuplicate, canEdit } from '../state/locks'
import { useCreatorSelector, useCreatorStore } from '../state/store'
import { ChoiceCountEditor } from './choice-validation'
import { OptionsEditor } from './options-editor'
import { QuestionMenu } from './question-menu'
import { QuestionPreview } from './question-preview'
import {
  DateEditor,
  LinearScaleEditor,
  RatingEditor,
  TimeEditor,
} from './scale-editors'
import { LongTextEditor, ShortTextEditor } from './text-validation'
import { TypeSelect } from './type-options'

export type DragHandleProps = {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef: (element: HTMLElement | null) => void
}

const HANDLE =
  'mbc:cursor-grab mbc:touch-none mbc:rounded-sm mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring'

function Handle({
  handle: { attributes, listeners, setActivatorNodeRef },
  label,
  className,
}: {
  handle: DragHandleProps
  label: string
  className: string
}) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={label}
      className={cn(HANDLE, className)}
    >
      <GripHorizontal
        aria-hidden
        className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
      />
    </button>
  )
}

function KindEditor({
  question,
  set,
  showBranching,
}: {
  question: SurveyQuestion
  set: (next: SurveyQuestion) => void
  showBranching: boolean
}) {
  const items = useCreatorSelector((state) => state.survey.items)
  const sections = useMemo(
    () => sectionHeaders(items).map(({ id, title }) => ({ id, title })),
    [items]
  )
  switch (question.type) {
    case 'short-text':
      return <ShortTextEditor question={question} onChange={set} />
    case 'long-text':
      return <LongTextEditor question={question} onChange={set} />
    case 'single-choice':
    case 'dropdown':
      return (
        <OptionsEditor
          question={question}
          onChange={set}
          showBranching={showBranching}
          sections={sections}
        />
      )
    case 'multiple-choice':
      return (
        <>
          <OptionsEditor
            question={question}
            onChange={set}
            showBranching={false}
            sections={sections}
          />
          <ChoiceCountEditor question={question} onChange={set} />
        </>
      )
    case 'linear-scale':
      return <LinearScaleEditor question={question} onChange={set} />
    case 'rating':
      return <RatingEditor question={question} onChange={set} />
    case 'date':
      return <DateEditor question={question} />
    case 'time':
      return <TimeEditor question={question} />
  }
}

function QuestionEditor({
  question,
  handle,
  duplicable,
  deletable,
}: {
  question: SurveyQuestion
  handle?: DragHandleProps
  duplicable: boolean
  deletable: boolean
}) {
  const t = useMessages(creatorMessages)
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const requiredId = useId()
  const labelRef = useRef<HTMLInputElement>(null)
  const [showDescription, setShowDescription] = useState(() =>
    Boolean(question.description)
  )
  const [showBranching, setShowBranching] = useState(
    () =>
      'options' in question &&
      question.options.some(
        (option) => 'nextSectionId' in option && option.nextSectionId
      )
  )
  const { id } = question
  const set = (next: SurveyQuestion) =>
    dispatch({ type: 'updateItem', id, update: () => next })

  useEffect(() => {
    if (ui.takeFocus(id)) labelRef.current?.focus()
  }, [ui, id])

  return (
    <div className="mbc:p-6">
      <div className="mbc:flex mbc:justify-center mbc:pb-4">
        {handle && (
          <Handle
            handle={handle}
            label={t.question.dragHandle}
            className="mbc:flex"
          />
        )}
      </div>
      <div className="mbc:flex mbc:items-center mbc:gap-4">
        <Input
          ref={labelRef}
          placeholder={t.question.placeholder}
          aria-label={t.question.placeholder}
          className="mbc:h-12 mbc:grow mbc:rounded-none mbc:border-0 mbc:border-b mbc:px-1 mbc:text-lg mbc:font-semibold mbc:shadow-none mbc:focus-visible:ring-0"
          value={question.label}
          onChange={(event) => set({ ...question, label: event.target.value })}
        />
        <TypeSelect
          value={question.type}
          onChange={(kind) =>
            dispatch({
              type: 'changeType',
              id,
              kind,
              optionLabel: t.options.placeholder({ n: 1 }),
            })
          }
        />
      </div>
      <div className="mbc:mt-4 mbc:flex mbc:flex-col mbc:gap-2">
        {showDescription && (
          <Input
            placeholder={t.question.descriptionPlaceholder}
            aria-label={t.question.descriptionPlaceholder}
            className="mbc:rounded-none mbc:border-0 mbc:px-1 mbc:text-sm mbc:shadow-none mbc:focus-visible:ring-0"
            value={question.description ?? ''}
            onChange={(event) =>
              set({ ...question, description: event.target.value })
            }
          />
        )}
        <KindEditor
          question={question}
          set={set}
          showBranching={showBranching}
        />
      </div>
      <Separator className="mbc:my-4" />
      <div className="mbc:flex mbc:items-center mbc:justify-end mbc:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={t.question.duplicate}
          aria-label={t.question.duplicate}
          disabled={!duplicable}
          onClick={() => dispatch({ type: 'duplicate', id, copySuffix: '' })}
        >
          <Copy aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:hover:bg-destructive/10 mbc:hover:text-destructive"
          title={t.question.delete}
          aria-label={t.question.delete}
          disabled={!deletable}
          onClick={() => dispatch({ type: 'remove', id })}
        >
          <Trash2 aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
        <Separator orientation="vertical" className="mbc:h-6" />
        <div className="mbc:flex mbc:items-center mbc:gap-2">
          <Label
            htmlFor={requiredId}
            className="mbc:cursor-pointer mbc:text-sm mbc:font-medium"
          >
            {t.question.required}
          </Label>
          <Switch
            id={requiredId}
            checked={question.validation?.required === true}
            onCheckedChange={(checked) =>
              set({
                ...question,
                validation: { ...question.validation, required: checked },
              } as SurveyQuestion)
            }
          />
        </div>
        <QuestionMenu
          question={question}
          set={set}
          showDescription={showDescription}
          onShowDescription={setShowDescription}
          showBranching={showBranching}
          onShowBranching={setShowBranching}
        />
      </div>
    </div>
  )
}

function QuestionView({
  question,
  handle,
  onSelect,
}: {
  question: SurveyQuestion
  handle?: DragHandleProps
  onSelect: (fromKeyboard: boolean) => void
}) {
  const t = useMessages(creatorMessages)
  return (
    <div className="mbc:group mbc:relative mbc:cursor-pointer mbc:p-6">
      {handle && (
        <Handle
          handle={handle}
          label={t.question.dragHandle}
          className="mbc:absolute mbc:left-1/2 mbc:top-3 mbc:flex mbc:-translate-x-1/2 mbc:justify-center mbc:opacity-0 mbc:transition-opacity mbc:group-hover:opacity-100 mbc:focus-visible:opacity-100"
        />
      )}
      <div className="mbc:flex mbc:flex-col mbc:gap-2">
        <p className="mbc:flex mbc:items-center mbc:gap-2 mbc:font-semibold">
          <button
            type="button"
            className="mbc:rounded-sm mbc:text-left mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
            onClick={(event) => onSelect(event.detail === 0)}
          >
            {question.label || t.question.newQuestion}
          </button>
          {question.locked && (
            <Lock
              role="img"
              aria-label={t.question.locked}
              className="mbc:text-muted-foreground mbc:h-4 mbc:w-4"
            />
          )}
        </p>
        {question.description && (
          <p className="mbc:text-muted-foreground mbc:text-sm">
            {question.description}
          </p>
        )}
        <div className="mbc:pt-2">
          <QuestionPreview question={question} />
        </div>
      </div>
    </div>
  )
}

function QuestionCardImpl({
  id,
  handle,
}: {
  id: string
  handle?: DragHandleProps
}) {
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const item = useCreatorSelector((state) =>
    state.survey.items.find((entry) => entry.id === id)
  )
  const selected = useCreatorSelector((state) => state.selectedId === id)
  const flags = useCreatorSelector((state) => {
    const items = state.survey.items
    const index = items.findIndex((entry) => entry.id === id)
    return [canEdit, canDuplicate, canDelete, canDrag]
      .map((can) => (can(items, index) ? '1' : '0'))
      .join('')
  })
  if (!item || item.type === 'section-header') return null
  const [editable, duplicable, deletable, draggable] = [0, 1, 2, 3].map(
    (index) => flags[index] === '1'
  ) as [boolean, boolean, boolean, boolean]
  const editing = selected && editable
  const visibleHandle = draggable ? handle : undefined

  const select = (fromKeyboard = false) => {
    if (fromKeyboard) ui.requestFocus(id)
    dispatch({ type: 'select', id })
  }
  // Portalled menus bubble React events here; only clicks inside the card select it.
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selected && event.currentTarget.contains(event.target as Node))
      select()
  }

  return (
    <div
      ref={ui.cardRef(id)}
      onClick={onClick}
      className={cn(
        'mbc:rounded-lg mbc:border mbc:transition-all',
        selected
          ? 'mbc:border-primary mbc:bg-card mbc:shadow-lg'
          : 'mbc:hover:bg-muted/50 mbc:border-transparent mbc:bg-white'
      )}
    >
      {editing ? (
        <QuestionEditor
          question={item}
          handle={visibleHandle}
          duplicable={duplicable}
          deletable={deletable}
        />
      ) : (
        <QuestionView
          question={item}
          handle={visibleHandle}
          onSelect={(fromKeyboard) => select(fromKeyboard)}
        />
      )}
      <IssueList id={id} />
    </div>
  )
}

export const QuestionCard = memo(QuestionCardImpl)
