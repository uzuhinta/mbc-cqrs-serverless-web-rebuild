import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion'

function Sections() {
  return (
    <Accordion type="multiple" defaultValue={['search']}>
      <AccordionItem value="search" data-testid="item">
        <AccordionTrigger>Search</AccordionTrigger>
        <AccordionContent className="mbc:flex">Filters</AccordionContent>
      </AccordionItem>
      <AccordionItem value="result">
        <AccordionTrigger>Result</AccordionTrigger>
        <AccordionContent>Rows</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

describe('Accordion', () => {
  it('keeps v0 classes and puts className on the inner div', () => {
    render(<Sections />)
    const trigger = screen.getByRole('button', { name: 'Search' })
    const inner = screen.getByText('Filters')

    expectV0Classes(screen.getByTestId('item'), V0['accordion.item'])
    expectV0Classes(trigger, V0['accordion.trigger'])
    expectV0Classes(inner.parentElement as HTMLElement, V0['accordion.content'])
    expect(inner).toHaveClass('mbc:pb-4', 'mbc:pt-0', 'mbc:flex')
    expect(trigger.closest('[data-mbc]')).not.toBeNull()
  })

  it('opens and closes sections from the keyboard', async () => {
    render(<Sections />)
    const search = screen.getByRole('button', { name: 'Search' })
    const result = screen.getByRole('button', { name: 'Result' })
    expect(search).toHaveAttribute('aria-expanded', 'true')
    expect(result).toHaveAttribute('aria-expanded', 'false')

    result.focus()
    await userEvent.keyboard('{Enter}')
    expect(result).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Rows')).toBeVisible()

    search.focus()
    await userEvent.keyboard(' ')
    expect(search).toHaveAttribute('aria-expanded', 'false')
  })
})
