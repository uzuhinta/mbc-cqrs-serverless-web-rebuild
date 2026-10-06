import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { useHydrated } from './use-hydrated'

function Probe() {
  return <span>{useHydrated() ? 'client' : 'server'}</span>
}

describe('useHydrated', () => {
  it('is false when rendered on the server', () => {
    expect(renderToString(<Probe />)).toContain('server')
  })

  it('is true once mounted in the browser', () => {
    render(<Probe />)
    expect(screen.getByText('client')).toBeInTheDocument()
  })
})
