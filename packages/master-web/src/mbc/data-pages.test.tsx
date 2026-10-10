import { MbcTimeoutError } from '@mbc-cqrs-serverless/client-web'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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
    expect(onError).toHaveBeenCalledWith(down)
    failing = false
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(await screen.findByRole('link', { name: 'P-001' })).toBeVisible()
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
      '時間内に結果を確認できませんでした。'
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
