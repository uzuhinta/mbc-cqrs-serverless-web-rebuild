import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Field, FieldError, FieldLabel } from './field'
import { Input } from './input'

describe('Input', () => {
  it('keeps v0 classes for the default size', () => {
    render(<Input placeholder="Type" />)
    expectV0Classes(screen.getByPlaceholderText('Type'), V0['input.md'])
  })

  it('marks its wrapper as a library root and forwards the ref', () => {
    const ref = createRef<HTMLInputElement>()
    const { container } = render(<Input ref={ref} />)

    expect(container.firstElementChild).toHaveAttribute('data-mbc', '')
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('applies size classes', () => {
    render(<Input size="lg" placeholder="Big" />)
    expect(screen.getByPlaceholderText('Big')).toHaveClass('mbc:h-[44px]')
  })

  it('shows the error icon when invalid inside a Field', () => {
    const { container } = render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Input />
        <FieldError>Required</FieldError>
      </Field>
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('hides the error icon when showIconError is false', () => {
    const { container } = render(
      <Input aria-invalid="true" showIconError={false} />
    )
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows a search icon on request', () => {
    const { container } = render(<Input showSearchIcon />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
