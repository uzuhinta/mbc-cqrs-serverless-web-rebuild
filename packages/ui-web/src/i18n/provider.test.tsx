import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  MbcProvider,
  useLocale,
  useMessages,
  usePortalContainer,
} from './provider'
import { uiMessages } from './ui-messages'

function Probe() {
  const t = useMessages(uiMessages)
  const locale = useLocale()
  return (
    <p>
      {locale}|{t.close}|{t.pagination.next}|{t.pagination.previous}|
      {t.pagination.page({ page: 3 })}
    </p>
  )
}

function PortalProbe() {
  const container = usePortalContainer()
  return <p>{container ? container.id : 'body'}</p>
}

describe('MbcProvider', () => {
  it('defaults to Japanese without a provider', () => {
    render(<Probe />)
    expect(
      screen.getByText(/^ja\|閉じる\|次のページへ\|前のページへ\|3ページ目$/)
    ).toBeInTheDocument()
  })

  it('switches locale', () => {
    render(
      <MbcProvider locale="en">
        <Probe />
      </MbcProvider>
    )
    expect(
      screen.getByText(
        /^en\|Close\|Go to next page\|Go to previous page\|Page 3$/
      )
    ).toBeInTheDocument()
  })

  it('overrides one nested message and keeps the rest', () => {
    render(
      <MbcProvider
        locale="en"
        messages={{
          ui: {
            pagination: { next: 'Weiter', page: ({ page }) => `S. ${page}` },
          },
        }}
      >
        <Probe />
      </MbcProvider>
    )
    expect(
      screen.getByText(/^en\|Close\|Weiter\|Go to previous page\|S\. 3$/)
    ).toBeInTheDocument()
  })

  it('lets an inner provider change locale while keeping outer overrides', () => {
    render(
      <MbcProvider locale="en" messages={{ ui: { close: 'Dismiss' } }}>
        <MbcProvider locale="ja">
          <Probe />
        </MbcProvider>
      </MbcProvider>
    )
    expect(screen.getByText(/^ja\|Dismiss\|次のページへ/)).toBeInTheDocument()
  })

  it('passes the portal container down', () => {
    const container = document.createElement('div')
    container.id = 'portal-root'
    render(
      <MbcProvider portalContainer={container}>
        <PortalProbe />
      </MbcProvider>
    )
    expect(screen.getByText('portal-root')).toBeInTheDocument()
  })

  it('uses document.body for portals by default', () => {
    render(<PortalProbe />)
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('rejects unknown message keys at compile time', () => {
    const element = (
      // @ts-expect-error `nope` is not a ui message
      <MbcProvider messages={{ ui: { nope: 'x' } }}>
        <Probe />
      </MbcProvider>
    )
    expect(element).toBeTruthy()
  })
})
