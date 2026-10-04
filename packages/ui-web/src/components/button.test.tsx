import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('renders a non-submitting button marked as a library root', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('data-mbc', '')
    expect(button).toHaveAttribute('data-slot', 'button')
  })

  it('keeps an explicit type', () => {
    render(<Button type="submit">Send</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('applies variant and size classes', () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>
    )
    const button = screen.getByRole('button')

    expect(button).toHaveClass('mbc:bg-destructive', 'mbc:h-8')
  })

  it('lets className override conflicting variant classes', () => {
    render(<Button className="mbc:px-8 host-extra">Wide</Button>)
    const button = screen.getByRole('button')

    expect(button).toHaveClass('mbc:px-8', 'host-extra')
    expect(button).not.toHaveClass('mbc:px-4')
  })

  it('forwards its ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref</Button>)

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders its child instead of a button when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/surveys">Surveys</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Surveys' })

    expect(link).toHaveClass('mbc:bg-primary')
    expect(link).toHaveAttribute('data-mbc', '')
    expect(link).not.toHaveAttribute('type')
  })

  it('is disabled and shows a spinner while loading', () => {
    render(<Button loading>Saving</Button>)
    const button = screen.getByRole('button')

    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).not.toBeNull()
  })

  it('stays disabled when disabled is passed explicitly', () => {
    render(<Button disabled>Off</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
