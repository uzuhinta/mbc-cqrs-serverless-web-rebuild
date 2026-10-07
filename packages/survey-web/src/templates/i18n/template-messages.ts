import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

export type TemplateMessages = {
  list: {
    searchPlaceholder: string
    create: string
    createLabel: string
    emptyTitle: string
    emptyDescription: string
    loadError: string
    retry: string
    loading: string
    noDescription: string
    questions: (params: { count: number }) => string
    sections: (params: { count: number }) => string
    open: (params: { name: string }) => string
  }
  editor: {
    loadingEdit: string
    loadingEditHint: string
    loadingCreate: string
    loadingCreateHint: string
    loadErrorTitle: string
    loadErrorFallback: string
    retry: string
    back: string
    delete: string
    update: string
    create: string
    discardTitle: string
    discardDescription: string
    cancel: string
    ok: string
    deleteTitle: string
    deleteDescription: string
    deleteConfirm: string
    deleting: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    surveyTemplates: TemplateMessages
  }
}

const ja: TemplateMessages = {
  list: {
    searchPlaceholder: 'テキスト・タグ・IDで検索',
    create: '新規作成',
    createLabel: 'アンケートテンプレートを新規作成',
    emptyTitle: 'アンケートが見つかりません',
    emptyDescription: '最初のアンケートテンプレートを作成してください。',
    loadError: 'アンケートの読み込みに失敗しました。再度試してください。',
    retry: '再度試す',
    loading: 'アンケートテンプレートを読み込んでいます',
    noDescription: '説明が提供されていません',
    questions: ({ count }) => `${count} 質問`,
    sections: ({ count }) => `${count} セクション`,
    open: ({ name }) => `アンケートテンプレートを開く: ${name}`,
  },
  editor: {
    loadingEdit: 'アンケートを読み込んでいます...',
    loadingEditHint:
      'アンケートデータを読み込んでいます。しばらくお待ちください。',
    loadingCreate: 'アンケート作成インターフェースを準備しています...',
    loadingCreateHint:
      'アンケート作成インターフェースを準備しています。しばらくお待ちください。',
    loadErrorTitle: 'アンケートの読み込みに失敗しました。',
    loadErrorFallback:
      'アンケートデータの取得に失敗しました。再度試してください。',
    retry: '再度試す',
    back: '戻る',
    delete: '削除',
    update: '更新',
    create: '作成',
    discardTitle: '変更を破棄しますか？',
    discardDescription:
      '未保存の変更があります。このページを離れると、変更内容が失われます。よろしいですか？',
    cancel: 'キャンセル',
    ok: 'OK',
    deleteTitle: '削除の確認',
    deleteDescription:
      'このデータを完全に削除します。この操作は元に戻せません。よろしいですか？',
    deleteConfirm: '削除する',
    deleting: '削除中...',
  },
}

const en: TemplateMessages = {
  list: {
    searchPlaceholder: 'Search by text, tag, or ID',
    create: 'Create',
    createLabel: 'Create a survey template',
    emptyTitle: 'No surveys found',
    emptyDescription: 'Create your first survey template.',
    loadError: 'Failed to load surveys. Please try again.',
    retry: 'Try again',
    loading: 'Loading survey templates',
    noDescription: 'No description provided',
    questions: ({ count }) =>
      `${count} ${count === 1 ? 'question' : 'questions'}`,
    sections: ({ count }) => `${count} ${count === 1 ? 'section' : 'sections'}`,
    open: ({ name }) => `Open survey template: ${name}`,
  },
  editor: {
    loadingEdit: 'Loading survey...',
    loadingEditHint: 'Please wait while the survey loads.',
    loadingCreate: 'Preparing the survey creator...',
    loadingCreateHint: 'Please wait while the survey creator is set up.',
    loadErrorTitle: 'Failed to load the survey.',
    loadErrorFallback: 'The survey data could not be loaded. Please try again.',
    retry: 'Try again',
    back: 'Back',
    delete: 'Delete',
    update: 'Update',
    create: 'Create',
    discardTitle: 'Discard changes?',
    discardDescription:
      'You have unsaved changes. They will be lost if you leave this page. Continue?',
    cancel: 'Cancel',
    ok: 'OK',
    deleteTitle: 'Confirm deletion',
    deleteDescription:
      'This permanently deletes the data. This cannot be undone. Continue?',
    deleteConfirm: 'Delete',
    deleting: 'Deleting...',
  },
}

export const templateMessages = defineMessages('surveyTemplates', { ja, en })
