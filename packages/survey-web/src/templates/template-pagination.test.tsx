import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TemplatePagination } from './template-pagination'

describe('TemplatePagination', () => {
  it('renders nothing for a single page (v0)', () => {
    const { container } = render(
      <TemplatePagination
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
      <TemplatePagination
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
      <TemplatePagination
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

  it('offers v0’s page sizes', async () => {
    const onPageSizeChange = vi.fn()
    render(
      <TemplatePagination
        page={1}
        pageSize={10}
        total={30}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
      />
    )
    await userEvent.click(
      screen.getByRole('combobox', { name: '1ページの件数' })
    )
    expect(
      (await screen.findAllByRole('option')).map((o) => o.textContent)
    ).toEqual([
      '10 / ページ',
      '20 / ページ',
      '50 / ページ',
      '100 / ページ',
      '300 / ページ',
      '500 / ページ',
    ])
    await userEvent.click(screen.getByRole('option', { name: '50 / ページ' }))
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })
})
