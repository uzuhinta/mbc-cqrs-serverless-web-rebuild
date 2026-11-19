import { MbcApiError } from '@mbc-cqrs-serverless/client-web'
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FakeJsonEditor } from '../../test/fake-json-editor'
import { V0_SETTING } from '../../test/fixtures/v0-master'
import { masterAccess, OPEN_ACCESS } from '../core/access'
import { parseMasterSetting } from '../core/parse'
import type {
  MasterSettingCreateBody,
  MasterSettingUpdateBody,
  SequenceFormat,
} from '../core/setting-form'
import type { MasterSetting } from '../core/types'
import type { MasterRouting } from '../routing/routing'
import {
  MasterSettingEditor,
  type MasterSettingEditorProps,
} from './master-setting-editor'

const routing: MasterRouting = {
  href: (to) =>
    'settingId' in to
      ? `/${to.screen}/${encodeURIComponent(to.settingId)}`
      : `/${to.screen}`,
  navigate: vi.fn(),
}

const FORMATS: SequenceFormat[] = [
  { code: 'MASTER_DATA#SEQ', name: '商品番号', format: '%%no%%' },
]

function stored(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

function setup(overrides: Partial<MasterSettingEditorProps> = {}) {
  const onSave = vi.fn<MasterSettingEditorProps['onSave']>(async () => {})
  const props: MasterSettingEditorProps = {
    mode: 'edit',
    setting: stored(),
    routing,
    tenantCode: 'tenant-a',
    formats: FORMATS,
    onSave,
    ...overrides,
  }
  render(<MasterSettingEditor {...props} />)
  return { onSave, props }
}

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })
const lastBody = (fn: { mock: { calls: unknown[][] } }) =>
  fn.mock.calls.at(-1)?.[0] as MasterSettingCreateBody & MasterSettingUpdateBody

describe('MasterSettingEditor', () => {
  it('creates a setting: checks the code is free, then saves v0’s body', async () => {
    const checkCodeUnique = vi.fn(async () => true)
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      checkCodeUnique,
    })
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
    expect(
      within(screen.getByRole('table', { name: '項目一覧' })).getAllByRole(
        'row'
      )
    ).toHaveLength(4)
    await userEvent.type(input('コード'), ' NEW ')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(checkCodeUnique).toHaveBeenCalledWith('NEW')
    const body = lastBody(onSave)
    expect(body).toMatchObject({ code: 'NEW', name: '新規' })
    expect(body.settingValue).toEqual(body.attributes)
    expect(body.attributes.fields.map((f) => f.physicalName)).toEqual([
      'code',
      'name',
      'seq',
    ])
  })

  it('creates a setting once while the code check is still running', async () => {
    const pending: Array<(free: boolean) => void> = []
    const checkCodeUnique = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          pending.push(resolve)
        })
    )
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      checkCodeUnique,
    })
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    await userEvent.click(button('保存'))
    expect(checkCodeUnique).toHaveBeenCalledTimes(1)
    for (const resolve of pending) resolve(true)
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
  })

  it('refuses an empty or taken code before saving', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      checkCodeUnique: async () => false,
    })
    await userEvent.click(button('保存'))
    expect(input('コード')).toHaveAccessibleDescription('入力してください。')
    expect(input('コード')).toHaveFocus()
    expect(input('名称')).toHaveAccessibleDescription('入力してください。')
    await userEvent.type(input('コード'), 'USED')
    await userEvent.type(input('名称'), '名前')
    await userEvent.click(button('保存'))
    expect(input('コード')).toHaveAccessibleDescription(
      '既にこのコードは登録されています。'
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('opens a stored setting for viewing, then edits and saves it', async () => {
    const { onSave } = setup()
    expect(input('コード')).toBeDisabled()
    expect(input('名称')).toBeDisabled()
    expect(input('名称')).toHaveValue('商品')
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    await userEvent.click(button('編集'))
    expect(input('コード')).toBeDisabled()
    expect(button('保存')).toBeDisabled()
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    const body = lastBody(onSave)
    expect(body).not.toHaveProperty('settingValue')
    expect(body).toMatchObject({ code: 'PRODUCT', name: '商品2' })
    expect(body.attributes.extraFlag).toBe(true)
    // Saved: back to viewing the new values.
    expect(await screen.findByRole('button', { name: '編集' })).toBeVisible()
    expect(input('名称')).toHaveValue('商品2')
  })

  it('cancels editing back to the stored values', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), 'X')
    await userEvent.click(button('キャンセル'))
    expect(input('名称')).toHaveValue('商品')
    expect(button('編集')).toBeVisible()
  })

  it('adds, edits and removes fields before saving', async () => {
    const { onSave } = setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('項目追加'))
    const dialog = screen.getByRole('dialog', { name: '項目追加' })
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'コード' }),
      'note'
    )
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: '名称' }),
      '追記'
    )
    await userEvent.click(within(dialog).getByRole('button', { name: '登録' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('cell', { name: 'note' })).toBeVisible()

    await userEvent.click(button('「価格」の操作'))
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }))
    expect(screen.queryByRole('cell', { name: 'price' })).toBeNull()

    await userEvent.click(button('「名称」の操作'))
    await userEvent.click(await screen.findByRole('menuitem', { name: '編集' }))
    const edit = screen.getByRole('dialog', { name: '項目編集' })
    await userEvent.type(
      within(edit).getByRole('textbox', { name: '名称' }),
      '!'
    )
    await userEvent.click(within(edit).getByRole('button', { name: '登録' }))

    await userEvent.click(button('保存'))
    const names = lastBody(onSave).attributes.fields.map((f) => f.name)
    expect(names).toContain('追記')
    expect(names).toContain('名称!')
    expect(names).not.toContain('価格')
  })

  it('returns focus to the button that opened the field dialog', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('項目追加'))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(button('項目追加')).toHaveFocus())

    await userEvent.click(button('「名称」の操作'))
    await userEvent.click(await screen.findByRole('menuitem', { name: '編集' }))
    const edit = screen.getByRole('dialog', { name: '項目編集' })
    await userEvent.click(
      within(edit).getByRole('button', { name: 'キャンセル' })
    )
    await waitFor(() => expect(button('「名称」の操作')).toHaveFocus())
  })

  it('moves focus to a neighbouring row’s actions after removing a field', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('「価格」の操作'))
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }))
    await waitFor(() => expect(button('「有効」の操作')).toHaveFocus())

    await userEvent.click(button('「SKU」の操作'))
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }))
    await waitFor(() => expect(button('「備考」の操作')).toHaveFocus())
  })

  it('edits the setting JSON in the host’s JSON editor', async () => {
    setup({ jsonEditor: FakeJsonEditor })
    await userEvent.click(button('編集'))
    await userEvent.click(button('JSONエディタ'))
    const json = screen.getByRole('textbox', { name: 'JSON' })
    expect(json).toHaveAttribute('data-editor', 'fake')
    expect(JSON.parse((json as HTMLTextAreaElement).value)).toMatchObject({
      code: 'PRODUCT',
    })
  })

  it('applies a setting JSON to the form, keeping the stored code', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('JSONエディタ'))
    const json = screen.getByRole('textbox', { name: 'JSON' })
    const current = JSON.parse((json as HTMLTextAreaElement).value)
    expect(current).toMatchObject({ code: 'PRODUCT', name: '商品' })

    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste('{"code":"P"}')
    await userEvent.click(button('データ反映'))
    expect(screen.getByRole('alert')).toHaveTextContent('JSON が無効です。')

    const next = { ...current, code: 'OTHER', name: '別名' }
    next.attributes.fields = next.attributes.fields.slice(0, 3)
    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste(JSON.stringify(next))
    await userEvent.click(button('データ反映'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(input('名称')).toHaveValue('別名')
    expect(input('コード')).toHaveValue('PRODUCT')
    expect(
      within(screen.getByRole('table', { name: '項目一覧' })).getAllByRole(
        'row'
      )
    ).toHaveLength(4)
  })

  it('deletes after confirmation and says when it failed', async () => {
    const onDelete = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce()
    setup({ onDelete })
    await userEvent.click(button('削除'))
    const confirm = screen.getByRole('alertdialog', {
      name: '削除してもよろしいですか？',
    })
    await userEvent.click(within(confirm).getByRole('button', { name: '削除' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'データ削除に失敗しました。'
    )
    await userEvent.click(button('削除'))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '削除',
      })
    )
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(2))
  })

  it('says when saving failed, and when the outcome is unknown', async () => {
    const timeout = Object.assign(new Error('late'), {
      name: 'MbcTimeoutError',
    })
    const onSave = vi
      .fn<MasterSettingEditorProps['onSave']>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(timeout)
    setup({ onSave })
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('データ更新に失敗しました。')
    expect(alert).toHaveTextContent(
      '入力内容を確認した上で再度やり直してください。'
    )
    await userEvent.click(button('保存'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '結果を確認できませんでした。'
    )
    expect(button('保存')).toBeEnabled()
  })

  it('treats its own tenant’s setting as its own in any case (the backend lowercases it)', () => {
    setup({
      setting: { ...stored(), tenantCode: 'tenant-a' },
      tenantCode: 'TENANT-A',
    })
    expect(button('編集')).toBeVisible()
    expect(
      screen.queryByText('他のテナントの設定のため、編集できません。')
    ).toBeNull()
  })

  it('opens another tenant’s setting read-only with a way back', () => {
    const setting = { ...stored(), tenantCode: 'common' }
    setup({ setting, onDelete: async () => {}, canCopy: true })
    expect(
      screen.getByText('他のテナントの設定のため、編集できません。')
    ).toBeVisible()
    // v0: in the button bar and below the form.
    for (const link of screen.getAllByRole('link', { name: '戻る' }))
      expect(link).toHaveAttribute('href', '/settings')
    for (const name of ['編集', '削除', 'テナントへコピー', '項目追加'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(input('名称')).toBeDisabled()
  })

  it('links to the copy screens only when copying is allowed', () => {
    setup({ canCopy: true })
    expect(
      screen.getByRole('link', { name: 'テナントへコピー' })
    ).toHaveAttribute('href', `/copyRequest/${encodeURIComponent(stored().id)}`)
    expect(
      screen.getByRole('link', { name: 'コピー結果を確認' })
    ).toHaveAttribute('href', `/copyTasks/${encodeURIComponent(stored().id)}`)
  })

  it('reads and saves the host’s option flags', async () => {
    const setting = stored()
    setting.attributes.flagA = true
    const { onSave } = setup({
      setting,
      settingOptions: [
        { key: 'flagA', label: 'フラグA' },
        { key: 'flagB', label: 'フラグB' },
      ],
    })
    expect(screen.getByRole('switch', { name: 'フラグA' })).toBeChecked()
    await userEvent.click(button('編集'))
    await userEvent.click(screen.getByRole('switch', { name: 'フラグB' }))
    await userEvent.click(button('保存'))
    expect(lastBody(onSave).attributes).toMatchObject({
      flagA: true,
      flagB: true,
    })
  })

  it('shows loading, then a load failure with a reload button', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <MasterSettingEditor
        mode="edit"
        routing={routing}
        loading
        onSave={async () => {}}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(
      <MasterSettingEditor
        mode="edit"
        routing={routing}
        error={new Error('x')}
        onRetry={onRetry}
        onSave={async () => {}}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      '読み込みに失敗しました。'
    )
    await userEvent.click(button('再読み込み'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the form on Edit, as the button it pressed goes', async () => {
    setup()
    await userEvent.click(button('編集'))
    await waitFor(() => expect(input('名称')).toHaveFocus())
  })

  it('names a new setting’s fixed fields in the screen’s language', () => {
    render(
      <MbcProvider locale="en">
        <MasterSettingEditor
          mode="create"
          routing={routing}
          tenantCode="tenant-a"
          onSave={async () => {}}
        />
      </MbcProvider>
    )
    for (const name of ['Code', 'Name', 'Order'])
      expect(screen.getByRole('cell', { name })).toBeVisible()
  })

  it('has no axe violations and renders on the server', async () => {
    const element = (
      <MbcProvider locale="en">
        <main>
          <MasterSettingEditor
            mode="edit"
            setting={stored()}
            routing={routing}
            tenantCode="tenant-a"
            canCopy
            onSave={async () => {}}
            onDelete={async () => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(renderToString(element)).toContain('Fields')
    render(element)
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})

describe('MasterSettingEditor with access', () => {
  const systems = [
    { id: 'app-a', label: 'App A' },
    { id: 'app-b', label: 'App B' },
    { id: 'shared', label: '共通' },
  ]
  const access = (
    grants: { systemId: string; settingCode: string; write: boolean }[]
  ) =>
    masterAccess(
      {
        enabled: true,
        grants: grants.map((grant) => ({ ...grant, read: true })),
      },
      systems
    )
  const owned = (): MasterSetting => ({ ...stored(), systemId: 'app-a' })

  it('creates with a chosen system, offering only writable ones', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      access: access([
        { systemId: 'app-a', settingCode: '*', write: true },
        { systemId: 'app-b', settingCode: 'ONE', write: true },
        { systemId: 'shared', settingCode: '*', write: false },
      ]),
    })
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'システム' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'システム' }))
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['App A', 'App B'])
    await userEvent.click(screen.getByRole('option', { name: 'App B' }))
    await userEvent.click(button('保存'))
    expect(lastBody(onSave)).toMatchObject({ code: 'NEW', systemId: 'app-b' })
  })

  it('preselects the only writable system', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      access: access([{ systemId: 'app-a', settingCode: '*', write: true }]),
    })
    expect(
      screen.getByRole('combobox', { name: 'システム' })
    ).toHaveTextContent('App A')
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(lastBody(onSave)).toMatchObject({ systemId: 'app-a' })
  })

  it('sends no systemId without access', async () => {
    const { onSave } = setup({ mode: 'create', setting: undefined })
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
    await userEvent.type(input('コード'), 'NEW')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(lastBody(onSave)).not.toHaveProperty('systemId')
  })

  it('shows a stored setting’s system and edits it with its write grant', () => {
    setup({
      setting: owned(),
      onDelete: async () => {},
      canCopy: true,
      access: access([{ systemId: '*', settingCode: '*', write: true }]),
    })
    expect(screen.getByText('App A')).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'システム' })).toBeNull()
    expect(button('編集')).toBeEnabled()
    expect(button('削除')).toBeEnabled()
    expect(screen.getByRole('link', { name: 'テナントへコピー' })).toBeVisible()
  })

  it('opens a setting it may not write read-only, keeping the copy results', () => {
    setup({
      setting: owned(),
      onDelete: async () => {},
      canCopy: true,
      access: access([{ systemId: 'app-b', settingCode: '*', write: true }]),
    })
    expect(screen.getByText('この操作を行う権限がありません。')).toBeVisible()
    for (const name of ['編集', '削除', '項目追加'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.queryByRole('link', { name: 'テナントへコピー' })).toBeNull()
    expect(screen.getByRole('link', { name: 'コピー結果を確認' })).toBeVisible()
  })

  it('still opens another tenant’s setting read-only for its tenant', () => {
    setup({
      setting: { ...owned(), tenantCode: 'common' },
      access: access([{ systemId: '*', settingCode: '*', write: true }]),
    })
    expect(
      screen.getByText('他のテナントの設定のため、編集できません。')
    ).toBeVisible()
  })

  it('offers the copy request only with a */* write grant', () => {
    setup({
      setting: owned(),
      canCopy: true,
      access: access([{ systemId: 'app-a', settingCode: '*', write: true }]),
    })
    expect(button('編集')).toBeEnabled()
    expect(screen.queryByRole('link', { name: 'テナントへコピー' })).toBeNull()
    expect(screen.getByRole('link', { name: 'コピー結果を確認' })).toBeVisible()
  })

  it('waits for the grants before editing', () => {
    setup({
      setting: owned(),
      onDelete: async () => {},
      canCopy: true,
      access: { ...OPEN_ACCESS, loading: true, systems },
    })
    expect(button('編集')).toBeDisabled()
    expect(button('削除')).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'テナントへコピー' })).toBeNull()
    expect(screen.queryByText('App A')).toBeNull()
  })

  it('explains a refused save', async () => {
    const onSave = vi
      .fn<MasterSettingEditorProps['onSave']>()
      .mockRejectedValueOnce(new MbcApiError(403, {}))
      .mockRejectedValueOnce(
        new MbcApiError(400, { message: 'systemId conflicts' })
      )
    setup({
      setting: owned(),
      onSave,
      access: access([{ systemId: 'app-a', settingCode: '*', write: true }]),
    })
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'この操作を行う権限がありません。'
    )
    await userEvent.click(button('保存'))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('systemId conflicts')
    )
  })

  it('has no axe violations when creating with access', async () => {
    setup({
      mode: 'create',
      setting: undefined,
      access: access([{ systemId: '*', settingCode: '*', write: true }]),
    })
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
  })
})
