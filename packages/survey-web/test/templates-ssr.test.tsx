import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SurveyTemplateEditor } from '../src/templates/survey-template-editor'
import { SurveyTemplateList } from '../src/templates/survey-template-list'

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
  return { html, recoverable, logged }
}

describe('template screens on the server', () => {
  it('render the list without the date, then hydrate cleanly', async () => {
    const result = await hydrate(
      <MbcProvider>
        <SurveyTemplateList
          items={[
            {
              id: 'a',
              name: 'A',
              version: 1,
              createdAt: '2026-10-04T23:30:00.000Z',
            },
          ]}
          total={1}
          page={1}
          pageSize={10}
          keyword=""
          onPageChange={() => {}}
          onKeywordChange={() => {}}
          onSelect={() => {}}
        />
      </MbcProvider>
    )
    expect(result.html).not.toContain('2026')
    expect(result.recoverable).toEqual([])
    expect(result.logged).toBe(0)
  })

  it('hydrate the editor', async () => {
    const result = await hydrate(
      <MbcProvider>
        <SurveyTemplateEditor
          mode="create"
          onSave={() => {}}
          onCancel={() => {}}
        />
      </MbcProvider>
    )
    expect(result.recoverable).toEqual([])
    expect(result.logged).toBe(0)
  })
})
