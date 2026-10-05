import { Input } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { V0 } from '../../test/v0-classes'
import { QuestionField } from './question-field'

function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

describe('QuestionField', () => {
  it('renders v0’s card with label, description and error wired to the control', () => {
    const { container } = render(
      <QuestionField
        questionId="q1"
        label="Email"
        description="Work address"
        required
        error="This question is required"
      >
        <Input />
      </QuestionField>
    )
    const card = container.querySelector('[data-question-id="q1"]')
    const input = screen.getByRole('textbox', { name: /Email/ })

    expect(classesOf(card)).toEqual(V0['question.card'].split(' ').sort())
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'Work address This question is required'
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This question is required'
    )
    expect(classesOf(screen.getByRole('alert'))).toEqual(
      V0['question.error'].split(' ').sort()
    )
    expect(classesOf(screen.getByText('Work address'))).toEqual(
      V0['question.description'].split(' ').sort()
    )
  })

  it('omits the error when there is none', () => {
    render(
      <QuestionField questionId="q1" label="Name">
        <Input />
      </QuestionField>
    )
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')
  })
})
