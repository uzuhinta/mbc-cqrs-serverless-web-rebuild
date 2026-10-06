import { MbcApiError, MbcCommandError } from '@mbc-cqrs-serverless/client-web'
import { describe, expect, it } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import type { Survey } from '../schema/survey-schema'
import { createSurveyTemplateApi, submitSurveyAnswer } from './api'

const survey: Survey = {
  title: '満足度調査',
  description: '年次',
  items: [
    { id: 'sec_1', type: 'section-header', title: 'S' },
    { id: 'q_1', type: 'short-text', label: 'Q' },
    { id: 'q_2', type: 'short-text', label: 'Q2' },
  ],
}
const entity = {
  id: 'SURVEY#demo#1',
  name: '満足度調査',
  version: 2,
  createdAt: '2026-10-04T03:00:00.000Z',
  attributes: { description: '年次', surveyTemplate: survey },
}

describe('createSurveyTemplateApi', () => {
  it('lists with v0’s query and maps entities to summaries', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [entity], total: 1 })
    const result = await createSurveyTemplateApi(client).list({
      page: 2,
      pageSize: 20,
      keyword: '',
      orderBy: 'createdAt',
    })
    expect(client.get).toHaveBeenCalledWith('/api/survey-template', {
      query: {
        page: 2,
        pageSize: 20,
        keyword: undefined,
        orderBys: ['createdAt:desc'],
      },
      signal: undefined,
    })
    expect(result).toEqual({
      total: 1,
      items: [
        {
          id: 'SURVEY#demo#1',
          name: '満足度調査',
          description: '年次',
          version: 2,
          createdAt: '2026-10-04T03:00:00.000Z',
          updatedAt: undefined,
          questionCount: 2,
          sectionCount: 1,
        },
      ],
    })
  })

  it('gets one template with its id encoded', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(entity)
    const { survey: loaded, summary } =
      await createSurveyTemplateApi(client).get('SURVEY#demo#1')
    expect(client.get.mock.calls[0]?.[0]).toBe(
      '/api/survey-template/SURVEY%23demo%231'
    )
    expect(loaded).toEqual(survey)
    expect(summary.questionCount).toBe(2)
  })

  it('creates, updates and removes through command()', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const api = createSurveyTemplateApi(client)
    const signal = new AbortController().signal
    await api.create(survey, { signal })
    await api.update('SURVEY#demo#1', survey)
    await api.remove('SURVEY#demo#1')
    const body = {
      name: '満足度調査',
      attributes: { surveyTemplate: survey, description: '年次' },
    }
    expect(client.command.mock.calls).toEqual([
      [{ method: 'POST', path: '/api/survey-template', body }, { signal }],
      [
        { method: 'PUT', path: '/api/survey-template/SURVEY%23demo%231', body },
        undefined,
      ],
      [
        { method: 'DELETE', path: '/api/survey-template/SURVEY%23demo%231' },
        undefined,
      ],
    ])
  })

  it('treats an update that returns no requestId as saved (unchanged data)', async () => {
    const client = createFakeClient()
    client.command.mockRejectedValue(
      new MbcApiError(200, null, 'The command response has no requestId')
    )
    await expect(
      createSurveyTemplateApi(client).update('x', survey)
    ).resolves.toBeUndefined()
  })

  it('reports real failures', async () => {
    const client = createFakeClient()
    const api = createSurveyTemplateApi(client)
    client.command.mockRejectedValueOnce(new MbcApiError(500, null))
    await expect(api.update('x', survey)).rejects.toBeInstanceOf(MbcApiError)
    client.command.mockRejectedValueOnce(
      new MbcCommandError('r', 'sync:FAILED')
    )
    await expect(api.update('x', survey)).rejects.toBeInstanceOf(
      MbcCommandError
    )
    client.command.mockRejectedValueOnce(new MbcApiError(200, null))
    await expect(api.create(survey)).rejects.toBeInstanceOf(MbcApiError)
  })
})

describe('submitSurveyAnswer', () => {
  it('posts v0’s answer body', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    await submitSurveyAnswer(client, {
      surveyId: 's1',
      answer: { q_1: 'A' },
      email: 'a@example.com',
    })
    expect(client.command).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/api/survey-answer',
        body: {
          attributes: {
            surveyId: 's1',
            email: 'a@example.com',
            answer: { q_1: 'A' },
          },
        },
      },
      undefined
    )
  })
})
