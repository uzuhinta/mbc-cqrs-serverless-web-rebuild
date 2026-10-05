import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

type CountParams = { rule: 'min' | 'max' | 'exact'; value: number }

export type SurveyMessages = {
  validation: {
    required: string
    requiredField: string
    requiredChoice: string
    requiredChoices: string
    otherRequired: string
    invalidNumber: string
    criteria: string
    length: string
    pattern: string
    choiceCount: (params: CountParams) => string
  }
  form: {
    submit: string
    next: string
    back: string
    empty: string
    submitError: string
    placeholder: string
    otherPlaceholder: string
    selectPlaceholder: string
    datePlaceholder: string
    datePlaceholderNoYear: string
    dateTimePlaceholder: string
    dateTimePlaceholderNoYear: string
    hour: string
    minute: string
    hours: string
    minutes: string
    seconds: string
    /** Accessible name of one rating level. */
    rating: (params: { value: number; max: number }) => string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    survey: SurveyMessages
  }
}

const ja: SurveyMessages = {
  validation: {
    required: 'この質問は必須です',
    requiredField: 'この項目は必須です',
    requiredChoice: 'オプションを選択してください',
    requiredChoices: '最低でも1つオプションを選択してください',
    otherRequired: 'その他の回答を入力してください',
    invalidNumber: '有効な数値を入力してください。',
    criteria: 'この回答は要件を満たしていません。',
    length: '文字数が規定の長さに合致していません',
    pattern: 'パターンに一致させてください',
    choiceCount: ({ rule, value }) =>
      rule === 'min'
        ? `${value}個以上選択してください`
        : rule === 'max'
          ? `${value}個以下で選択してください`
          : `${value}個選択してください`,
  },
  form: {
    submit: 'アンケートを送信',
    next: '次へ',
    back: '前へ',
    empty: 'このアンケートにはコンテンツがありません。',
    submitError: '送信に失敗しました。もう一度お試しください。',
    placeholder: '回答を入力...',
    otherPlaceholder: 'その他の回答を入力...',
    selectPlaceholder: 'オプションを選択してください...',
    datePlaceholder: '年月日を選択してください',
    datePlaceholderNoYear: '月日を選択してください',
    dateTimePlaceholder: '年月日時を選択してください',
    dateTimePlaceholderNoYear: '月日時を選択してください',
    hour: '時',
    minute: '分',
    hours: '時間',
    minutes: '分',
    seconds: '秒',
    rating: ({ value, max }) => `${max}段階中${value}`,
  },
}

const en: SurveyMessages = {
  validation: {
    required: 'This question is required',
    requiredField: 'This field is required',
    requiredChoice: 'Please select an option',
    requiredChoices: 'Please select at least one option',
    otherRequired: 'Please enter your other answer',
    invalidNumber: 'Please enter a valid number.',
    criteria: 'This response does not meet the criteria.',
    length: 'The character count does not match the required length',
    pattern: 'Please match the pattern',
    choiceCount: ({ rule, value }) =>
      rule === 'min'
        ? `Select at least ${value} options`
        : rule === 'max'
          ? `Select at most ${value} options`
          : `Select exactly ${value} options`,
  },
  form: {
    submit: 'Submit survey',
    next: 'Next',
    back: 'Back',
    empty: 'This survey has no content.',
    submitError: 'Submission failed. Please try again.',
    placeholder: 'Enter your answer...',
    otherPlaceholder: 'Enter your other answer...',
    selectPlaceholder: 'Choose an option...',
    datePlaceholder: 'Select a date',
    datePlaceholderNoYear: 'Select a month and day',
    dateTimePlaceholder: 'Select a date and time',
    dateTimePlaceholderNoYear: 'Select a month, day and time',
    hour: 'h',
    minute: 'min',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    rating: ({ value, max }) => `${value} of ${max}`,
  },
}

export const surveyMessages = defineMessages('survey', { ja, en })
