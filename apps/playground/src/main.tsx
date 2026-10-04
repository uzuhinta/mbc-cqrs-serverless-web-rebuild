import '@mbc-cqrs-serverless/ui-web/styles.css'

import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Gallery } from './gallery'
import { Toolbar, type Settings } from './toolbar'

export function App() {
  const [settings, setSettings] = useState<Settings>({
    locale: 'ja',
    dark: new URLSearchParams(location.search).has('dark'),
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.dark)
    document.body.style.background = settings.dark ? '#020817' : '#ffffff'
    document.body.style.color = settings.dark ? '#f8fafc' : '#020817'
  }, [settings.dark])

  return (
    <MbcProvider locale={settings.locale}>
      <Toolbar settings={settings} onChange={setSettings} />
      <Gallery />
    </MbcProvider>
  )
}

const root = document.getElementById('root')
if (root && !root.dataset.fixture) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
