import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import { render } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { vi } from 'vitest'

import type { MasterRouting, MasterTarget } from '../src/routing/routing'
import type { createFakeClient } from './fake-mbc-client'

export type FakeClient = ReturnType<typeof createFakeClient>

/** Each target as a path of its encoded parts, e.g. `data/<setting id>`. */
export function createRouting(): MasterRouting & {
  navigate: ReturnType<typeof vi.fn<(to: MasterTarget) => void>>
} {
  return {
    href: (to) =>
      [
        to.screen,
        'settingId' in to ? to.settingId : '',
        'id' in to ? to.id : '',
        'taskId' in to ? to.taskId : '',
      ]
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/'),
    navigate: vi.fn<(to: MasterTarget) => void>(),
  }
}

/**
 * Answers the client's `get` by path: `routes[path]` is the answer, or a
 * function of the request's query. A path it does not know rejects.
 */
export function serveGets(
  client: FakeClient,
  routes: Record<
    string,
    unknown | ((query: Record<string, unknown>) => unknown)
  >
) {
  client.get.mockImplementation(
    async (path: string, options?: { query?: Record<string, unknown> }) => {
      if (!(path in routes)) throw new Error(`no route for GET ${path}`)
      const route = routes[path]
      return typeof route === 'function'
        ? (route as (query: Record<string, unknown>) => unknown)(
            options?.query ?? {}
          )
        : route
    }
  )
}

/**
 * Renders a connected page under StrictMode with the client. `rerenderPage`
 * renders another element in its place, as a router re-using it would.
 */
export function renderPage(client: FakeClient, page: ReactElement) {
  const wrap = (element: ReactElement) => (
    <StrictMode>
      <MbcClientProvider client={client}>{element}</MbcClientProvider>
    </StrictMode>
  )
  const view = render(wrap(page))
  return {
    ...view,
    rerenderPage: (next: ReactElement) => view.rerender(wrap(next)),
  }
}
