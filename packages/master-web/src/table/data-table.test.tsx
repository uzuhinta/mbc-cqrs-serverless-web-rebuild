import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type DataTableSort,
} from './data-table'

type Row = { id: string; code: string; name: string }

const ROWS: Row[] = [
  { id: 'a', code: 'A-1', name: 'りんご' },
  { id: 'b', code: 'B-2', name: 'みかん' },
]
const COLUMNS: DataTableColumn<Row>[] = [
  {
    id: 'code',
    header: 'コード',
    sortable: true,
    width: '25%',
    cell: (row) => row.code,
  },
  { id: 'name', header: '名称', sortable: true, cell: (row) => row.name },
  { id: 'memo', header: '説明', cell: () => '—' },
]

function table(overrides: Partial<DataTableProps<Row>> = {}) {
  return (
    <DataTable
      label="データ一覧"
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.id}
      total={25}
      page={1}
      pageSize={10}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      {...overrides}
    />
  )
}

describe('DataTable', () => {
  it('shows rows, column widths and which column is sorted', () => {
    render(
      table({ sort: { column: 'code', desc: false }, onSortChange: () => {} }),
    )
    const grid = screen.getByRole('table', { name: 'データ一覧' })
    expect(within(grid).getByRole('cell', { name: 'B-2' })).toBeInTheDocument()
    const [code, name, memo] = within(grid).getAllByRole('columnheader')
    expect(code).toHaveAttribute('aria-sort', 'ascending')
    expect(code).toHaveStyle({ width: '25%' })
    expect(name).toHaveAttribute('aria-sort', 'none')
    expect(memo).not.toHaveAttribute('aria-sort')
    expect(within(memo!).queryByRole('button')).toBeNull()
  })

  it('sorts a column ascending first, then flips it (v0)', async () => {
    const onSortChange = vi.fn<(sort: DataTableSort) => void>()
    const { rerender } = render(table({ onSortChange }))
    await userEvent.click(screen.getByRole('button', { name: '名称' }))
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      desc: false,
    })
    rerender(table({ onSortChange, sort: { column: 'name', desc: false } }))
    await userEvent.click(screen.getByRole('button', { name: '名称' }))
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      desc: true,
    })
    rerender(table({ onSortChange, sort: { column: 'name', desc: true } }))
    await userEvent.click(screen.getByRole('button', { name: '名称' }))
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      desc: false,
    })
  })

  it('puts a pagination bar above and below the table, each with its own name', async () => {
    const onPageChange = vi.fn()
    render(table({ onPageChange }))
    const top = screen.getByRole('navigation', { name: '上部のページ送り' })
    const bottom = screen.getByRole('navigation', { name: '下部のページ送り' })
    expect(within(top).getByText('検索件数:25')).toBeInTheDocument()
    await userEvent.click(within(bottom).getByRole('link', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('says when there is no data, and shows a loading row instead while loading', () => {
    const { rerender } = render(table({ rows: [], total: 0 }))
    expect(screen.getByText('データがありません')).toBeInTheDocument()
    rerender(table({ rows: [], total: 0, loading: true }))
    expect(screen.queryByText('データがありません')).toBeNull()
    expect(
      screen.getByRole('status', { name: '読み込み中' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('selects rows one by one or the whole page', async () => {
    function Selectable() {
      const [selection, setSelection] = useState<Set<string>>(new Set())
      return (
        <>
          {table({ selection, onSelectionChange: setSelection })}
          <output>{[...selection].join(',')}</output>
        </>
      )
    }
    render(<Selectable />)
    const all = screen.getByRole('checkbox', { name: 'このページをすべて選択' })
    const [first] = screen.getAllByRole('checkbox', { name: 'この行を選択' })
    await userEvent.click(first!)
    expect(document.querySelector('output')).toHaveTextContent('a')
    expect(all).toHaveAttribute('data-state', 'indeterminate')
    expect(first!.closest('tr')).toHaveAttribute('data-state', 'selected')
    await userEvent.click(all)
    expect(document.querySelector('output')).toHaveTextContent('a,b')
    await userEvent.click(all)
    expect(document.querySelector('output')).toHaveTextContent('')
  })

  it('has no axe violations and renders on the server', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          {table({ onSortChange: () => {}, onSelectionChange: () => {} })}
        </main>
      </MbcProvider>,
    )
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
    expect(renderToString(table())).toContain('りんご')
  })
})
