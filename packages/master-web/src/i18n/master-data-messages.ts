import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

export type MasterDataMessages = {
  /** A setting's data list. */
  list: {
    settingInfo: (params: { code: string; name: string }) => string
    code: string
    name: string
    description: string
    details: string
    searchSection: string
    resultSection: string
    includeDeleted: string
    search: string
    clear: string
    create: string
    back: string
    /** Accessible name of the table. */
    table: string
    /** A JSON cell with nothing in it (v0 showed "empty"). */
    emptyJson: string
    date: (params: { year: string; month: string; day: string }) => string
    loadFailed: string
    retry: string
  }
  /** The data editor. */
  editor: {
    /** Accessible name of the button bar. */
    actions: string
    edit: string
    save: string
    cancel: string
    delete: string
    restore: string
    back: string
    /** Labels of the code / name inputs added when the setting has no such fields. */
    code: string
    name: string
    codeTaken: string
    /** An auto-numbered code before it is saved. */
    autoNumber: string
    readOnly: string
    loadFailed: string
    retry: string
    createFailed: string
    updateFailed: string
    deleteFailed: string
    restoreFailed: string
    failedHint: string
    /** A change whose outcome is unknown (the wait for it timed out). */
    timeout: string
    deleteTitle: string
    restoreTitle: string
    deleteConfirm: string
    restoreConfirm: string
  }
  /** The built-in field renderers. */
  renderers: {
    textPlaceholder: string
    numberPlaceholder: string
    datePlaceholder: string
    date: (params: { year: string; month: string; day: string }) => string
    addItem: string
    item: (params: { name: string; n: number }) => string
    removeItem: (params: { name: string; n: number }) => string
  }
  /** The record JSON dialog. */
  json: {
    fileName: string
    invalidJson: string
    invalidData: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    masterData: MasterDataMessages
  }
}

const ja: MasterDataMessages = {
  list: {
    settingInfo: ({ code, name }) => `${code}:${name} 設定情報`,
    code: 'コード',
    name: '名称',
    description: '説明',
    details: '詳細',
    searchSection: 'データを検索する',
    resultSection: 'データ一覧',
    includeDeleted: '削除済み含む',
    search: '検索',
    clear: 'クリア',
    create: '新規登録',
    back: '戻る',
    table: 'データ一覧',
    emptyJson: 'empty',
    date: ({ year, month, day }) => `${year}年${month}月${day}日`,
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  editor: {
    actions: '操作',
    edit: '編集',
    save: '登録',
    cancel: 'キャンセル',
    delete: '削除',
    restore: '復旧',
    back: '戻る',
    code: 'コード',
    name: '名称',
    codeTaken: '既にこのコードは登録されています。',
    autoNumber: '登録時に自動採番されます',
    readOnly: '他のテナントのデータのため、編集できません。',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
    createFailed: 'データ登録に失敗しました。',
    updateFailed: 'データ更新に失敗しました。',
    deleteFailed: 'データ削除に失敗しました。',
    restoreFailed: 'データ復旧に失敗しました。',
    failedHint: '入力内容を確認した上で再度やり直してください。',
    timeout:
      '時間内に結果を確認できませんでした。反映されたかどうか、読み込み直して確認してください。',
    deleteTitle: '削除してもよろしいですか？',
    restoreTitle: '復旧してもよろしいですか？',
    deleteConfirm: '削除',
    restoreConfirm: '復旧',
  },
  renderers: {
    textPlaceholder: 'テキストを入力してください。',
    numberPlaceholder: '数値を入力してください。',
    datePlaceholder: '日時を選択してください',
    date: ({ year, month, day }) => `${year}/${month}/${day}`,
    addItem: 'アイテム追加',
    item: ({ name, n }) => `${name} ${n}件目`,
    removeItem: ({ name, n }) => `${name} ${n}件目を削除`,
  },
  json: {
    fileName: 'master-data.json',
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    invalidData: 'JSON が無効です。settingCode、code、name が必要です。',
  },
}

const en: MasterDataMessages = {
  list: {
    settingInfo: ({ code, name }) => `${code}: ${name} settings`,
    code: 'Code',
    name: 'Name',
    description: 'Description',
    details: 'Details',
    searchSection: 'Search data',
    resultSection: 'Data',
    includeDeleted: 'Include deleted',
    search: 'Search',
    clear: 'Clear',
    create: 'Create',
    back: 'Back',
    table: 'Data',
    emptyJson: 'empty',
    date: ({ year, month, day }) => `${year}-${month}-${day}`,
    loadFailed: 'Could not load the list.',
    retry: 'Reload',
  },
  editor: {
    actions: 'Actions',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    restore: 'Restore',
    back: 'Back',
    code: 'Code',
    name: 'Name',
    codeTaken: 'This code is already in use.',
    autoNumber: 'Numbered automatically when saved',
    readOnly: 'This record belongs to another tenant and cannot be edited.',
    loadFailed: 'Could not load the record.',
    retry: 'Reload',
    createFailed: 'Could not create the record.',
    updateFailed: 'Could not update the record.',
    deleteFailed: 'Could not delete the record.',
    restoreFailed: 'Could not restore the record.',
    failedHint: 'Check your input and try again.',
    timeout:
      'The result did not arrive in time. Reload to check whether the change was made.',
    deleteTitle: 'Delete this record?',
    restoreTitle: 'Restore this record?',
    deleteConfirm: 'Delete',
    restoreConfirm: 'Restore',
  },
  renderers: {
    textPlaceholder: 'Enter text.',
    numberPlaceholder: 'Enter a number.',
    datePlaceholder: 'Pick a date',
    date: ({ year, month, day }) => `${year}-${month}-${day}`,
    addItem: 'Add item',
    item: ({ name, n }) => `${name} ${n}`,
    removeItem: ({ name, n }) => `Remove ${name} ${n}`,
  },
  json: {
    fileName: 'master-data.json',
    invalidJson: 'The JSON is not valid.',
    invalidData: 'The JSON needs settingCode, code and name.',
  },
}

export const masterDataMessages = defineMessages('masterData', { ja, en })
