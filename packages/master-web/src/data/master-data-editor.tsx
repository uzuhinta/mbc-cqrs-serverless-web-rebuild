'use client'

import { Button, cn, Skeleton, useMessages } from '@mbc-cqrs-serverless/ui-web'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import { dataJson, parseDataJson } from '../core/data-json'
import {
  toDataPayload,
  type MasterDataCreateBody,
  type MasterDataUpdateBody,
} from '../core/payload'
import { isSameTenant } from '../core/tenant'
import type { MasterData, MasterField, MasterSetting } from '../core/types'
import { validateMasterData } from '../core/validate'
import {
  dataFields,
  isEntityField,
  toFormValues,
  type MasterFormValues,
} from '../core/values'
import { ConfirmButton } from '../form/confirm-button'
import { FailureAlert, failureOf, type Failure } from '../form/failure'
import { useEditFocus } from '../form/edit-focus'
import { isUnknownOutcome } from '../form/outcome'
import { RequiredMark } from '../form/required-mark'
import { formatMasterError } from '../i18n/format-error'
import { masterDataMessages } from '../i18n/master-data-messages'
import { masterMessages } from '../i18n/master-messages'
import { JsonDialog } from '../json/json-dialog'
import type { JsonTextEditor } from '../json/json-text'
import { ListError } from '../list/list-error'
import {
  defaultRenderers,
  rendererType,
  type FieldRenderers,
} from '../renderers/registry'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'

export type MasterDataEditorProps = {
  mode: 'create' | 'edit'
  /** The record's setting; its fields make the form. */
  setting?: MasterSetting
  /** The stored record (edit). A new `id` or `version` restarts the editor. */
  data?: MasterData
  routing: MasterRouting
  /** The current tenant: another tenant's record opens read-only. */
  tenantCode?: string
  /** The setting or the record is loading. */
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRetry`. */
  error?: unknown
  onRetry?(): void
  /** Create, typed code: resolves `false` when the code is already used. */
  checkCodeUnique?(code: string): Promise<boolean>
  /** Create, auto-numbered code: the next code, asked for once per save. */
  generateCode?(field: MasterField, setting: MasterSetting): Promise<string>
  /**
   * Saves the record; reject to show the failure. After an update the
   * editor shows the saved values; after a create, navigating is the host's.
   */
  onSave(body: MasterDataCreateBody | MasterDataUpdateBody): Promise<void>
  /** Deletes the record (soft delete) after the user confirms. */
  onDelete?(): Promise<void>
  /** Restores a deleted record after the user confirms. */
  onRestore?(): Promise<void>
  /** Renderers that replace the built-ins, by field type. */
  components?: FieldRenderers
  /** The JSON dialog's editor instead of a text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
}

// Wide inputs take the whole row (v0).
const WIDE = new Set(['json', 'text-area', 'text-html', 'text-markdown'])

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

/** v0's data editor: the setting's fields, view / edit, delete / restore and the JSON dialog. */
export function MasterDataEditor(props: MasterDataEditorProps) {
  const t = useMessages(masterDataMessages).editor
  const m = useMessages(masterMessages)
  const { mode, setting, data, loading = false, error, onRetry } = props
  if (!setting || (mode === 'edit' && !data) || loading) {
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
        <Skeleton className="mbc:h-48 mbc:w-full" />
      </div>
    )
  }
  const key = [setting.id, setting.version, data?.id, data?.version].join(':')
  return <EditorBody key={key} {...props} setting={setting} />
}

function EditorBody({
  mode,
  setting,
  data,
  routing,
  tenantCode,
  checkCodeUnique,
  generateCode,
  onSave,
  onDelete,
  onRestore,
  components,
  jsonEditor,
}: MasterDataEditorProps & { setting: MasterSetting }) {
  const messages = useMessages(masterDataMessages)
  const t = messages.editor
  const m = useMessages(masterMessages)
  const formId = useId()
  const fields = useMemo(() => dataFields(setting), [setting])
  const owned =
    mode === 'create' ||
    tenantCode === undefined ||
    isSameTenant(data?.tenantCode, tenantCode)

  const [baseline, setBaseline] = useState<MasterFormValues>(() =>
    toFormValues(fields, data)
  )
  // What the backend holds after this editor's last update: the next update
  // is worked out against it (a host need not reload `data` in between).
  const [stored, setStored] = useState(data)
  const [values, setValues] = useState(baseline)
  const [editing, setEditing] = useState(mode === 'create')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState(0)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)
  const [deleted, setDeleted] = useState(data?.isDeleted === true)
  const [acting, setActing] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const busy = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const editFocus = useEditFocus(editing, formRef)
  const readOnly = !editing || !owned

  // After a refused save: focus the first field with an error. Its control
  // carries the id the renderer was given (a rich editor's editing area is
  // not an input); a group gets its first input instead.
  useEffect(() => {
    if (attempts === 0) return
    const index = fields.findIndex((field) => errors[field.physicalName])
    const first = fields[index]
    if (!first) return
    const control = document.getElementById(`${formId}-${index}-control`)
    if (
      control?.matches(
        'input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), [contenteditable="true"], [tabindex]'
      )
    ) {
      control.focus()
      return
    }
    const wrapper = [
      ...(formRef.current?.querySelectorAll<HTMLElement>('[data-field]') ?? []),
    ].find((element) => element.dataset.field === first.physicalName)
    wrapper
      ?.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
      ?.focus()
  }, [attempts, errors, fields, formId])

  const changed = JSON.stringify(values) !== JSON.stringify(baseline)
  const codeField = fields.find((field) => field.physicalName === 'code')
  const generated = codeField?.dataType === 'auto_number'

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy.current || readOnly || created) return
    busy.current = true
    setSaving(true)
    setFailure(null)
    const failedTitle = mode === 'create' ? t.createFailed : t.updateFailed
    try {
      const found = validateMasterData(fields, values, {
        mode: mode === 'create' ? 'create' : 'update',
      })
      const next: Record<string, string> = {}
      for (const [name, problem] of Object.entries(found))
        next[name] = formatMasterError(problem, m.validation)
      if (mode === 'create' && !generated && !next.code && checkCodeUnique) {
        if (!(await checkCodeUnique(text(values.code).trim())))
          next.code = t.codeTaken
      }
      setErrors(next)
      if (Object.keys(next).length > 0) {
        setAttempts((count) => count + 1)
        return
      }
      if (mode === 'create') {
        let generatedCode: string | undefined
        if (generated && codeField) {
          if (!generateCode)
            throw new Error(
              'MasterDataEditor: an auto-numbered code needs generateCode'
            )
          generatedCode = await generateCode(codeField, setting)
        }
        await onSave(
          toDataPayload(setting, values, { mode: 'create', generatedCode })
        )
        setCreated(true)
      } else if (stored) {
        const body = toDataPayload(setting, values, {
          mode: 'update',
          previous: stored,
        })
        await onSave(body)
        setStored({ ...stored, ...body })
        setBaseline(values)
        setEditing(false)
      }
    } catch (reason) {
      setFailure(failureOf(reason, failedTitle, t))
      // A create that timed out may already exist. Saving again would
      // number another record; the message tells the host to reload.
      if (mode === 'create' && isUnknownOutcome(reason)) setCreated(true)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  const cancel = () => {
    setValues(baseline)
    setErrors({})
    setFailure(null)
    setEditing(false)
  }

  const act = async (
    action: (() => Promise<void>) | undefined,
    failedTitle: string,
    next: boolean
  ) => {
    if (!action) return
    setFailure(null)
    setActing(true)
    try {
      await action()
      setDeleted(next)
    } catch (reason) {
      setFailure(failureOf(reason, failedTitle, t))
    } finally {
      setActing(false)
    }
  }

  const applyJson = (json: string) => {
    const parsed = parseDataJson(json, setting)
    if (!parsed.ok) return messages.json[parsed.error.key]
    // The code of a stored record cannot change.
    setValues(
      mode === 'edit'
        ? { ...parsed.values, code: values.code ?? '' }
        : parsed.values
    )
    return undefined
  }

  const label = (field: MasterField) =>
    field.name ||
    (isEntityField(field)
      ? field.physicalName === 'code'
        ? t.code
        : t.name
      : field.physicalName)

  const back = (
    <Button asChild variant="outline" className="mbc:min-w-[200px]">
      <MasterLink
        routing={routing}
        to={{ screen: 'data', settingId: setting.id }}
      >
        {t.back}
      </MasterLink>
    </Button>
  )

  return (
    <div data-mbc="" className="mbc:w-full">
      <form
        ref={formRef}
        noValidate
        onSubmit={save}
        className="mbc:bg-background mbc:w-full"
      >
        <div
          role="group"
          aria-label={t.actions}
          className="mbc:bg-muted/50 mbc:p-4"
        >
          {owned ? (
            <div className="mbc:flex mbc:justify-between mbc:gap-4">
              <div className="mbc:flex mbc:flex-wrap mbc:gap-4">
                {mode === 'edit' && !editing ? (
                  <Button
                    type="button"
                    onClick={() => {
                      editFocus.start()
                      setEditing(true)
                    }}
                  >
                    {t.edit}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      loading={saving}
                      disabled={created || (mode === 'edit' && !changed)}
                    >
                      {t.save}
                    </Button>
                    {mode === 'edit' && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancel}
                      >
                        {t.cancel}
                      </Button>
                    )}
                    <JsonDialog
                      text={() => dataJson(setting, values, data)}
                      fileName={messages.json.fileName}
                      onApply={applyJson}
                      disabled={saving}
                      jsonEditor={jsonEditor}
                    />
                  </>
                )}
              </div>
              {mode === 'edit' && (
                <div className="mbc:flex mbc:items-center mbc:gap-4">
                  {deleted
                    ? onRestore && (
                        <ConfirmButton
                          label={t.restore}
                          title={t.restoreTitle}
                          confirm={t.restoreConfirm}
                          cancel={t.cancel}
                          variant="default"
                          onConfirm={() =>
                            void act(onRestore, t.restoreFailed, false)
                          }
                          loading={acting}
                          disabled={saving}
                        />
                      )
                    : onDelete && (
                        <ConfirmButton
                          label={t.delete}
                          title={t.deleteTitle}
                          confirm={t.deleteConfirm}
                          cancel={t.cancel}
                          onConfirm={() =>
                            void act(onDelete, t.deleteFailed, true)
                          }
                          loading={acting}
                          disabled={saving}
                        />
                      )}
                </div>
              )}
            </div>
          ) : (
            <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-4">
              <Button asChild>
                <MasterLink
                  routing={routing}
                  to={{ screen: 'data', settingId: setting.id }}
                >
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

        <div className="mbc:w-full mbc:p-4">
          <div className="mbc:grid mbc:grid-cols-1 mbc:gap-x-10 mbc:gap-y-4 mbc:p-6 mbc:pb-10 mbc:pt-2 mbc:md:grid-cols-2">
            {fields.map((field, index) => {
              const name = field.physicalName
              const id = `${formId}-${index}`
              const description = text(field.description)
              const problem = errors[name]
              const describedBy =
                [
                  description ? `${id}-description` : undefined,
                  problem ? `${id}-error` : undefined,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              const type = rendererType(field)
              const Renderer = components?.[type] ?? defaultRenderers[type]
              const isCode = name === 'code'
              return (
                <div
                  key={name}
                  data-field={name}
                  className={cn(
                    'mbc:block',
                    isCode && 'mbc:col-start-1',
                    WIDE.has(field.dataType) && 'mbc:md:col-span-2'
                  )}
                >
                  <label
                    id={`${id}-label`}
                    htmlFor={`${id}-control`}
                    className={cn(
                      'mbc:text-sm mbc:font-semibold mbc:leading-5',
                      problem && 'mbc:text-destructive'
                    )}
                  >
                    {label(field)}
                    {(field.isRequired || isEntityField(field)) && (
                      <RequiredMark />
                    )}
                  </label>
                  <div className="mbc:relative mbc:mt-2">
                    <Renderer
                      field={field}
                      value={values[name] ?? ''}
                      onChange={(value) =>
                        setValues((current) => ({ ...current, [name]: value }))
                      }
                      onBlur={() => {}}
                      id={`${id}-control`}
                      labelId={`${id}-label`}
                      describedBy={describedBy}
                      invalid={problem !== undefined}
                      disabled={readOnly || (isCode && mode === 'edit')}
                    />
                    {description && (
                      <p
                        id={`${id}-description`}
                        className="mbc:text-muted-foreground mbc:mt-1.5 mbc:text-xs"
                      >
                        {t.description({ text: description })}
                      </p>
                    )}
                    {problem && (
                      <p
                        id={`${id}-error`}
                        className="mbc:text-destructive mbc:mt-2 mbc:text-xs mbc:font-semibold"
                      >
                        {problem}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </form>
      <div className="mbc:flex mbc:justify-center mbc:pt-10">{back}</div>
    </div>
  )
}
