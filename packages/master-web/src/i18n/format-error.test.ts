import { describe, expect, it } from 'vitest'

import {
  formatBulkError,
  formatFieldDefinitionError,
  formatMasterError,
} from './format-error'
import { masterMessages } from './master-messages'

const { ja, en } = masterMessages.locales

describe('error text', () => {
  it('formats data errors with their parameters (v0’s Japanese)', () => {
    expect(formatMasterError({ key: 'required' }, ja.validation)).toBe(
      '入力してください。',
    )
    expect(
      formatMasterError(
        { key: 'maxLength', params: { max: 8 } },
        ja.validation,
      ),
    ).toBe('8文字以内で入力してください。')
    expect(
      formatMasterError(
        { key: 'pattern', params: { name: 'SKU' } },
        ja.validation,
      ),
    ).toBe('SKU の型が違います。')
    expect(
      formatMasterError({ key: 'min', params: { min: 0 } }, en.validation),
    ).toBe('The minimum is 0.')
  })

  it('formats field-definition errors', () => {
    expect(
      formatFieldDefinitionError({ key: 'lengthRange' }, ja.fieldDefinition),
    ).toBe('1〜255の範囲で入力してください。')
    expect(
      formatFieldDefinitionError(
        { key: 'tooLong', params: { max: 255 } },
        en.fieldDefinition,
      ),
    ).toBe('Enter at most 255 characters.')
  })

  it('prefixes bulk errors about one entry with its 1-based number', () => {
    expect(formatBulkError({ key: 'notArray' }, ja.bulk)).toBe(
      'JSON が無効です。配列である必要があります。',
    )
    expect(formatBulkError({ key: 'invalidDataItem', index: 0 }, ja.bulk)).toBe(
      '1件目: 各項目には settingCode, code, name, seq, attributes が必須です。',
    )
    expect(
      formatBulkError(
        { key: 'mapFailed', index: 2, message: 'bad row' },
        en.bulk,
      ),
    ).toBe('Item 3: Mapping failed. bad row')
  })
})
