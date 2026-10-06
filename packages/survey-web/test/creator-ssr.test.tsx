import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SurveyCreator } from '../src/creator/survey-creator'
import type { SurveyInput } from '../src/schema/survey-schema'
import { LOCKS } from './fixtures/creator-surveys'

async function hydrate(element: ReactElement) {
  const html = renderToString(element)
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const recoverable: string[] = []
  await act(async () => {
    hydrateRoot(container, element, {
      onRecoverableError: (error) => recoverable.push(String(error)),
    })
  })
  const logged = errors.mock.calls.length
  errors.mockRestore()
  container.remove()
  return { recoverable, logged }
}

describe('SurveyCreator server rendering', () => {
  it('hydrates a new survey although its ids are random', async () => {
    expect(
      await hydrate(
        <MbcProvider>
          <SurveyCreator />
        </MbcProvider>
      )
    ).toEqual({ recoverable: [], logged: 0 })
  })

  it('hydrates a loaded survey', async () => {
    expect(
      await hydrate(
        <MbcProvider>
          <SurveyCreator defaultValue={LOCKS} />
        </MbcProvider>
      )
    ).toEqual({ recoverable: [], logged: 0 })
  })

  it('hydrates a loaded survey whose first item (selected) is a choice question', async () => {
    const choiceFirst: SurveyInput = {
      title: 'Choice first',
      items: [
        {
          id: 'q_pick',
          type: 'single-choice',
          label: 'Pick',
          options: [
            { value: 'a', label: 'a' },
            { value: 'b', label: 'b' },
          ],
        },
        { id: 'sec_1', type: 'section-header', title: 'S' },
      ],
    }
    expect(
      await hydrate(
        <MbcProvider>
          <SurveyCreator defaultValue={choiceFirst} />
        </MbcProvider>
      )
    ).toEqual({ recoverable: [], logged: 0 })
  })
})
