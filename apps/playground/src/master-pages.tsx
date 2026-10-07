import {
  initialDataListState,
  initialSettingListState,
  MasterDataList,
  MasterSettingList,
  parseMasterSetting,
  type BulkJsonItem,
  type ListSort,
  type MasterDataListItem,
  type MasterDataListState,
  type MasterRouting,
  type MasterSetting,
  type MasterSettingListItem,
  type MasterSettingListState,
} from '@mbc-cqrs-serverless/master-web'
import { useState } from 'react'

const TENANT = 'tenant-a'

function settingOf(code: string, name: string): MasterSetting {
  const parsed = parseMasterSetting({
    id: `MASTER#${TENANT}#MASTER_SETTING#${code}`,
    pk: `MASTER#${TENANT}`,
    sk: `MASTER_SETTING#${code}`,
    code,
    name,
    version: 1,
    tenantCode: TENANT,
    attributes: {
      description: `${name}のマスタ`,
      fields: [
        {
          physicalName: 'code',
          name: 'コード',
          dataType: 'string',
          isRequired: true,
          isShowedOnList: true,
        },
        {
          physicalName: 'name',
          name: '名称',
          dataType: 'string',
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
          isRequired: false,
          isShowedOnList: true,
        },
        {
          physicalName: 'released',
          name: '発売日',
          dataType: 'date',
          isRequired: false,
          isShowedOnList: true,
        },
        {
          physicalName: 'spec',
          name: '仕様',
          dataType: 'json',
          isRequired: false,
          isShowedOnList: true,
        },
      ],
    },
  })
  if (!parsed.success) throw parsed.error
  return parsed.data
}

const SETTINGS: MasterSetting[] = [
  settingOf('PRODUCT', '商品'),
  settingOf('PREF', '都道府県'),
  ...Array.from({ length: 22 }, (_, i) =>
    settingOf(`EXTRA_${String(i + 1).padStart(2, '0')}`, `追加マスタ ${i + 1}`)
  ),
]

const settingRows: MasterSettingListItem[] = SETTINGS.map((setting) => ({
  id: setting.id,
  pk: setting.pk,
  sk: setting.sk,
  code: `MASTER_SETTING#${setting.code}`,
  name: setting.name,
  tenantCode: TENANT,
  attributes: { description: setting.attributes.description },
}))

const dataRows: MasterDataListItem[] = Array.from({ length: 26 }, (_, i) => {
  const code = `P-${String(i + 1).padStart(3, '0')}`
  return {
    id: `MASTER#${TENANT}#PRODUCT#${code}`,
    pk: `MASTER#${TENANT}`,
    sk: `PRODUCT#${code}`,
    masterCode: code,
    name:
      i === 3
        ? '名前がとても長い商品で、表のセルで折り返されることを確かめるための行'
        : `商品 ${i + 1}`,
    seq: i,
    isDeleted: i === 25,
    attributes: {
      price: String((i + 1) * 120),
      released: `2026-${String((i % 12) + 1).padStart(2, '0')}-07T00:00:00+09:00`,
      spec: i % 3 === 0 ? { size: 'L' } : {},
    },
  }
})

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

/** Pretends to import: one item finishes every 300 ms. */
async function fakeImport(
  items: BulkJsonItem[],
  onProgress: (done: number, total: number) => void
) {
  for (let done = 1; done <= items.length; done++) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    onProgress(done, items.length)
  }
}

const routing: MasterRouting = {
  href: (to) =>
    to.screen === 'data'
      ? `#master/data/${encodeURIComponent(to.settingId)}`
      : `#master/${to.screen}`,
  navigate: (to) => {
    location.hash = routing.href(to)
  },
}

function SettingsPage() {
  const [state, setState] = useState<MasterSettingListState>(
    initialSettingListState
  )
  const matches = settingRows.filter(
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
      onBack={() => {
        location.hash = ''
      }}
    />
  )
}

function DataPage({ settingId }: { settingId: string }) {
  const [state, setState] = useState<MasterDataListState>(initialDataListState)
  const setting =
    SETTINGS.find((entry) => entry.id === settingId) ?? SETTINGS[0]!
  const source = setting.code === 'PRODUCT' ? dataRows : []
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
  return (
    <MasterDataList
      setting={setting}
      items={pageOf(rows, state)}
      total={rows.length}
      state={state}
      onStateChange={setState}
      routing={routing}
      tenantCode={TENANT}
      onImport={fakeImport}
    />
  )
}

/** `#master` (settings list) and `#master/data/<setting id>` on in-memory data. */
export function MasterPage({ route }: { route: string }) {
  const [, screen, id] = route.split('/')
  return (
    <div style={{ padding: 16 }}>
      {screen === 'data' && id ? (
        <DataPage key={id} settingId={decodeURIComponent(id)} />
      ) : (
        <SettingsPage />
      )}
    </div>
  )
}
