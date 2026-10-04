import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Field, FieldLabel } from './field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select'

function Fruit(props: {
  onValueChange?: (value: string) => void
  open?: boolean
}) {
  return (
    <Field invalid>
      <FieldLabel>Fruit</FieldLabel>
      <Select defaultOpen={props.open} onValueChange={props.onValueChange}>
        <SelectTrigger size="lg">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="pear" disabled>
              Pear
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

describe('Select', () => {
  it('labels the trigger from its Field and keeps v0 classes', () => {
    render(<Fruit />)
    const trigger = screen.getByRole('combobox', { name: 'Fruit' })

    expectV0Classes(trigger, V0['select.trigger'])
    expect(trigger).toHaveAttribute('data-mbc', '')
    expect(trigger).toHaveAttribute('data-size', 'lg')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders open content as a library root with v0 classes', () => {
    render(<Fruit open />)
    const listbox = screen.getByRole('listbox')
    const content = listbox.closest('[data-slot="select-content"]')

    expect(content).toHaveAttribute('data-mbc', '')
    expectV0Classes(content as Element, V0['select.content'])
    expectV0Classes(
      screen.getByRole('option', { name: 'Apple' }),
      V0['select.item']
    )
    expectV0Classes(screen.getByText('Fruits'), V0['select.label'])
    expect(screen.getByRole('option', { name: 'Pear' })).toHaveAttribute(
      'data-disabled'
    )
  })

  it('reports the chosen value', async () => {
    const chosen: string[] = []
    render(<Fruit open onValueChange={(value) => chosen.push(value)} />)
    await userEvent.click(screen.getByRole('option', { name: 'Apple' }))

    expect(chosen).toEqual(['apple'])
  })
})
