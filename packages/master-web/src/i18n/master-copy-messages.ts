import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { CopyTaskStatus, CopyType } from '../core/copy'
import type { TimeParts } from '../core/list'

export type MasterCopyMessages = {
  /** The copy request form. */
  request: {
    destination: string
    allTenants: string
    chosenTenants: string
    /** Above the tenant list (v0 named its host's tenants here). */
    chooseTenants: string
    tenantsPlaceholder: string
    content: string
    copyTypes: Record<CopyType, string>
    code: string
    name: string
    includeDeleted: string
    search: string
    /** Accessible name of the data table. */
    table: string
    selected: (params: { count: number }) => string
    back: string
    submit: string
    noTargets: string
    failed: string
    failedHint: string
    requested: string
    viewResults: string
    loadFailed: string
    retry: string
  }
  /** A setting's copy requests. */
  tasks: {
    title: string
    name: string
    started: string
    ended: string
    total: string
    running: string
    succeeded: string
    failed: string
    status: string
    refresh: string
    back: string
    loadFailed: string
    retry: string
  }
  /** One copy request, per destination tenant. */
  detail: {
    title: string
    tenant: string
    status: string
    started: string
    ended: string
    message: string
    taskId: string
    succeeded: string
    refresh: string
    back: string
    loadFailed: string
    retry: string
  }
  status: Record<CopyTaskStatus, string>
  time: (parts: TimeParts) => string
  /** A time or result that does not exist yet (v0's "-"). */
  none: string
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    masterCopy: MasterCopyMessages
  }
}

const ja: MasterCopyMessages = {
  request: {
    destination: 'データのコピー先',
    allTenants: '全テナント',
    chosenTenants: '指定したテナント',
    chooseTenants: 'コピー先のテナントを選択してください',
    tenantsPlaceholder: 'データのコピー先を選択してください',
    content: 'コピーデータ',
    copyTypes: {
      BOTH: '設定データ & 全マスタデータ',
      SETTING_ONLY: '設定データのみ',
      DATA_ONLY: '指定したマスタデータのみ',
    },
    code: 'コード',
    name: '名称',
    includeDeleted: '削除済み含む',
    search: '検索',
    table: 'マスタデータ一覧',
    selected: ({ count }) => `選択した ${count} つのアイテム`,
    back: '戻る',
    submit: 'コピー登録',
    noTargets: 'コピー先のテナントを選択してください。',
    failed: '汎用マスタコピーの登録に失敗しました。',
    failedHint: '入力内容を確認した上で再度やり直してください。',
    requested: '汎用マスタコピーを登録しました。',
    viewResults: 'コピー結果を確認',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  tasks: {
    title: 'コピー結果一覧',
    name: '名前',
    started: '開始時間',
    ended: '終了時間',
    total: '総数',
    running: '実行中数',
    succeeded: '成功数',
    failed: '失敗数',
    status: '状態',
    refresh: '最新の状態に更新',
    back: '戻る',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  detail: {
    title: 'コピー結果詳細',
    tenant: 'テナントコード',
    status: '状態',
    started: '開始時間',
    ended: '終了時間',
    message: 'メッセージ',
    taskId: 'タスクID',
    succeeded: 'コピー成功',
    refresh: '最新の状態に更新',
    back: '戻る',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  status: {
    CREATED: '作成済み',
    QUEUED: 'キュー待ち',
    PROCESSING: '処理中',
    STARTED: '開始済み',
    FINISHED: '完了',
    COMPLETED: '終了',
    ERRORED: 'エラー発生',
    FAILED: '失敗',
  },
  time: ({ year, month, day, hour, minute, second }) =>
    `${year}/${month}/${day} ${hour}:${minute}:${second}`,
  none: '-',
}

const en: MasterCopyMessages = {
  request: {
    destination: 'Copy to',
    allTenants: 'All tenants',
    chosenTenants: 'Chosen tenants',
    chooseTenants: 'Choose the tenants to copy to',
    tenantsPlaceholder: 'Choose tenants',
    content: 'What to copy',
    copyTypes: {
      BOTH: 'The setting and all its data',
      SETTING_ONLY: 'The setting only',
      DATA_ONLY: 'Chosen data only',
    },
    code: 'Code',
    name: 'Name',
    includeDeleted: 'Include deleted',
    search: 'Search',
    table: 'Data',
    selected: ({ count }) => `${count} selected`,
    back: 'Back',
    submit: 'Request copy',
    noTargets: 'Choose at least one tenant to copy to.',
    failed: 'Could not request the copy.',
    failedHint: 'Check your input and try again.',
    requested: 'The copy was requested.',
    viewResults: 'Copy results',
    loadFailed: 'Could not load the data.',
    retry: 'Reload',
  },
  tasks: {
    title: 'Copy results',
    name: 'Name',
    started: 'Started',
    ended: 'Ended',
    total: 'Total',
    running: 'Running',
    succeeded: 'Succeeded',
    failed: 'Failed',
    status: 'Status',
    refresh: 'Refresh',
    back: 'Back',
    loadFailed: 'Could not load the copy results.',
    retry: 'Reload',
  },
  detail: {
    title: 'Copy result details',
    tenant: 'Tenant code',
    status: 'Status',
    started: 'Started',
    ended: 'Ended',
    message: 'Message',
    taskId: 'Task ID',
    succeeded: 'Copied',
    refresh: 'Refresh',
    back: 'Back',
    loadFailed: 'Could not load the copy result.',
    retry: 'Reload',
  },
  status: {
    CREATED: 'Created',
    QUEUED: 'Queued',
    PROCESSING: 'Processing',
    STARTED: 'Started',
    FINISHED: 'Finished',
    COMPLETED: 'Completed',
    ERRORED: 'Errored',
    FAILED: 'Failed',
  },
  time: ({ year, month, day, hour, minute, second }) =>
    `${year}-${month}-${day} ${hour}:${minute}:${second}`,
  none: '-',
}

export const masterCopyMessages = defineMessages('masterCopy', { ja, en })
