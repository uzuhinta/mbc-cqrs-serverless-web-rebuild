'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import {
  allowedFieldTypes,
  FIXED_FIELD_NAMES,
  validateFieldDefinition,
  type FieldDefinitionError,
  type FieldDefinitionErrors,
} from '../core/field-definition'
import type { MasterFieldType } from '../core/field-type-names'
import { fieldTypeOf } from '../core/field-types'
import { dateParts } from '../core/list'
import {
  applyFieldDialog,
  formatCodeOf,
  type SequenceFormat,
} from '../core/setting-form'
import type { MasterField } from '../core/types'
import { RequiredMark } from '../form/required-mark'
import { formatFieldDefinitionError } from '../i18n/format-error'
import { masterMessages } from '../i18n/master-messages'
import { masterSettingMessages } from '../i18n/master-setting-messages'

export type FieldDialogProps = {
  open: boolean
  onOpenChange(open: boolean): void
  /** The field to edit, as the editor holds it (`fieldToForm`); omit to add one. */
  field?: MasterField
  /** The setting's other fields: physical names must be unique. */
  siblings: readonly MasterField[]
  /** Sequences an auto-numbered code field can use. */
  formats: readonly SequenceFormat[]
  onSubmit(field: MasterField): void
  /** Where focus goes when the dialog closes (it has no trigger of its own). */
  returnFocusTo?(): HTMLElement | null | undefined
}

const NEW_FIELD: MasterField = {
  physicalName: '',
  name: '',
  description: '',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
}

const TEXTAREA_DEFAULTS = new Set([
  'json',
  'text-area',
  'text-html',
  'text-markdown',
])

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

function TextInput({
  label,
  value,
  onChange,
  error,
  type = 'text',
  disabled,
  placeholder,
  required = false,
}: {
  label: string
  value: unknown
  onChange(value: string): void
  error: string | undefined
  type?: 'text' | 'number' | 'date'
  disabled?: boolean
  placeholder?: string
  required?: boolean
}) {
  return (
    <Field invalid={error !== undefined}>
      <FieldLabel className="mbc:font-semibold">
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
      <Input
        type={type}
        value={text(value)}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-required={required || undefined}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

/** v0's add / edit field dialog; the inputs follow the chosen type. */
export function FieldDialog(props: FieldDialogProps) {
  const t = useMessages(masterSettingMessages)
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          const target = props.returnFocusTo?.()
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
        // A grid spaces the parts (ui-web's Dialog is not one; 0.0.x master's was).
        className="mbc:grid mbc:max-h-[calc(100dvh-2rem)] mbc:overflow-y-auto mbc:sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>
            {props.field ? t.fieldDialog.editTitle : t.fieldDialog.addTitle}
          </DialogTitle>
        </DialogHeader>
        {/* Mounted while open: each opening starts from the given field. */}
        <FieldForm {...props} />
      </DialogContent>
    </Dialog>
  )
}

function FieldForm({
  field,
  siblings,
  formats,
  onSubmit,
  onOpenChange,
}: FieldDialogProps) {
  const t = useMessages(masterSettingMessages).fieldDialog
  const m = useMessages(masterMessages)
  const fixed =
    field !== undefined && FIXED_FIELD_NAMES.includes(field.physicalName)
  const [draft, setDraft] = useState<MasterField>(() =>
    field ? { ...field } : { ...NEW_FIELD }
  )
  const [format, setFormat] = useState(() =>
    field ? formatCodeOf(field, formats) : ''
  )
  const [errors, setErrors] = useState<FieldDefinitionErrors>({})
  const [attempts, setAttempts] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (attempts > 0)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
  }, [attempts])

  const type = fieldTypeOf(draft)
  const types = allowedFieldTypes(fixed ? field.physicalName : '')
  const message = (error: FieldDefinitionError | undefined) =>
    error && formatFieldDefinitionError(error, m.fieldDefinition)
  const set = (key: string, value: unknown) =>
    setDraft((current) => ({ ...current, [key]: value }))
  // v0: a new type starts from its empty default.
  const setType = (dataType: string) =>
    setDraft((current) => ({
      ...current,
      dataType,
      defaultValue: dataType === 'boolean' ? 'false' : '',
    }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    // The dialog is portalled but still inside the editor's React tree.
    event.stopPropagation()
    const chosen = formats.find((option) => option.code === format)
    const candidate = applyFieldDialog(draft, chosen)
    const found = validateFieldDefinition(candidate, siblings)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setAttempts((count) => count + 1)
      return
    }
    onSubmit(candidate)
    onOpenChange(false)
  }

  const date = dateParts(draft.defaultValue)
  const defaultInput =
    fixed || !type.hasDefault ? null : draft.dataType === 'boolean' ? (
      <Field invalid={errors.defaultValue !== undefined}>
        <FieldLabel className="mbc:font-semibold">{t.defaultValue}</FieldLabel>
        <Switch
          checked={draft.defaultValue === true || draft.defaultValue === 'true'}
          onCheckedChange={(checked) => set('defaultValue', String(checked))}
        />
        <FieldError>{message(errors.defaultValue)}</FieldError>
      </Field>
    ) : TEXTAREA_DEFAULTS.has(draft.dataType) ? (
      <Field
        invalid={errors.defaultValue !== undefined}
        className="mbc:md:col-span-2"
      >
        <FieldLabel className="mbc:font-semibold">{t.defaultValue}</FieldLabel>
        <Textarea
          value={text(draft.defaultValue)}
          onChange={(event) => set('defaultValue', event.target.value)}
          spellCheck={draft.dataType !== 'json'}
          className={cn(draft.dataType === 'json' && 'mbc:font-mono')}
        />
        <FieldError>{message(errors.defaultValue)}</FieldError>
      </Field>
    ) : (
      <TextInput
        label={t.defaultValue}
        type={draft.dataType === 'date' ? 'date' : 'text'}
        value={
          draft.dataType === 'date' && date
            ? `${date.year}-${date.month}-${date.day}`
            : draft.defaultValue
        }
        onChange={(value) => set('defaultValue', value)}
        error={message(errors.defaultValue)}
      />
    )

  return (
    <form ref={formRef} noValidate onSubmit={save}>
      <div className="mbc:grid mbc:gap-x-10 mbc:gap-y-4 mbc:md:grid-cols-2">
        <TextInput
          label={t.physicalName}
          value={draft.physicalName}
          onChange={(value) => set('physicalName', value)}
          error={message(errors.physicalName)}
          disabled={fixed}
          required
        />
        <TextInput
          label={t.name}
          value={draft.name}
          onChange={(value) => set('name', value)}
          error={message(errors.name)}
          required
        />
        <Field invalid={errors.dataType !== undefined}>
          <FieldLabel className="mbc:font-semibold">
            {t.dataType}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={draft.dataType}
            onValueChange={setType}
            disabled={fixed && types.length === 1}
          >
            <SelectTrigger className="mbc:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((option: MasterFieldType) => (
                <SelectItem key={option} value={option}>
                  {m.fieldTypes[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{message(errors.dataType)}</FieldError>
        </Field>
        {type.options.includes('maxRow') && (
          <TextInput
            label={t.maxRow}
            type="number"
            value={draft.maxRow}
            onChange={(value) => set('maxRow', value)}
            error={message(errors.maxRow)}
          />
        )}
        {type.options.includes('min') && (
          <div className="mbc:grid mbc:grid-cols-2 mbc:gap-x-10">
            <TextInput
              label={t.min}
              type="number"
              value={draft.min}
              onChange={(value) => set('min', value)}
              error={message(errors.min)}
            />
            <TextInput
              label={t.max}
              type="number"
              value={draft.max}
              onChange={(value) => set('max', value)}
              error={message(errors.max)}
            />
          </div>
        )}
        {type.options.includes('length') && (
          <TextInput
            label={t.length}
            type="number"
            value={draft.length}
            onChange={(value) => set('length', value)}
            error={message(errors.length)}
          />
        )}
        {type.options.includes('format') && (
          <>
            <Field invalid={errors.dataFormat !== undefined}>
              <FieldLabel className="mbc:font-semibold">
                {t.format}
                {draft.physicalName === 'code' && <RequiredMark />}
              </FieldLabel>
              <Select value={format || undefined} onValueChange={setFormat}>
                <SelectTrigger className="mbc:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{message(errors.dataFormat)}</FieldError>
            </Field>
            <TextInput
              label={t.prefix}
              value={draft.prefix}
              onChange={(value) => set('prefix', value)}
              error={undefined}
            />
            <TextInput
              label={t.postfix}
              value={draft.postfix}
              onChange={(value) => set('postfix', value)}
              error={undefined}
            />
          </>
        )}
        {defaultInput}
        {type.options.includes('pattern') && (
          <TextInput
            label={t.pattern}
            value={draft.pattern}
            onChange={(value) => set('pattern', value)}
            error={undefined}
            placeholder={t.patternPlaceholder}
          />
        )}
        <div className="mbc:flex mbc:items-start mbc:gap-10">
          <Field className="mbc:w-fit">
            <FieldLabel className="mbc:font-semibold">
              {t.isRequired}
            </FieldLabel>
            <Switch
              checked={draft.isRequired}
              onCheckedChange={(checked) => set('isRequired', checked)}
              disabled={fixed}
            />
          </Field>
          <Field className="mbc:w-fit">
            <FieldLabel className="mbc:font-semibold">
              {t.isShowedOnList}
            </FieldLabel>
            <Switch
              checked={draft.isShowedOnList}
              onCheckedChange={(checked) => set('isShowedOnList', checked)}
              disabled={fixed}
            />
          </Field>
        </div>
        <Field className="mbc:md:col-span-2">
          <FieldLabel className="mbc:font-semibold">{t.description}</FieldLabel>
          <Textarea
            value={text(draft.description)}
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>
      </div>
      <DialogFooter className="mbc:mt-8 mbc:gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t.cancel}
        </Button>
        <Button type="submit">{t.submit}</Button>
      </DialogFooter>
    </form>
  )
}
