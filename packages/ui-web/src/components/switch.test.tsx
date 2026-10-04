import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Field, FieldLabel } from './field'
import { Switch } from './switch'

describe('Switch', () => {
  it('keeps v0 classes on root and thumb', () => {
    render(<Switch aria-label="Notify" />)
    const control = screen.getByRole('switch', { name: 'Notify' })

    expectV0Classes(control, V0.switch)
    expect(control).toHaveAttribute('data-mbc', '')
    expectV0Classes(control.firstElementChild as Element, V0['switch.thumb'])
  })

  it('is labelled by its Field and toggles', async () => {
    render(
      <Field>
        <FieldLabel>Notify</FieldLabel>
        <Switch />
      </Field>
    )
    await userEvent.click(screen.getByRole('switch', { name: 'Notify' }))
    expect(screen.getByRole('switch')).toBeChecked()
  })
})
