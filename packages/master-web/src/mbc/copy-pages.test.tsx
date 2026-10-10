import { MbcApiError } from '@mbc-cqrs-serverless/client-web'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { COPY_REQUESTS, COPY_TENANT_TASKS } from '../../test/fixtures/v0-copy'
import { DATA_ROWS } from '../../test/fixtures/v0-lists'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { createRouting, renderPage, serveGets } from '../../test/render-page'
import type { MasterTenant } from '../core/copy'
import {
  MbcMasterCopyRequestPage,
  MbcMasterCopyTaskDetailPage,
  MbcMasterCopyTaskListPage,
} from './copy-pages'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'
const settingPath = `/api/master-setting/detail/${encodeURIComponent(SETTING_ID)}`
const TENANTS: MasterTenant[] = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
]

const button = (name: string) => screen.getByRole('button', { name })

function serveSetting(client: ReturnType<typeof createFakeClient>) {
  serveGets(client, {
    [settingPath]: V0_SETTING,
    '/api/master-data/list': { items: DATA_ROWS, total: 2 },
  })
}

describe('MbcMasterCopyRequestPage', () => {
  it('requests a copy to every tenant, then opens the copy results', async () => {
    const client = createFakeClient()
    serveSetting(client)
    client.post.mockResolvedValue({})
    const routing = createRouting()
    const onRequested = vi.fn()
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={routing}
        settingId={SETTING_ID}
        loadTenants={async () => TENANTS}
        onRequested={onRequested}
      />
    )
    expect(screen.getByRole('status', { name: '読み込み中' })).toBeVisible()
    await userEvent.click(
      await screen.findByRole('button', { name: 'コピー登録' })
    )
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith({
        screen: 'copyTasks',
        settingId: SETTING_ID,
      })
    )
    expect(client.post).toHaveBeenCalledWith(
      '/api/master-setting/copy',
      {
        masterSettingId: SETTING_ID,
        targetTenants: ['tenant-b', 'tenant-c'],
        copyType: 'BOTH',
      },
      { signal: expect.any(AbortSignal) }
    )
    expect(onRequested).toHaveBeenCalled()
  })

  it('loads the setting’s records up front for "chosen data only"', async () => {
    const client = createFakeClient()
    serveSetting(client)
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={createRouting()}
        settingId={SETTING_ID}
        loadTenants={async () => TENANTS}
      />
    )
    await screen.findByRole('button', { name: 'コピー登録' })
    expect(
      client.get.mock.calls.find(
        ([path]) => path === '/api/master-data/list'
      )?.[1].query.settingCode
    ).toBe('PRODUCT')
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    expect(
      within(screen.getByRole('table', { name: 'マスタデータ一覧' })).getByText(
        'P-001'
      )
    ).toBeVisible()
  })

  it('reports tenants that failed to load and loads them again on Reload', async () => {
    const client = createFakeClient()
    serveSetting(client)
    const down = new Error('down')
    const loadTenants = vi
      .fn<() => Promise<MasterTenant[]>>()
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockResolvedValue(TENANTS)
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={createRouting()}
        settingId={SETTING_ID}
        loadTenants={loadTenants}
        onError={onError}
      />
    )
    const alert = await screen.findByRole('alert')
    expect(onError).toHaveBeenCalledWith(down)
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(
      await screen.findByRole('button', { name: 'コピー登録' })
    ).toBeVisible()
  })

  it('shows tenants that could not be asked for, instead of crashing', async () => {
    const client = createFakeClient()
    serveSetting(client)
    const noSession = new Error('no session')
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={createRouting()}
        settingId={SETTING_ID}
        loadTenants={() => {
          throw noSession
        }}
        onError={onError}
      />
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '読み込みに失敗しました。'
    )
    expect(onError).toHaveBeenCalledWith(noSession)
  })

  it('says when the request failed, stays, and reports it', async () => {
    const client = createFakeClient()
    serveSetting(client)
    const refused = new MbcApiError(400, { message: 'Bad request' })
    client.post.mockRejectedValue(refused)
    const routing = createRouting()
    const onError = vi.fn()
    renderPage(
      client,
      <MbcMasterCopyRequestPage
        routing={routing}
        settingId={SETTING_ID}
        loadTenants={async () => TENANTS}
        onError={onError}
      />
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'コピー登録' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '汎用マスタコピーの登録に失敗しました。'
    )
    expect(onError).toHaveBeenCalledWith(refused)
    expect(routing.navigate).not.toHaveBeenCalled()
  })
})

describe('MbcMasterCopyTaskListPage', () => {
  it('lists the setting’s copy requests and refreshes them', async () => {
    const client = createFakeClient()
    serveGets(client, {
      '/api/tasks/sfn-task-parent': () => COPY_REQUESTS,
    })
    renderPage(
      client,
      <MbcMasterCopyTaskListPage
        routing={createRouting()}
        settingId={SETTING_ID}
      />
    )
    expect(
      await screen.findByRole('link', { name: 'PRODUCT#01J9B' })
    ).toBeVisible()
    expect(client.get.mock.calls[0]?.[1].query).toEqual({
      masterSettingCode: 'PRODUCT',
    })
    const loads = client.get.mock.calls.length
    await userEvent.click(button('最新の状態に更新'))
    await waitFor(() =>
      expect(client.get.mock.calls.length).toBeGreaterThan(loads)
    )
  })
})

describe('MbcMasterCopyTaskDetailPage', () => {
  it('shows one request’s result per tenant, through a child’s key (v0)', async () => {
    const client = createFakeClient()
    const taskId = COPY_REQUESTS[0]!.id
    serveGets(client, {
      [`/api/tasks/${encodeURIComponent(`${taskId}#0`)}`]: COPY_TENANT_TASKS,
    })
    renderPage(
      client,
      <MbcMasterCopyTaskDetailPage
        routing={createRouting()}
        settingId={SETTING_ID}
        taskId={taskId}
      />
    )
    expect(await screen.findByText('tenant-c')).toBeVisible()
    expect(
      screen.getByText('Error: Master setting does not exist')
    ).toBeVisible()
  })
})
