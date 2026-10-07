'use client'

import {
  BulkImportDialog,
  MASTER_FIELD_TYPES,
  MasterDataList,
  MasterLink,
  MasterSettingList,
  MbcProvider,
  masterMessages,
  useMessages,
  type MasterRouting,
} from '@mbc-cqrs-serverless/master-web'
import {
  initialDataListState,
  initialSettingListState,
  parseMasterSetting,
} from '@mbc-cqrs-serverless/master-web/core'
import { MultiSelect } from '@mbc-cqrs-serverless/ui-web'

function FieldTypes() {
  const t = useMessages(masterMessages)
  return (
    <ul>
      {MASTER_FIELD_TYPES.map((type) => (
        <li key={type}>{t.fieldTypes[type]}</li>
      ))}
    </ul>
  )
}

const routing: MasterRouting = {
  href: (target) => `/master/${target.screen}`,
  navigate: () => {},
}

const parsed = parseMasterSetting({
  id: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
  pk: 'MASTER#tenant-a',
  sk: 'MASTER_SETTING#PRODUCT',
  code: 'PRODUCT',
  name: '商品',
  version: 1,
  attributes: {
    fields: [
      {
        physicalName: 'code',
        name: 'コード',
        dataType: 'string',
        isShowedOnList: true,
      },
      {
        physicalName: 'name',
        name: '名称',
        dataType: 'string',
        isShowedOnList: true,
      },
    ],
  },
})
if (!parsed.success) throw parsed.error
const setting = parsed.data

/** master-web's client entry and the new ui-web parts, rendered on the server and hydrated. */
export function MasterScreens() {
  return (
    <MbcProvider locale="ja">
      <FieldTypes />
      <MasterLink routing={routing} to={{ screen: 'settings' }}>
        master settings
      </MasterLink>
      <BulkImportDialog screen="settings" onImport={async () => {}} />
      <MasterSettingList
        items={[
          {
            id: setting.id,
            pk: setting.pk,
            sk: setting.sk,
            code: 'MASTER_SETTING#PRODUCT',
            name: setting.name,
          },
        ]}
        total={1}
        state={initialSettingListState()}
        onStateChange={() => {}}
        routing={routing}
      />
      <MasterDataList
        setting={setting}
        items={[
          {
            id: 'MASTER#tenant-a#PRODUCT#P-001',
            pk: 'MASTER#tenant-a',
            sk: 'PRODUCT#P-001',
            masterCode: 'P-001',
            name: 'りんご',
          },
        ]}
        total={1}
        state={initialDataListState()}
        onStateChange={() => {}}
        routing={routing}
      />
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
        value={['a']}
        onValueChange={() => {}}
      />
    </MbcProvider>
  )
}
