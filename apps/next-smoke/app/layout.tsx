import '@mbc-cqrs-serverless/survey-web/styles.css'
import '@mbc-cqrs-serverless/master-web/styles.css'
import '@mbc-cqrs-serverless/master-web/editors.css'

import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
