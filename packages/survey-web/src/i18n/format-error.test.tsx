import { MbcProvider, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { formatAnswerError } from './format-error'
import { surveyMessages } from './survey-messages'

function Probe() {
  const t = useMessages(surveyMessages)
  return (
    <p>
      {formatAnswerError({ key: 'required' }, t.validation)}|
      {formatAnswerError(
        { key: 'choiceCount', params: { rule: 'max', value: 2 } },
        t.validation
      )}
      |{formatAnswerError({ key: 'custom', message: '独自' }, t.validation)}|
      {t.form.submit}
    </p>
  )
}

describe('survey messages', () => {
  it('uses v0’s Japanese strings by default', () => {
    render(<Probe />)
    expect(
      screen.getByText(
        'この質問は必須です|2個以下で選択してください|独自|アンケートを送信'
      )
    ).toBeInTheDocument()
  })

  it('switches to English and accepts overrides', () => {
    render(
      <MbcProvider
        locale="en"
        messages={{ survey: { form: { submit: 'Send' } } }}
      >
        <Probe />
      </MbcProvider>
    )
    expect(
      screen.getByText(
        'This question is required|Select at most 2 options|独自|Send'
      )
    ).toBeInTheDocument()
  })
})
