import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { PaginationBar } from './pagination-bar'

describe('PaginationBar', () => {
  it('renders nothing for a single page (survey v0)', () => {
    const { container } = render(
      <PaginationBar
        page={1}
        pageSize={10}
        total={10}
        onPageChange={() => {}}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('changes page from the mouse and the keyboard, and marks the current page', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationBar
        page={2}
        pageSize={10}
        total={95}
        onPageChange={onPageChange}
      />
    )
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await userEvent.click(screen.getByRole('link', { name: '3' }))
    screen.getByRole('link', { name: '1' }).focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(screen.getByRole('link', { name: '次のページへ' }))
    expect(onPageChange.mock.calls).toEqual([[3], [1], [3]])
  })

  it('disables Previous on the first page', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationBar
        page={1}
        pageSize={10}
        total={30}
        onPageChange={onPageChange}
      />
    )
    const previous = screen.getByRole('link', { name: '前のページへ' })
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(previous)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('offers the page sizes it is given', async () => {
    const onPageSizeChange = vi.fn()
    render(
      <PaginationBar
        page={1}
        pageSize={10}
        total={30}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[10, 20]}
      />
    )
    await userEvent.click(
      screen.getByRole('combobox', { name: '1ページの件数' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: '20 / ページ' })
    )
    expect(onPageSizeChange).toHaveBeenCalledWith(20)
  })

  it('takes its own name', () => {
    render(
      <PaginationBar
        label="下部のページ送り"
        page={1}
        pageSize={10}
        total={30}
        onPageChange={() => {}}
      />
    )
    expect(
      screen.getByRole('navigation', { name: '下部のページ送り' })
    ).toBeInTheDocument()
  })

  describe('table variant (master v0)', () => {
    it('shows the result count and stays visible with one page or none', () => {
      const { rerender } = render(
        <PaginationBar
          variant="table"
          page={1}
          pageSize={10}
          total={0}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )
      const bar = screen.getByRole('navigation', { name: 'ページ送り' })
      expect(within(bar).getByText('検索件数:0')).toBeInTheDocument()
      expect(within(bar).queryByRole('link')).toBeNull()
      expect(
        within(bar).getByRole('combobox', { name: '1ページの件数' })
      ).toBeInTheDocument()
      expect(within(bar).queryByRole('spinbutton')).toBeNull()

      rerender(
        <PaginationBar
          variant="table"
          page={1}
          pageSize={10}
          total={25}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )
      const order = Array.from(bar.children).map(
        (child) => child.getAttribute('data-part') ?? child.tagName
      )
      expect(order).toEqual(['total', 'UL', 'size', 'jump'])
    })

    it('jumps to a typed page and ignores pages that do not exist', async () => {
      const onPageChange = vi.fn()
      render(
        <MbcProvider locale="en">
          <PaginationBar
            variant="table"
            page={1}
            pageSize={10}
            total={95}
            onPageChange={onPageChange}
          />
        </MbcProvider>
      )
      expect(screen.getByText('95 results')).toBeInTheDocument()
      const jump = screen.getByRole('spinbutton', { name: 'Go to page (1–10)' })
      await userEvent.type(jump, '11{Enter}')
      await userEvent.type(jump, '3{Enter}')
      expect(onPageChange.mock.calls).toEqual([[3]])
      expect(jump).toHaveValue(null)
    })
  })
})
