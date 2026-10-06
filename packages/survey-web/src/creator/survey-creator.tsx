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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Alert,
  AlertDescription,
  cn,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  forwardRef,
  Fragment,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type MouseEvent,
  type RefAttributes,
  type RefObject,
} from 'react'

import { SurveyForm } from '../form/survey-form'
import type { Survey, SurveyInput } from '../schema/survey-schema'
import {
  createCreatorUi,
  createValueStore,
  CreatorUiProvider,
  IssueList,
  useCreatorUi,
  useItemIssues,
  type CreatorUi,
  type IssueState,
} from './creator-ui'
import { announcements } from './dnd-announcements'
import { FloatingActionBar } from './floating-action-bar'
import { creatorMessages } from './i18n/creator-messages'
import { SectionAction } from './section/section-action'
import { SectionCard } from './section/section-card'
import { SectionReorderDialog } from './section/section-reorder-dialog'
import { SortableQuestion } from './sortable-question'
import {
  createQuestion,
  createSection,
  initialCreatorState,
} from './state/defaults'
import {
  isInLockedSection,
  isSection,
  questionInsertIndex,
} from './state/items'
import {
  createCreatorStore,
  CreatorStoreProvider,
  useCreatorSelector,
  useCreatorStore,
  type CreatorStore,
} from './state/store'
import { TITLE_ID } from './state/types'
import { validateDraft, type DraftReport } from './state/validate'

export type SurveyCreatorHandle = {
  /** Validates; when invalid, shows the card errors, moves to the first and resolves `false`. Otherwise awaits `onSubmit`. */
  submit(): Promise<boolean>
  /** Loads `next` (or a new survey) without calling `onChange`. */
  reset(next?: SurveyInput): void
  getValue(): Survey
}

export type SurveyCreatorProps = {
  /** Read on mount; load another survey with `ref.reset(next)` or a `key`. */
  defaultValue?: SurveyInput
  /** Once per user change (not on mount or `reset`). */
  onChange?: (
    survey: Survey,
    state: { isValid: boolean; isDirty: boolean }
  ) => void
  onSubmit?: (survey: Survey) => void | Promise<void>
  disabled?: boolean
  className?: string
}

type Row = { id: string; section: boolean }

/** The list's shape as a string, so typing in a card does not re-render the list. */
function useRows(): Row[] {
  const key = useCreatorSelector((state) =>
    state.survey.items
      .map((item) => `${isSection(item) ? 's' : 'q'}${item.id}`)
      .join('\n')
  )
  return useMemo(
    () =>
      key
        ? key
            .split('\n')
            .map((part) => ({ section: part[0] === 's', id: part.slice(1) }))
        : [],
    [key]
  )
}

function TitleCard() {
  const t = useMessages(creatorMessages)
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const issuesId = useId()
  const issues = useItemIssues(TITLE_ID)
  const describedBy =
    issues.errors.length + issues.warnings.length > 0 ? issuesId : undefined
  const titleRef = useRef<HTMLInputElement>(null)
  const selected = useCreatorSelector((state) => state.selectedId === TITLE_ID)
  const title = useCreatorSelector((state) => state.survey.title)
  const description = useCreatorSelector(
    (state) => state.survey.description ?? ''
  )

  useEffect(() => {
    if (selected && ui.takeFocus(TITLE_ID)) titleRef.current?.focus()
  }, [selected, ui])

  const select = (fromKeyboard: boolean) => {
    if (fromKeyboard) ui.requestFocus(TITLE_ID)
    dispatch({ type: 'select', id: TITLE_ID })
  }
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selected && event.currentTarget.contains(event.target as Node))
      select(false)
  }

  return (
    <div
      ref={ui.cardRef(TITLE_ID)}
      onClick={onClick}
      className={cn(
        'mbc:cursor-pointer mbc:rounded-lg mbc:border-l-8 mbc:p-6',
        selected
          ? 'mbc:border-primary mbc:bg-card mbc:shadow-lg'
          : 'mbc:bg-muted/30 mbc:border-gray-300'
      )}
    >
      {selected ? (
        <div className="mbc:flex mbc:flex-col mbc:gap-2">
          <Input
            ref={titleRef}
            data-focus-target=""
            aria-describedby={describedBy}
            aria-invalid={issues.errors.length > 0 || undefined}
            value={title}
            placeholder={t.shell.surveyTitlePlaceholder}
            aria-label={t.shell.surveyTitlePlaceholder}
            onChange={(event) =>
              dispatch({ type: 'updateSurvey', title: event.target.value })
            }
            className="mbc:h-12 mbc:border-0 mbc:px-0 mbc:text-3xl mbc:font-bold mbc:shadow-none"
          />
          <Input
            value={description}
            placeholder={t.shell.surveyDescriptionPlaceholder}
            aria-label={t.shell.surveyDescriptionPlaceholder}
            onChange={(event) =>
              dispatch({
                type: 'updateSurvey',
                description: event.target.value,
              })
            }
            className="mbc:border-0 mbc:px-0 mbc:shadow-none"
          />
        </div>
      ) : (
        <div>
          <h2 className="mbc:text-3xl mbc:font-bold">
            <button
              type="button"
              data-focus-target=""
              aria-describedby={describedBy}
              className="mbc:rounded-sm mbc:text-left mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
              onClick={(event) => select(event.detail === 0)}
            >
              {title || t.shell.surveyTitlePlaceholder}
            </button>
          </h2>
          <p className="mbc:text-muted-foreground mbc:mt-1">
            {description || t.shell.surveyDescriptionPlaceholder}
          </p>
        </div>
      )}
      <IssueList
        id={TITLE_ID}
        domId={issuesId}
        className="mbc:mt-2 mbc:flex mbc:flex-col mbc:gap-1"
      />
    </div>
  )
}

function ItemList() {
  const t = useMessages(creatorMessages)
  const store = useCreatorStore()
  const rows = useRows()
  const dndId = useId()
  const restore = useRef<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const accessibility = useMemo(
    () => ({
      announcements: announcements(t, (id) => {
        const item = store
          .getState()
          .survey.items.find((entry) => entry.id === id)
        if (!item) return ''
        return isSection(item)
          ? item.title || t.section.untitled
          : item.label || t.question.newQuestion
      }),
      screenReaderInstructions: { draggable: t.dnd.instructions },
    }),
    [t, store]
  )
  const lastSection = rows.filter((row) => row.section).at(-1)?.id
  // Each row's section, for the "n セクション後" rows.
  const owners: (string | null)[] = []
  let owner: string | null = null
  for (const row of rows) {
    if (row.section) owner = row.id
    owners.push(owner)
  }
  const questionIds = rows.filter((row) => !row.section).map((row) => row.id)

  // v0: the selection is set aside while dragging and restored afterwards.
  const onDragStart = () => {
    restore.current = store.getState().selectedId
    store.dispatch({ type: 'select', id: null })
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      store.dispatch({
        type: 'move',
        id: String(active.id),
        overId: String(over.id),
      })
    }
    store.dispatch({ type: 'select', id: restore.current })
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() =>
        store.dispatch({ type: 'select', id: restore.current })
      }
      accessibility={accessibility}
    >
      <SortableContext
        items={questionIds}
        strategy={verticalListSortingStrategy}
      >
        {rows.map((row, index) => {
          const section = owners[index] ?? null
          const endsSection =
            index === rows.length - 1 || rows[index + 1]?.section === true
          const actionFor =
            endsSection && section !== null && section !== lastSection
              ? section
              : null
          return (
            <Fragment key={row.id}>
              {row.section ? (
                <SectionCard id={row.id} />
              ) : (
                <SortableQuestion id={row.id} />
              )}
              {actionFor && <SectionAction sectionId={actionFor} />}
            </Fragment>
          )
        })}
      </SortableContext>
    </DndContext>
  )
}

function Toolbar({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const t = useMessages(creatorMessages)
  const store = useCreatorStore()
  const ui = useCreatorUi()
  const selectedId = useCreatorSelector((state) => state.selectedId)
  const items = useCreatorSelector((state) => state.survey.items)
  const index = items.findIndex((item) => item.id === selectedId)
  const canAddQuestion = questionInsertIndex(items, index) !== null
  const afterLocked = index >= 0 && isInLockedSection(items, index)
  const [top, setTop] = useState<number | null>(null)

  useEffect(() => {
    const measure = () => {
      const card = selectedId ? ui.getCard(selectedId) : undefined
      const container = containerRef.current
      setTop(
        card && container
          ? card.getBoundingClientRect().top -
              container.getBoundingClientRect().top
          : null
      )
    }
    // Layout is outside React: measure after every commit that can move the card.
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [selectedId, items, ui, containerRef])

  if (top === null) return null
  return (
    <FloatingActionBar
      top={top}
      canAddQuestion={canAddQuestion}
      afterLocked={afterLocked}
      onAddQuestion={() => {
        const question = createQuestion()
        ui.requestFocus(question.id)
        store.dispatch({ type: 'addQuestion', question })
      }}
      onAddSection={() => {
        const n = store.getState().survey.items.filter(isSection).length + 1
        const section = createSection(t.shell.newSection({ n }))
        ui.requestFocus(section.id)
        store.dispatch({ type: 'addSection', section })
      }}
    />
  )
}

function PreviewPane({ survey }: { survey: Survey | null }) {
  const t = useMessages(creatorMessages)
  const [submissions, setSubmissions] = useState(0)
  if (!survey) return null
  return (
    <div className="mbc:bg-card mbc:rounded-lg mbc:border mbc:border-border mbc:p-4 mbc:md:p-8">
      {submissions > 0 && (
        <Alert className="mbc:mb-4">
          <AlertDescription>{t.shell.previewSubmitted}</AlertDescription>
        </Alert>
      )}
      <SurveyForm
        key={submissions}
        schema={survey}
        onSubmit={() => setSubmissions((n) => n + 1)}
      />
    </div>
  )
}

function JsonPane() {
  const t = useMessages(creatorMessages)
  const survey = useCreatorSelector((state) => state.survey)
  return (
    <div className="mbc:sticky mbc:top-4">
      <h3 className="mbc:mb-2 mbc:text-lg mbc:font-semibold">
        {t.shell.jsonTitle}
      </h3>
      <pre className="mbc:bg-secondary mbc:text-secondary-foreground mbc:max-h-[80vh] mbc:overflow-auto mbc:rounded-md mbc:p-4 mbc:text-sm">
        {JSON.stringify(survey, null, 2)}
      </pre>
    </div>
  )
}

/** Selects the first card with an error and focuses its first control once it has rendered. */
function revealFirstIssue(
  store: CreatorStore,
  ui: CreatorUi,
  report: DraftReport
) {
  const order = [
    TITLE_ID,
    ...store.getState().survey.items.map((item) => item.id),
  ]
  const id = order.find((candidate) => report.errors[candidate]?.length)
  if (!id) return
  store.dispatch({ type: 'select', id })
  // The card's main field, which is described by its errors.
  ui.focusCard(id)
}

export const SurveyCreator: ForwardRefExoticComponent<
  SurveyCreatorProps & RefAttributes<SurveyCreatorHandle>
> = forwardRef<SurveyCreatorHandle, SurveyCreatorProps>(function SurveyCreator(
  { defaultValue, onChange, onSubmit, disabled = false, className },
  ref
) {
  const t = useMessages(creatorMessages)
  const [store] = useState(() =>
    createCreatorStore(initialCreatorState(defaultValue, t.shell))
  )
  const [issues] = useState(() =>
    createValueStore<IssueState>({
      report: validateDraft(store.getState().survey),
      showErrors: false,
    })
  )
  const [reorder, setReorder] = useState<{
    open: boolean
    from: string | null
  }>({
    open: false,
    from: null,
  })
  const [ui] = useState(() =>
    createCreatorUi(issues, (from) => setReorder({ open: true, from }))
  )
  const [preview, setPreview] = useState<Survey | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onChange, onSubmit })

  useEffect(() => {
    callbacks.current = { onChange, onSubmit }
  })

  useEffect(() => {
    let previous = store.getState()
    return store.subscribe(() => {
      const next = store.getState()
      if (next.survey !== previous.survey) {
        const report = validateDraft(next.survey)
        issues.set({ report, showErrors: issues.get().showErrors })
        // `reset` clears `dirty`; only user changes reach the host.
        if (next.dirty)
          callbacks.current.onChange?.(next.survey, {
            isValid: report.valid,
            isDirty: true,
          })
      }
      previous = next
    })
  }, [store, issues])

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        const report = validateDraft(store.getState().survey)
        issues.set({ report, showErrors: true })
        if (!report.valid || !report.data) {
          revealFirstIssue(store, ui, report)
          return false
        }
        await callbacks.current.onSubmit?.(report.data)
        return true
      },
      reset(next) {
        const state = initialCreatorState(next, t.shell)
        store.dispatch({
          type: 'reset',
          survey: state.survey,
          selectedId: state.selectedId,
        })
        issues.set({ report: validateDraft(state.survey), showErrors: false })
      },
      getValue: () => store.getState().survey,
    }),
    [store, issues, ui, t]
  )

  return (
    <CreatorStoreProvider store={store}>
      <CreatorUiProvider value={ui}>
        <div
          data-mbc=""
          className={cn(
            disabled && 'mbc:pointer-events-none mbc:opacity-50',
            className
          )}
        >
          <fieldset
            disabled={disabled}
            className="mbc:m-0 mbc:min-w-0 mbc:border-0 mbc:p-0"
          >
            <Tabs
              defaultValue="creator"
              className="mbc:w-full"
              onValueChange={(tab) => {
                if (tab === 'preview') setPreview(store.getState().survey)
              }}
            >
              <TabsList className="mbc:grid mbc:w-full mbc:grid-cols-3">
                <TabsTrigger value="creator">{t.shell.creatorTab}</TabsTrigger>
                <TabsTrigger value="preview">{t.shell.previewTab}</TabsTrigger>
                <TabsTrigger value="json">{t.shell.jsonTab}</TabsTrigger>
              </TabsList>
              <TabsContent value="creator" className="mbc:pt-6">
                <div
                  ref={containerRef}
                  className="mbc:relative mbc:mx-auto mbc:flex mbc:w-full mbc:max-w-4xl mbc:gap-x-12"
                >
                  <div className="mbc:w-full">
                    <div className="mbc:flex mbc:flex-col mbc:gap-4">
                      <TitleCard />
                      <ItemList />
                    </div>
                  </div>
                  <Toolbar containerRef={containerRef} />
                </div>
              </TabsContent>
              <TabsContent value="preview" className="mbc:pt-6">
                <PreviewPane survey={preview} />
              </TabsContent>
              <TabsContent value="json" className="mbc:pt-6">
                <JsonPane />
              </TabsContent>
            </Tabs>
          </fieldset>
          <SectionReorderDialog
            open={reorder.open}
            onOpenChange={(open) =>
              setReorder((current) => ({ ...current, open }))
            }
            returnFocusTo={reorder.from}
          />
        </div>
      </CreatorUiProvider>
    </CreatorStoreProvider>
  )
})
