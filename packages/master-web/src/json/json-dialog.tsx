'use client'

import {
  Alert,
  AlertDescription,
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

import { masterMessages } from '../i18n/master-messages'
import { downloadJson, readJsonFile } from './json-file'
import { JsonText, type JsonTextEditor } from './json-text'

export type JsonDialogProps = {
  /** The text the dialog opens with; read each time it opens. */
  text(): string
  /** The file name "JSON保存" saves under. */
  fileName: string
  /** Applies the text. Return why it was refused to keep the dialog open, or nothing to close it. */
  onApply(text: string): string | undefined
  disabled?: boolean
  /** Edits the text instead of the text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
}

/** v0's JSON editor for one setting or record, as a normal dialog with a text box. */
export function JsonDialog({
  text,
  fileName,
  onApply,
  disabled = false,
  jsonEditor,
}: JsonDialogProps) {
  const t = useMessages(masterMessages)
  const errorId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const changeOpen = (next: boolean) => {
    if (next) {
      setValue(text())
      setError(null)
    }
    setOpen(next)
  }

  const apply = () => {
    const refused = onApply(value)
    if (refused === undefined) setOpen(false)
    else setError(refused)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          {t.jsonDialog.open}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        // The textarea grows with its text: keep the buttons reachable.
        className="mbc:max-h-[calc(100dvh-2rem)] mbc:overflow-y-auto mbc:sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{t.jsonDialog.title}</DialogTitle>
        </DialogHeader>
        <JsonText
          value={value}
          onChange={setValue}
          label={t.jsonDialog.json}
          invalid={error !== null}
          describedBy={error !== null ? errorId : undefined}
          editor={jsonEditor}
        />
        {error !== null && (
          <Alert variant="destructive" id={errorId} role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="mbc:gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            {t.jsonDialog.cancel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden />
            {t.jsonDialog.load}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            tabIndex={-1}
            aria-hidden
            className="mbc:hidden"
            onChange={(event) => readJsonFile(event, setValue)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadJson(value, fileName)}
          >
            <Download aria-hidden />
            {t.jsonDialog.save}
          </Button>
          <Button type="button" onClick={apply}>
            <Save aria-hidden />
            {t.jsonDialog.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
