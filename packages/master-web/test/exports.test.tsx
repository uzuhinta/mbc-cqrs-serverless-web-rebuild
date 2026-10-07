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
      'dataFields',
      'defaultSettingFields',
      'ENTITY_CODE_FIELD',
      'ENTITY_NAME_FIELD',
      'fieldTypeOf',
      'fieldTypes',
      'FIXED_FIELD_NAMES',
      'formatDateValue',
      'fromFormValues',
      'isEntityField',
      'isMasterFieldType',
      'MASTER_FIELD_TYPES',
      'mapResultToBulkItem',
      'normalizeFieldDefinition',
      'numberOption',
      'parseBulkJson',
      'parseMasterData',
      'parseMasterSetting',
      'settingCodeOf',
      'toDataPayload',
      'toFormValues',
      'validateFieldDefinition',
      'validateMasterData',
    ]
    expect(Object.keys(core).sort()).toEqual([...CORE].sort())
    expect(Object.keys(root).sort()).toEqual(
      [...CORE, 'MbcProvider', 'masterMessages', 'useMessages'].sort(),
    )
  })

  it('labels every field type in Japanese by default and in English', () => {
    const { unmount } = render(
      <MbcProvider>
        <Labels />
      </MbcProvider>,
    )
    expect(screen.getByText(/^文字列\|数値\|自動採番\|/)).toBeInTheDocument()
    unmount()
    render(
      <MbcProvider locale="en">
        <Labels />
      </MbcProvider>,
    )
    expect(screen.getByText(/\|JSON\|/)).toBeInTheDocument()
    expect(screen.getByText(/^Text\|Number\|/)).toBeInTheDocument()
  })
})
