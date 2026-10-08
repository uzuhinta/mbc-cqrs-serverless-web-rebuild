'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Edit3, GripVertical, MoreVertical, Trash2 } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'

import { FIXED_FIELD_NAMES } from '../core/field-definition'
import { isMasterFieldType } from '../core/field-type-names'
import { dateParts } from '../core/list'
import type { SequenceFormat } from '../core/setting-form'
import type { MasterField } from '../core/types'
import { masterMessages } from '../i18n/master-messages'
import {
  masterSettingMessages,
  type MasterSettingMessages,
} from '../i18n/master-setting-messages'

/** A field with a key that stays the same while fields move. */
export type FieldRow = { key: string; field: MasterField }

export type FieldsTableProps = {
  rows: readonly FieldRow[]
  formats: readonly SequenceFormat[]
  readOnly: boolean
  /** Moves the field at `from` to `to` (indexes into `rows`). */
  onMove(from: number, to: number): void
  onEdit(key: string): void
  onRemove(key: string): void
}

// v0 kept the handle, code and name columns in view while the table scrolls;
// on a phone they are wider than the screen, so only from md up.
const HANDLE = 'mbc:md:sticky mbc:left-0 mbc:z-10 mbc:w-[52px] mbc:min-w-[52px]'
const CODE =
  'mbc:md:sticky mbc:left-[52px] mbc:z-10 mbc:w-[170px] mbc:min-w-[170px]'
const NAME =
  'mbc:md:sticky mbc:left-[222px] mbc:z-10 mbc:w-[170px] mbc:min-w-[170px]'
const ACTIONS = 'mbc:md:sticky mbc:right-0 mbc:z-10 mbc:w-[72px]'
const HEAD =
  'mbc:bg-emphasis mbc:text-emphasis-foreground mbc:whitespace-nowrap mbc:text-center mbc:font-bold'
const BODY = 'mbc:bg-background'

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

function label(field: MasterField) {
  return field.name || field.physicalName
}

function announcements(
  t: MasterSettingMessages['dnd'],
  name: (id: string) => string
): Announcements {
  const of = (id: string | number) => name(String(id))
  return {
    onDragStart: ({ active }) => t.pickedUp({ label: of(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t.movedOver({ label: of(active.id), over: of(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t.dropped({ label: of(active.id), over: of(over.id) })
        : t.droppedNowhere({ label: of(active.id) }),
    onDragCancel: ({ active }) => t.cancelled({ label: of(active.id) }),
  }
}

function SortableRow({
  row,
  readOnly,
  children,
}: {
  row: FieldRow
  readOnly: boolean
  children: ReactNode
}) {
  const t = useMessages(masterSettingMessages)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.key,
    disabled: readOnly,
    attributes: { roleDescription: t.dnd.roleDescription },
  })
  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: isDragging ? 'relative' : undefined,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      <TableCell className={cn(HANDLE, BODY)}>
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:h-8 mbc:w-8 mbc:cursor-grab"
          {...attributes}
          {...listeners}
          disabled={readOnly}
          aria-label={t.fieldsTable.drag({ name: label(row.field) })}
        >
          <GripVertical aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  )
}

function Mark({ on, yes }: { on: boolean; yes: string }) {
  if (!on) return null
  return (
    <>
      <span aria-hidden>◯</span>
      <span className="mbc:sr-only">{yes}</span>
    </>
  )
}

/** v0's fields table: drag to reorder, edit or remove from each row's menu. */
export function FieldsTable({
  rows,
  formats,
  readOnly,
  onMove,
  onEdit,
  onRemove,
}: FieldsTableProps) {
  const messages = useMessages(masterSettingMessages)
  const t = messages.fieldsTable
  const m = useMessages(masterMessages)
  const dndId = useId()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const accessibility = useMemo(
    () => ({
      announcements: announcements(messages.dnd, (id) => {
        const row = rows.find((entry) => entry.key === id)
        return row ? label(row.field) : ''
      }),
      screenReaderInstructions: { draggable: messages.dnd.instructions },
    }),
    [messages.dnd, rows]
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = rows.findIndex((row) => row.key === active.id)
    const to = rows.findIndex((row) => row.key === over.id)
    if (from >= 0 && to >= 0) onMove(from, to)
  }

  const typeName = (field: MasterField) =>
    isMasterFieldType(field.dataType)
      ? m.fieldTypes[field.dataType]
      : field.dataType
  const formatName = (field: MasterField) => {
    if (field.dataType !== 'auto_number') return ''
    const code = field.formatCode || field.dataFormat
    return (
      formats.find((format) => format.code === code)?.name ??
      text(field.formatName)
    )
  }
  const range = (field: MasterField) => {
    if (text(field.length) !== '') return text(field.length)
    if (text(field.min) !== '' && text(field.max) !== '')
      return `${text(field.min)} ~ ${text(field.max)}`
    return ''
  }
  const fallback = (field: MasterField) => {
    if (field.dataType === 'date') {
      const parts = dateParts(field.defaultValue)
      return parts ? t.date(parts) : text(field.defaultValue)
    }
    return text(field.defaultValue)
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={accessibility}
    >
      {/* Its own width: the container scrolls instead of squeezing columns. */}
      <Table aria-label={t.table} className="mbc:w-max mbc:min-w-full">
        <TableHeader>
          <TableRow className="mbc:bg-emphasis mbc:hover:bg-emphasis">
            <TableHead className={cn(HEAD, HANDLE)}>
              <span className="mbc:sr-only">{t.move}</span>
            </TableHead>
            <TableHead className={cn(HEAD, CODE)}>{t.code}</TableHead>
            <TableHead className={cn(HEAD, NAME)}>{t.name}</TableHead>
            <TableHead className={HEAD}>{t.description}</TableHead>
            <TableHead className={HEAD}>{t.dataType}</TableHead>
            <TableHead className={HEAD}>{t.format}</TableHead>
            <TableHead className={HEAD}>
              <div>{t.rangeMin}</div>
              <div>{t.rangeMax}</div>
            </TableHead>
            <TableHead className={HEAD}>{t.defaultValue}</TableHead>
            <TableHead className={HEAD}>{t.required}</TableHead>
            <TableHead className={HEAD}>{t.showOnList}</TableHead>
            <TableHead className={cn(HEAD, ACTIONS)}>{t.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={rows.map((row) => row.key)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row) => {
              const { field } = row
              return (
                <SortableRow key={row.key} row={row} readOnly={readOnly}>
                  <TableCell className={cn(CODE, BODY)}>
                    <div className="mbc:w-[150px] mbc:truncate mbc:text-center">
                      {field.physicalName}
                    </div>
                  </TableCell>
                  <TableCell className={cn(NAME, BODY)}>
                    <div className="mbc:w-[150px] mbc:truncate mbc:text-center">
                      {field.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="mbc:max-w-[150px] mbc:truncate mbc:text-center">
                      {text(field.description)}
                    </div>
                  </TableCell>
                  <TableCell className="mbc:text-center">
                    {typeName(field)}
                  </TableCell>
                  <TableCell className="mbc:whitespace-nowrap mbc:text-center">
                    {formatName(field)}
                  </TableCell>
                  <TableCell className="mbc:whitespace-nowrap mbc:text-center">
                    {range(field)}
                  </TableCell>
                  <TableCell>
                    <div className="mbc:max-w-[200px] mbc:truncate mbc:text-center">
                      {fallback(field)}
                    </div>
                  </TableCell>
                  <TableCell className="mbc:text-center">
                    <Mark on={field.isRequired} yes={t.yes} />
                  </TableCell>
                  <TableCell className="mbc:text-center">
                    <Mark on={field.isShowedOnList} yes={t.yes} />
                  </TableCell>
                  <TableCell className={cn(ACTIONS, BODY, 'mbc:text-center')}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mbc:h-8 mbc:w-8"
                          disabled={readOnly}
                          aria-label={t.actionsFor({ name: label(field) })}
                        >
                          <MoreVertical
                            aria-hidden
                            className="mbc:h-4 mbc:w-4"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(row.key)}>
                          <Edit3
                            aria-hidden
                            className="mbc:text-muted-foreground mbc:mr-2 mbc:h-4 mbc:w-4"
                          />
                          {t.edit}
                        </DropdownMenuItem>
                        {!FIXED_FIELD_NAMES.includes(field.physicalName) && (
                          <DropdownMenuItem
                            className="mbc:text-destructive"
                            onSelect={() => onRemove(row.key)}
                          >
                            <Trash2
                              aria-hidden
                              className="mbc:text-destructive mbc:mr-2 mbc:h-4 mbc:w-4"
                            />
                            {t.remove}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </SortableRow>
              )
            })}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  )
}
