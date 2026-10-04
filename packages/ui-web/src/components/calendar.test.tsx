import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { V0 } from '../../test/v0-classes'
import { Calendar } from './calendar'

const OCTOBER = new Date(2026, 9, 1)

describe('Calendar', () => {
  it('marks its root and uses Japanese by default', () => {
    const { container } = render(<Calendar defaultMonth={OCTOBER} />)

    expect(container.querySelector('[data-slot="calendar"]')).toHaveAttribute(
      'data-mbc',
      ''
    )
    expect(screen.getByText('2026年10月')).toBeInTheDocument()
  })

  it('follows the provider locale', () => {
    render(
      <MbcProvider locale="en">
        <Calendar defaultMonth={OCTOBER} />
      </MbcProvider>
    )
    expect(screen.getByText('October 2026')).toBeInTheDocument()
  })

  it('styles the selected day with the v0 day-button classes', () => {
    const selected = new Date(2026, 9, 15)
    render(
      <Calendar mode="single" selected={selected} defaultMonth={OCTOBER} />
    )
    const day = document.querySelector(
      `[data-day="${selected.toDateString()}"]`
    )

    expect(day).toHaveAttribute('data-selected-single', 'true')
    for (const name of V0['calendar.day-button-extra'].split(' ')) {
      expect(day).toHaveClass(`mbc:${name}`)
    }
  })
})
