import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SurveyForm } from '../src/form/survey-form'
import type { Survey } from '../src/schema/survey-schema'

const survey: Survey = {
  title: 'SSR',
  items: [
    {
      id: 'pick',
      type: 'single-choice',
      label: 'Pick',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
      validation: { shuffleOptions: true },
    },
    {
      id: 'when',
      type: 'date',
      label: 'When',
      includeTime: true,
      includeYear: false,
    },
    { id: 'stars', type: 'rating', label: 'Stars', levels: 5, symbol: 'star' },
  ],
}

describe('server rendering', () => {
  it('hydrates without mismatches', async () => {
    const element = (
      <MbcProvider>
        <SurveyForm schema={survey} onSubmit={() => {}} />
      </MbcProvider>
    )
    const html = renderToString(element)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    // React 19 reports hydration mismatches here, not through console.error.
    const recoverable: string[] = []
    await act(async () => {
      hydrateRoot(container, element, {
        onRecoverableError: (error) => recoverable.push(String(error)),
      })
    })

    expect(recoverable).toEqual([])
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
    container.remove()
  })

  it('renders a saved date only after hydration, so server and browser time zones cannot disagree', async () => {
    const dated: Survey = {
      title: 'Dated',
      items: [
        {
          id: 'd',
          type: 'date',
          label: 'D',
          includeTime: true,
          includeYear: true,
        },
      ],
    }
    const element = (
      <MbcProvider>
        <SurveyForm
          schema={dated}
          defaultValues={{ d: new Date(2026, 9, 4, 9, 30).toISOString() }}
          onSubmit={() => {}}
        />
      </MbcProvider>
    )
    const html = renderToString(element)
    expect(html).toContain('年月日時を選択してください')
    expect(html).not.toContain('2026年10月4日')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const recoverable: string[] = []
    await act(async () => {
      hydrateRoot(container, element, {
        onRecoverableError: (error) => recoverable.push(String(error)),
      })
    })
    expect(recoverable).toEqual([])
    expect(container).toHaveTextContent('2026年10月4日')
    container.remove()
  })
})
