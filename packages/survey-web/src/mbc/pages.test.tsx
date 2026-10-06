import { MbcApiError, MbcCommandError } from '@mbc-cqrs-serverless/client-web'
import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { MbcSurveyTemplateEditorPage, MbcSurveyTemplateListPage } from './pages'

const entity = (id: string, name: string) => ({
  id,
  name,
  version: 1,
  attributes: {
    surveyTemplate: {
      title: name,
      items: [{ id: 'sec_1', type: 'section-header', title: 'S' }],
    },
  },
})

function renderWith(
  client: ReturnType<typeof createFakeClient>,
  ui: ReactElement
) {
  return render(<MbcClientProvider client={client}>{ui}</MbcClientProvider>)
}

describe('MbcSurveyTemplateListPage', () => {
  it('loads page 1 of 10, searches from page 1, and selects', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({
      items: [entity('t1', 'A'), entity('t2', 'B')],
      total: 25,
    })
    const onSelect = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateListPage onSelect={onSelect} onCreate={() => {}} />
    )

    await userEvent.click(await screen.findByText('A'))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', name: 'A' })
    )

    await userEvent.click(screen.getByRole('link', { name: '2' }))
    await screen.findByText('A')
    await userEvent.type(screen.getByRole('searchbox'), 'x')
    await waitFor(() =>
      expect(client.get).toHaveBeenLastCalledWith(
        '/api/survey-template',
        expect.objectContaining({
          query: expect.objectContaining({ page: 1, keyword: 'x' }),
        })
      )
    )
    const queries = client.get.mock.calls.map(
      ([, options]) =>
        (options as { query: { page: number; keyword?: string } }).query
    )
    expect(queries.map((q) => [q.page, q.keyword])).toEqual([
      [1, undefined],
      [2, undefined],
      [1, 'x'],
    ])
  })

  it('lets the host own the state', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [entity('t1', 'A')], total: 25 })
    const onStateChange = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateListPage
        onSelect={() => {}}
        state={{ page: 3, pageSize: 10, keyword: '' }}
        onStateChange={onStateChange}
      />
    )
    await screen.findByText('A')
    await userEvent.click(screen.getByRole('link', { name: '2' }))
    expect(onStateChange).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      keyword: '',
    })
    expect(client.get).toHaveBeenCalledTimes(1)
  })

  it('retries after an error', async () => {
    const client = createFakeClient()
    client.get
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ items: [entity('t1', 'A')], total: 1 })
    renderWith(client, <MbcSurveyTemplateListPage onSelect={() => {}} />)
    await userEvent.click(
      await screen.findByRole('button', { name: '再度試す' })
    )
    expect(await screen.findByText('A')).toBeInTheDocument()
  })
})

describe('MbcSurveyTemplateEditorPage', () => {
  const edit = async (
    client: ReturnType<typeof createFakeClient>,
    props: Partial<Parameters<typeof MbcSurveyTemplateEditorPage>[0]> = {}
  ) => {
    client.get.mockResolvedValue(entity('SURVEY#1', 'Old'))
    renderWith(
      client,
      <MbcSurveyTemplateEditorPage
        id="SURVEY#1"
        onCancel={() => {}}
        {...props}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Old' }))
    await userEvent.type(
      screen.getByPlaceholderText('アンケートのタイトル'),
      '2'
    )
  }

  it('loads, updates and reports onSaved', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const onSaved = vi.fn()
    await edit(client, { onSaved })
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Old2' })
      )
    )
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'PUT',
      path: '/api/survey-template/SURVEY%231',
    })
  })

  it('treats a save without a requestId as saved, not as an error', async () => {
    const client = createFakeClient()
    client.command.mockRejectedValue(
      new MbcApiError(200, null, 'The command response has no requestId')
    )
    const onSaved = vi.fn()
    const onError = vi.fn()
    await edit(client, { onSaved, onError })
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onError).not.toHaveBeenCalled()
  })

  it('reports a failed command through onError and lets the user retry', async () => {
    const client = createFakeClient()
    client.command.mockRejectedValue(new MbcCommandError('r', 'sync:FAILED'))
    const onError = vi.fn()
    await edit(client, { onError })
    const update = screen.getByRole('button', { name: '更新' })
    await userEvent.click(update)
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.any(MbcCommandError))
    )
    expect(update).toBeEnabled()
  })

  it('deletes after confirming', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(entity('SURVEY#1', 'Old'))
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const onDeleted = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateEditorPage
        id="SURVEY#1"
        onCancel={() => {}}
        onDeleted={onDeleted}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '削除' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '削除する' })
    )
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(client.command.mock.calls[0]?.[0]).toEqual({
      method: 'DELETE',
      path: '/api/survey-template/SURVEY%231',
    })
  })

  it('creates without loading anything', async () => {
    const client = createFakeClient()
    client.command.mockResolvedValue({ data: {}, requestId: 'r' })
    const onSaved = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateEditorPage onCancel={() => {}} onSaved={onSaved} />
    )
    await userEvent.click(screen.getByRole('button', { name: '作成' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(client.get).not.toHaveBeenCalled()
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/api/survey-template',
    })
  })

  it('reports every failed command, not only the first', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue(entity('SURVEY#1', 'Old'))
    client.command
      .mockRejectedValueOnce(new MbcApiError(500, null))
      .mockRejectedValueOnce(new MbcApiError(503, null))
    const onError = vi.fn()
    renderWith(
      client,
      <MbcSurveyTemplateEditorPage
        id="SURVEY#1"
        onCancel={() => {}}
        onError={onError}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Old' }))
    await userEvent.type(
      screen.getByPlaceholderText('アンケートのタイトル'),
      '2'
    )
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      })
    )
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
    expect(
      onError.mock.calls.map(([error]) => (error as MbcApiError).status)
    ).toEqual([500, 503])
  })
})
