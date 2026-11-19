import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FakeJsonEditor } from '../../test/fake-json-editor'
import { SETTING_ROWS } from '../../test/fixtures/v0-lists'
import { masterAccess, OPEN_ACCESS } from '../core/access'
import {
  initialSettingListState,
  type MasterSettingListState,
} from '../core/list'
import type { MasterRouting } from '../routing/routing'
import {
  MasterSettingList,
  type MasterSettingListProps,
} from './master-setting-list'

const routing: MasterRouting = {
  href: (to) =>
    'settingId' in to
      ? `/${to.screen}/${encodeURIComponent(to.settingId)}`
      : `/${to.screen}`,
  navigate: vi.fn(),
}

function setup(overrides: Partial<MasterSettingListProps> = {}) {
  const onStateChange = vi.fn<(state: MasterSettingListState) => void>()
  const props: MasterSettingListProps = {
    items: SETTING_ROWS,
    total: 45,
    state: { ...initialSettingListState(), page: 2 },
    onStateChange,
    routing,
    ...overrides,
  }
  const view = render(<MasterSettingList {...props} />)
  return { onStateChange, props, ...view }
}

const last = (fn: { mock: { calls: unknown[][] } }) => fn.mock.calls.at(-1)?.[0]

describe('MasterSettingList', () => {
  it('lists settings with their own code linking to the data list', () => {
    setup()
    const table = screen.getByRole('table', { name: 'マスター設定一覧' })
    const link = within(table).getByRole('link', { name: 'PRODUCT' })
    expect(link).toHaveAttribute(
      'href',
      '/data/MASTER%23tenant-a%23MASTER_SETTING%23PRODUCT'
    )
    expect(
      within(table).getByRole('cell', { name: '商品マスタ' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: '都道府県' })
    ).toBeInTheDocument()
  })

  it('applies the typed filters on search and starts at page 1', async () => {
    const { onStateChange, props } = setup()
    await userEvent.type(screen.getByLabelText('コード'), 'PRO')
    await userEvent.type(screen.getByLabelText('名称'), '商')
    await userEvent.type(screen.getByLabelText('説明'), 'マスタ{Enter}')
    expect(last(onStateChange)).toEqual({
      ...props.state,
      code: 'PRO',
      name: '商',
      keyword: 'マスタ',
      page: 1,
    })
    expect(onStateChange).toHaveBeenCalledTimes(1)
  })

  it('imports with the host’s JSON editor', async () => {
    setup({ onImport: async () => {}, jsonEditor: FakeJsonEditor })
    await userEvent.click(screen.getByRole('button', { name: 'JSONエディタ' }))
    expect(screen.getByRole('textbox', { name: 'JSON' })).toHaveAttribute(
      'data-editor',
      'fake'
    )
  })

  it('clears the filters', async () => {
    const { onStateChange, props } = setup({
      state: { ...initialSettingListState(), code: 'X', page: 3 },
    })
    expect(screen.getByLabelText('コード')).toHaveValue('X')
    await userEvent.click(screen.getByRole('button', { name: 'クリア' }))
    expect(screen.getByLabelText('コード')).toHaveValue('')
    expect(last(onStateChange)).toEqual({ ...props.state, code: '', page: 1 })
  })

  it('sorts and pages through the state', async () => {
    const { onStateChange, props } = setup()
    await userEvent.click(screen.getByRole('button', { name: '名称' }))
    expect(last(onStateChange)).toEqual({
      ...props.state,
      sort: { column: 'name', desc: false },
      page: 1,
    })
    const [top] = screen.getAllByRole('navigation')
    await userEvent.click(within(top!).getByRole('link', { name: '3' }))
    expect(last(onStateChange)).toEqual({ ...props.state, page: 3 })
  })

  it('follows filters that change from outside, then keeps typing from them', async () => {
    const { rerender, props } = setup()
    rerender(
      <MasterSettingList {...props} state={{ ...props.state, name: '商品' }} />
    )
    const name = screen.getByLabelText('名称')
    expect(name).toHaveValue('商品')
    await userEvent.type(name, 'X')
    expect(name).toHaveValue('商品X')
  })

  it('links to the create screen and shows back only when asked', async () => {
    const onBack = vi.fn()
    const { rerender, props } = setup()
    expect(screen.getByRole('link', { name: '新規作成' })).toHaveAttribute(
      'href',
      '/newSetting'
    )
    expect(screen.queryByRole('button', { name: '戻る' })).toBeNull()
    rerender(<MasterSettingList {...props} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('offers the JSON editor only with an import handler, and reloads after it', async () => {
    const onImport = vi.fn(async () => {})
    const onImported = vi.fn()
    const { rerender, props } = setup()
    expect(screen.queryByRole('button', { name: 'JSONエディタ' })).toBeNull()
    rerender(
      <MasterSettingList
        {...props}
        onImport={onImport}
        onImported={onImported}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'JSONエディタ' }))
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImported).toHaveBeenCalledTimes(1)
  })

  it('says when loading failed and offers a reload', async () => {
    const onRetry = vi.fn()
    setup({ error: new Error('down'), onRetry })
    expect(screen.getByRole('alert')).toHaveTextContent(
      '読み込みに失敗しました。'
    )
    await userEvent.click(screen.getByRole('button', { name: '再読み込み' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows no “no data” row under a load failure', () => {
    setup({ error: new Error('down'), items: [], total: 0 })
    expect(screen.queryByText('データがありません')).toBeNull()
  })

  it('keeps v0’s layout', () => {
    setup()
    const form = screen.getByRole('search')
    const labels = screen.getByText('コード', { selector: 'label' })
    expect(labels).toHaveClass(
      'mbc:flex',
      'mbc:h-9',
      'mbc:items-center',
      'mbc:text-sm',
      'mbc:font-semibold'
    )
    expect(labels.parentElement).toHaveClass(
      'mbc:flex',
      'mbc:w-fit',
      'mbc:flex-col',
      'mbc:gap-4'
    )
    expect(
      within(form).getByRole('button', { name: '検索' }).parentElement
    ).toHaveClass(
      'mbc:mt-3',
      'mbc:flex',
      'mbc:justify-end',
      'mbc:gap-5',
      'mbc:px-3'
    )
    expect(
      screen.getByRole('link', { name: '新規作成' }).parentElement
    ).toHaveClass(
      'mbc:mx-3',
      'mbc:mb-2',
      'mbc:flex',
      'mbc:justify-end',
      'mbc:gap-2',
      'mbc:pt-3'
    )
  })

  it('has no axe violations and renders on the server', async () => {
    const props: MasterSettingListProps = {
      items: SETTING_ROWS,
      total: 2,
      state: initialSettingListState(),
      onStateChange: () => {},
      routing,
      onImport: async () => {},
      onBack: () => {},
    }
    render(
      <MbcProvider locale="en">
        <main>
          <MasterSettingList {...props} />
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
    expect(renderToString(<MasterSettingList {...props} />)).toContain(
      'PRODUCT'
    )
  })
})

describe('MasterSettingList with access', () => {
  const systems = [
    { id: 'app-a', label: 'App A' },
    { id: 'shared', label: '共通' },
  ]
  const grant = (systemId: string, write: boolean) => ({
    systemId,
    settingCode: '*',
    read: true,
    write,
  })
  const rows = [
    { ...SETTING_ROWS[0]!, systemId: 'app-a' },
    { ...SETTING_ROWS[1]! },
  ]

  it('shows no system filter or column without access, and keeps the state’s shape', async () => {
    // A host's own state, written before systemId existed.
    const { onStateChange, props } = setup({
      access: OPEN_ACCESS,
      state: { page: 1, pageSize: 20, code: '', name: '', keyword: '' },
    })
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'システム' })).toBeNull()
    await userEvent.type(screen.getByLabelText('コード'), 'P{Enter}')
    expect(last(onStateChange)).toEqual({ ...props.state, code: 'P', page: 1 })
    expect(last(onStateChange)).not.toHaveProperty('systemId')
  })

  it('filters by system and shows each row’s system, shared when it has none', async () => {
    const { onStateChange, props } = setup({
      items: rows,
      access: masterAccess(
        { enabled: true, grants: [grant('*', true)] },
        systems
      ),
    })
    const table = screen.getByRole('table', { name: 'マスター設定一覧' })
    expect(
      within(table).getByRole('columnheader', { name: 'システム' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: 'App A' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: '共通' })
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'システム' }))
    await userEvent.click(await screen.findByRole('option', { name: 'App A' }))
    await userEvent.click(screen.getByRole('button', { name: '検索' }))
    expect(last(onStateChange)).toEqual({
      ...props.state,
      systemId: 'app-a',
      page: 1,
    })
    await userEvent.click(screen.getByRole('button', { name: 'クリア' }))
    expect(last(onStateChange)).toEqual({
      ...props.state,
      systemId: '',
      page: 1,
    })
  })

  it('hides create and import when no system is writable', () => {
    setup({
      onImport: async () => {},
      access: masterAccess(
        { enabled: true, grants: [grant('*', false)] },
        systems
      ),
    })
    expect(screen.queryByRole('link', { name: '新規作成' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'JSONエディタ' })).toBeNull()
  })

  it('disables create and import while the grants load', () => {
    setup({
      onImport: async () => {},
      access: { ...OPEN_ACCESS, loading: true, systems },
    })
    expect(screen.getByRole('button', { name: '新規作成' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'JSONエディタ' })).toBeDisabled()
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
  })
})

it('has no axe violations with access and renders on the server', async () => {
  const props: MasterSettingListProps = {
    items: [{ ...SETTING_ROWS[0]!, systemId: 'app-a' }],
    total: 1,
    state: initialSettingListState(),
    onStateChange: () => {},
    routing,
    onImport: async () => {},
    access: masterAccess(
      {
        enabled: true,
        grants: [{ systemId: '*', settingCode: '*', read: true, write: true }],
      },
      [{ id: 'app-a', label: 'App A' }]
    ),
  }
  render(
    <main>
      <MasterSettingList {...props} />
    </main>
  )
  const result = await axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  })
  expect(result.violations.map((violation) => violation.id)).toEqual([])
  expect(renderToString(<MasterSettingList {...props} />)).toContain('App A')
})
