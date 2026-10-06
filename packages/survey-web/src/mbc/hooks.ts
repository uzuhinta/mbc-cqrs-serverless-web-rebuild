'use client'

import {
  useCommand,
  useMbcClient,
  useQuery,
  type QueryState,
} from '@mbc-cqrs-serverless/client-web/react'
import { useMemo } from 'react'

import type { Survey } from '../schema/survey-schema'
import type { SurveyAnswers } from '../answers/types'
import {
  createSurveyTemplateApi,
  submitSurveyAnswer,
  type SurveyTemplateListParams,
} from './api'

export type { QueryState }

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
