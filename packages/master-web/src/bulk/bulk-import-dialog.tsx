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
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Download, Save, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import {
  bulkSampleJson,
  parseBulkJson,
  type BulkError,
  type BulkJsonItem,
  type BulkMapper,
  type BulkScreen,
} from '../core/bulk'
import { isUnknownOutcome } from '../form/outcome'
import { formatBulkError } from '../i18n/format-error'
import { masterMessages } from '../i18n/master-messages'
import { downloadJson, readJsonFile } from '../json/json-file'
import { JsonText, type JsonTextEditor } from '../json/json-text'

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
   * when everything is done (or nothing changed), or with `'accepted'` when
   * the backend took them but their outcome is not known yet (no realtime);
   * reject on failure. A
   * rejection with numeric `from` / `to` (`/mbc`'s `MasterBulkError`) names
   * the failed items; a timeout or dropped connection (also as its `cause`) is shown
   * as an unknown outcome.
   */
  onImport(
    items: BulkJsonItem[],
    onProgress: (done: number, total: number) => void
  ): Promise<void | 'accepted'>
  /** After an import (also after a partial one), e.g. to reload the list. */
  onImported?(): void
  disabled?: boolean
  /** Edits the JSON instead of the text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
}

type Failure = {
  timeout: boolean
  range?: { from: number; to: number }
  message?: string
}

/** What the alert says: an unknown outcome has no message of its own. */
function failureOf(error: unknown): Failure {
  if (isUnknownOutcome(error)) return { timeout: true }
  const { from, to } = (error ?? {}) as { from?: unknown; to?: unknown }
  return {
    timeout: false,
    range:
      typeof from === 'number' && typeof to === 'number'
        ? { from, to }
        : undefined,
    message: error instanceof Error ? error.message : undefined,
  }
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
  jsonEditor,
}: BulkImportDialogProps) {
  const t = useMessages(masterMessages)
  const errorsId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(
    () =>
      inputSampleJson ??
      bulkSampleJson(screen, settingCode, {
        fields: t.defaults,
        settingName: t.defaults.sampleSetting,
        dataName: t.defaults.sampleData,
      })
  )
  const [errors, setErrors] = useState<BulkError[]>([])
  const [failure, setFailure] = useState<Failure | null>(null)
  // Said after the dialog closes: how the import went.
  const [result, setResult] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  /** Progress retained after a mid-import failure so the host can reload. */
  const [partial, setPartial] = useState<{
    done: number
    total: number
  } | null>(null)
  const submitting = progress !== null

  const changeOpen = (next: boolean) => {
    // A running import cannot be dismissed; its outcome would be lost.
    if (submitting) return
    setOpen(next)
    if (next) {
      setResult(null)
      setErrors([])
      setFailure(null)
      setPartial(null)
    }
  }

  const submit = async () => {
    const parsed = parseBulkJson(text, { screen, mapRawItem, tenantCode })
    setErrors(parsed.errors)
    setFailure(null)
    setPartial(null)
    if (parsed.errors.length > 0) return
    let last = { done: 0, total: parsed.items.length }
    setProgress(last)
    try {
      const outcome = await onImport(parsed.items, (done, total) => {
        last = { done, total }
        setProgress(last)
      })
      setProgress(null)
      setOpen(false)
      const count = parsed.items.length
      setResult(
        outcome === 'accepted'
          ? t.bulkDialog.accepted({ count })
          : t.bulkDialog.done({ count })
      )
      onImported?.()
    } catch (error) {
      setProgress(null)
      setFailure(failureOf(error))
      // Batches already accepted by the host must still reach the list.
      if (last.done > 0) {
        setPartial(last)
        onImported?.()
      }
    }
  }

  return (
    <>
      {result && (
        <p
          role="status"
          className="mbc:text-muted-foreground mbc:self-center mbc:text-sm"
        >
          {result}
        </p>
      )}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled}>
            {t.bulkDialog.open}
          </Button>
        </DialogTrigger>
        <DialogContent
          aria-describedby={undefined}
          // The textarea grows with its text: keep the buttons reachable. A grid
          // spaces the parts (ui-web's Dialog is not one; 0.0.x master's was).
          className="mbc:grid mbc:max-h-[calc(100dvh-2rem)] mbc:overflow-y-auto mbc:sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle>{t.bulkDialog.title}</DialogTitle>
          </DialogHeader>
          <JsonText
            value={text}
            onChange={setText}
            label={t.bulkDialog.json}
            invalid={errors.length > 0}
            describedBy={errors.length > 0 ? errorsId : undefined}
            disabled={submitting}
            editor={jsonEditor}
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
              <AlertTitle>
                {failure.timeout ? t.bulkDialog.timeout : t.bulkDialog.failed}
              </AlertTitle>
              <AlertDescription>
                {[
                  failure.range && t.bulkDialog.failedRange(failure.range),
                  failure.message,
                  partial && t.bulkDialog.partial(partial),
                ]
                  .filter(Boolean)
                  .join(' ')}
              </AlertDescription>
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
              onChange={(event) => readJsonFile(event, setText)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => downloadJson(text, FILE_NAMES[screen])}
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
    </>
  )
}
