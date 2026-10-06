import {
  SurveyCreator,
  type Survey,
  type SurveyCreatorHandle,
} from '@mbc-cqrs-serverless/survey-web'
import { Button } from '@mbc-cqrs-serverless/ui-web'
import { useRef, useState } from 'react'

const SAMPLE: Survey = {
  title: '顧客満足度調査 2026',
  description: 'サンプルの説明文です。',
  items: [
    {
      id: 'sec_basic',
      type: 'section-header',
      title: '基本情報',
      locked: true,
    },
    {
      id: 'q_name',
      type: 'short-text',
      label: 'お名前',
      validation: { required: true },
      locked: true,
    },
    { id: 'sec_eval', type: 'section-header', title: '評価' },
    {
      id: 'q_route',
      type: 'single-choice',
      label: '通勤手段',
      options: [
        { value: '車', label: '車', nextSectionId: 'sec_end' },
        { value: '電車', label: '電車' },
        { value: 'other', label: 'その他', isOther: true },
      ],
    },
    {
      id: 'q_stars',
      type: 'rating',
      label: '満足度',
      levels: 5,
      symbol: 'star',
    },
    { id: 'sec_end', type: 'section-header', title: 'おわりに' },
    { id: 'q_note', type: 'long-text', label: 'ご意見' },
  ],
}

export function SurveyCreatorPage() {
  const ref = useRef<SurveyCreatorHandle>(null)
  const [state, setState] = useState('')
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Button
          onClick={async () =>
            setState((await ref.current?.submit()) ? 'saved' : 'invalid')
          }
        >
          Save
        </Button>
        <span>{state}</span>
      </div>
      <SurveyCreator
        ref={ref}
        defaultValue={SAMPLE}
        onChange={(_, { isValid }) =>
          setState(isValid ? 'valid, unsaved' : 'invalid, unsaved')
        }
        onSubmit={() => {}}
      />
    </div>
  )
}
