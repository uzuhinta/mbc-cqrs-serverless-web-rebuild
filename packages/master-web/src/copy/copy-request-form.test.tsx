import { MbcApiError } from '@mbc-cqrs-serverless/client-web'
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DATA_ROWS } from '../../test/fixtures/v0-lists'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { masterAccess, OPEN_ACCESS } from '../core/access'
import type { MasterCopyRequest, MasterTenant } from '../core/copy'
import { initialDataListState, type MasterDataListState } from '../core/list'
import { parseMasterSetting } from '../core/parse'
import type { MasterSetting } from '../core/types'
import type { MasterRouting } from '../routing/routing'
import {
  MasterCopyRequestForm,
  type MasterCopyRequestFormProps,
} from './master-copy-request-form'

function setting(): MasterSetting {
  const result = parseMasterSetting(V0_SETTING)
  if (!result.success) throw result.error
  return result.data
}

const TENANTS: MasterTenant[] = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
]

const routing: MasterRouting = {
  href: (to) =>
    [to.screen, 'settingId' in to ? to.settingId : '', 'id' in to ? to.id : '']
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/'),
  navigate: vi.fn(),
}

/** The host: owns the search state and serves one row a page. */
function Host(props: Partial<MasterCopyRequestFormProps>) {
  const [state, setState] = useState<MasterDataListState>({
    ...initialDataListState(),
    pageSize: 1,
  })
  return (
    <MasterCopyRequestForm
      setting={setting()}
      tenants={TENANTS}
      items={DATA_ROWS.slice(state.page - 1, state.page)}
      total={DATA_ROWS.length}
      state={state}
      onStateChange={setState}
      routing={routing}
      onRequestCopy={async () => {}}
      {...props}
    />
  )
}

function setup(props: Partial<MasterCopyRequestFormProps> = {}) {
  const onRequestCopy = vi.fn<(request: MasterCopyRequest) => Promise<void>>(
    async () => {}
  )
  render(<Host onRequestCopy={onRequestCopy} {...props} />)
  return { onRequestCopy }
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'コピー登録' }))

describe('MasterCopyRequestForm', () => {
  it('copies the setting and all its data to every tenant by default', async () => {
    const { onRequestCopy } = setup()
    expect(
      screen.getByRole('radiogroup', { name: 'データのコピー先' })
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '全テナント' })).toBeChecked()
    expect(
      screen.getByRole('radio', { name: '設定データ & 全マスタデータ' })
    ).toBeChecked()
    await submit()
    expect(onRequestCopy).toHaveBeenCalledWith({
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-b', 'tenant-c'],
      copyType: 'BOTH',
    })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('汎用マスタコピーを登録しました。')
    expect(
      within(status).getByRole('link', { name: 'コピー結果を確認' })
    ).toHaveAttribute(
      'href',
      `copyTasks/${encodeURIComponent('MASTER#tenant-a#MASTER_SETTING#PRODUCT')}`
    )
  })

  it('copies to the chosen tenants only', async () => {
    const { onRequestCopy } = setup()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したテナント' })
    )
    await userEvent.click(
      screen.getByRole('combobox', {
        name: 'コピー先のテナントを選択してください',
      })
    )
    await userEvent.click(screen.getByRole('option', { name: 'テナントC' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('radio', { name: '設定データのみ' }))
    await submit()
    expect(onRequestCopy).toHaveBeenCalledWith({
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-c'],
      copyType: 'SETTING_ONLY',
    })
  })

  it('asks for a tenant instead of copying to every one when none is chosen', async () => {
    const { onRequestCopy } = setup()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したテナント' })
    )
    await submit()
    expect(onRequestCopy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'コピー先のテナントを選択してください。'
    )
    const list = screen.getByRole('combobox', {
      name: 'コピー先のテナントを選択してください',
    })
    expect(list).toHaveFocus()
    expect(list).toHaveAttribute('aria-invalid', 'true')
    await userEvent.click(list)
    await userEvent.click(screen.getByRole('option', { name: 'テナントB' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says when there is no tenant to copy to, and clears that once a copy goes out', async () => {
    const onRequestCopy = vi.fn(async () => {})
    const { rerender } = render(
      <Host tenants={[]} onRequestCopy={onRequestCopy} />
    )
    await submit()
    expect(onRequestCopy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'コピー先のテナントがありません。'
    )
    rerender(<Host tenants={TENANTS} onRequestCopy={onRequestCopy} />)
    await submit()
    expect(onRequestCopy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      '汎用マスタコピーを登録しました。'
    )
  })

  it('copies chosen data rows, kept across pages', async () => {
    const { onRequestCopy } = setup()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    const table = screen.getByRole('table', { name: 'マスタデータ一覧' })
    expect(within(table).getByText('P-001')).toBeInTheDocument()
    expect(within(table).queryByRole('link')).not.toBeInTheDocument()
    await userEvent.click(
      within(table).getByRole('checkbox', { name: 'P-001 を選択' })
    )
    expect(screen.getByText('選択した 1 つのアイテム')).toBeInTheDocument()
    const [pager] = screen.getAllByRole('navigation')
    await userEvent.click(within(pager!).getByRole('link', { name: '2' }))
    expect(within(table).getByText('P/002')).toBeInTheDocument()
    await userEvent.click(
      within(table).getByRole('checkbox', { name: 'P/002 を選択' })
    )
    expect(screen.getByText('選択した 2 つのアイテム')).toBeInTheDocument()
    await submit()
    expect(onRequestCopy).toHaveBeenCalledWith({
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-b', 'tenant-c'],
      copyType: 'DATA_ONLY',
      dataCopyOption: {
        mode: 'PARTIAL',
        id: ['MASTER#tenant-a#PRODUCT#P-001', 'MASTER#tenant-a#PRODUCT#P/002'],
      },
    })
  })

  it('copies all the data when no row is chosen (v0), and says so', async () => {
    const { onRequestCopy } = setup()
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    const all = '行が選択されていません。全てのマスタデータをコピーします。'
    expect(screen.getByText(all)).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'P-001 を選択' })
    )
    expect(screen.queryByText(all)).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'P-001 を選択' })
    )
    expect(screen.getByText(all)).toBeInTheDocument()
    await submit()
    expect(onRequestCopy.mock.calls[0]?.[0].dataCopyOption).toEqual({
      mode: 'ALL',
    })
  })

  it('searches the data with v0’s filters', async () => {
    const onStateChange = vi.fn()
    render(
      <MasterCopyRequestForm
        setting={setting()}
        tenants={TENANTS}
        items={DATA_ROWS}
        total={2}
        state={{ ...initialDataListState(), page: 3 }}
        onStateChange={onStateChange}
        routing={routing}
        onRequestCopy={async () => {}}
      />
    )
    await userEvent.click(
      screen.getByRole('radio', { name: '指定したマスタデータのみ' })
    )
    await userEvent.type(screen.getByLabelText('コード'), 'P-0')
    await userEvent.type(screen.getByLabelText('名称'), 'りん')
    await userEvent.click(screen.getByRole('switch', { name: '削除済み含む' }))
    await userEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(onStateChange).toHaveBeenLastCalledWith({
      ...initialDataListState(),
      code: 'P-0',
      keyword: 'りん',
      isDeleted: true,
      page: 1,
    })
  })

  it('says when the request failed, and allows another try', async () => {
    setup({
      onRequestCopy: async () => {
        throw new Error('400')
      },
    })
    await submit()
    expect(screen.getByRole('alert')).toHaveTextContent(
      '汎用マスタコピーの登録に失敗しました。'
    )
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeEnabled()
  })

  it('says the outcome is unknown when the answer timed out', async () => {
    setup({
      onRequestCopy: async () => {
        throw Object.assign(new Error('late'), { name: 'MbcTimeoutError' })
      },
    })
    await submit()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(
      '結果を確認できませんでした。コピー結果一覧で登録されたかを確認してください。'
    )
    expect(alert).not.toHaveTextContent('登録に失敗しました')
  })

  it('sends one request at a time', async () => {
    let finish = () => {}
    const onRequestCopy = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    setup({ onRequestCopy })
    await submit()
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeDisabled()
    await submit()
    expect(onRequestCopy).toHaveBeenCalledTimes(1)
    finish()
    expect(
      await screen.findByRole('link', { name: 'コピー結果を確認' })
    ).toBeVisible()
  })

  it('goes back to the setting', () => {
    setup()
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      `setting/${encodeURIComponent('MASTER#tenant-a#MASTER_SETTING#PRODUCT')}`
    )
  })

  it('has no axe violations and renders on the server', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <Host />
        </main>
      </MbcProvider>
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Chosen tenants' }))
    await userEvent.click(
      screen.getByRole('radio', { name: 'Chosen data only' })
    )
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
    expect(renderToString(<Host />)).toContain('コピー登録')
  })
})

describe('MasterCopyRequestForm with access', () => {
  const systems = [{ id: 'app-a', label: 'App A' }]
  const access = (systemId: string, settingCode: string) =>
    masterAccess(
      {
        enabled: true,
        grants: [{ systemId, settingCode, read: true, write: true }],
      },
      systems
    )

  it('offers the request with a */* write grant', () => {
    setup({ access: access('*', '*') })
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeEnabled()
  })

  it('offers no request without a */* write grant, and says why', () => {
    setup({ access: access('*', 'PRODUCT') })
    expect(screen.queryByRole('button', { name: 'コピー登録' })).toBeNull()
    expect(screen.getByText('この操作を行う権限がありません。')).toBeVisible()
  })

  it('waits for the grants before sending', () => {
    setup({ access: { ...OPEN_ACCESS, loading: true, systems } })
    expect(screen.getByRole('button', { name: 'コピー登録' })).toBeDisabled()
  })

  it('explains a refused copy even without access', async () => {
    setup({
      onRequestCopy: async () => {
        throw new MbcApiError(403, {})
      },
    })
    await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'この操作を行う権限がありません。'
    )
  })
})
