import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import type { SurveyAnswerValue } from '../answers/types'
import type {
  LongTextQuestion,
  ShortTextQuestion,
} from '../schema/survey-schema'
import { LongTextRenderer } from './long-text'
import { ShortTextRenderer } from './short-text'

function Harness<Q extends ShortTextQuestion | LongTextQuestion>({
  Renderer,
  question,
}: {
  Renderer: typeof ShortTextRenderer | typeof LongTextRenderer
  question: Q
}) {
  const [value, setValue] = useState<SurveyAnswerValue>(undefined)
  return (
    <>
      <Renderer
        question={question as never}
        value={value}
        onChange={setValue}
        onBlur={() => {}}
        disabled={false}
        invalid={false}
      />
      <output>{JSON.stringify(value ?? null)}</output>
    </>
  )
}

describe('text renderers', () => {
  it('edits a short answer with v0’s placeholder', async () => {
    render(
      <Harness
        Renderer={ShortTextRenderer}
        question={{ id: 'q', type: 'short-text', label: 'Q' }}
      />
    )
    await userEvent.type(screen.getByPlaceholderText('回答を入力...'), 'Ann')
    expect(screen.getByRole('status')).toHaveTextContent('"Ann"')
  })

  it('edits a long answer in a 5-row resizable textarea', async () => {
    render(
      <Harness
        Renderer={LongTextRenderer}
        question={{ id: 'q', type: 'long-text', label: 'Q' }}
      />
    )
    const textarea = screen.getByPlaceholderText('回答を入力...')
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toHaveClass('mbc:min-h-[120px]', 'mbc:resize-y')
    await userEvent.type(textarea, 'Line')
    expect(screen.getByRole('status')).toHaveTextContent('"Line"')
  })
})
