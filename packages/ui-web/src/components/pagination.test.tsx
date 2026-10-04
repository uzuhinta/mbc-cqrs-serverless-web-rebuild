import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination'

function Pages() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

describe('Pagination', () => {
  it('labels navigation and arrows in Japanese by default', () => {
    render(<Pages />)
    const nav = screen.getByRole('navigation', { name: 'ページ送り' })

    expect(nav).toHaveAttribute('data-mbc', '')
    expectV0Classes(nav, V0['pagination.nav'])
    expectV0Classes(screen.getByRole('list'), V0['pagination.content'])
    expect(
      screen.getByRole('link', { name: '前のページへ' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '次のページへ' })
    ).toBeInTheDocument()
    expect(screen.getByText('省略されたページ')).toHaveClass('mbc:sr-only')
  })

  it('follows the provider locale', () => {
    render(
      <MbcProvider locale="en">
        <Pages />
      </MbcProvider>
    )
    expect(
      screen.getByRole('navigation', { name: 'pagination' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Go to next page' })
    ).toBeInTheDocument()
    expect(screen.getByText('More pages')).toBeInTheDocument()
  })

  it('marks the active page and adds the v0 link classes', () => {
    render(<Pages />)
    const active = screen.getByRole('link', { name: '2' })

    expect(active).toHaveAttribute('aria-current', 'page')
    for (const name of V0['pagination.link-extra'].split(' ')) {
      expect(active).toHaveClass(`mbc:${name}`)
    }
    expect(active).toHaveClass('mbc:border-brand')
    expect(active).not.toHaveClass('mbc:border-border')
    expect(screen.getByRole('link', { name: '前のページへ' })).toHaveClass(
      'mbc:border-border'
    )
  })
})
