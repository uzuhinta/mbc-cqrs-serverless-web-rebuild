import { SurveyForm, type Survey } from '@mbc-cqrs-serverless/survey-web'
import { useState } from 'react'

const SAMPLE: Survey = {
  title: '顧客満足度調査 2026',
  description:
    'とても長い説明文がどのように折り返されるかを確認するためのサンプルです。所要時間は約3分です。',
  items: [
    { id: 's1', type: 'section-header', title: '基本情報' },
    {
      id: 'name',
      type: 'short-text',
      label: 'お名前',
      validation: { required: true },
    },
    {
      id: 'mail',
      type: 'short-text',
      label: 'メールアドレス',
      validation: { custom: { type: 'text', rule: 'is_email' } },
    },
    {
      id: 'bio',
      type: 'long-text',
      label: '自己紹介',
      description: '200文字以内',
      validation: { custom: { type: 'length', rule: 'max', value: 200 } },
    },
    {
      id: 'route',
      type: 'single-choice',
      label: '通勤手段',
      options: [
        { value: 'car', label: '車', nextSectionId: 's2' },
        { value: 'train', label: '電車' },
        { value: 'other', label: 'その他', isOther: true },
      ],
      validation: { required: true, shuffleOptions: true },
    },
    { id: 's2', type: 'section-header', title: '評価' },
    {
      id: 'tools',
      type: 'multiple-choice',
      label: '利用したツール',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'other', label: 'その他', isOther: true },
      ],
      validation: { custom: { rule: 'max', value: 2 } },
    },
    {
      id: 'plan',
      type: 'dropdown',
      label: 'プラン',
      options: [
        { value: 'free', label: '無料' },
        { value: 'pro', label: 'プロ' },
      ],
    },
    {
      id: 'nps',
      type: 'linear-scale',
      label: 'おすすめ度',
      min: 0,
      max: 10,
      minLabel: '低い',
      maxLabel: '高い',
    },
    { id: 'stars', type: 'rating', label: '満足度', levels: 5, symbol: 'star' },
    {
      id: 'when',
      type: 'date',
      label: '来店日時',
      includeTime: true,
      includeYear: true,
    },
    { id: 'stay', type: 'time', label: '滞在時間', answerType: 'duration' },
  ],
}

export function SurveyFormPage() {
  const [result, setResult] = useState<unknown>(null)
  return (
    <div style={{ padding: 16 }}>
      <SurveyForm
        schema={SAMPLE}
        onSubmit={(answers, meta) => setResult({ answers, meta })}
      />
      {result !== null && (
        <pre
          style={{ maxWidth: 768, margin: '0 auto', whiteSpace: 'pre-wrap' }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
