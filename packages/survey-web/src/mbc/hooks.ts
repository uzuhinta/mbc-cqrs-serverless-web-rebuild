'use client'

import { useCommand, useMbcClient } from '@mbc-cqrs-serverless/client-web/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Survey } from '../schema/survey-schema'
import type { SurveyAnswers } from '../answers/types'
import {
  createSurveyTemplateApi,
  submitSurveyAnswer,
  type SurveyTemplateListParams,
} from './api'

export type QueryState<T> = {
  data: T | undefined
  loading: boolean
  error: unknown
  refetch(): void
}

type Settled<T> = { key: string; data?: T; error?: unknown }

/**
 * Fetch keyed by `key`; `load === null` means idle. Loading is derived (the
 * latest request has not settled), so no state is set synchronously in effects.
 */
function useQuery<T>(
  key: string,
  load: ((signal: AbortSignal) => Promise<T>) | null
): QueryState<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  const active = load !== null
  const requestKey = `${nonce}\u0000${key}`

  useEffect(() => {
    const run = loadRef.current
    if (!run) return
    const controller = new AbortController()
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, error })
      }
    )
    return () => controller.abort()
  }, [requestKey, active])

  const current = active && settled?.key === requestKey ? settled : null
  return {
    data: current?.data,
    loading: active && current === null,
    error: current?.error,
    refetch: () => setNonce((n) => n + 1),
  }
}

function useApi() {
  const client = useMbcClient()
  return useMemo(() => createSurveyTemplateApi(client), [client])
}

export function useSurveyTemplates(params: SurveyTemplateListParams) {
  const api = useApi()
  return useQuery(JSON.stringify(params), (signal) =>
    api.list(params, { signal })
  )
}

export function useSurveyTemplate(id?: string) {
  const api = useApi()
  return useQuery(id ?? '', id ? (signal) => api.get(id, { signal }) : null)
}

export function useSurveyTemplateMutations() {
  const create = useCommand(
    async ({ client, signal, onPhase }, survey: Survey) => {
      await createSurveyTemplateApi(client).create(survey, { signal, onPhase })
      return true as const
    }
  )
  const update = useCommand(
    async ({ client, signal, onPhase }, id: string, survey: Survey) => {
      await createSurveyTemplateApi(client).update(id, survey, {
        signal,
        onPhase,
      })
      return true as const
    }
  )
  const remove = useCommand(async ({ client, signal, onPhase }, id: string) => {
    await createSurveyTemplateApi(client).remove(id, { signal, onPhase })
    return true as const
  })
  return { create, update, remove }
}

export function useSubmitSurveyAnswer() {
  return useCommand(
    async (
      { client, signal, onPhase },
      input: { surveyId: string; answer: SurveyAnswers; email?: string }
    ) => {
      await submitSurveyAnswer(client, input, { signal, onPhase })
      return true as const
    }
  )
}
