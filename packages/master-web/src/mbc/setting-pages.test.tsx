import { MbcTimeoutError } from '@mbc-cqrs-serverless/client-web'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { SETTING_ROWS } from '../../test/fixtures/v0-lists'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { createRouting, renderPage, serveGets } from '../../test/render-page'
import {
  MbcMasterSettingEditorPage,
  MbcMasterSettingListPage,
} from './setting-pages'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'
const detail = `/api/master-setting/detail/${encodeURIComponent(SETTING_ID)}`
const sequences = {
  items: [
    {
      id: 'MASTER#tenant-a#sequence_setting#ORDER',
      pk: 'MASTER#tenant-a',
      sk: 'sequence_setting#ORDER',
      name: '注文番号',
      attributes: { format: 'O-%%no%%' },
    },
  ],
  total: 1,
}

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })

describe('MbcMasterSettingListPage', () => {
  it('lists the tenant’s settings, keeping its own state', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(client, <MbcMasterSettingListPage routing={createRouting()} />)
    expect(await screen.findByRole('link', { name: 'PRODUCT' })).toBeVisible()
    await userEvent.type(input('コード'), 'PRO')
    await userEvent.click(button('検索'))
    await waitFor(() =>
      expect(client.get.mock.calls.at(-1)?.[1].query.code).toBe('PRO')
    )
  })

  it('follows the host’s state when it passes one', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: [], total: 0 }),
    })
    const onStateChange = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingListPage
        routing={createRouting()}
        state={{
          page: 3,
          pageSize: 20,
          code: 'X',
          name: '',
          keyword: '',
        }}
        onStateChange={onStateChange}
      />
    )
    await waitFor(() =>
      expect(client.get.mock.calls.at(-1)?.[1].query).toMatchObject({
        page: 3,
        code: 'X',
      })
    )
    await userEvent.click(button('クリア'))
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: '', page: 1 })
    )
  })

  it('reports a failed load and loads again on Reload', async () => {
    const client = createFakeClient()
    const down = new Error('down')
    client.get.mockRejectedValueOnce(down).mockRejectedValueOnce(down)
    client.get.mockResolvedValue({ items: SETTING_ROWS, total: 2 })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingListPage routing={createRouting()} onError={onError} />
    )
    const alert = await screen.findByRole('alert')
    // A load failure reaches onError from an effect, just after the alert.
    await waitFor(() => expect(onError).toHaveBeenCalledWith(down))
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(await screen.findByRole('link', { name: 'PRODUCT' })).toBeVisible()
  })

  it('imports through the bulk command, then loads the list again', async () => {
    const client = createFakeClient(() => [{ requestId: 'req-1' }])
    serveGets(client, {
      '/api/master-setting/list': () => ({ items: SETTING_ROWS, total: 2 }),
    })
    renderPage(client, <MbcMasterSettingListPage routing={createRouting()} />)
    await screen.findByRole('link', { name: 'PRODUCT' })
    const loads = client.get.mock.calls.length
    await userEvent.click(button('JSONエディタ'))
    const editor = screen.getByRole('textbox', { name: 'JSON' })
    await userEvent.clear(editor)
    editor.focus()
    await userEvent.paste(
      JSON.stringify([{ code: 'NEW', name: '新規', attributes: {} }])
    )
    await userEvent.click(button('データ反映'))
    await waitFor(() =>
      expect(client.command.mock.calls[0]?.[0]).toMatchObject({
        method: 'POST',
        path: '/api/master-bulk',
        body: { items: [{ code: 'NEW', name: '新規' }] },
      })
    )
    await waitFor(() =>
      expect(client.get.mock.calls.length).toBeGreaterThan(loads)
    )
  })
})

describe('MbcMasterSettingEditorPage', () => {
  it('creates a setting whose code is free, then opens its data list (v0)', async () => {
    const client = createFakeClient()
    serveGets(client, { '/api/master-data/list': sequences })
    client.post.mockResolvedValue(false)
    const routing = createRouting()
    const onSaved = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage routing={routing} onSaved={onSaved} />
    )
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({
        screen: 'data',
        settingId: 'MASTER#tenant-a#MASTER_SETTING#NEW',
      })
    )
    expect(client.post).toHaveBeenCalledWith(
      '/api/master-setting/check-exist/NEW',
      undefined,
      { signal: undefined }
    )
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/api/master-setting',
      body: { code: 'NEW', name: '新規' },
    })
    expect(onSaved).toHaveBeenCalledWith('MASTER#tenant-a#MASTER_SETTING#NEW')
  })

  it('refuses a code that is taken', async () => {
    const client = createFakeClient()
    serveGets(client, { '/api/master-data/list': sequences })
    client.post.mockResolvedValue(true)
    renderPage(client, <MbcMasterSettingEditorPage routing={createRouting()} />)
    await userEvent.type(input('コード'), 'USED')
    await userEvent.type(input('名称'), '名前')
    await userEvent.click(button('保存'))
    expect(
      await screen.findByText('既にこのコードは登録されています。')
    ).toBeVisible()
    expect(client.command).not.toHaveBeenCalled()
  })

  it('updates a stored setting by its encoded id', async () => {
    const client = createFakeClient()
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    const onSaved = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={createRouting()}
        id={SETTING_ID}
        onSaved={onSaved}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(SETTING_ID))
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'PUT',
      path: `/api/master-setting/${encodeURIComponent(SETTING_ID)}`,
    })
  })

  it('deletes a setting, then goes to the settings list (v0)', async () => {
    const client = createFakeClient()
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    const routing = createRouting()
    const onDeleted = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={routing}
        id={SETTING_ID}
        onDeleted={onDeleted}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '削除' }))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '削除',
      })
    )
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({ screen: 'settings' })
    )
    expect(onDeleted).toHaveBeenCalled()
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'DELETE',
    })
  })

  it('says the outcome is unknown when a save timed out, and reports it', async () => {
    const timeout = new MbcTimeoutError(60_000)
    const client = createFakeClient(() => timeout)
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={createRouting()}
        id={SETTING_ID}
        onError={onError}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '時間内に結果を確認できませんでした。'
    )
    expect(onError).toHaveBeenCalledWith(timeout)
  })

  it('opens another tenant’s setting read-only', async () => {
    const client = createFakeClient()
    client.tenantCode = () => 'tenant-b'
    serveGets(client, {
      [detail]: V0_SETTING,
      '/api/master-data/list': sequences,
    })
    renderPage(
      client,
      <MbcMasterSettingEditorPage routing={createRouting()} id={SETTING_ID} />
    )
    await screen.findByText('商品マスタ')
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })

  it('reads the sequences from the sequence master, unless the host gives them', async () => {
    const client = createFakeClient()
    serveGets(client, { '/api/master-data/list': sequences })
    const view = renderPage(
      client,
      <MbcMasterSettingEditorPage routing={createRouting()} />
    )
    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/api/master-data/list', {
        query: expect.objectContaining({
          settingCode: 'sequence_setting',
          page: 1,
          pageSize: 100,
        }),
        signal: expect.any(AbortSignal),
      })
    )
    view.unmount()
    client.get.mockClear()
    renderPage(
      client,
      <MbcMasterSettingEditorPage
        routing={createRouting()}
        formats={[{ code: 'SEQ#A', name: 'A', format: '%%no%%' }]}
      />
    )
    expect(client.get).not.toHaveBeenCalled()
  })
})
