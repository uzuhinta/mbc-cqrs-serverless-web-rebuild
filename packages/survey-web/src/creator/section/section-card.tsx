'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Combine,
  Copy,
  Lock,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import {
  memo,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from 'react'

import { IssueList, useCreatorUi, useItemIssues } from '../creator-ui'
import { creatorMessages } from '../i18n/creator-messages'
import { isSection, sectionEndOf } from '../state/items'
import { canDelete, canMerge } from '../state/locks'
import { useCreatorSelector, useCreatorStore } from '../state/store'

const UNDERLINE =
  'mbc:h-auto mbc:rounded-none mbc:border-0 mbc:border-b mbc:p-1 mbc:shadow-none mbc:focus-visible:ring-0'

function SectionMenu({ id }: { id: string }) {
  const t = useMessages(creatorMessages)
  const store = useCreatorStore()
  const { dispatch } = store
  const ui = useCreatorUi()
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Set when a menu action moves focus itself; Radix must not then return focus to the trigger.
  const focusHandled = useRef(false)
  const focusSelection = () => {
    focusHandled.current = true
    ui.focusCard(store.getState().selectedId)
  }
  const flags = useCreatorSelector((state) => {
    const items = state.survey.items
    const index = items.findIndex((item) => item.id === id)
    const holdsLocked = items
      .slice(index + 1, sectionEndOf(items, index))
      .some((item) => item.locked === true)
    return `${canMerge(items, index) ? 1 : 0}${canDelete(items, index) ? 1 : 0}${holdsLocked ? 1 : 0}`
  })
  const [mergeable, deletable, holdsLocked] = [0, 1, 2].map(
    (index) => flags[index] === '1'
  ) as [boolean, boolean, boolean]

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t.section.menu}
            // Opening the menu must not select the card: that swaps the card's
            // mode and remounts the menu, closing it again.
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical aria-hidden className="mbc:h-4 mbc:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (focusHandled.current) event.preventDefault()
            focusHandled.current = false
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              focusHandled.current = true
              ui.openReorder(id)
            }}
          >
            <ArrowUpDown aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
            <span>{t.section.move}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              dispatch({
                type: 'duplicate',
                id,
                copySuffix: t.shell.copySuffix,
              })
              focusSelection()
            }}
          >
            <Copy aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
            <span>{t.section.duplicate}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!mergeable}
            onSelect={() => {
              const index = store
                .getState()
                .survey.items.findIndex((item) => item.id === id)
              dispatch({ type: 'mergeSection', id })
              // Keep a place: the item that preceded the merged header.
              const previous = store.getState().survey.items[index - 1]?.id
              if (previous) dispatch({ type: 'select', id: previous })
              focusSelection()
            }}
          >
            <Combine aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
            <span>{t.section.merge}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="mbc:text-destructive"
              disabled={!deletable}
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
              <span>
                {t.section.delete}
                {holdsLocked && (
                  <span className="mbc:ml-1 mbc:text-xs">
                    {t.section.containsLocked}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent
        // Its trigger lived in the closed menu: focus the section (or, after a delete, its neighbour).
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          ui.focusCard(store.getState().selectedId ?? id)
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t.section.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.section.deleteDescription}
            <br />
            <br />
            {t.section.deleteHint}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.section.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const index = store
                .getState()
                .survey.items.findIndex((item) => item.id === id)
              dispatch({ type: 'remove', id })
              // Keyboard users keep a place: the item before the deleted section.
              const items = store.getState().survey.items
              dispatch({
                type: 'select',
                id: items[index - 1]?.id ?? items[index]?.id ?? null,
              })
            }}
          >
            {t.section.confirmDelete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SectionCardImpl({ id }: { id: string }) {
  const t = useMessages(creatorMessages)
  const { dispatch } = useCreatorStore()
  const ui = useCreatorUi()
  const issuesId = useId()
  const issues = useItemIssues(id)
  const describedBy =
    issues.errors.length + issues.warnings.length > 0 ? issuesId : undefined
  const titleRef = useRef<HTMLInputElement>(null)
  const section = useCreatorSelector((state) =>
    state.survey.items.find((item) => item.id === id)
  )
  const selected = useCreatorSelector((state) => state.selectedId === id)
  const position = useCreatorSelector((state) => {
    const headers = state.survey.items.filter(isSection)
    return `${headers.findIndex((header) => header.id === id) + 1}/${headers.length}`
  })
  const active = selected && isSection(section) && section.locked !== true

  useEffect(() => {
    if (active && ui.takeFocus(id)) titleRef.current?.focus()
  }, [active, ui, id])

  if (!isSection(section)) return null
  const [n = 0, total = 0] = position.split('/').map(Number)
  const select = (fromKeyboard = false) => {
    if (fromKeyboard) ui.requestFocus(id)
    dispatch({ type: 'select', id })
  }
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selected && event.currentTarget.contains(event.target as Node))
      select()
  }
  const update = (change: { title?: string; description?: string }) =>
    dispatch({
      type: 'updateItem',
      id,
      update: (item) => ({ ...item, ...change }) as typeof item,
    })

  return (
    <div
      ref={ui.cardRef(id)}
      className="mbc:relative mbc:pt-5"
      onClick={onClick}
    >
      <div className="mbc:bg-primary mbc:text-primary-foreground mbc:absolute mbc:-top-1 mbc:left-0 mbc:z-10 mbc:rounded-md mbc:rounded-b-none mbc:px-3 mbc:py-1 mbc:text-xs mbc:font-semibold">
        {t.section.tab({ n, total })}
      </div>
      {active ? (
        <Card className="mbc:border-l-primary mbc:rounded-tl-none mbc:border-l-4 mbc:shadow-lg">
          <CardHeader className="mbc:flex mbc:flex-row mbc:items-start mbc:justify-between mbc:gap-4 mbc:p-6">
            <div className="mbc:flex mbc:w-full mbc:flex-col mbc:gap-4">
              <Input
                ref={titleRef}
                data-focus-target=""
                aria-describedby={describedBy}
                aria-invalid={issues.errors.length > 0 || undefined}
                placeholder={t.section.untitled}
                aria-label={t.section.untitled}
                className={`${UNDERLINE} mbc:text-xl mbc:font-semibold`}
                value={section.title}
                onChange={(event) => update({ title: event.target.value })}
              />
              <Input
                placeholder={t.section.descriptionPlaceholder}
                aria-label={t.section.descriptionPlaceholder}
                className={`${UNDERLINE} mbc:text-sm`}
                value={section.description ?? ''}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
              />
            </div>
            <div className="mbc:flex mbc:items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.section.collapse}
                onClick={(event) => {
                  event.stopPropagation()
                  dispatch({ type: 'select', id: null })
                  ui.focusCard(id)
                }}
              >
                <ChevronUp
                  aria-hidden
                  className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
                />
              </Button>
              <SectionMenu id={id} />
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div
          data-section-view=""
          className="mbc:bg-card mbc:cursor-pointer mbc:rounded-lg mbc:rounded-tl-none mbc:border mbc:border-border mbc:p-6 mbc:shadow-sm"
        >
          <div className="mbc:flex mbc:items-start mbc:justify-between">
            <div className="mbc:flex mbc:flex-col mbc:gap-1">
              <p className="mbc:flex mbc:items-center mbc:gap-2 mbc:font-semibold">
                <button
                  type="button"
                  data-focus-target=""
                  aria-describedby={describedBy}
                  className="mbc:rounded-sm mbc:text-left mbc:outline-none mbc:focus-visible:ring-2 mbc:focus-visible:ring-ring"
                  onClick={(event) => select(event.detail === 0)}
                >
                  {section.title || t.section.untitled}
                </button>
                {section.locked && (
                  <Lock
                    role="img"
                    aria-label={t.section.locked}
                    className="mbc:text-muted-foreground mbc:h-4 mbc:w-4"
                  />
                )}
              </p>
              {section.description && (
                <p className="mbc:text-muted-foreground mbc:text-sm">
                  {section.description}
                </p>
              )}
            </div>
            <div className="mbc:flex mbc:items-center">
              {!section.locked && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t.section.expand}
                  onClick={(event) => {
                    event.stopPropagation()
                    select(event.detail === 0)
                  }}
                >
                  <ChevronDown
                    aria-hidden
                    className="mbc:text-muted-foreground mbc:h-5 mbc:w-5"
                  />
                </Button>
              )}
              <SectionMenu id={id} />
            </div>
          </div>
        </div>
      )}
      <IssueList
        id={id}
        domId={issuesId}
        className="mbc:mt-2 mbc:flex mbc:flex-col mbc:gap-1"
      />
    </div>
  )
}

export const SectionCard = memo(SectionCardImpl)
