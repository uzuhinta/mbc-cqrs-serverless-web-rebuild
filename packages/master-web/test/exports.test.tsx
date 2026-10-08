import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import * as root from '../src/index'
import * as core from '../src/core/index'
import {
  MASTER_FIELD_TYPES,
  MbcProvider,
  masterMessages,
  useMessages,
} from '../src/index'

function Labels() {
  const t = useMessages(masterMessages)
  return <p>{MASTER_FIELD_TYPES.map((type) => t.fieldTypes[type]).join('|')}</p>
}

describe('master-web entries', () => {
  it('exports the core from the root, plus messages and the provider', () => {
    const CORE = [
      'allowedFieldTypes',
      'buildCopyRequest',
      'bulkSampleJson',
      'COPY_TYPES',
      'dataCodeOf',
      'dataFields',
      'dataJson',
      'dateParts',
      'DEFAULT_PAGE_SIZE',
      'defaultSettingFields',
      'ENTITY_CODE_FIELD',
      'ENTITY_NAME_FIELD',
      'fieldTypeOf',
      'fieldTypes',
      'FIXED_FIELD_NAMES',
      'formatDateValue',
      'fromFormValues',
      'initialDataListState',
      'initialSettingListState',
      'isEntityField',
      'isMasterFieldType',
      'MASTER_FIELD_TYPES',
      'mapResultToBulkItem',
      'normalizeFieldDefinition',
      'numberOption',
      'parseBulkJson',
      'parseDataJson',
      'parseMasterData',
      'parseMasterSetting',
      'parseSettingJson',
      'settingCodeOf',
      'settingJson',
      'settingToForm',
      'toDataPayload',
      'toFormValues',
      'toSettingPayload',
      'validateFieldDefinition',
      'validateMasterData',
      'validateSettingForm',
    ]
    expect(Object.keys(core).sort()).toEqual([...CORE].sort())
    expect(Object.keys(root).sort()).toEqual(
      [
        ...CORE,
        'BulkImportDialog',
        'defaultRenderers',
        'MasterDataEditor',
        'MasterDataList',
        'MasterLink',
        'MasterSettingEditor',
        'MasterSettingList',
        'masterDataMessages',
        'masterSettingMessages',
        'MbcProvider',
        'masterMessages',
        'useMessages',
      ].sort()
    )
  })

  it('labels every field type in Japanese by default and in English', () => {
    const { unmount } = render(
      <MbcProvider>
        <Labels />
      </MbcProvider>
    )
    expect(screen.getByText(/^文字列\|数値\|自動採番\|/)).toBeInTheDocument()
    unmount()
    render(
      <MbcProvider locale="en">
        <Labels />
      </MbcProvider>
    )
    expect(screen.getByText(/\|JSON\|/)).toBeInTheDocument()
    expect(screen.getByText(/^Text\|Number\|/)).toBeInTheDocument()
  })
})
