import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Field, FieldLabel } from './field'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('keeps v0 classes and marks its root', () => {
    render(<Textarea placeholder="Notes" />)
    const textarea = screen.getByPlaceholderText('Notes')

    expectV0Classes(textarea, V0.textarea)
    expect(textarea).toHaveAttribute('data-mbc', '')
  })

  it('is labelled by its Field and forwards the ref', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(
      <Field>
        <FieldLabel>Notes</FieldLabel>
        <Textarea ref={ref} />
      </Field>
    )
    expect(screen.getByLabelText('Notes')).toBe(ref.current)
  })
})
