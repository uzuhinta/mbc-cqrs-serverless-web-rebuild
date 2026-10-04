import './host-tailwind-v4.css'

import { Button, MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Gallery } from './gallery'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <MbcProvider>
        <div className="p-4">
          <Button className="bg-emerald-600 text-white">
            host utility wins
          </Button>
        </div>
        <Gallery />
      </MbcProvider>
    </StrictMode>
  )
}
