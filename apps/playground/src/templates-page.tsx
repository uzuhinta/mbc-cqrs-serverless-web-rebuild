import { MbcClientProvider } from '@mbc-cqrs-serverless/client-web/react'
import {
  MbcSurveyTemplateEditorPage,
  MbcSurveyTemplateListPage,
} from '@mbc-cqrs-serverless/survey-web/mbc'
import { useState } from 'react'

import { createFakeBackend } from './fake-backend'

const backend = createFakeBackend()

/** `#templates` (list), `#templates/new`, `#templates/<id>` (editor). */
export function TemplatesPage({ route }: { route: string }) {
  const [notice, setNotice] = useState('')
  const go = (next: string) => {
    location.hash = next
  }
  const id = route.startsWith('templates/')
    ? decodeURIComponent(route.slice('templates/'.length))
    : null
  return (
    <MbcClientProvider client={backend}>
      <div style={{ padding: 16 }}>
        {notice && <p role="status">{notice}</p>}
        {id === null ? (
          <MbcSurveyTemplateListPage
            onCreate={() => go('templates/new')}
            onSelect={(item) => go(`templates/${encodeURIComponent(item.id)}`)}
          />
        ) : (
          <MbcSurveyTemplateEditorPage
            key={id}
            id={id === 'new' ? undefined : id}
            onCancel={() => go('templates')}
            onSaved={() => {
              setNotice('保存しました')
              go('templates')
            }}
            onDeleted={() => {
              setNotice('削除しました')
              go('templates')
            }}
            onError={(error) => setNotice(`エラー: ${String(error)}`)}
          />
        )}
      </div>
    </MbcClientProvider>
  )
}
