import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { Badge } from './badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'
import { Separator } from './separator'
import { Skeleton } from './skeleton'

describe('Card', () => {
  it('keeps v0 classes on every part', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    )
    const card = screen.getByTestId('card')

    expectV0Classes(card, V0.card)
    expect(card).toHaveAttribute('data-mbc', '')
    expectV0Classes(screen.getByTestId('header'), V0['card.header'])
    expectV0Classes(screen.getByText('Title'), V0['card.title'])
    expectV0Classes(screen.getByText('Description'), V0['card.description'])
    expectV0Classes(screen.getByText('Action'), V0['card.action'])
    expectV0Classes(screen.getByText('Content'), V0['card.content'])
    expectV0Classes(screen.getByTestId('footer'), V0['card.footer'])
  })
})

describe('Alert', () => {
  it('announces itself and keeps v0 destructive classes', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Failed</AlertTitle>
        <AlertDescription>Try again</AlertDescription>
      </Alert>
    )
    const alert = screen.getByRole('alert')

    expect(alert).toHaveAttribute('data-mbc', '')
    expectV0Classes(alert, V0['alert.destructive'])
    expect(screen.getByText('Failed').tagName).toBe('H5')
    expectV0Classes(screen.getByText('Failed'), V0['alert.title'])
    expectV0Classes(screen.getByText('Try again'), V0['alert.description'])
  })
})

describe('Badge', () => {
  it('keeps v0 secondary classes and lets className win', () => {
    render(
      <Badge variant="secondary" className="mbc:px-2">
        New
      </Badge>
    )
    const badge = screen.getByText('New')

    expect(badge).toHaveAttribute('data-mbc', '')
    expect(badge).toHaveClass('mbc:px-2')
    expect(badge).not.toHaveClass('mbc:px-4')
  })

  it('matches v0 exactly without overrides', () => {
    render(<Badge variant="secondary">New</Badge>)
    expectV0Classes(screen.getByText('New'), V0['badge.secondary'])
  })

  it('renders its child with asChild', () => {
    render(
      <Badge asChild>
        <a href="/x">Link</a>
      </Badge>
    )
    expect(screen.getByRole('link', { name: 'Link' })).toHaveAttribute(
      'data-slot',
      'badge'
    )
  })
})

describe('Separator and Skeleton', () => {
  it('keep v0 classes and mark their roots', () => {
    render(
      <>
        <Separator data-testid="separator" />
        <Skeleton data-testid="skeleton" />
      </>
    )
    const separator = screen.getByTestId('separator')
    const skeleton = screen.getByTestId('skeleton')

    expectV0Classes(separator, V0.separator)
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
    expectV0Classes(skeleton, V0.skeleton)
    expect(skeleton).toHaveAttribute('data-mbc', '')
  })
})
