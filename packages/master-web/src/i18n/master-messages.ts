import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterFieldType } from '../core/field-type-names'

export type MasterMessages = {
  fieldTypes: Record<MasterFieldType, string>
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
}

export const masterMessages = defineMessages('master', { ja, en })
