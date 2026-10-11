import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'

import { defaultSettingFields } from '../core/field-definition'
import type { SequenceFormat } from '../core/setting-form'
import type { MasterField } from '../core/types'
import { FieldDialog, type FieldDialogProps } from './field-dialog'

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
  { code: 'SEQ#ORDER', name: '注文番号', format: 'O-%%no%%' },
]

const [CODE, NAME] = defaultSettingFields as [MasterField, MasterField]

function setup(overrides: Partial<FieldDialogProps> = {}) {
  const onSubmit = vi.fn<FieldDialogProps['onSubmit']>()
  const onOpenChange = vi.fn<FieldDialogProps['onOpenChange']>()
  render(
    <FieldDialog
      open
      onOpenChange={onOpenChange}
      siblings={defaultSettingFields}
      formats={FORMATS}
      onSubmit={onSubmit}
      {...overrides}
    />
  )
  return { onSubmit, onOpenChange }
}

const input = (name: string) => screen.getByRole('textbox', { name })
const number = (name: string) => screen.getByRole('spinbutton', { name })
const submit = () =>
  userEvent.click(screen.getByRole('button', { name: '登録' }))

async function choose(label: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

describe('FieldDialog', () => {
  it('adds a field from the inputs its type uses', async () => {
    const { onSubmit, onOpenChange } = setup()
    expect(screen.getByRole('dialog', { name: '項目追加' })).toBeVisible()
    await userEvent.type(input('コード'), 'price')
    await userEvent.type(input('名称'), '価格')
    await choose('データ型', '数値')
    expect(screen.queryByRole('spinbutton', { name: '文字数' })).toBeNull()
    await userEvent.type(number('Min'), '0')
    await userEvent.type(number('Max'), '100')
    await userEvent.type(input('デフォルト値'), '10')
    await userEvent.click(screen.getByRole('switch', { name: '必須項目' }))
    await submit()
    expect(onSubmit).toHaveBeenCalledWith({
      physicalName: 'price',
      name: '価格',
      description: '',
      dataType: 'number',
      min: '0',
      max: '100',
      defaultValue: '10',
      isRequired: true,
      isShowedOnList: false,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows each type’s options and default input', async () => {
    setup()
    expect(number('文字数')).toBeInTheDocument()
    expect(input('正規表現パターン')).toBeInTheDocument()
    await choose('データ型', 'テキストエリア')
    expect(number('最大行数')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: '文字数' })).toBeNull()
    await choose('データ型', 'ブール値')
    expect(
      screen.getByRole('switch', { name: 'デフォルト値' })
    ).not.toBeChecked()
    await choose('データ型', '文字列(配列)')
    expect(screen.queryByLabelText('デフォルト値')).toBeNull()
    // Only the code field can be numbered automatically.
    await userEvent.click(screen.getByRole('combobox', { name: 'データ型' }))
    expect(screen.queryByRole('option', { name: '自動採番' })).toBeNull()
  })

  it('refuses a definition the setting cannot use and says why', async () => {
    const { onSubmit } = setup()
    await userEvent.type(input('コード'), 'name')
    await choose('データ型', 'JSON')
    await userEvent.type(input('デフォルト値'), '{{')
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    const code = input('コード')
    expect(code).toHaveAttribute('aria-invalid', 'true')
    expect(code).toHaveAccessibleDescription('同じ物理名の項目が既にあります。')
    expect(code).toHaveFocus()
    expect(input('名称')).toHaveAccessibleDescription('入力してください。')
    expect(input('デフォルト値')).toHaveAccessibleDescription(
      'デフォルト値は有効な JSON である必要があります。'
    )
  })

  it('keeps a fixed field’s name, flags and default, and offers its own types', async () => {
    const { onSubmit } = setup({
      field: CODE,
      siblings: defaultSettingFields.slice(1),
    })
    expect(screen.getByRole('dialog', { name: '項目編集' })).toBeVisible()
    expect(input('コード')).toBeDisabled()
    expect(screen.getByRole('switch', { name: '必須項目' })).toBeDisabled()
    expect(screen.queryByLabelText('デフォルト値')).toBeNull()
    await choose('データ型', '自動採番')
    await submit()
    expect(
      screen.getByRole('combobox', { name: 'フォーマット' })
    ).toHaveAccessibleDescription('選択してください。')
    await choose('フォーマット', '注文番号')
    await userEvent.type(input('接頭辞'), 'P-')
    await submit()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        physicalName: 'code',
        dataType: 'auto_number',
        formatCode: 'SEQ#ORDER',
        dataFormat: 'O-%%no%%',
        formatName: '注文番号',
        prefix: 'P-',
      })
    )
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty('length')
  })

  it('edits a field with its stored sequence chosen and unknown keys kept', async () => {
    const { onSubmit } = setup({
      field: {
        ...CODE,
        dataType: 'auto_number',
        dataFormat: '%%no%%',
        formatCode: 'SEQ#PRODUCT',
        extra: 'kept',
      },
      siblings: [NAME],
    })
    expect(
      screen.getByRole('combobox', { name: 'フォーマット' })
    ).toHaveTextContent('商品番号')
    await submit()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ extra: 'kept', formatCode: 'SEQ#PRODUCT' })
    )
  })

  it('cancels without saving', async () => {
    const { onSubmit, onOpenChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('has no axe violations', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <FieldDialog
            open
            onOpenChange={() => {}}
            siblings={[]}
            formats={FORMATS}
            onSubmit={() => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(screen.getByRole('dialog', { name: 'Add field' })).toBeVisible()
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })

  it('spaces its title, form and buttons apart, as 0.0.x did', () => {
    setup()
    expect(screen.getByRole('dialog')).toHaveClass('mbc:grid', 'mbc:gap-4')
  })
})
