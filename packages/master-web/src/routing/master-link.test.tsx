import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MasterLink } from './master-link'
import type { MasterRouting, MasterTarget } from './routing'

const target: MasterTarget = {
  screen: 'dataItem',
  settingId: 'MASTER#t#MASTER_SETTING#P',
  id: 'MASTER#t#P#a/b',
}

function routing(overrides: Partial<MasterRouting> = {}): MasterRouting {
  return {
    href: (to) =>
      to.screen === 'dataItem'
        ? `/data/${encodeURIComponent(to.settingId)}/${encodeURIComponent(to.id)}`
        : '/',
    navigate: vi.fn(),
    ...overrides,
  }
}

describe('MasterLink', () => {
  it('renders the host’s Link with the target’s href', () => {
    const Link = ({
      href,
      className,
      children,
    }: {
      href: string
      className?: string
      children: ReactNode
    }) => (
      <a href={href} className={className} data-host-link="">
        {children}
      </a>
    )
    render(
      <MasterLink routing={routing({ Link })} to={target} className="x">
        P-001
      </MasterLink>
    )
    const link = screen.getByRole('link', { name: 'P-001' })
    expect(link).toHaveAttribute('data-host-link', '')
    expect(link).toHaveAttribute(
      'href',
      '/data/MASTER%23t%23MASTER_SETTING%23P/MASTER%23t%23P%23a%2Fb'
    )
    expect(link).toHaveClass('x')
  })

  it('without a Link, navigates on a plain click and leaves modified clicks to the browser', async () => {
    const host = routing()
    render(
      <MasterLink routing={host} to={target}>
        P-001
      </MasterLink>
    )
    const link = screen.getByRole('link', { name: 'P-001' })
    await userEvent.click(link)
    expect(host.navigate).toHaveBeenCalledWith(target)

    fireEvent.click(link, { ctrlKey: true })
    fireEvent.click(link, { button: 1 })
    expect(host.navigate).toHaveBeenCalledTimes(1)
  })
})
