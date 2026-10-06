import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

describe('Table', () => {
  it('keeps v0 classes on every part and marks the container', () => {
    render(
      <Table aria-label="People">
        <TableCaption>Caption</TableCaption>
        <TableHeader data-testid="thead">
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody data-testid="tbody">
          <TableRow data-testid="row" data-state="selected">
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter data-testid="tfoot">
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    const table = screen.getByRole('table', { name: 'People' })
    const container = table.parentElement as HTMLElement

    expectV0Classes(table, V0.table)
    expectV0Classes(container, V0['table.container'])
    expect(container).toHaveAttribute('data-mbc', '')
    expectV0Classes(screen.getByTestId('thead'), V0['table.header'])
    expectV0Classes(screen.getByTestId('tbody'), V0['table.body'])
    expectV0Classes(screen.getByTestId('tfoot'), V0['table.footer'])
    expectV0Classes(screen.getByTestId('row'), V0['table.row'])
    expectV0Classes(
      screen.getByRole('columnheader', { name: 'Name' }),
      V0['table.head']
    )
    expectV0Classes(
      screen.getByRole('cell', { name: 'Alice' }),
      V0['table.cell']
    )
    expectV0Classes(screen.getByText('Caption'), V0['table.caption'])
  })

  it('merges a caller className after v0 classes', () => {
    render(
      <Table>
        <TableBody>
          <TableRow className="mbc:h-12">
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByRole('row')).toHaveClass('mbc:h-12', 'mbc:border-b')
  })
})
