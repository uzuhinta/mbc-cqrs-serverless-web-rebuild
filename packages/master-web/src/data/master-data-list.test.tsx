import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DATA_ROWS } from '../../test/fixtures/v0-lists'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { initialDataListState, type MasterDataListState } from '../core/list'
import { parseMasterSetting } from '../core/parse'
import type { MasterSetting } from '../core/types'
import type { MasterRouting } from '../routing/routing'
import { MasterDataList, type MasterDataListProps } from './master-data-list'

function setting(): MasterSetting {
  const result = parseMasterSetting(V0_SETTING)
  if (!result.success) throw result.error
  return result.data
}

const routing: MasterRouting = {
  href: (to) =>
    [to.screen, 'settingId' in to ? to.settingId : '', 'id' in to ? to.id : '']
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/'),
  navigate: vi.fn(),
}

function setup(overrides: Partial<MasterDataListProps> = {}) {
  const onStateChange = vi.fn<(state: MasterDataListState) => void>()
  const props: MasterDataListProps = {
    setting: setting(),
    items: DATA_ROWS,
    total: 2,
    state: initialDataListState(),
    onStateChange,
    routing,
    ...overrides,
  }
  const view = render(<MasterDataList {...props} />)
  return { onStateChange, props, ...view }
}

const last = (fn: { mock: { calls: unknown[][] } }) => fn.mock.calls.at(-1)?.[0]

describe('MasterDataList', () => {
  it('keeps the setting details closed and opens them with a link to the setting', async () => {
    setup()
    const header = screen.getByRole('button', { name: 'PRODUCT:商品 設定情報' })
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getByRole('button', { name: 'データを検索する' })
    ).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(header)
    expect(screen.getByText('商品マスタ')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '詳細' })).toHaveAttribute(
      'href',
      'setting/MASTER%23tenant-a%23MASTER_SETTING%23PRODUCT'
    )
  })

  it('shows the fields marked for the list, formatted by type', () => {
    setup()
    const table = screen.getByRole('table', { name: 'データ一覧' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
    ).toEqual(['コード', '名称', '並び順', '価格', '発売日'])
    const link = within(table).getByRole('link', { name: 'P-001' })
    expect(link).toHaveAttribute(
      'href',
      'dataItem/MASTER%23tenant-a%23MASTER_SETTING%23PRODUCT/MASTER%23tenant-a%23PRODUCT%23P-001'
    )
    expect(
      within(table).getByRole('link', { name: 'P/002' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: '2026年10月07日' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: '1200' })
    ).toBeInTheDocument()
  })

  it('adds code and name columns when the setting has no such fields (v0)', () => {
    const bare = setting()
    bare.attributes.fields = bare.attributes.fields.filter(
      (field) => !['code', 'name'].includes(field.physicalName)
    )
    setup({ setting: bare })
    expect(
      screen.getAllByRole('columnheader').map((cell) => cell.textContent)
    ).toEqual(['コード', '名称', '並び順', '価格', '発売日'])
  })

  it('searches by code, name and deleted records, and clears', async () => {
    const { onStateChange, props } = setup({
      state: { ...initialDataListState(), page: 4 },
    })
    await userEvent.type(screen.getByLabelText('コード'), 'P')
    await userEvent.type(screen.getByLabelText('名称'), 'りん')
    await userEvent.click(screen.getByRole('switch', { name: '削除済み含む' }))
    await userEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(last(onStateChange)).toEqual({
      ...props.state,
      code: 'P',
      keyword: 'りん',
      isDeleted: true,
      page: 1,
    })
    await userEvent.click(screen.getByRole('button', { name: 'クリア' }))
    expect(last(onStateChange)).toEqual({ ...props.state, page: 1 })
    expect(
      screen.getByRole('switch', { name: '削除済み含む' })
    ).not.toBeChecked()
  })

  it('sorts by code and pages through the state', async () => {
    const { onStateChange, props } = setup({ total: 45 })
    await userEvent.click(screen.getByRole('button', { name: 'コード' }))
    expect(last(onStateChange)).toEqual({
      ...props.state,
      sort: { column: 'code', desc: false },
      page: 1,
    })
    const [, bottom] = screen.getAllByRole('navigation')
    await userEvent.click(within(bottom!).getByRole('link', { name: '2' }))
    expect(last(onStateChange)).toEqual({ ...props.state, page: 2 })
  })

  it('links to a new record and back to the settings', () => {
    setup()
    expect(screen.getByRole('link', { name: '新規登録' })).toHaveAttribute(
      'href',
      'newData/MASTER%23tenant-a%23MASTER_SETTING%23PRODUCT'
    )
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      'settings'
    )
  })

  it('imports this setting’s data, starting from a sample with its code', async () => {
    setup({ onImport: async () => {} })
    await userEvent.click(screen.getByRole('button', { name: 'JSONエディタ' }))
    const json = JSON.parse(
      (screen.getByRole('textbox', { name: 'JSON' }) as HTMLTextAreaElement)
        .value
    )
    expect(json[0].settingCode).toBe('PRODUCT')
  })

  it('says when loading failed', () => {
    setup({ error: new Error('down') })
    expect(screen.getByRole('alert')).toHaveTextContent(
      '読み込みに失敗しました。'
    )
  })

  it('keeps v0’s dark section headers', () => {
    setup()
    expect(screen.getByRole('button', { name: 'データ一覧' })).toHaveClass(
      'mbc:bg-emphasis',
      'mbc:text-emphasis-foreground',
      'mbc:px-6',
      'mbc:py-3',
      'mbc:text-lg'
    )
  })

  it('has no axe violations and renders on the server', async () => {
    const props: MasterDataListProps = {
      setting: setting(),
      items: DATA_ROWS,
      total: 2,
      state: initialDataListState(),
      onStateChange: () => {},
      routing,
      onImport: async () => {},
    }
    render(
      <MbcProvider locale="en">
        <main>
          <MasterDataList {...props} />
        </main>
      </MbcProvider>
    )
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
    expect(renderToString(<MasterDataList {...props} />)).toContain('りんご')
  })
})
