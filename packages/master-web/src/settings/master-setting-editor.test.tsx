import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { V0_SETTING } from '../../test/fixtures/v0-master'
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
      '時間内に結果を確認できませんでした。'
    )
    expect(button('保存')).toBeEnabled()
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
