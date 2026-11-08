import '@mbc-cqrs-serverless/survey-web/styles.css'
import '@mbc-cqrs-serverless/master-web/editors.css'

import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
