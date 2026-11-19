import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterFieldType } from '../core/field-type-names'

export type MasterMessages = {
  fieldTypes: Record<MasterFieldType, string>
  /** The data tables of the list screens. */
  table: {
    empty: string
    loading: string
    selectAll: string
    selectRow: string
    pagerTop: string
    pagerBottom: string
  }
  /** The JSON bulk-import dialog. */
  bulkDialog: {
    open: string
    title: string
    json: string
    cancel: string
    load: string
    save: string
    submit: string
    progress: (params: { done: number; total: number }) => string
    /** Shown in the failure alert when some items already saved. */
    partial: (params: { done: number; total: number }) => string
    failed: string
    /** After the dialog closed: every item saved. */
    done: (params: { count: number }) => string
    /** After the dialog closed: the backend took the items (no realtime). */
    accepted: (params: { count: number }) => string
    /** The batch that failed, by item position (1-based). */
    failedRange: (params: { from: number; to: number }) => string
    /** The result could not be confirmed (a timeout or a dropped connection). */
    timeout: string
  }
  /** The editors' JSON dialog (one setting or record). */
  /** Names a new setting's fixed fields get, and the bulk sample's names. */
  defaults: {
    code: string
    name: string
    seq: string
    sampleSetting: string
    sampleData: string
  }
  /** Names for the rich editors' own controls (`/editors`). */
  editors: {
    heading: string
    font: string
    size: string
    color: string
    background: string
    align: string
    linkUrl: string
    openLink: string
  }
  jsonDialog: {
    open: string
    title: string
    json: string
    cancel: string
    load: string
    save: string
    apply: string
  }
  /** Data-record errors (`MasterError`). */
  validation: {
    required: string
    blank: string
    maxLength: (params: { max: number }) => string
    maxRows: (params: { max: number }) => string
    pattern: (params: { name: string }) => string
    integer: string
    min: (params: { min: number }) => string
    max: (params: { max: number }) => string
    json: string
    /** A code with `#` or `@`, which the backend rejects. */
    keyChars: string
    /** The reserved setting code `MASTER_SETTING`. */
    reserved: string
  }
  /** Field-definition errors (`FieldDefinitionError`). */
  fieldDefinition: {
    required: string
    tooLong: (params: { max: number }) => string
    nameChars: string
    duplicate: string
    reserved: string
    typeNotAllowed: string
    numeric: string
    lengthRange: string
    maxRowMin: string
    minNotLess: string
    maxNotGreater: string
    defaultRange: string
    defaultJson: string
    defaultBoolean: string
    defaultLength: string
    formatRequired: string
  }
  /** Bulk-import errors (`BulkError`); `item` prefixes errors about one entry. */
  bulk: {
    item: (params: { n: number }) => string
    invalidJson: string
    notArray: string
    empty: string
    mapFailed: (params: { message: string }) => string
    invalidItem: string
    invalidDataItem: string
    invalidMappedSetting: string
    invalidMappedData: string
    settingNotAllowed: string
    otherTenant: string
    /** A code or settingCode the backend cannot key (`#`, `@`, `MASTER_SETTING`). */
    invalidCode: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    master: MasterMessages
  }
}

const ja: MasterMessages = {
  fieldTypes: {
    string: '文字列',
    number: '数値',
    auto_number: '自動採番',
    boolean: 'ブール値',
    date: '日付',
    array: '文字列(配列)',
    json: 'JSON',
    'text-area': 'テキストエリア',
    'text-html': 'HTML形式',
    'text-markdown': 'Markdown形式',
  },
  table: {
    empty: 'データがありません',
    loading: '読み込み中',
    selectAll: 'このページをすべて選択',
    selectRow: 'この行を選択',
    pagerTop: '上部のページ送り',
    pagerBottom: '下部のページ送り',
  },
  bulkDialog: {
    open: 'JSONエディタ',
    title: 'JSONエディタ',
    json: 'JSON',
    cancel: 'キャンセル',
    load: 'JSON読込',
    save: 'JSON保存',
    submit: 'データ反映',
    progress: ({ done, total }) => `反映中 (${done}/${total})`,
    partial: ({ done, total }) => `${done} / ${total} 件反映済み`,
    failed: 'マスターデータの反映に失敗しました。',
    failedRange: ({ from, to }) => `${from}〜${to}件目の反映に失敗しました。`,
    done: ({ count }) => `${count}件を反映しました。`,
    accepted: ({ count }) =>
      `${count}件を受け付けました。一覧に表示されるまで時間がかかる場合があります。`,
    timeout:
      '結果を確認できませんでした。反映されたかどうか、読み込み直して確認してください。',
  },
  defaults: {
    code: 'コード',
    name: '名称',
    seq: '並び順',
    sampleSetting: 'マスター設定サンプル',
    sampleData: 'マスターデータサンプル',
  },
  editors: {
    heading: '見出し',
    font: 'フォント',
    size: '文字サイズ',
    color: '文字色',
    background: '背景色',
    align: '配置',
    linkUrl: 'リンクURL',
    openLink: 'リンクを開く',
  },
  jsonDialog: {
    open: 'JSONエディタ',
    title: 'JSONエディタ',
    json: 'JSON',
    cancel: 'キャンセル',
    load: 'JSON読込',
    save: 'JSON保存',
    apply: 'データ反映',
  },
  validation: {
    required: '入力してください。',
    blank: '空白のみは許可されていません。',
    maxLength: ({ max }) => `${max}文字以内で入力してください。`,
    maxRows: ({ max }) => `${max}行以内で入力してください。`,
    pattern: ({ name }) => `${name} の型が違います。`,
    integer: '数字を入力してください。',
    min: ({ min }) => `最小値は ${min} です。`,
    max: ({ max }) => `最大値は ${max} です。`,
    json: 'JSONの形式が正しくありません。',
    keyChars: '「#」と「@」は使用できません。',
    reserved: 'このコードは予約されています。',
  },
  fieldDefinition: {
    required: '入力してください。',
    tooLong: ({ max }) => `${max}文字以内で入力してください。`,
    nameChars: '物理名に「.」「[」「]」「\'」「"」は使えません。',
    duplicate: '同じ物理名の項目が既にあります。',
    reserved: 'この物理名は使えません。',
    typeNotAllowed: 'この項目では選択できないデータ型です。',
    numeric: '数字で入力してください。',
    lengthRange: '1〜255の範囲で入力してください。',
    maxRowMin: '1以上の数値を入力してください。',
    minNotLess: '最小値には最大値より小さい値を入力してください。',
    maxNotGreater: '最大値には最小値より大きい値を入力してください。',
    defaultRange: 'デフォルト値は min から max の範囲内である必要があります。',
    defaultJson: 'デフォルト値は有効な JSON である必要があります。',
    defaultBoolean: 'デフォルト値は true または false である必要があります。',
    defaultLength: '文字列の長さは設定された長さを超えてはいけません。',
    formatRequired: '選択してください。',
  },
  bulk: {
    item: ({ n }) => `${n}件目: `,
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    notArray: 'JSON が無効です。配列である必要があります。',
    empty: 'データがありません',
    mapFailed: ({ message }) => `マッピングに失敗しました。${message}`,
    invalidItem:
      '各項目には code, name, attributes が必須です。マスターデータの場合は settingCode, seq も必須です。',
    invalidDataItem:
      '各項目には settingCode, code, name, seq, attributes が必須です。',
    invalidMappedSetting:
      '設定データの name, code は文字列、settingValue はオブジェクトである必要があります。',
    invalidMappedData:
      'データの settingCode, code, name は文字列、seq は数値、attributes はオブジェクトである必要があります。',
    settingNotAllowed:
      'マスター設定はこの画面から登録できません。マスターデータ画面では kind: "data" のみ登録できます。',
    otherTenant: 'tenantCode が現在のテナントと異なります。',
    invalidCode:
      'code と settingCode に「#」「@」は使用できません。「MASTER_SETTING」は設定コードに使えません。',
  },
}

const en: MasterMessages = {
  fieldTypes: {
    string: 'Text',
    number: 'Number',
    auto_number: 'Auto number',
    boolean: 'Boolean',
    date: 'Date',
    array: 'Text list',
    json: 'JSON',
    'text-area': 'Text area',
    'text-html': 'HTML',
    'text-markdown': 'Markdown',
  },
  table: {
    empty: 'No data',
    loading: 'Loading',
    selectAll: 'Select all on this page',
    selectRow: 'Select this row',
    pagerTop: 'Pagination (top)',
    pagerBottom: 'Pagination (bottom)',
  },
  bulkDialog: {
    open: 'JSON editor',
    title: 'JSON editor',
    json: 'JSON',
    cancel: 'Cancel',
    load: 'Load JSON',
    save: 'Save JSON',
    submit: 'Import',
    progress: ({ done, total }) => `Importing (${done}/${total})`,
    partial: ({ done, total }) => `${done} / ${total} imported`,
    failed: 'The import failed.',
    failedRange: ({ from, to }) => `Items ${from} to ${to} failed to import.`,
    done: ({ count }) => `Imported ${count} items.`,
    accepted: ({ count }) =>
      `${count} items were accepted; they may take a moment to appear in the list.`,
    timeout:
      'The result could not be confirmed. Reload to check which items were imported.',
  },
  defaults: {
    code: 'Code',
    name: 'Name',
    seq: 'Order',
    sampleSetting: 'Sample setting',
    sampleData: 'Sample data',
  },
  editors: {
    heading: 'Heading',
    font: 'Font',
    size: 'Size',
    color: 'Text color',
    background: 'Background color',
    align: 'Alignment',
    linkUrl: 'Link URL',
    openLink: 'Open link',
  },
  jsonDialog: {
    open: 'JSON editor',
    title: 'JSON editor',
    json: 'JSON',
    cancel: 'Cancel',
    load: 'Load JSON',
    save: 'Save JSON',
    apply: 'Apply',
  },
  validation: {
    required: 'This field is required.',
    blank: 'Spaces alone are not allowed.',
    maxLength: ({ max }) => `Enter at most ${max} characters.`,
    maxRows: ({ max }) => `Enter at most ${max} lines.`,
    pattern: ({ name }) => `${name} has the wrong format.`,
    integer: 'Enter a whole number.',
    min: ({ min }) => `The minimum is ${min}.`,
    max: ({ max }) => `The maximum is ${max}.`,
    json: 'The JSON is not valid.',
    keyChars: 'The characters # and @ cannot be used.',
    reserved: 'This code is reserved.',
  },
  fieldDefinition: {
    required: 'This field is required.',
    tooLong: ({ max }) => `Enter at most ${max} characters.`,
    nameChars: `A physical name cannot contain ".", "[", "]", "'" or '"'.`,
    duplicate: 'Another field already has this physical name.',
    reserved: 'This physical name is reserved.',
    typeNotAllowed: 'This data type is not available for this field.',
    numeric: 'Enter a number.',
    lengthRange: 'Enter a number from 1 to 255.',
    maxRowMin: 'Enter 1 or more.',
    minNotLess: 'The minimum must be less than the maximum.',
    maxNotGreater: 'The maximum must be greater than the minimum.',
    defaultRange: 'The default must be between the minimum and the maximum.',
    defaultJson: 'The default must be valid JSON.',
    defaultBoolean: 'The default must be true or false.',
    defaultLength: 'The default is longer than the length allows.',
    formatRequired: 'Select a format.',
  },
  bulk: {
    item: ({ n }) => `Item ${n}: `,
    invalidJson: 'The JSON is not valid.',
    notArray: 'The JSON must be a list.',
    empty: 'There is no data.',
    mapFailed: ({ message }) => `Mapping failed. ${message}`,
    invalidItem:
      'Every item needs code, name and attributes; data items also need settingCode and seq.',
    invalidDataItem:
      'Every item needs settingCode, code, name, seq and attributes.',
    invalidMappedSetting:
      'A mapped setting needs a text name and code and an object settingValue.',
    invalidMappedData:
      'Mapped data needs a text settingCode, code and name, a number seq and an object attributes.',
    settingNotAllowed:
      'Settings cannot be imported here; only kind: "data" items are allowed.',
    otherTenant: 'The tenantCode differs from the current tenant.',
    invalidCode:
      'code and settingCode cannot contain # or @, and MASTER_SETTING cannot be a setting code.',
  },
}

export const masterMessages = defineMessages('master', { ja, en })
