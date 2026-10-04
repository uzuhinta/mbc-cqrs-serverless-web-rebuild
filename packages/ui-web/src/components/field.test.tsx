import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Checkbox } from './checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  useFieldControl,
} from './field'
import { Input } from './input'
import { RadioGroup, RadioGroupItem } from './radio-group'

function Control(props: { id?: string; 'aria-describedby'?: string }) {
  const controlProps = useFieldControl(props)
  return <input {...controlProps} />
}

function Group() {
  const controlProps = useFieldControl({}, { group: true })
  return <div role="radiogroup" {...controlProps} />
}

describe('Field', () => {
  it('links label, description and error to the control', () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Control />
        <FieldDescription>Work address</FieldDescription>
        <FieldError>Required</FieldError>
      </Field>
    )
    const input = screen.getByLabelText('Email')
    const description = screen.getByText('Work address')
    const error = screen.getByText('Required')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute(
      'aria-describedby',
      `${description.id} ${error.id}`
    )
    expect(input).toHaveAccessibleDescription('Work address Required')
  })

  it('describes only the parts that are rendered', () => {
    render(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Control />
        <FieldError>{undefined}</FieldError>
      </Field>
    )
    const input = screen.getByLabelText('Name')

    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('keeps ids the caller passes and appends field ids', () => {
    render(
      <Field>
        <FieldLabel htmlFor="custom">Name</FieldLabel>
        <Control id="custom" aria-describedby="hint" />
        <FieldDescription>Shown</FieldDescription>
      </Field>
    )
    const input = screen.getByLabelText('Name')

    expect(input).toHaveAttribute('id', 'custom')
    expect(input.getAttribute('aria-describedby')).toMatch(/^hint \S+$/)
  })

  it('gives each field unique ids, also under StrictMode', () => {
    render(
      <StrictMode>
        <Field>
          <FieldLabel>First</FieldLabel>
          <Control />
        </Field>
        <Field>
          <FieldLabel>Second</FieldLabel>
          <Control />
        </Field>
      </StrictMode>
    )
    expect(screen.getByLabelText('First').id).not.toBe(
      screen.getByLabelText('Second').id
    )
  })

  it('labels a group control through aria-labelledby', () => {
    render(
      <Field>
        <FieldLabel>Colour</FieldLabel>
        <Group />
      </Field>
    )
    expect(
      screen.getByRole('radiogroup', { name: 'Colour' })
    ).toBeInTheDocument()
  })

  it('leaves controls outside a Field untouched', () => {
    render(<Control id="alone" />)
    const input = screen.getByRole('textbox')

    expect(input).toHaveAttribute('id', 'alone')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('marks the root and keeps v0 classes on text parts', () => {
    const { container } = render(
      <Field>
        <FieldDescription>Hint</FieldDescription>
        <FieldError>Bad</FieldError>
      </Field>
    )
    expect(container.firstElementChild).toHaveAttribute('data-mbc', '')
    expectV0Classes(screen.getByText('Hint'), V0['field.description'])
    expectV0Classes(screen.getByText('Bad'), V0['field.error'])
  })

  it('gives a RadioGroup the field ids but not the Input inside it', () => {
    render(
      <Field>
        <FieldLabel>Fruit</FieldLabel>
        <RadioGroup defaultValue="apple">
          <RadioGroupItem value="apple" aria-label="Apple" />
          <RadioGroupItem value="other" aria-label="Other" />
          <Input aria-label="Other fruit" />
        </RadioGroup>
      </Field>
    )
    const group = screen.getByRole('radiogroup', { name: 'Fruit' })
    const other = screen.getByRole('textbox', { name: 'Other fruit' })

    expect(other.id).not.toBe(group.id)
    expect(other).not.toHaveAttribute('aria-labelledby')
  })

  it('labels a set of checkboxes through FieldGroup without sharing ids', () => {
    render(
      <Field invalid>
        <FieldLabel>Colours</FieldLabel>
        <FieldGroup>
          <Checkbox aria-label="Red" />
          <Checkbox aria-label="Blue" />
        </FieldGroup>
        <FieldError>Pick one</FieldError>
      </Field>
    )
    const group = screen.getByRole('group', { name: 'Colours' })
    const [red, blue] = screen.getAllByRole('checkbox')

    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(group).toHaveAccessibleDescription('Pick one')
    expect(red?.id).toBeFalsy()
    expect(blue?.id).toBeFalsy()
  })
})
