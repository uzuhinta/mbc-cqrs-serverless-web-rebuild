import {
  MbcAbortError,
  MbcTimeoutError,
  type CommandOptions,
} from '@mbc-cqrs-serverless/client-web'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FakeJsonEditor } from '../../test/fake-json-editor'
import { createFakeClient } from '../../test/fake-mbc-client'
import { DATA_ROWS } from '../../test/fixtures/v0-lists'
import { V0_DATA, V0_SETTING } from '../../test/fixtures/v0-master'
import { createRouting, renderPage, serveGets } from '../../test/render-page'
import { MbcMasterDataEditorPage, MbcMasterDataListPage } from './data-pages'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'
const DATA_ID = 'MASTER#tenant-a#PRODUCT#P-001'
const settingPath = `/api/master-setting/detail/${encodeURIComponent(SETTING_ID)}`
const dataPath = `/api/master-data/detail/${encodeURIComponent(DATA_ID)}`

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })

describe('MbcMasterDataListPage', () => {
  it('waits for the setting, then lists its records by its code', async () => {
    const client = createFakeClient()
    let release = () => {}
    const settingLoaded = new Promise<void>((resolve) => (release = resolve))
    client.get.mockImplementation(async (path: string) => {
      if (path === settingPath) {
        await settingLoaded
        return V0_SETTING
      }
      return { items: DATA_ROWS, total: 2 }
    })
    renderPage(
      client,
      <MbcMasterDataListPage routing={createRouting()} settingId={SETTING_ID} />
    )
    expect(screen.getByRole('status', { name: '読み込み中' })).toBeVisible()
    release()
    expect(await screen.findByRole('link', { name: 'P-001' })).toBeVisible()
    expect(
      client.get.mock.calls.find(
        ([path]) => path === '/api/master-data/list'
      )?.[1].query.settingCode
    ).toBe('PRODUCT')
  })

  it('reports a setting that failed to load and loads it again on Reload', async () => {
    const client = createFakeClient()
    const down = new Error('down')
    let failing = true
    client.get.mockImplementation(async (path: string) => {
      if (path === settingPath) {
        if (failing) throw down
        return V0_SETTING
      }
      return { items: DATA_ROWS, total: 2 }
    })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterDataListPage
        routing={createRouting()}
        settingId={SETTING_ID}
        onError={onError}
      />
    )
    const alert = await screen.findByRole('alert')
    // A load failure reaches onError from an effect, just after the alert.
    await waitFor(() => expect(onError).toHaveBeenCalledWith(down))
    failing = false
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(await screen.findByRole('link', { name: 'P-001' })).toBeVisible()
  })
})

describe('MbcMasterDataListPage, re-used for another setting', () => {
  it('starts afresh, without the last setting’s search', async () => {
    const client = createFakeClient()
    const other = 'MASTER#tenant-a#MASTER_SETTING#OTHER'
    client.get.mockImplementation(async (path: string) =>
      path.startsWith('/api/master-setting/detail/')
        ? V0_SETTING
        : { items: DATA_ROWS, total: 2 }
    )
    const routing = createRouting()
    const view = renderPage(
      client,
      <MbcMasterDataListPage routing={routing} settingId={SETTING_ID} />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'コード' }),
      'zz'
    )
    await userEvent.click(screen.getByRole('button', { name: '検索' }))
    await waitFor(() =>
      expect(client.get.mock.calls.at(-1)?.[1].query.code).toBe('zz')
    )
    view.rerenderPage(
      <MbcMasterDataListPage routing={routing} settingId={other} />
    )
    await waitFor(() =>
      expect(
        client.get.mock.calls.filter(
          ([path, options]) =>
            path === '/api/master-data/list' &&
            options.query.settingCode === 'OTHER'
        ).length
      ).toBeGreaterThan(0)
    )
    for (const [path, options] of client.get.mock.calls)
      if (
        path === '/api/master-data/list' &&
        options.query.settingCode === 'OTHER'
      )
        expect(options.query.code).toBeUndefined()
  })
})

describe('MbcMasterDataEditorPage', () => {
  it('numbers a new record from the sequence API, then opens it (v0)', async () => {
    const client = createFakeClient()
    serveGets(client, { [settingPath]: V0_SETTING })
    client.post.mockResolvedValue({ formattedNo: 'P-100' })
    const routing = createRouting()
    const onSaved = vi.fn()
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={routing}
        settingId={SETTING_ID}
        onSaved={onSaved}
      />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: '名称' }),
      'なし'
    )
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    const created = 'MASTER#tenant-a#PRODUCT#P-100'
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({
        screen: 'dataItem',
        settingId: SETTING_ID,
        id: created,
      })
    )
    expect(client.post.mock.calls[0]?.[0]).toBe(
      '/api/sequence/with-provided-setting'
    )
    expect(client.command.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/api/master-data/create',
      body: { settingCode: 'PRODUCT', code: 'P-100', name: 'なし' },
    })
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('opens a new record by the id the backend wrote, whatever the tenant’s case', async () => {
    // The backend lowercases the tenant (core 1.1.0) and answers with its keys.
    const client = Object.assign(
      createFakeClient(() => ({
        requestId: 'r',
        pk: 'MASTER#tenant-a',
        sk: 'PRODUCT#P-100@1',
      })),
      { tenantCode: () => 'TENANT-A' }
    )
    serveGets(client, { [settingPath]: V0_SETTING })
    client.post.mockResolvedValue({ formattedNo: 'P-100' })
    const routing = createRouting()
    renderPage(
      client,
      <MbcMasterDataEditorPage routing={routing} settingId={SETTING_ID} />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: '名称' }),
      'なし'
    )
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({
        screen: 'dataItem',
        settingId: SETTING_ID,
        id: 'MASTER#tenant-a#PRODUCT#P-100',
      })
    )
  })

  it('keeps Save off after a create that timed out, as the editor does', async () => {
    const timeout = new MbcTimeoutError(60_000)
    const client = createFakeClient(() => timeout)
    serveGets(client, { [settingPath]: V0_SETTING })
    client.post.mockResolvedValue({ formattedNo: 'P-100' })
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        onError={onError}
      />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: '名称' }),
      'なし'
    )
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '結果を確認できませんでした。'
    )
    expect(button('登録')).toBeDisabled()
    expect(client.post).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(timeout)
  })

  it('edits, deletes and restores a stored record by its encoded id', async () => {
    const client = createFakeClient()
    serveGets(client, { [settingPath]: V0_SETTING, [dataPath]: V0_DATA })
    const onSaved = vi.fn()
    const onDeleted = vi.fn()
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        id={DATA_ID}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.clear(input('価格'))
    await userEvent.type(input('価格'), '1300')
    await userEvent.click(button('登録'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(DATA_ID))
    const confirm = async (trigger: string) => {
      await userEvent.click(
        await screen.findByRole('button', { name: trigger })
      )
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', {
          name: trigger,
        })
      )
    }
    await confirm('削除')
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    await confirm('復旧')
    const path = `/api/master-data/${encodeURIComponent(DATA_ID)}`
    await waitFor(() =>
      expect(client.command.mock.calls.map(([request]) => request)).toEqual([
        expect.objectContaining({ method: 'PUT', path }),
        { method: 'DELETE', path },
        { method: 'PUT', path, body: { isDeleted: false } },
      ])
    )
  })

  it('checks a typed code against the setting’s records', async () => {
    const client = createFakeClient()
    const typed = structuredClone(V0_SETTING) as {
      attributes: { fields: { physicalName: string; dataType: string }[] }
    }
    typed.attributes.fields[0]!.dataType = 'string'
    serveGets(client, { [settingPath]: typed })
    client.post.mockResolvedValue(true)
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
      />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'コード' }),
      'P/9'
    )
    await userEvent.type(input('名称'), 'なし')
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        '/api/master-data/check-exist/PRODUCT/P%2F9',
        undefined,
        { signal: undefined }
      )
    )
    expect(client.command).not.toHaveBeenCalled()
  })

  it('does not report a write cut short by leaving the page', async () => {
    const client = createFakeClient()
    // The command waits until the page aborts it, as client-web's does.
    client.command.mockImplementation(
      (_request: unknown, options: CommandOptions = {}) =>
        new Promise((_resolve, reject) =>
          options.signal?.addEventListener('abort', () =>
            reject(new MbcAbortError())
          )
        )
    )
    serveGets(client, { [settingPath]: V0_SETTING, [dataPath]: V0_DATA })
    const onError = vi.fn()
    const view = renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        id={DATA_ID}
        onError={onError}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.clear(input('価格'))
    await userEvent.type(input('価格'), '1300')
    await userEvent.click(button('登録'))
    await waitFor(() => expect(client.command).toHaveBeenCalled())
    view.unmount()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not move the user when a create finishes after the page moved on', async () => {
    const client = createFakeClient()
    let finish = () => {}
    client.command.mockImplementation(
      (_request: unknown, options: CommandOptions = {}) =>
        new Promise((resolve, reject) => {
          finish = () => resolve({ data: {}, requestId: 'req-1' })
          options.signal?.addEventListener('abort', () =>
            reject(new MbcAbortError())
          )
        })
    )
    client.get.mockImplementation(async () => V0_SETTING)
    client.post.mockResolvedValue({ formattedNo: 'P-100' })
    const routing = createRouting()
    const other = 'MASTER#tenant-a#MASTER_SETTING#OTHER'
    const view = renderPage(
      client,
      <MbcMasterDataEditorPage routing={routing} settingId={SETTING_ID} />
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: '名称' }),
      'なし'
    )
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    await waitFor(() => expect(client.command).toHaveBeenCalled())
    view.rerenderPage(
      <MbcMasterDataEditorPage routing={routing} settingId={other} />
    )
    finish()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(routing.navigate).not.toHaveBeenCalled()
  })

  it('passes the host’s JSON editor to the JSON dialog', async () => {
    const client = createFakeClient()
    serveGets(client, { [settingPath]: V0_SETTING, [dataPath]: V0_DATA })
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        id={DATA_ID}
        jsonEditor={FakeJsonEditor}
      />
    )
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.click(button('JSONエディタ'))
    expect(screen.getByRole('textbox', { name: 'JSON' })).toHaveAttribute(
      'data-editor',
      'fake'
    )
  })

  it('opens another tenant’s record read-only', async () => {
    const client = createFakeClient()
    client.tenantCode = () => 'tenant-b'
    serveGets(client, { [settingPath]: V0_SETTING, [dataPath]: V0_DATA })
    renderPage(
      client,
      <MbcMasterDataEditorPage
        routing={createRouting()}
        settingId={SETTING_ID}
        id={DATA_ID}
      />
    )
    await screen.findByRole('textbox', { name: '価格' })
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
  })
})
