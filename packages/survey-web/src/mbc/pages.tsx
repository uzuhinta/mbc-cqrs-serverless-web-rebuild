'use client'

import { useEffect, useRef, useState } from 'react'

import type { Survey } from '../schema/survey-schema'
import { SurveyTemplateEditor } from '../templates/survey-template-editor'
import { SurveyTemplateList } from '../templates/survey-template-list'
import type { SurveyTemplateSummary } from '../templates/types'
import {
  useSurveyTemplate,
  useSurveyTemplateMutations,
  useSurveyTemplates,
} from './hooks'

export type TemplateListState = {
  page: number
  pageSize: number
  keyword: string
}

const INITIAL: TemplateListState = { page: 1, pageSize: 10, keyword: '' }
const pending = (status: string) => status === 'sending' || status === 'waiting'

/** v0's SurveyTemplatePage on the mbc backend. Pass `state` + `onStateChange` to sync with the URL. */
export function MbcSurveyTemplateListPage({
  onCreate,
  onSelect,
  state,
  onStateChange,
  className,
}: {
  onCreate?: () => void
  onSelect: (item: SurveyTemplateSummary) => void
  state?: TemplateListState
  onStateChange?: (state: TemplateListState) => void
  className?: string
}) {
  const [own, setOwn] = useState(INITIAL)
  const current = state ?? own
  const change = (next: Partial<TemplateListState>) => {
    const merged = { ...current, ...next }
    if (!state) setOwn(merged)
    onStateChange?.(merged)
  }
  const { data, loading, error, refetch } = useSurveyTemplates(current)
  return (
    <SurveyTemplateList
      items={data?.items ?? []}
      total={data?.total ?? 0}
      page={current.page}
      pageSize={current.pageSize}
      keyword={current.keyword}
      loading={loading}
      error={error}
      onPageChange={(page) => change({ page })}
      onPageSizeChange={(pageSize) => change({ pageSize, page: 1 })}
      onKeywordChange={(keyword) => change({ keyword, page: 1 })}
      onCreate={onCreate}
      onSelect={onSelect}
      onRetry={refetch}
      className={className}
    />
  )
}

/** v0's EditSurveyTemplatePage on the mbc backend; no `id` creates a template. */
export function MbcSurveyTemplateEditorPage({
  id,
  onSaved,
  onDeleted,
  onCancel,
  onError,
  className,
}: {
  id?: string
  onSaved?: (survey: Survey) => void
  onDeleted?: () => void
  onCancel: () => void
  onError?: (error: unknown) => void
  className?: string
}) {
  const { data, loading, error, refetch } = useSurveyTemplate(id)
  const { create, update, remove } = useSurveyTemplateMutations()
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })
  // One effect per command: a later failure of another command is still reported.
  useEffect(() => {
    if (create.status === 'error') onErrorRef.current?.(create.error)
  }, [create.status, create.error])
  useEffect(() => {
    if (update.status === 'error') onErrorRef.current?.(update.error)
  }, [update.status, update.error])
  useEffect(() => {
    if (remove.status === 'error') onErrorRef.current?.(remove.error)
  }, [remove.status, remove.error])

  return (
    <SurveyTemplateEditor
      mode={id ? 'edit' : 'create'}
      defaultValue={data?.survey}
      loading={loading}
      error={error}
      saving={pending(create.status) || pending(update.status)}
      deleting={pending(remove.status)}
      onSave={async (survey) => {
        const ok = id ? await update.run(id, survey) : await create.run(survey)
        // A rejection keeps the editor's unsaved state; the error itself reaches onError.
        if (!ok) throw new Error('The survey was not saved')
        onSaved?.(survey)
      }}
      onDelete={
        id
          ? async () => {
              if (await remove.run(id)) onDeleted?.()
            }
          : undefined
      }
      onCancel={onCancel}
      onRetry={refetch}
      className={className}
    />
  )
}
