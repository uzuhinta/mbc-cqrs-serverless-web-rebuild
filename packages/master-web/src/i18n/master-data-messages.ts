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
}

export const masterDataMessages = defineMessages('masterData', { ja, en })
