import type {
  MasterDataListItem,
  MasterSettingListItem,
} from '../../src/core/list'

/** Rows as the list endpoints return them (the database table): settings carry `MASTER_SETTING#<code>`. */
export const SETTING_ROWS: MasterSettingListItem[] = [
  {
    id: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
    pk: 'MASTER#tenant-a',
    sk: 'MASTER_SETTING#PRODUCT',
    code: 'MASTER_SETTING#PRODUCT',
    name: '商品',
    tenantCode: 'tenant-a',
    attributes: { description: '商品マスタ', fields: [] },
  },
  {
    id: 'MASTER#common#MASTER_SETTING#PREF',
    pk: 'MASTER#common',
    sk: 'MASTER_SETTING#PREF',
    code: 'MASTER_SETTING#PREF',
    name: '都道府県',
    tenantCode: 'common',
    attributes: {},
  },
]

export const DATA_ROWS: MasterDataListItem[] = [
  {
    id: 'MASTER#tenant-a#PRODUCT#P-001',
    pk: 'MASTER#tenant-a',
    sk: 'PRODUCT#P-001',
    code: 'PRODUCT#P-001',
    masterCode: 'P-001',
    name: 'りんご',
    seq: 3,
    attributes: {
      price: '1200',
      active: true,
      released: '2026-10-07T00:00:00+09:00',
      tags: ['fruit', 'red'],
      spec: { size: 'L' },
    },
  },
  {
    id: 'MASTER#tenant-a#PRODUCT#P/002',
    pk: 'MASTER#tenant-a',
    sk: 'PRODUCT#P/002',
    masterCode: 'P/002',
    name: 'みかん',
    seq: null,
    isDeleted: true,
    attributes: {},
  },
]
