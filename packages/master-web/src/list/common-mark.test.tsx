import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CommonMark } from './common-mark'

describe('CommonMark', () => {
  it('marks another tenant’s row as common', () => {
    render(<CommonMark rowTenant="common" tenantCode="tenant-a" />)
    expect(screen.getByText('共通')).toBeVisible()
  })

  it('marks nothing for the page’s own tenant in any case, or without tenants', () => {
    const { container, rerender } = render(
      <CommonMark rowTenant="tenant-a" tenantCode="TENANT-A" />
    )
    expect(container).toBeEmptyDOMElement()
    rerender(<CommonMark rowTenant={undefined} tenantCode="tenant-a" />)
    expect(container).toBeEmptyDOMElement()
    rerender(<CommonMark rowTenant="common" tenantCode={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
