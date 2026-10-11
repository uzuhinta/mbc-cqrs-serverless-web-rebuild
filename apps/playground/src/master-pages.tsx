import {
  copyTaskTenant,
  initialDataListState,
  initialSettingListState,
  MasterCopyRequestForm,
  MasterCopyTaskDetail,
  MasterCopyTaskList,
  MasterDataEditor,
  MasterDataList,
  MasterSettingEditor,
  MasterSettingList,
  parseMasterSetting,
  type BulkJsonItem,
  type CopyTask,
  type ListSort,
  type MasterCopyRequest,
  type MasterData,
  type MasterDataCreateBody,
  type MasterDataListItem,
  type MasterDataListState,
  type MasterDataUpdateBody,
  type MasterRouting,
  type MasterSetting,
  type MasterSettingCreateBody,
  type MasterSettingListItem,
  type MasterSettingListState,
  type MasterSettingUpdateBody,
  type MasterTenant,
  type SequenceFormat,
  type SettingOption,
} from '@mbc-cqrs-serverless/master-web'
import {
  editorRenderers,
  JsonEditor,
} from '@mbc-cqrs-serverless/master-web/editors'
import { useState } from 'react'

const TENANT = 'tenant-a'

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
  { code: 'SEQ#ORDER', name: '注文番号', format: 'O-%%no%%' },
]

const OPTIONS: SettingOption[] = [
  { key: 'copyOnTenantCreate', label: '新規テナント作成時に設定をコピー' },
]

function settingOf(code: string, name: string, tenant = TENANT): MasterSetting {
  const parsed = parseMasterSetting({
    id: `MASTER#${tenant}#MASTER_SETTING#${code}`,
    pk: `MASTER#${tenant}`,
    sk: `MASTER_SETTING#${code}`,
    code,
    name,
    version: 1,
    tenantCode: tenant,
    attributes: {
      description: `${name}のマスタ`,
      fields: [
        {
          physicalName: 'code',
          name: 'コード',
          dataType: code === 'PRODUCT' ? 'auto_number' : 'string',
          formatCode: code === 'PRODUCT' ? 'SEQ#PRODUCT' : undefined,
          dataFormat: code === 'PRODUCT' ? '%%no%%' : undefined,
          formatName: code === 'PRODUCT' ? '商品番号' : undefined,
          isRequired: true,
          isShowedOnList: true,
        },
        {
          physicalName: 'name',
          name: '名称',
          dataType: 'string',
          length: '255',
          isRequired: true,
          isShowedOnList: true,
        },
        {
          physicalName: 'seq',
          name: '並び順',
          dataType: 'number',
          isRequired: false,
          isShowedOnList: true,
        },
        {
          physicalName: 'price',
          name: '価格',
          dataType: 'number',
          min: '0',
          max: '100000',
          isRequired: true,
          isShowedOnList: true,
        },
        {
          physicalName: 'released',
          name: '発売日',
          dataType: 'date',
          defaultValue: '2026-10-07T00:00:00+09:00',
          isRequired: false,
          isShowedOnList: true,
        },
        {
          physicalName: 'spec',
          name: '仕様',
          dataType: 'json',
          defaultValue: { size: 'M' },
          isRequired: false,
          isShowedOnList: true,
        },
        {
          physicalName: 'body',
          name: '本文',
          dataType: 'text-html',
          isRequired: false,
          isShowedOnList: false,
        },
        {
          physicalName: 'notes',
          name: '備考',
          dataType: 'text-markdown',
          isRequired: false,
          isShowedOnList: false,
        },
      ],
    },
  })
  if (!parsed.success) throw parsed.error
  return parsed.data
}

/** The playground's settings, kept while it runs; PREF belongs to another tenant. */
const store = new Map<string, MasterSetting>(
  [
    settingOf('PRODUCT', '商品'),
    settingOf('PREF', '都道府県', 'common'),
    ...Array.from({ length: 22 }, (_, i) =>
      settingOf(
        `EXTRA_${String(i + 1).padStart(2, '0')}`,
        `追加マスタ ${i + 1}`
      )
    ),
  ].map((setting) => [setting.id, setting])
)

const settingRows = (): MasterSettingListItem[] =>
  [...store.values()].map((setting) => ({
    id: setting.id,
    pk: setting.pk,
    sk: setting.sk,
    code: `MASTER_SETTING#${setting.code}`,
    name: setting.name,
    tenantCode: setting.tenantCode,
    attributes: { description: setting.attributes.description },
  }))

/** PRODUCT's records, kept while the playground runs; P-025 belongs to another tenant. */
const records = new Map<string, MasterData>(
  Array.from({ length: 26 }, (_, i): [string, MasterData] => {
    const code = `P-${String(i + 1).padStart(3, '0')}`
    const tenant = i === 24 ? 'common' : TENANT
    const record: MasterData = {
      id: `MASTER#${tenant}#PRODUCT#${code}`,
      pk: `MASTER#${tenant}`,
      sk: `PRODUCT#${code}`,
      code,
      name:
        i === 3
          ? '名前がとても長い商品で、表のセルで折り返されることを確かめるための行'
          : `商品 ${i + 1}`,
      version: 1,
      tenantCode: tenant,
      seq: i,
      isDeleted: i === 25,
      attributes: {
        code,
        price: String((i + 1) * 120),
        released: `2026-${String((i % 12) + 1).padStart(2, '0')}-07T00:00:00+09:00`,
        spec: i % 3 === 0 ? { size: 'L' } : {},
        body: '<p>甘い<strong>りんご</strong></p>',
        notes: '# りんご\n\n- 赤い\n- 甘い',
      },
    }
    return [record.id, record]
  })
)
let nextNumber = records.size + 1

const dataRows = (): MasterDataListItem[] =>
  [...records.values()].map((record) => ({
    id: record.id,
    pk: record.pk,
    sk: record.sk,
    masterCode: record.code,
    name: record.name,
    seq: record.seq,
    isDeleted: record.isDeleted,
    attributes: record.attributes,
  }))

function sorted<T>(
  rows: T[],
  sort: ListSort | undefined,
  value: (row: T, column: string) => string | number
) {
  if (!sort) return rows
  return [...rows].sort((a, b) => {
    const x = value(a, sort.column)
    const y = value(b, sort.column)
    const order = x < y ? -1 : x > y ? 1 : 0
    return sort.desc ? -order : order
  })
}

const pageOf = <T,>(rows: T[], state: { page: number; pageSize: number }) =>
  rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Pretends to import: one item finishes every 300 ms. */
async function fakeImport(
  items: BulkJsonItem[],
  onProgress: (done: number, total: number) => void
) {
  for (let done = 1; done <= items.length; done++) {
    await wait(300)
    onProgress(done, items.length)
  }
}

const TENANTS: MasterTenant[] = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
  { code: 'tenant-d', name: 'テナントD' },
]

/** Copy requests by setting id (newest first), and each one's tenant tasks. */
const copies = new Map<string, CopyTask[]>()
const tenantTasks = new Map<string, CopyTask[]>()

/** The parent's counts, as the backend keeps them; done when no tenant waits. */
function count(parent: CopyTask) {
  const tasks = tenantTasks.get(parent.id) ?? []
  const of = (status: string) =>
    tasks.filter((task) => task.status === status).length
  parent.attributes = {
    subTaskCount: tasks.length,
    subTaskRunningCount: of('QUEUED'),
    subTaskSucceedCount: of('COMPLETED'),
    subTaskFailedCount: of('FAILED'),
  }
  if (of('QUEUED') === 0) {
    parent.status = 'COMPLETED'
    parent.updatedAt = new Date().toISOString()
  }
}

function requestCopy(setting: MasterSetting, request: MasterCopyRequest) {
  const now = new Date().toISOString()
  const sk = `MASTER_COPY_${setting.code}#${Date.now().toString(36).toUpperCase()}`
  const parent: CopyTask = {
    id: `SFN_TASK#${TENANT}#${sk}`,
    pk: `SFN_TASK#${TENANT}`,
    sk,
    status: 'PROCESSING',
    createdAt: now,
    updatedAt: now,
  }
  tenantTasks.set(
    parent.id,
    request.targetTenants.map((tenant, n) => ({
      id: `${parent.id}#${n}`,
      pk: parent.pk,
      sk: `${sk}#${n}`,
      status: 'QUEUED',
      createdAt: now,
      input: { ...request, targetTenants: [tenant] },
    }))
  )
  copies.set(setting.id, [parent, ...(copies.get(setting.id) ?? [])])
  count(parent)
}

/** Pretends the copy runs: each refresh finishes one more tenant; the last of several fails. */
function advance(parent: CopyTask) {
  const tasks = tenantTasks.get(parent.id) ?? []
  const next = tasks.find((task) => task.status === 'QUEUED')
  if (next) {
    const fails = tasks.length > 1 && next === tasks.at(-1)
    next.status = fails ? 'FAILED' : 'COMPLETED'
    next.updatedAt = new Date().toISOString()
    if (fails)
      next.attributes = {
        error: `Error: ${copyTaskTenant(next)} is not ready\n    at copy (playground)`,
      }
  }
  count(parent)
}

const routing: MasterRouting = {
  href: (to) => {
    const id = encodeURIComponent
    switch (to.screen) {
      case 'setting':
        return `#master/setting/${id(to.id)}`
      case 'dataItem':
        return `#master/dataItem/${id(to.settingId)}/${id(to.id)}`
      case 'copyTask':
        return `#master/copyTask/${id(to.settingId)}/${id(to.taskId)}`
      case 'data':
      case 'newData':
      case 'copyRequest':
      case 'copyTasks':
        return `#master/${to.screen}/${id(to.settingId)}`
      default:
        return `#master/${to.screen}`
    }
  },
  navigate: (to) => {
    location.hash = routing.href(to)
  },
}

function SettingsPage() {
  const [state, setState] = useState<MasterSettingListState>(
    initialSettingListState
  )
  const matches = settingRows().filter(
    (row) =>
      row.code.includes(state.code) &&
      row.name.includes(state.name) &&
      String(row.attributes?.description ?? '').includes(state.keyword)
  )
  const rows = sorted(matches, state.sort, (row, column) =>
    column === 'name' ? row.name : row.code
  )
  return (
    <MasterSettingList
      items={pageOf(rows, state)}
      total={rows.length}
      state={state}
      onStateChange={setState}
      routing={routing}
      tenantCode={TENANT}
      onImport={fakeImport}
      jsonEditor={JsonEditor}
      onBack={() => {
        location.hash = ''
      }}
    />
  )
}

function SettingPage({ id }: { id?: string }) {
  const [setting, setSetting] = useState(() =>
    id === undefined ? undefined : store.get(id)
  )
  const save = async (
    body: MasterSettingCreateBody | MasterSettingUpdateBody
  ) => {
    await wait(600)
    if (!setting) {
      const created = settingOf(body.code, body.name)
      created.attributes = body.attributes
      store.set(created.id, created)
      routing.navigate({ screen: 'data', settingId: created.id })
      return
    }
    const next = {
      ...setting,
      name: body.name,
      attributes: body.attributes,
      version: setting.version + 1,
    }
    store.set(next.id, next)
    setSetting(next)
  }
  return (
    <MasterSettingEditor
      mode={id === undefined ? 'create' : 'edit'}
      setting={setting}
      routing={routing}
      tenantCode={TENANT}
      canCopy
      settingOptions={OPTIONS}
      formats={FORMATS}
      jsonEditor={JsonEditor}
      checkCodeUnique={async (code) => {
        await wait(200)
        return ![...store.values()].some((entry) => entry.code === code)
      }}
      onSave={save}
      onDelete={async () => {
        await wait(600)
        if (setting) store.delete(setting.id)
        routing.navigate({ screen: 'settings' })
      }}
    />
  )
}

/** A setting's records, filtered, sorted and paged as the backend's list does. */
function dataPage(setting: MasterSetting, state: MasterDataListState) {
  const source = setting.code === 'PRODUCT' ? dataRows() : []
  const matches = source.filter(
    (row) =>
      (row.masterCode ?? '').includes(state.code) &&
      row.name.includes(state.keyword) &&
      (state.isDeleted || !row.isDeleted)
  )
  const rows = sorted(matches, state.sort, (row, column) =>
    column === 'name'
      ? row.name
      : column === 'seq'
        ? (row.seq ?? 0)
        : (row.masterCode ?? '')
  )
  return { items: pageOf(rows, state), total: rows.length }
}

function DataPage({ settingId }: { settingId: string }) {
  const [state, setState] = useState<MasterDataListState>(initialDataListState)
  const setting = store.get(settingId) ?? [...store.values()][0]!
  const { items, total } = dataPage(setting, state)
  return (
    <MasterDataList
      setting={setting}
      items={items}
      total={total}
      state={state}
      onStateChange={setState}
      routing={routing}
      tenantCode={TENANT}
      onImport={fakeImport}
      jsonEditor={JsonEditor}
    />
  )
}

function DataEditorPage({ settingId, id }: { settingId: string; id?: string }) {
  const setting = store.get(settingId)
  const [data, setData] = useState(() =>
    id === undefined ? undefined : records.get(id)
  )
  const [rich, setRich] = useState(true)
  const save = async (body: MasterDataCreateBody | MasterDataUpdateBody) => {
    await wait(600)
    if (!setting) return
    if (!data && 'code' in body) {
      const created: MasterData = {
        id: `MASTER#${TENANT}#${body.settingCode}#${body.code}`,
        pk: `MASTER#${TENANT}`,
        sk: `${body.settingCode}#${body.code}`,
        code: body.code,
        name: body.name,
        version: 1,
        tenantCode: TENANT,
        seq: body.seq,
        attributes: body.attributes,
      }
      records.set(created.id, created)
      routing.navigate({ screen: 'data', settingId })
      return
    }
    if (!data) return
    const next = { ...data, ...body, version: data.version + 1 }
    records.set(next.id, next)
    setData(next)
  }
  const mark = (isDeleted: boolean) => async () => {
    await wait(600)
    if (data) records.set(data.id, { ...data, isDeleted })
  }
  return (
    <>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={rich}
          onChange={(event) => setRich(event.target.checked)}
        />{' '}
        Rich editors (/editors)
      </label>
      <MasterDataEditor
        key={rich ? 'rich' : 'plain'}
        components={rich ? editorRenderers : undefined}
        jsonEditor={rich ? JsonEditor : undefined}
        mode={id === undefined ? 'create' : 'edit'}
        setting={setting}
        data={data}
        routing={routing}
        tenantCode={TENANT}
        checkCodeUnique={async (code) => {
          await wait(200)
          return ![...records.values()].some((record) => record.code === code)
        }}
        generateCode={async () => {
          await wait(300)
          return `P-${String(nextNumber++).padStart(3, '0')}`
        }}
        onSave={save}
        onDelete={mark(true)}
        onRestore={mark(false)}
      />
    </>
  )
}

function CopyRequestPage({ settingId }: { settingId: string }) {
  const [state, setState] = useState<MasterDataListState>(initialDataListState)
  const setting = store.get(settingId)
  if (!setting) return null
  const { items, total } = dataPage(setting, state)
  return (
    <MasterCopyRequestForm
      setting={setting}
      tenants={TENANTS}
      items={items}
      total={total}
      state={state}
      onStateChange={setState}
      routing={routing}
      onRequestCopy={async (request) => {
        await wait(600)
        requestCopy(setting, request)
      }}
    />
  )
}

/** Copies of the store's tasks, so React sees each refresh. */
const fresh = (tasks: CopyTask[] | undefined) =>
  (tasks ?? []).map((task) => ({ ...task }))

function CopyTasksPage({ settingId }: { settingId: string }) {
  const [tasks, setTasks] = useState(() => fresh(copies.get(settingId)))
  const [loading, setLoading] = useState(false)
  const refresh = async () => {
    setLoading(true)
    await wait(400)
    for (const parent of copies.get(settingId) ?? []) advance(parent)
    setTasks(fresh(copies.get(settingId)))
    setLoading(false)
  }
  return (
    <MasterCopyTaskList
      settingId={settingId}
      tasks={tasks}
      routing={routing}
      loading={loading}
      onRefresh={() => void refresh()}
    />
  )
}

function CopyTaskPage({
  settingId,
  taskId,
}: {
  settingId: string
  taskId: string
}) {
  const [tasks, setTasks] = useState(() => fresh(tenantTasks.get(taskId)))
  const [loading, setLoading] = useState(false)
  const refresh = async () => {
    setLoading(true)
    await wait(400)
    const parent = copies.get(settingId)?.find((task) => task.id === taskId)
    if (parent) advance(parent)
    setTasks(fresh(tenantTasks.get(taskId)))
    setLoading(false)
  }
  return (
    <MasterCopyTaskDetail
      settingId={settingId}
      tasks={tasks}
      routing={routing}
      loading={loading}
      onRefresh={() => void refresh()}
    />
  )
}

/**
 * `#master` (settings list), `#master/newSetting`, `#master/setting/<id>`,
 * `#master/data/<setting id>`, `#master/newData/<setting id>`,
 * `#master/dataItem/<setting id>/<id>`, `#master/copyRequest/<setting id>`,
 * `#master/copyTasks/<setting id>` and `#master/copyTask/<setting id>/<task
 * id>`, on in-memory data.
 */
export function MasterPage({ route }: { route: string }) {
  const [, screen, id, item] = route.split('/')
  const decoded = id === undefined ? undefined : decodeURIComponent(id)
  const itemId = item === undefined ? undefined : decodeURIComponent(item)
  return (
    <div style={{ padding: 16 }}>
      {screen === 'data' && decoded ? (
        <DataPage key={decoded} settingId={decoded} />
      ) : screen === 'newData' && decoded ? (
        <DataEditorPage key={`new:${decoded}`} settingId={decoded} />
      ) : screen === 'dataItem' && decoded && itemId ? (
        <DataEditorPage key={itemId} settingId={decoded} id={itemId} />
      ) : screen === 'copyRequest' && decoded ? (
        <CopyRequestPage key={decoded} settingId={decoded} />
      ) : screen === 'copyTasks' && decoded ? (
        <CopyTasksPage key={decoded} settingId={decoded} />
      ) : screen === 'copyTask' && decoded && itemId ? (
        <CopyTaskPage key={itemId} settingId={decoded} taskId={itemId} />
      ) : screen === 'setting' && decoded ? (
        <SettingPage key={decoded} id={decoded} />
      ) : screen === 'newSetting' ? (
        <SettingPage key="new" />
      ) : (
        <SettingsPage />
      )}
    </div>
  )
}
