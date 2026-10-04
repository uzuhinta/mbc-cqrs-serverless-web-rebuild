import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Field, FieldLabel } from './field'
import { RadioGroup, RadioGroupItem } from './radio-group'

function Colours() {
  return (
    <Field>
      <FieldLabel>Colour</FieldLabel>
      <RadioGroup defaultValue="red">
        <RadioGroupItem value="red" aria-label="Red" />
        <RadioGroupItem value="blue" aria-label="Blue" />
      </RadioGroup>
    </Field>
  )
}

describe('RadioGroup', () => {
  it('keeps v0 classes on the group and items', () => {
    render(<Colours />)
    const group = screen.getByRole('radiogroup', { name: 'Colour' })

    expectV0Classes(group, V0['radio-group'])
    expect(group).toHaveAttribute('data-mbc', '')
    expectV0Classes(
      screen.getByRole('radio', { name: 'Red' }),
      V0['radio-group.item']
    )
  })

  it('moves the selection with arrow keys', async () => {
    render(<Colours />)
    const user = userEvent.setup()
    await user.tab()
    // Hold the key: Radix selects on the focus it moves in a timeout after
    // keydown, and user-event would otherwise release the key first.
    await user.keyboard('{ArrowDown>}')

    expect(screen.getByRole('radio', { name: 'Blue' })).toBeChecked()
    await user.keyboard('{/ArrowDown}')
  })
})
