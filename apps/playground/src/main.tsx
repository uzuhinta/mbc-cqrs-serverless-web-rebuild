import '@mbc-cqrs-serverless/survey-web/styles.css'
import '@mbc-cqrs-serverless/master-web/styles.css'
import '@mbc-cqrs-serverless/master-web/editors.css'

import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Gallery } from './gallery'
import { MasterPage } from './master-pages'
import { MbcMasterPage } from './mbc-pages'
import { SurveyCreatorPage } from './survey-creator-page'
import { SurveyFormPage } from './survey-form-page'
import { TemplatesPage } from './templates-page'
import { Toolbar, type Settings } from './toolbar'

function useHash() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const update = () => setHash(location.hash)
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return hash
}

export function App() {
  const hash = useHash()
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
      {hash.startsWith('#mbc') ? (
        <MbcMasterPage route={hash.slice(1)} />
      ) : hash.startsWith('#master') ? (
        <MasterPage route={hash.slice(1)} />
      ) : hash.startsWith('#templates') ? (
        <TemplatesPage route={hash.slice(1)} />
      ) : hash === '#creator' ? (
        <SurveyCreatorPage />
      ) : hash === '#survey' ? (
        <SurveyFormPage />
      ) : (
        <Gallery />
      )}
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
