import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { cn } from '../lib/cn'
import { badgeVariants } from './badge-variants'
import { buttonVariants } from './button-variants'

import { MbcProvider } from '../i18n/provider'
import { Field, FieldLabel } from './field'
import { MultiSelect, type MultiSelectOption } from './multi-select'

const OPTIONS: MultiSelectOption[] = [
  { value: 't1', label: 'Tokyo' },
  { value: 't2', label: 'Osaka' },
  { value: 't3', label: 'Osaka' },
]

function Harness({
  initial = [] as string[],
  locale = 'en' as 'en' | 'ja',
}: {
  initial?: string[]
  locale?: 'en' | 'ja'
}) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <MbcProvider locale={locale}>
      <Field>
        <FieldLabel>Tenants</FieldLabel>
        <MultiSelect options={OPTIONS} value={value} onValueChange={setValue} />
      </Field>
      <output>{JSON.stringify(value)}</output>
    </MbcProvider>
  )
}

const stored = () =>
  JSON.parse(document.querySelector('output')?.textContent ?? '[]') as string[]

describe('MultiSelect', () => {
  it('is a labelled combobox with a translated placeholder', () => {
    render(<Harness locale="ja" />)
    const trigger = screen.getByRole('combobox', { name: 'Tenants' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('選択してください')
    expect(trigger).toHaveClass(
      'mbc:h-auto',
      'mbc:w-full',
      'mbc:justify-between'
    )
  })

  it('wraps a long placeholder or many chips inside its box', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox', { name: 'Tenants' })).toHaveClass(
      'mbc:whitespace-normal',
      'mbc:text-left'
    )
  })

  it('searches and toggles options from the keyboard', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox', { name: 'Tenants' })
    trigger.focus()
    await userEvent.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await userEvent.keyboard('tok{Enter}')
    expect(stored()).toEqual(['t1'])
    expect(within(trigger).getByText('Tokyo')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Tokyo checked' })
    ).toBeInTheDocument()

    await userEvent.keyboard('{Enter}')
    expect(stored()).toEqual([])

    await userEvent.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('uses ui-web’s outline button and secondary badges (one shared look)', () => {
    render(<Harness initial={['t1']} />)
    const trigger = screen.getByRole('combobox', { name: 'Tenants' })
    const classes = (value: string) =>
      new Set(value.split(/\s+/).filter(Boolean))
    expect(classes(trigger.className)).toEqual(
      classes(
        cn(
          buttonVariants({ variant: 'outline' }),
          'mbc:h-auto mbc:w-full mbc:justify-between mbc:whitespace-normal mbc:text-left'
        )
      )
    )
    expect(classes(within(trigger).getByText('Tokyo').className)).toEqual(
      classes(cn(badgeVariants({ variant: 'secondary' }), 'mbc:mr-1'))
    )
  })

  it('forwards its ref and takes button props such as aria-label', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <MbcProvider locale="en">
        <MultiSelect
          ref={ref}
          aria-label="Targets"
          name="targets"
          options={OPTIONS}
          value={[]}
          onValueChange={() => {}}
        />
      </MbcProvider>
    )
    const trigger = screen.getByRole('combobox', { name: 'Targets' })
    expect(ref.current).toBe(trigger)
    expect(trigger).toHaveAttribute('name', 'targets')
  })

  it('names the open list and its search box', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Tenants' }))
    expect(screen.getByRole('dialog', { name: 'Options' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search...')).toHaveAccessibleName(
      'Search...'
    )
  })

  it('toggles only the chosen value when labels repeat', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Tenants' }))
    const [, second] = screen.getAllByRole('option', { name: 'Osaka' })
    await userEvent.click(second!)
    expect(stored()).toEqual(['t3'])
  })

  it('keeps values that are not in the options', async () => {
    render(<Harness initial={['gone']} />)
    const trigger = screen.getByRole('combobox', { name: 'Tenants' })
    expect(within(trigger).getByText('gone')).toBeInTheDocument()
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('option', { name: 'Tokyo' }))
    expect(stored()).toEqual(['gone', 't1'])
  })

  it('shows the empty state when nothing matches', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Tenants' }))
    await userEvent.keyboard('zzz')
    expect(screen.getByText('No data')).toBeInTheDocument()
  })
})
