import '@mbc-cqrs-serverless/ui-web/styles.css'
import './tailwind-v3-preflight.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './main'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
