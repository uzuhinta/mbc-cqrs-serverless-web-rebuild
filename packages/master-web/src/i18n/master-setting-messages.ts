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
  /** The settings editor. */
  editor: {
    /** Accessible name of the button bar. */
    actions: string
    edit: string
    save: string
    cancel: string
    delete: string
    back: string
    copy: string
    copyResults: string
    basics: string
    fields: string
    code: string
    name: string
    description: string
    codeTaken: string
    readOnly: string
    loadFailed: string
    retry: string
    createFailed: string
    updateFailed: string
    deleteFailed: string
    failedHint: string
    /** A save or delete whose outcome is unknown (the wait for it timed out). */
    timeout: string
    deleteTitle: string
    deleteConfirm: string
  }
  /** The editor's fields table. */
  fieldsTable: {
    /** Accessible name of the table. */
    table: string
    /** Header of the drag-handle column (screen readers only). */
    move: string
    drag: (params: { name: string }) => string
    code: string
    name: string
    description: string
    dataType: string
    format: string
    rangeMin: string
    rangeMax: string
    defaultValue: string
    required: string
    showOnList: string
    actions: string
    actionsFor: (params: { name: string }) => string
    edit: string
    remove: string
    yes: string
    date: (params: { year: string; month: string; day: string }) => string
  }
  /** The add / edit field dialog. */
  fieldDialog: {
    add: string
    addTitle: string
    editTitle: string
    physicalName: string
    name: string
    dataType: string
    length: string
    pattern: string
    patternPlaceholder: string
    min: string
    max: string
    maxRow: string
    format: string
    prefix: string
    postfix: string
    defaultValue: string
    isRequired: string
    isShowedOnList: string
    description: string
    cancel: string
    submit: string
  }
  /** Moving fields with the keyboard or a pointer. */
  dnd: {
    roleDescription: string
    instructions: string
    pickedUp: (params: { label: string }) => string
    movedOver: (params: { label: string; over: string }) => string
    dropped: (params: { label: string; over: string }) => string
    droppedNowhere: (params: { label: string }) => string
    cancelled: (params: { label: string }) => string
  }
  /** Errors of the setting JSON (`SettingJsonError`). */
  json: {
    fileName: string
    invalidJson: string
    invalidSetting: string
    field: (params: { n: number; name: string }) => string
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
  editor: {
    actions: '操作',
    edit: '編集',
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    back: '戻る',
    copy: 'テナントへコピー',
    copyResults: 'コピー結果を確認',
    basics: '名称登録',
    fields: '項目一覧',
    code: 'コード',
    name: '名称',
    description: '説明',
    codeTaken: '既にこのコードは登録されています。',
    readOnly: '他のテナントの設定のため、編集できません。',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
    createFailed: 'データ登録に失敗しました。',
    updateFailed: 'データ更新に失敗しました。',
    deleteFailed: 'データ削除に失敗しました。',
    failedHint: '入力内容を確認した上で再度やり直してください。',
    timeout:
      '時間内に結果を確認できませんでした。反映されたかどうか、読み込み直して確認してください。',
    deleteTitle: '削除してもよろしいですか？',
    deleteConfirm: '削除',
  },
  fieldsTable: {
    table: '項目一覧',
    move: '並べ替え',
    drag: ({ name }) => `「${name}」をドラッグして並べ替え`,
    code: 'コード',
    name: '名称',
    description: '説明',
    dataType: 'データ型',
    format: 'フォーマット',
    rangeMin: 'Min/Max',
    rangeMax: '文字数',
    defaultValue: 'デフォルト値',
    required: '必須',
    showOnList: '一覧表示',
    actions: 'アクション',
    actionsFor: ({ name }) => `「${name}」の操作`,
    edit: '編集',
    remove: '削除',
    yes: 'はい',
    date: ({ year, month, day }) => `${year}年${month}月${day}日`,
  },
  fieldDialog: {
    add: '項目追加',
    addTitle: '項目追加',
    editTitle: '項目編集',
    physicalName: 'コード',
    name: '名称',
    dataType: 'データ型',
    length: '文字数',
    pattern: '正規表現パターン',
    patternPlaceholder: '正規表現パターンを入力してください',
    min: 'Min',
    max: 'Max',
    maxRow: '最大行数',
    format: 'フォーマット',
    prefix: '接頭辞',
    postfix: '接尾辞',
    defaultValue: 'デフォルト値',
    isRequired: '必須項目',
    isShowedOnList: '一覧表示',
    description: '説明',
    cancel: 'キャンセル',
    submit: '登録',
  },
  dnd: {
    roleDescription: '並べ替え可能',
    instructions:
      'スペースキーで項目を持ち上げ、矢印キーで移動し、もう一度スペースキーで置きます。Escape キーで取り消します。',
    pickedUp: ({ label }) => `「${label}」を持ち上げました。`,
    movedOver: ({ label, over }) =>
      `「${label}」を「${over}」の位置に移動しました。`,
    dropped: ({ label, over }) =>
      `「${label}」を「${over}」の位置に置きました。`,
    droppedNowhere: ({ label }) => `「${label}」を元の位置に戻しました。`,
    cancelled: ({ label }) => `「${label}」の移動を取り消しました。`,
  },
  json: {
    fileName: 'master-setting.json',
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    invalidSetting:
      'JSON が無効です。code、name と attributes.fields（各項目に physicalName、name、dataType、isRequired、isShowedOnList）が必要です。',
    field: ({ n, name }) => `${n}件目の項目（${name}）: `,
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
  editor: {
    actions: 'Actions',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    copy: 'Copy to tenants',
    copyResults: 'Copy results',
    basics: 'Setting',
    fields: 'Fields',
    code: 'Code',
    name: 'Name',
    description: 'Description',
    codeTaken: 'This code is already in use.',
    readOnly: 'This setting belongs to another tenant and cannot be edited.',
    loadFailed: 'Could not load the setting.',
    retry: 'Reload',
    createFailed: 'Could not create the setting.',
    updateFailed: 'Could not update the setting.',
    deleteFailed: 'Could not delete the setting.',
    failedHint: 'Check your input and try again.',
    timeout:
      'The result did not arrive in time. Reload to check whether the change was made.',
    deleteTitle: 'Delete this setting?',
    deleteConfirm: 'Delete',
  },
  fieldsTable: {
    table: 'Fields',
    move: 'Move',
    drag: ({ name }) => `Drag "${name}" to reorder`,
    code: 'Code',
    name: 'Name',
    description: 'Description',
    dataType: 'Type',
    format: 'Format',
    rangeMin: 'Min/Max',
    rangeMax: 'Length',
    defaultValue: 'Default',
    required: 'Required',
    showOnList: 'In list',
    actions: 'Actions',
    actionsFor: ({ name }) => `Actions for "${name}"`,
    edit: 'Edit',
    remove: 'Delete',
    yes: 'Yes',
    date: ({ year, month, day }) => `${year}-${month}-${day}`,
  },
  fieldDialog: {
    add: 'Add field',
    addTitle: 'Add field',
    editTitle: 'Edit field',
    physicalName: 'Code',
    name: 'Name',
    dataType: 'Type',
    length: 'Length',
    pattern: 'Pattern',
    patternPlaceholder: 'A regular expression',
    min: 'Min',
    max: 'Max',
    maxRow: 'Maximum lines',
    format: 'Format',
    prefix: 'Prefix',
    postfix: 'Suffix',
    defaultValue: 'Default',
    isRequired: 'Required',
    isShowedOnList: 'Show in list',
    description: 'Description',
    cancel: 'Cancel',
    submit: 'Save',
  },
  dnd: {
    roleDescription: 'sortable',
    instructions:
      'Press Space to pick up an item, use the arrow keys to move it, and press Space again to drop it. Press Escape to cancel.',
    pickedUp: ({ label }) => `Picked up "${label}".`,
    movedOver: ({ label, over }) =>
      `"${label}" moved to the position of "${over}".`,
    dropped: ({ label, over }) =>
      `"${label}" dropped at the position of "${over}".`,
    droppedNowhere: ({ label }) => `"${label}" returned to its place.`,
    cancelled: ({ label }) => `Moving "${label}" was cancelled.`,
  },
  json: {
    fileName: 'master-setting.json',
    invalidJson: 'The JSON is not valid.',
    invalidSetting:
      'The JSON needs code, name and attributes.fields (each field with physicalName, name, dataType, isRequired and isShowedOnList).',
    field: ({ n, name }) => `Field ${n} (${name}): `,
  },
}

export const masterSettingMessages = defineMessages('masterSetting', {
  ja,
  en,
})
