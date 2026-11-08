'use client'

import {
  BulkImportDialog,
  MASTER_FIELD_TYPES,
  MasterCopyRequestForm,
  MasterCopyTaskDetail,
  MasterCopyTaskList,
  MasterDataEditor,
  MasterDataList,
  MasterLink,
  MasterSettingEditor,
  MasterSettingList,
  MbcProvider,
  masterMessages,
  useMessages,
  type FieldRenderers,
  type JsonTextEditor,
  type MasterRouting,
} from '@mbc-cqrs-serverless/master-web'
import {
  initialDataListState,
  initialSettingListState,
  parseMasterSetting,
} from '@mbc-cqrs-serverless/master-web/core'
import {
  createMbcClient,
  MbcClientProvider,
  MbcMasterCopyRequestPage,
  MbcMasterCopyTaskDetailPage,
  MbcMasterCopyTaskListPage,
  MbcMasterDataEditorPage,
  MbcMasterDataListPage,
  MbcMasterSettingEditorPage,
  MbcMasterSettingListPage,
} from '@mbc-cqrs-serverless/master-web/mbc'
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
      { physicalName: 'body', name: '本文', dataType: 'text-html' },
      { physicalName: 'notes', name: '備考', dataType: 'text-markdown' },
      { physicalName: 'spec', name: '仕様', dataType: 'json' },
    ],
  },
})
if (!parsed.success) throw parsed.error
const setting = parsed.data

// The connected page renders its loading state on the server; it loads
// after hydration (this smoke app has no backend).
const client = createMbcClient({
  apiUrl: 'https://example.invalid',
  tenantCode: 'tenant-a',
})

const copyTask = {
  id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9A',
  pk: 'SFN_TASK#tenant-a',
  sk: 'MASTER_COPY_PRODUCT#01J9A',
  status: 'COMPLETED',
  createdAt: '2026-10-10T00:05:07.000Z',
  updatedAt: '2026-10-10T00:06:40.000Z',
  input: { targetTenants: ['tenant-b'] },
  attributes: { subTaskCount: 1, subTaskSucceedCount: 1 },
}

/** master-web's client entry and the new ui-web parts, rendered on the server and hydrated. */
/** `components` and `jsonEditor` come from the Server Component: `/editors`' renderers and JsonEditor cross as client references. */
export function MasterScreens({
  components,
  jsonEditor,
}: {
  components: FieldRenderers
  jsonEditor: JsonTextEditor
}) {
  return (
    <MbcProvider locale="ja">
      <FieldTypes />
      <MasterLink routing={routing} to={{ screen: 'settings' }}>
        master settings
      </MasterLink>
      <BulkImportDialog
        screen="settings"
        onImport={async () => {}}
        jsonEditor={jsonEditor}
      />
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
      <MasterDataEditor
        mode="create"
        setting={setting}
        routing={routing}
        components={components}
        jsonEditor={jsonEditor}
        onSave={async () => {}}
      />
      <MasterSettingEditor
        mode="edit"
        setting={setting}
        routing={routing}
        onSave={async () => {}}
        onDelete={async () => {}}
        jsonEditor={jsonEditor}
      />
      <MasterCopyRequestForm
        setting={setting}
        tenants={[{ code: 'tenant-b', name: 'テナントB' }]}
        items={[]}
        total={0}
        state={initialDataListState()}
        onStateChange={() => {}}
        routing={routing}
        onRequestCopy={async () => {}}
      />
      <MasterCopyTaskList
        settingId={setting.id}
        tasks={[copyTask]}
        routing={routing}
        onRefresh={() => {}}
      />
      <MasterCopyTaskDetail
        settingId={setting.id}
        tasks={[copyTask]}
        routing={routing}
      />
      <MbcClientProvider client={client}>
        {/* Every connected page renders on the server (they load after mount). */}
        <MbcMasterSettingListPage routing={routing} jsonEditor={jsonEditor} />
        <MbcMasterSettingEditorPage
          routing={routing}
          id={setting.id}
          jsonEditor={jsonEditor}
        />
        <MbcMasterDataListPage routing={routing} settingId={setting.id} />
        <MbcMasterDataEditorPage
          routing={routing}
          settingId={setting.id}
          components={components}
          jsonEditor={jsonEditor}
        />
        <MbcMasterCopyRequestPage
          routing={routing}
          settingId={setting.id}
          loadTenants={async () => []}
        />
        <MbcMasterCopyTaskListPage routing={routing} settingId={setting.id} />
        <MbcMasterCopyTaskDetailPage
          routing={routing}
          settingId={setting.id}
          taskId={copyTask.id}
        />
      </MbcClientProvider>
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
        value={['a']}
        onValueChange={() => {}}
      />
    </MbcProvider>
  )
}
