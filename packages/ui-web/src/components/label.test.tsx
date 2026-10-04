import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Label } from './label'

describe('Label', () => {
  it('keeps v0 classes and marks its root', () => {
    render(<Label>Name</Label>)
    const label = screen.getByText('Name')

    expectV0Classes(label, V0.label)
    expect(label).toHaveAttribute('data-mbc', '')
  })

  it('shows a decorative asterisk and a translated required text', () => {
    render(
      <MbcProvider locale="en">
        <Label required>Name</Label>
      </MbcProvider>
    )
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('required')).toHaveClass('mbc:sr-only')
  })

  it('defaults the required text to Japanese', () => {
    render(<Label required>名前</Label>)
    expect(screen.getByText('必須')).toBeInTheDocument()
  })
})
