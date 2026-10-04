import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Checkbox } from './checkbox'
import { Field, FieldLabel } from './field'

describe('Checkbox', () => {
  it('keeps v0 classes and marks its root', () => {
    render(<Checkbox aria-label="Agree" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Agree' })

    expectV0Classes(checkbox, V0.checkbox)
    expect(checkbox).toHaveAttribute('data-mbc', '')
  })

  it('toggles and reports the change', async () => {
    const changes: boolean[] = []
    render(
      <Checkbox
        aria-label="Agree"
        onCheckedChange={(value) => changes.push(value === true)}
      />
    )
    await userEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(changes).toEqual([true])
  })

  it('is labelled by its Field and forwards the ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Field invalid>
        <FieldLabel>Agree</FieldLabel>
        <Checkbox ref={ref} />
      </Field>
    )
    const checkbox = screen.getByRole('checkbox', { name: 'Agree' })

    expect(checkbox).toBe(ref.current)
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
  })
})
