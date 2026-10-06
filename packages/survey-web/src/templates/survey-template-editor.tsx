'use client'

import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  Button,
  cn,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  SurveyCreator,
  type SurveyCreatorHandle,
} from '../creator/survey-creator'
import type { Survey, SurveyInput } from '../schema/survey-schema'
import { templateMessages } from './i18n/template-messages'

export type SurveyTemplateEditorProps = {
  mode: 'create' | 'edit'
  /** Read when the creator mounts (after `loading` ends). */
  defaultValue?: SurveyInput
  loading?: boolean
  error?: unknown
  saving?: boolean
  deleting?: boolean
  onSave: (survey: Survey) => void | Promise<void>
  onDelete?: () => void
  onCancel: () => void
  onRetry?: () => void
  className?: string
}

const ACTION =
  'mbc:flex mbc:items-center mbc:rounded-full mbc:border mbc:border-[#636F80] mbc:bg-[#EEEEEE] mbc:text-black mbc:hover:bg-[#B7BDC6]'
const ICON = 'mbc:h-5! mbc:w-5!'

function Body({
  mode,
  defaultValue,
  saving = false,
  deleting = false,
  onSave,
  onDelete,
  onCancel,
}: SurveyTemplateEditorProps) {
  const t = useMessages(templateMessages)
  const creator = useRef<SurveyCreatorHandle>(null)
  const loaded = useRef<string | null>(null)
  const [changed, setChanged] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const busy = saving || deleting

  useEffect(() => {
    loaded.current = JSON.stringify(creator.current?.getValue() ?? null)
  }, [])

  const save = async (survey: Survey) => {
    await onSave(survey)
    loaded.current = JSON.stringify(creator.current?.getValue() ?? null)
    setChanged(false)
  }

  return (
    <>
      <SurveyCreator
        ref={creator}
        defaultValue={defaultValue}
        disabled={busy}
        onChange={(survey) =>
          setChanged(JSON.stringify(survey) !== loaded.current)
        }
        onSubmit={save}
      />
      <div className="mbc:mt-9 mbc:flex mbc:flex-row mbc:items-center mbc:justify-center mbc:gap-8 mbc:self-center">
        <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
          <Button
            type="button"
            size="lg"
            className={ACTION}
            disabled={busy}
            onClick={() => (changed ? setDiscardOpen(true) : onCancel())}
          >
            <ChevronLeft aria-hidden className={ICON} />
            {t.editor.back}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.editor.discardTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.editor.discardDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                {t.editor.cancel}
              </AlertDialogCancel>
              <AlertDialogAction disabled={busy} onClick={onCancel}>
                {t.editor.ok}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {mode === 'edit' && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="lg"
                className={ACTION}
                loading={deleting}
                disabled={busy}
              >
                <Trash2 aria-hidden className={ICON} />
                {t.editor.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.editor.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.editor.deleteDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  {t.editor.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={onDelete}
                  className="mbc:bg-red-500 mbc:hover:bg-red-600"
                >
                  {deleting ? t.editor.deleting : t.editor.deleteConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button
          type="button"
          size="lg"
          className={ACTION}
          loading={saving}
          disabled={busy || (mode === 'edit' && !changed)}
          // Errors belong to `onSave`'s owner (the host or the connected page).
          onClick={() => void creator.current?.submit().catch(() => {})}
        >
          {mode === 'edit' ? t.editor.update : t.editor.create}
          <ChevronRight aria-hidden className={ICON} />
        </Button>
      </div>
    </>
  )
}

/** v0's edit-survey-template page as a prop-driven screen. */
export function SurveyTemplateEditor(props: SurveyTemplateEditorProps) {
  const t = useMessages(templateMessages)
  const { mode, loading, error, onRetry, className } = props
  const editing = mode === 'edit'

  let content
  if (loading) {
    content = (
      <div className="mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:gap-4 mbc:py-12">
        <Loader2
          aria-hidden
          className="mbc:text-primary mbc:animate-spin mbc:h-10 mbc:w-10"
        />
        <div className="mbc:text-center" role="status">
          <h3 className="mbc:text-foreground mbc:text-lg mbc:font-semibold">
            {editing ? t.editor.loadingEdit : t.editor.loadingCreate}
          </h3>
          <p className="mbc:text-muted-foreground mbc:text-sm">
            {editing ? t.editor.loadingEditHint : t.editor.loadingCreateHint}
          </p>
        </div>
      </div>
    )
  } else if (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : t.editor.loadErrorFallback
    content = (
      <Alert
        variant="destructive"
        role="alert"
        className="mbc:mx-auto mbc:max-w-md"
      >
        <AlertCircle aria-hidden className="mbc:h-4 mbc:w-4" />
        <AlertTitle>{t.editor.loadErrorTitle}</AlertTitle>
        <AlertDescription className="mbc:flex mbc:flex-col mbc:gap-3">
          <p>{message}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mbc:w-full"
            >
              <RefreshCw aria-hidden className="mbc:mr-2 mbc:h-4 mbc:w-4" />
              {t.editor.retry}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  } else {
    content = <Body {...props} />
  }

  return (
    <div
      data-mbc=""
      className={cn('mbc:container mbc:mx-auto mbc:px-4 mbc:py-8', className)}
    >
      {content}
    </div>
  )
}
