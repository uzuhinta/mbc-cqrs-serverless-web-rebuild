'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Download, Save, Upload } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'

import {
  bulkSampleJson,
  parseBulkJson,
  type BulkError,
  type BulkJsonItem,
  type BulkMapper,
  type BulkScreen,
} from '../core/bulk'
import { formatBulkError } from '../i18n/format-error'
import { masterMessages } from '../i18n/master-messages'

export type BulkImportDialogProps = {
  /** `settings`: the settings list (settings and data); `data`: one setting's data list. */
  screen: BulkScreen
  /** A data list's setting code, used in the sample JSON. */
  settingCode?: string
  /** The current tenant; entries for another tenant are refused. */
  tenantCode?: string
  /** Starting JSON instead of the built-in sample (v0's `inputSampleJson`). */
  inputSampleJson?: string
  /** Maps the host's own JSON shape to bulk items (v0's `mapRawItem`). */
  mapRawItem?: BulkMapper
  /**
   * Sends the items; call `onProgress(done, total)` as they finish. Resolve
   * when everything is done (or nothing changed); reject on failure.
   */
  onImport(
    items: BulkJsonItem[],
    onProgress: (done: number, total: number) => void
  ): Promise<void>
  /** After a successful import, e.g. to reload the list. */
  onImported?(): void
  disabled?: boolean
}

const FILE_NAMES: Record<BulkScreen, string> = {
  settings: 'master-setting-bulk.json',
  data: 'master-data-bulk.json',
}

/** v0's JSON editor dialog for bulk import, as a normal dialog with a text box. */
export function BulkImportDialog({
  screen,
  settingCode,
  tenantCode,
  inputSampleJson,
  mapRawItem,
  onImport,
  onImported,
  disabled = false,
}: BulkImportDialogProps) {
  const t = useMessages(masterMessages)
  const errorsId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(
    () => inputSampleJson ?? bulkSampleJson(screen, settingCode)
  )
  const [errors, setErrors] = useState<BulkError[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const submitting = progress !== null

  const changeOpen = (next: boolean) => {
    // A running import cannot be dismissed; its outcome would be lost.
    if (submitting) return
    setOpen(next)
    if (next) {
      setErrors([])
      setFailure(null)
    }
  }

  const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setText(reader.result)
      input.value = ''
    }
    reader.onerror = () => {
      input.value = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'application/json' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = FILE_NAMES[screen]
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const submit = async () => {
    const parsed = parseBulkJson(text, { screen, mapRawItem, tenantCode })
    setErrors(parsed.errors)
    setFailure(null)
    if (parsed.errors.length > 0) return
    setProgress({ done: 0, total: parsed.items.length })
    try {
      await onImport(parsed.items, (done, total) =>
        setProgress({ done, total })
      )
      setProgress(null)
      setOpen(false)
      onImported?.()
    } catch (error) {
      setProgress(null)
      setFailure(error instanceof Error ? error.message : '')
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          {t.bulkDialog.open}
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="mbc:sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.bulkDialog.title}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={t.bulkDialog.json}
          aria-invalid={errors.length > 0 || undefined}
          aria-describedby={errors.length > 0 ? errorsId : undefined}
          spellCheck={false}
          disabled={submitting}
          className="mbc:min-h-[50vh] mbc:font-mono mbc:text-xs"
        />
        {errors.length > 0 && (
          <Alert variant="destructive" id={errorsId}>
            <AlertDescription>
              <ul className="mbc:list-disc mbc:pl-5">
                {errors.map((error, index) => (
                  <li key={index}>{formatBulkError(error, t.bulk)}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {failure !== null && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>{t.bulkDialog.failed}</AlertTitle>
            {failure && <AlertDescription>{failure}</AlertDescription>}
          </Alert>
        )}
        {progress && (
          <p role="status" className="mbc:text-muted-foreground mbc:text-sm">
            {t.bulkDialog.progress(progress)}
          </p>
        )}
        <DialogFooter className="mbc:gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => changeOpen(false)}
          >
            {t.bulkDialog.cancel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden />
            {t.bulkDialog.load}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            tabIndex={-1}
            aria-hidden
            className="mbc:hidden"
            onChange={loadFile}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={download}
          >
            <Download aria-hidden />
            {t.bulkDialog.save}
          </Button>
          <Button
            type="button"
            loading={submitting}
            onClick={() => void submit()}
          >
            {!submitting && <Save aria-hidden />}
            {t.bulkDialog.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
