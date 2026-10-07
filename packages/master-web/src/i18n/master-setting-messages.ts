import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

export type MasterSettingMessages = {
  /** The settings list. */
  list: {
    /** Accessible name of the table. */
    table: string
    code: string
    name: string
    description: string
    search: string
    clear: string
    create: string
    back: string
    loadFailed: string
    retry: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    masterSetting: MasterSettingMessages
  }
}

const ja: MasterSettingMessages = {
  list: {
    table: 'マスター設定一覧',
    code: 'コード',
    name: '名称',
    description: '説明',
    search: '検索',
    clear: 'クリア',
    create: '新規作成',
    back: '戻る',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
}

const en: MasterSettingMessages = {
  list: {
    table: 'Master settings',
    code: 'Code',
    name: 'Name',
    description: 'Description',
    search: 'Search',
    clear: 'Clear',
    create: 'Create',
    back: 'Back',
    loadFailed: 'Could not load the list.',
    retry: 'Reload',
  },
}

export const masterSettingMessages = defineMessages('masterSetting', {
  ja,
  en,
})
