import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { defaultSettingFields } from '../core/field-definition'
import type { SequenceFormat } from '../core/setting-form'
import type { MasterField } from '../core/types'
import {
  FieldsTable,
  type FieldRow,
  type FieldsTableProps,
} from './fields-table'

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
]

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'memo',
  name: 'メモ',
  description: '',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
  ...overrides,
})

const ROWS: FieldRow[] = [
  {
    key: 'f0',
    field: {
      ...defaultSettingFields[0]!,
      dataType: 'auto_number',
      formatCode: 'SEQ#PRODUCT',
    },
  },
  { key: 'f1', field: defaultSettingFields[1]! },
  {
    key: 'f2',
    field: field({
      physicalName: 'price',
      name: '価格',
      dataType: 'number',
      min: '1',
      max: '10',
      isRequired: true,
    }),
  },
  {
    key: 'f3',
    field: field({
      physicalName: 'released',
      name: '発売日',
      dataType: 'date',
      defaultValue: '2026-10-07T00:00:00+09:00',
      isShowedOnList: true,
    }),
  },
]

function setup(overrides: Partial<FieldsTableProps> = {}) {
  const props = {
    onMove: vi.fn<FieldsTableProps['onMove']>(),
    onEdit: vi.fn<FieldsTableProps['onEdit']>(),
    onRemove: vi.fn<FieldsTableProps['onRemove']>(),
  }
  render(
    <FieldsTable
      rows={ROWS}
      formats={FORMATS}
      readOnly={false}
      {...props}
      {...overrides}
    />
  )
  return props
}

const table = () => screen.getByRole('table', { name: '項目一覧' })
const row = (name: string) =>
  within(table()).getByRole('cell', { name }).closest('tr')!

function stackRects() {
  const rows = () => [...document.querySelectorAll<HTMLElement>('tbody tr')]
  for (const element of rows()) {
    element.getBoundingClientRect = () => {
      const top = rows().indexOf(element) * 50
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        bottom: top + 40,
        right: 800,
        width: 800,
        height: 40,
        toJSON: () => ({}),
      } as DOMRect
    }
  }
}

describe('FieldsTable', () => {
  it('shows v0’s columns: type, sequence, range, default and the two flags', () => {
    setup()
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(headers).toEqual([
      '並べ替え',
      'コード',
      '名称',
      '説明',
      'データ型',
      'フォーマット',
      'Min/Max文字数',
      'デフォルト値',
      '必須',
      '一覧表示',
      'アクション',
    ])
    expect(row('code')).toHaveTextContent('自動採番')
    expect(row('code')).toHaveTextContent('商品番号')
    expect(row('name')).toHaveTextContent('255')
    expect(row('price')).toHaveTextContent('1 ~ 10')
    expect(row('released')).toHaveTextContent('2026年10月07日')
    const flags = (name: string) =>
      within(row(name))
        .getAllByRole('cell')
        .slice(8, 10)
        .map((cell) => cell.textContent)
    expect(flags('price')).toEqual(['◯はい', ''])
    expect(flags('released')).toEqual(['', '◯はい'])
  })

  it('scrolls on a phone: the table keeps its width, columns stay in view from md up', () => {
    setup()
    expect(table()).toHaveClass('mbc:w-max', 'mbc:min-w-full')
    const [handle, code, name] = within(table()).getAllByRole('columnheader')
    for (const header of [handle, code, name])
      expect(header).toHaveClass('mbc:md:sticky')
    expect(code).not.toHaveClass('mbc:sticky')
    expect(within(row('price')).getByText('1 ~ 10')).toHaveClass(
      'mbc:whitespace-nowrap'
    )
  })

  it('edits any field and removes all but the fixed ones from the row menu', async () => {
    const { onEdit, onRemove } = setup()
    await userEvent.click(
      screen.getByRole('button', { name: '「価格」の操作' })
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }))
    expect(onRemove).toHaveBeenCalledWith('f2')
    await userEvent.click(
      screen.getByRole('button', { name: '「名称」の操作' })
    )
    expect(screen.queryByRole('menuitem', { name: '削除' })).toBeNull()
    await userEvent.click(screen.getByRole('menuitem', { name: '編集' }))
    expect(onEdit).toHaveBeenCalledWith('f1')
  })

  it('moves a field with the keyboard and says so', async () => {
    const { onMove } = setup()
    stackRects()
    const handle = screen.getByRole('button', {
      name: '「価格」をドラッグして並べ替え',
    })
    expect(handle).toHaveAttribute('aria-roledescription', '並べ替え可能')
    handle.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowUp}')
    expect(
      await screen.findByText('「価格」を「名称」の位置に移動しました。')
    ).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(onMove).toHaveBeenCalledWith(2, 1)
  })

  it('offers no moves or changes when read-only', () => {
    setup({ readOnly: true })
    for (const button of within(table()).getAllByRole('button'))
      expect(button).toBeDisabled()
  })

  it('has no axe violations and renders on the server', async () => {
    const element = (
      <MbcProvider locale="en">
        <main>
          <FieldsTable
            rows={ROWS}
            formats={FORMATS}
            readOnly={false}
            onMove={() => {}}
            onEdit={() => {}}
            onRemove={() => {}}
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
