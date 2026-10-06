import {
  MbcApiError,
  type CommandOptions,
  type MbcClient,
} from '@mbc-cqrs-serverless/client-web'

import type { SurveyAnswers } from '../answers/types'
import type { Survey, SurveyInput } from '../schema/survey-schema'
import type { SurveyTemplateSummary } from '../templates/types'

/** The backend's survey-template entity (the fields this package reads). */
type TemplateEntity = {
  id: string
  name: string
  version?: number
  createdAt?: string
  updatedAt?: string
  attributes?: { description?: string; surveyTemplate?: unknown }
}

export type SurveyTemplateListParams = {
  page: number
  pageSize: number
  keyword?: string
  orderBy?: string
  orderType?: 'asc' | 'desc'
}

export type SurveyTemplateApi = {
  list(
    params: SurveyTemplateListParams,
    options?: { signal?: AbortSignal }
  ): Promise<{ items: SurveyTemplateSummary[]; total: number }>
  get(
    id: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ summary: SurveyTemplateSummary; survey: SurveyInput }>
  create(survey: Survey, options?: CommandOptions): Promise<void>
  update(id: string, survey: Survey, options?: CommandOptions): Promise<void>
  remove(id: string, options?: CommandOptions): Promise<void>
}

type Command = { requestId?: string }

const BASE = '/api/survey-template'
const itemPath = (id: string) => `${BASE}/${encodeURIComponent(id)}`
const bodyOf = (survey: Survey) => ({
  name: survey.title,
  attributes: { surveyTemplate: survey, description: survey.description },
})

export function toTemplateSummary(
  entity: TemplateEntity
): SurveyTemplateSummary {
  const survey = entity.attributes?.surveyTemplate as
    { items?: unknown } | undefined
  const items = Array.isArray(survey?.items)
    ? (survey.items as { type?: unknown }[])
    : []
  const sectionCount = items.filter(
    (item) => item?.type === 'section-header'
  ).length
  return {
    id: entity.id,
    name: entity.name,
    description: entity.attributes?.description,
    version: entity.version ?? 0,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    questionCount: items.length - sectionCount,
    sectionCount,
  }
}

/** An update with unchanged data gets no requestId from the backend: there is nothing to wait for. */
function isUnchanged(error: unknown): boolean {
  return (
    error instanceof MbcApiError && error.status >= 200 && error.status < 300
  )
}

export function createSurveyTemplateApi(client: MbcClient): SurveyTemplateApi {
  return {
    async list({ page, pageSize, keyword, orderBy, orderType }, options = {}) {
      const data = await client.get<{
        items?: TemplateEntity[]
        total?: number
      }>(BASE, {
        query: {
          page,
          pageSize,
          keyword: keyword || undefined,
          orderBys: orderBy ? [`${orderBy}:${orderType ?? 'desc'}`] : undefined,
        },
        signal: options.signal,
      })
      return {
        items: (data.items ?? []).map(toTemplateSummary),
        total: data.total ?? 0,
      }
    },
    async get(id, options = {}) {
      const entity = await client.get<TemplateEntity>(itemPath(id), {
        signal: options.signal,
      })
      return {
        summary: toTemplateSummary(entity),
        survey: (entity.attributes?.surveyTemplate ?? {
          title: entity.name,
          items: [],
        }) as SurveyInput,
      }
    },
    async create(survey, options) {
      await client.command<Command>(
        { method: 'POST', path: BASE, body: bodyOf(survey) },
        options
      )
    },
    async update(id, survey, options) {
      try {
        await client.command<Command>(
          { method: 'PUT', path: itemPath(id), body: bodyOf(survey) },
          options
        )
      } catch (error) {
        if (!isUnchanged(error)) throw error
      }
    },
    async remove(id, options) {
      await client.command<Command>(
        { method: 'DELETE', path: itemPath(id) },
        options
      )
    },
  }
}

export async function submitSurveyAnswer(
  client: MbcClient,
  {
    surveyId,
    answer,
    email,
  }: { surveyId: string; answer: SurveyAnswers; email?: string },
  options?: CommandOptions
): Promise<void> {
  await client.command<Command>(
    {
      method: 'POST',
      path: '/api/survey-answer',
      body: { attributes: { surveyId, email, answer } },
    },
    options
  )
}
