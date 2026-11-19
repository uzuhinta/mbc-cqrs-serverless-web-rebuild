'use client'

import { arrayMove } from '@dnd-kit/sortable'
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Skeleton,
  Switch,
  Textarea,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import {
  settingToForm,
  toSettingPayload,
  validateSettingForm,
  type MasterSettingCreateBody,
  type MasterSettingUpdateBody,
  type SequenceFormat,
  type SettingFormValues,
  type SettingOption,
} from '../core/setting-form'
import { parseSettingJson, settingJson } from '../core/setting-json'
import { isSameTenant } from '../core/tenant'
import type { MasterField, MasterSetting } from '../core/types'
import { ConfirmButton } from '../form/confirm-button'
import { FailureAlert, failureOf, type Failure } from '../form/failure'
import { useEditFocus } from '../form/edit-focus'
import { RequiredMark } from '../form/required-mark'
import {
  formatFieldDefinitionError,
  formatMasterError,
} from '../i18n/format-error'
import { masterMessages } from '../i18n/master-messages'
import { masterSettingMessages } from '../i18n/master-setting-messages'
import { JsonDialog } from '../json/json-dialog'
import type { JsonTextEditor } from '../json/json-text'
import { ListError } from '../list/list-error'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import { FieldDialog } from './field-dialog'
import { FieldsTable, type FieldRow } from './fields-table'

export type MasterSettingEditorProps = {
  mode: 'create' | 'edit'
  /** The stored setting (edit). A new `id` or `version` restarts the editor. */
  setting?: MasterSetting
  routing: MasterRouting
  /** The current tenant: another tenant's setting opens read-only. */
  tenantCode?: string
  /** The setting is loading (edit). */
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRetry`. */
  error?: unknown
  onRetry?(): void
  /** Create: resolves `false` when the code is already used. */
  checkCodeUnique?(code: string): Promise<boolean>
  /**
   * Saves the setting; reject to show the failure. After an update the
   * editor shows the saved values; after a create, navigating is the host's.
   */
  onSave(body: MasterSettingCreateBody | MasterSettingUpdateBody): Promise<void>
  /** Deletes the setting after the user confirms; reject to show the failure. */
  onDelete?(): Promise<void>
  /** Shows the copy links (v0 showed them to its system tenant only). */
  canCopy?: boolean
  /** Extra on/off flags stored in `attributes`. */
  settingOptions?: readonly SettingOption[]
  /** Sequences an auto-numbered code field can use. */
  formats?: readonly SequenceFormat[]
  /** The JSON dialog's editor instead of a text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
}

const SECTION =
  'mbc:bg-emphasis mbc:text-emphasis-foreground mbc:flex mbc:items-end mbc:justify-start mbc:p-4 mbc:text-xl mbc:font-bold'
const NO_OPTIONS: readonly SettingOption[] = []
const NO_FORMATS: readonly SequenceFormat[] = []

type Snapshot = { values: SettingFormValues; rows: FieldRow[] }

/** v0's settings editor: view, edit, save, delete, fields and the JSON dialog. */
export function MasterSettingEditor(props: MasterSettingEditorProps) {
  const t = useMessages(masterSettingMessages).editor
  const m = useMessages(masterMessages)
  const { mode, setting, loading = false, error, onRetry } = props
  if (mode === 'edit' && (!setting || loading)) {
    if (!loading && error !== undefined)
      return (
        <div data-mbc="" className="mbc:p-4">
          <ListError message={t.loadFailed} retry={t.retry} onRetry={onRetry} />
        </div>
      )
    return (
      <div data-mbc="" role="status" className="mbc:grid mbc:gap-4 mbc:p-4">
        <span className="mbc:sr-only">{m.table.loading}</span>
        <Skeleton className="mbc:h-10 mbc:w-1/3" />
        <Skeleton className="mbc:h-32 mbc:w-full" />
        <Skeleton className="mbc:h-48 mbc:w-full" />
      </div>
    )
  }
  return (
    <EditorBody
      key={setting ? `${setting.id}:${setting.version}` : 'new'}
      {...props}
    />
  )
}

function EditorBody({
  mode,
  setting,
  routing,
  tenantCode,
  checkCodeUnique,
  onSave,
  onDelete,
  canCopy = false,
  settingOptions = NO_OPTIONS,
  formats = NO_FORMATS,
  jsonEditor,
}: MasterSettingEditorProps) {
  const messages = useMessages(masterSettingMessages)
  const t = messages.editor
  const m = useMessages(masterMessages)
  const optionKeys = useMemo(
    () => settingOptions.map((option) => option.key),
    [settingOptions]
  )
  const owned =
    mode === 'create' ||
    tenantCode === undefined ||
    isSameTenant(setting?.tenantCode, tenantCode)

  const [baseline, setBaseline] = useState<Snapshot>(() => {
    const form = settingToForm(setting, optionKeys, m.defaults)
    const rows = form.fields.map((field, index) => ({
      key: `f${index}`,
      field,
    }))
    return { values: form.values, rows }
  })
  // Keys for rows added later (event handlers only).
  const nextKey = useRef(baseline.rows.length)
  const toRows = (fields: MasterField[]) =>
    fields.map((field) => ({ key: `f${nextKey.current++}`, field }))
  const [values, setValues] = useState(baseline.values)
  const [rows, setRows] = useState(baseline.rows)
  const [editing, setEditing] = useState(mode === 'create')
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})
  const [attempts, setAttempts] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  // The button that opened the field dialog, which gets the focus back.
  const opener = useRef<HTMLElement | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; key?: string }>({
    open: false,
  })
  const formRef = useRef<HTMLFormElement>(null)
  const editFocus = useEditFocus(editing, formRef)
  const busy = useRef(false)
  const readOnly = !editing || !owned

  useEffect(() => {
    if (attempts > 0)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
  }, [attempts])

  const fields = rows.map((row) => row.field)
  const changed =
    JSON.stringify({ values, fields }) !==
    JSON.stringify({
      values: baseline.values,
      fields: baseline.rows.map((row) => row.field),
    })

  const fail = (reason: unknown, title: string) =>
    setFailure(failureOf(reason, title, t))

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy.current || readOnly) return
    busy.current = true
    setSaving(true)
    setFailure(null)
    const failedTitle = mode === 'create' ? t.createFailed : t.updateFailed
    try {
      const found = validateSettingForm(values, {
        mode: mode === 'create' ? 'create' : 'update',
      })
      const next: { code?: string; name?: string } = {
        code: found.code && formatMasterError(found.code, m.validation),
        name: found.name && formatMasterError(found.name, m.validation),
      }
      if (mode === 'create' && !next.code && !next.name && checkCodeUnique) {
        try {
          if (!(await checkCodeUnique(values.code.trim())))
            next.code = t.codeTaken
        } catch (reason) {
          fail(reason, failedTitle)
          return
        }
      }
      setErrors(next)
      if (next.code || next.name) {
        setAttempts((count) => count + 1)
        return
      }
      if (mode === 'create')
        await onSave(toSettingPayload(values, fields, { mode: 'create' }))
      else if (setting) {
        await onSave(
          toSettingPayload(values, fields, {
            mode: 'update',
            previous: setting,
          })
        )
        setBaseline({ values, rows })
        setEditing(false)
      }
    } catch (reason) {
      fail(reason, failedTitle)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  const cancel = () => {
    setValues(baseline.values)
    setRows(baseline.rows)
    setErrors({})
    setFailure(null)
    setEditing(false)
  }

  const remove = async () => {
    if (!onDelete) return
    setFailure(null)
    setDeleting(true)
    try {
      await onDelete()
    } catch (reason) {
      fail(reason, t.deleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  const applyJson = (text: string) => {
    const parsed = parseSettingJson(text)
    if (!parsed.ok) {
      const { error } = parsed
      if (error.key === 'invalidField')
        return (
          messages.json.field(error.params) +
          formatFieldDefinitionError(error.error, m.fieldDefinition)
        )
      return messages.json[error.key]
    }
    const form = settingToForm(parsed.setting, optionKeys, m.defaults)
    // The code of a stored setting cannot change.
    setValues({
      ...form.values,
      code: mode === 'edit' ? values.code : form.values.code,
    })
    setRows(toRows(form.fields))
    return undefined
  }

  const submitField = (field: MasterField) => {
    if (dialog.key === undefined)
      setRows((current) => [...current, ...toRows([field])])
    else
      setRows((current) =>
        current.map((row) => (row.key === dialog.key ? { ...row, field } : row))
      )
  }

  const editingRow = rows.find((row) => row.key === dialog.key)
  const setValue = <K extends keyof SettingFormValues>(
    key: K,
    value: SettingFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  return (
    <div data-mbc="" className="mbc:relative mbc:w-full">
      <form
        ref={formRef}
        noValidate
        onSubmit={save}
        className="mbc:bg-background"
      >
        <div
          role="group"
          aria-label={t.actions}
          className="mbc:bg-muted/50 mbc:p-4"
        >
          {owned ? (
            <div className="mbc:flex mbc:justify-between mbc:gap-4">
              {mode === 'edit' && !editing ? (
                <div className="mbc:flex mbc:flex-wrap mbc:gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      editFocus.start()
                      setEditing(true)
                    }}
                  >
                    {t.edit}
                  </Button>
                  {canCopy && setting && (
                    <>
                      <Button asChild>
                        <MasterLink
                          routing={routing}
                          to={{ screen: 'copyRequest', settingId: setting.id }}
                        >
                          {t.copy}
                        </MasterLink>
                      </Button>
                      <Button asChild>
                        <MasterLink
                          routing={routing}
                          to={{ screen: 'copyTasks', settingId: setting.id }}
                        >
                          {t.copyResults}
                        </MasterLink>
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="mbc:flex mbc:flex-wrap mbc:gap-4">
                  <Button
                    type="submit"
                    loading={saving}
                    disabled={mode === 'edit' && !changed}
                  >
                    {t.save}
                  </Button>
                  {mode === 'edit' && (
                    <Button type="button" variant="secondary" onClick={cancel}>
                      {t.cancel}
                    </Button>
                  )}
                  <JsonDialog
                    text={() => settingJson(values, fields)}
                    fileName={messages.json.fileName}
                    onApply={applyJson}
                    disabled={saving}
                    jsonEditor={jsonEditor}
                  />
                </div>
              )}
              {mode === 'edit' && onDelete && (
                <ConfirmButton
                  label={t.delete}
                  title={t.deleteTitle}
                  confirm={t.deleteConfirm}
                  cancel={t.cancel}
                  onConfirm={() => void remove()}
                  loading={deleting}
                  disabled={saving}
                />
              )}
            </div>
          ) : (
            <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-4">
              <Button asChild>
                <MasterLink routing={routing} to={{ screen: 'settings' }}>
                  {t.back}
                </MasterLink>
              </Button>
              <p className="mbc:text-muted-foreground mbc:text-sm">
                {t.readOnly}
              </p>
            </div>
          )}
          {failure && <FailureAlert failure={failure} className="mbc:mt-4" />}
        </div>

        <div className="mbc:mt-4 mbc:px-4">
          <h2 className={SECTION}>{t.basics}</h2>
          <div className="mbc:bg-background mbc:grid mbc:gap-x-10 mbc:gap-y-2 mbc:p-6 mbc:pb-10 mbc:md:grid-cols-2">
            <Field invalid={errors.code !== undefined}>
              <FieldLabel className="mbc:font-semibold">
                {t.code}
                <RequiredMark />
              </FieldLabel>
              <Input
                value={values.code}
                onChange={(event) => setValue('code', event.target.value)}
                disabled={mode === 'edit' || readOnly}
                aria-required
              />
              <FieldError>{errors.code}</FieldError>
            </Field>
            <Field invalid={errors.name !== undefined}>
              <FieldLabel className="mbc:font-semibold">
                {t.name}
                <RequiredMark />
              </FieldLabel>
              <Input
                value={values.name}
                onChange={(event) => setValue('name', event.target.value)}
                disabled={readOnly}
                aria-required
              />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field className="mbc:md:col-span-2">
              <FieldLabel className="mbc:font-semibold">
                {t.description}
              </FieldLabel>
              <Textarea
                value={values.description}
                onChange={(event) =>
                  setValue('description', event.target.value)
                }
                disabled={readOnly}
              />
            </Field>
            {settingOptions.map((option) => (
              <Field key={option.key} className="mbc:mt-2">
                <FieldLabel className="mbc:font-semibold">
                  {option.label}
                </FieldLabel>
                <Switch
                  checked={values.options[option.key] === true}
                  onCheckedChange={(checked) =>
                    setValue('options', {
                      ...values.options,
                      [option.key]: checked,
                    })
                  }
                  disabled={readOnly}
                />
              </Field>
            ))}
          </div>

          <h2 className={SECTION}>{t.fields}</h2>
          <div className="mbc:bg-background mbc:p-6 mbc:pb-10">
            {owned && (
              <div className="mbc:mb-5 mbc:flex mbc:w-full mbc:items-start">
                <Button
                  type="button"
                  disabled={readOnly}
                  onClick={(event) => {
                    opener.current = event.currentTarget
                    setDialog({ open: true })
                  }}
                >
                  <PlusIcon aria-hidden />
                  {messages.fieldDialog.add}
                </Button>
              </div>
            )}
            <FieldsTable
              rows={rows}
              formats={formats}
              readOnly={readOnly}
              onMove={(from, to) =>
                setRows((current) => arrayMove(current, from, to))
              }
              onEdit={(key, trigger) => {
                opener.current = trigger ?? null
                setDialog({ open: true, key })
              }}
              onRemove={(key) =>
                setRows((current) => current.filter((row) => row.key !== key))
              }
            />
          </div>
        </div>
      </form>
      <FieldDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        field={editingRow?.field}
        siblings={rows
          .filter((row) => row.key !== dialog.key)
          .map((row) => row.field)}
        formats={formats}
        onSubmit={submitField}
        returnFocusTo={() => opener.current}
      />
      <div className="mbc:bg-background mbc:flex mbc:justify-evenly mbc:py-3">
        <Button asChild variant="outline" className="mbc:min-w-[200px]">
          <MasterLink routing={routing} to={{ screen: 'settings' }}>
            {t.back}
          </MasterLink>
        </Button>
      </div>
    </div>
  )
}
