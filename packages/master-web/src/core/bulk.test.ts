import { describe, expect, it } from 'vitest'

import { masterAccess, OPEN_ACCESS } from './access'
import {
  bulkAccessErrors,
  bulkSampleJson,
  mapResultToBulkItem,
  parseBulkJson,
  type BulkMapper,
  type MapResult,
} from './bulk'

const setting = {
  code: 'S',
  name: '設定',
  attributes: { description: '', fields: [] },
}
const data = {
  settingCode: 'S',
  code: 'D1',
  name: 'データ',
  seq: 0,
  attributes: {},
}

describe('parseBulkJson without a mapper', () => {
  it('reports JSON that does not parse or is not a list', () => {
    expect(parseBulkJson('{', { screen: 'settings' })).toEqual({
      items: [],
      errors: [{ key: 'invalidJson' }],
    })
    expect(parseBulkJson('{}', { screen: 'settings' }).errors).toEqual([
      { key: 'notArray' },
    ])
    expect(parseBulkJson('[]', { screen: 'settings' }).errors).toEqual([
      { key: 'empty' },
    ])
  })

  it('accepts settings and data on the settings list, data only on a data list', () => {
    const text = JSON.stringify([setting, data])
    expect(parseBulkJson(text, { screen: 'settings' })).toEqual({
      items: [setting, data],
      errors: [],
    })
    expect(parseBulkJson(text, { screen: 'data' })).toEqual({
      items: [data],
      errors: [{ key: 'invalidDataItem', index: 0 }],
    })
  })

  it('reports every bad entry with its index', () => {
    const text = JSON.stringify([
      { code: 1, name: 'x', attributes: {} },
      { ...data, seq: '0' },
      { ...data, settingCode: ' ' },
      data,
    ])
    expect(parseBulkJson(text, { screen: 'settings' })).toEqual({
      items: [data],
      errors: [
        { key: 'invalidItem', index: 0 },
        { key: 'invalidItem', index: 1 },
        { key: 'invalidItem', index: 2 },
      ],
    })
  })
})

describe('parseBulkJson with a mapper', () => {
  const mapper: BulkMapper = (raw) => {
    const row = raw as { kind?: string; id?: string; label?: string }
    if (row.kind === 'skip') return null
    if (row.kind === 'boom') throw new Error('bad row')
    if (row.kind === 'setting')
      return {
        kind: 'setting',
        value: { code: row.id ?? '', name: row.label ?? '', settingValue: {} },
      }
    return {
      kind: 'data',
      value: {
        settingCode: 'S',
        code: row.id ?? '',
        name: row.label ?? '',
        seq: 1,
        attributes: {},
      },
    }
  }

  it('maps entries, skips nulls and reports mapper failures', () => {
    const text = JSON.stringify([
      { kind: 'data', id: 'a', label: 'A' },
      { kind: 'skip' },
      { kind: 'boom' },
      { kind: 'setting', id: 's', label: 'S' },
    ])
    expect(
      parseBulkJson(text, { screen: 'settings', mapRawItem: mapper })
    ).toEqual({
      items: [
        {
          name: 'A',
          code: 'a',
          settingCode: 'S',
          tenantCode: undefined,
          seq: 1,
          attributes: {},
        },
        { name: 'S', code: 's', tenantCode: undefined, attributes: {} },
      ],
      errors: [{ key: 'mapFailed', index: 2, message: 'bad row' }],
    })
  })

  it('reports malformed mapper results instead of throwing', () => {
    const results: unknown[] = [
      { kind: 'data' },
      { kind: 'setting', value: null },
      'oops',
      { kind: 'other', value: {} },
    ]
    const mapper: BulkMapper = (raw) =>
      results[(raw as { i: number }).i] as MapResult
    const text = JSON.stringify([{ i: 0 }, { i: 1 }, { i: 2 }, { i: 3 }])
    expect(
      parseBulkJson(text, { screen: 'settings', mapRawItem: mapper }).errors
    ).toEqual([
      { key: 'invalidMappedData', index: 0 },
      { key: 'invalidMappedSetting', index: 1 },
      { key: 'invalidMappedData', index: 2 },
      { key: 'invalidMappedData', index: 3 },
    ])
  })

  it('refuses mapped settings on a data list and checks mapped values', () => {
    const text = JSON.stringify([{ kind: 'setting', id: 's' }])
    expect(
      parseBulkJson(text, { screen: 'data', mapRawItem: mapper }).errors
    ).toEqual([{ key: 'settingNotAllowed', index: 0 }])
    const broken: BulkMapper = () => ({
      kind: 'data',
      value: { settingCode: '', code: 'c', name: 'n', seq: 0, attributes: {} },
    })
    expect(
      parseBulkJson('[{}]', { screen: 'data', mapRawItem: broken }).errors
    ).toEqual([{ key: 'invalidMappedData', index: 0 }])
    expect(
      parseBulkJson('[{"kind":"skip"}]', { screen: 'data', mapRawItem: mapper })
        .errors
    ).toEqual([{ key: 'empty' }])
  })
})

describe('parseBulkJson with the current tenant', () => {
  it('accepts entries for the current tenant written in another case', () => {
    const text = JSON.stringify([{ ...data, tenantCode: 'tenant-a' }])
    expect(
      parseBulkJson(text, { screen: 'data', tenantCode: 'TENANT-A' }).errors
    ).toEqual([])
  })

  it('refuses entries for another tenant, mapped or not (the backend would reject the batch)', () => {
    const text = JSON.stringify([
      { ...data, tenantCode: 't1' },
      { ...data, code: 'D2', tenantCode: 't2' },
      { ...data, code: 'D3' },
    ])
    expect(parseBulkJson(text, { screen: 'data', tenantCode: 't1' })).toEqual({
      items: [
        { ...data, tenantCode: 't1' },
        { ...data, code: 'D3' },
      ],
      errors: [{ key: 'otherTenant', index: 1 }],
    })
    const mapper: BulkMapper = () => ({
      kind: 'data',
      value: {
        settingCode: 'S',
        code: 'c',
        name: 'n',
        seq: 0,
        attributes: {},
        tenantCode: 't2',
      },
    })
    expect(
      parseBulkJson('[{}]', {
        screen: 'data',
        tenantCode: 't1',
        mapRawItem: mapper,
      }).errors
    ).toEqual([{ key: 'otherTenant', index: 0 }])
  })
})

describe('mapResultToBulkItem', () => {
  it('turns a mapped setting’s settingValue into attributes (v0)', () => {
    expect(
      mapResultToBulkItem({
        kind: 'setting',
        value: { code: 'c', name: 'n', settingValue: { a: 1 } },
      })
    ).toEqual({
      code: 'c',
      name: 'n',
      tenantCode: undefined,
      attributes: { a: 1 },
    })
  })
})

describe('parseBulkJson: keys and systems (backend v1.8)', () => {
  it('refuses codes the backend cannot key, before anything is sent', () => {
    const text = JSON.stringify([
      { ...setting, code: 'a#b' },
      { ...setting, code: 'MASTER_SETTING' },
      { ...data, settingCode: 'S@1' },
      { ...data, code: 'D#1' },
      { ...data, settingCode: 'MASTER_SETTING' },
      { ...data, code: 'MASTER_SETTING' },
    ])
    expect(parseBulkJson(text, { screen: 'settings' })).toEqual({
      items: [{ ...data, code: 'MASTER_SETTING' }],
      errors: [0, 1, 2, 3, 4].map((index) => ({ key: 'invalidCode', index })),
    })
  })

  it('keeps a setting’s systemId and drops a record’s', () => {
    const text = JSON.stringify([
      { ...setting, systemId: 'app-a' },
      { ...data, systemId: 'app-a' },
    ])
    const { items, errors } = parseBulkJson(text, { screen: 'settings' })
    expect(errors).toEqual([])
    expect(items[0]).toEqual({ ...setting, systemId: 'app-a' })
    expect(items[1]).toEqual(data)
    expect(items[1]).not.toHaveProperty('systemId')
  })

  it('refuses a systemId that is not text', () => {
    const text = JSON.stringify([{ ...setting, systemId: 1 }])
    expect(parseBulkJson(text, { screen: 'settings' }).errors).toEqual([
      { key: 'invalidItem', index: 0 },
    ])
  })

  it('carries a mapped setting’s systemId', () => {
    expect(
      mapResultToBulkItem({
        kind: 'setting',
        value: { code: 'c', name: 'n', settingValue: {}, systemId: 'app-a' },
      })
    ).toMatchObject({ code: 'c', systemId: 'app-a' })
  })
})

describe('bulkSampleJson', () => {
  it('writes its sample names in the screen’s language when given texts', () => {
    const texts = {
      fields: { code: 'Code', name: 'Name', seq: 'Order' },
      settingName: 'Sample setting',
      dataName: 'Sample data',
    }
    const sample = bulkSampleJson('settings', 'PRODUCT', texts)
    for (const text of ['Code', 'Order', 'Sample setting', 'Sample data'])
      expect(sample).toContain(`"${text}"`)
    expect(sample).not.toMatch(/[\u3040-\u30ff\u4e00-\u9fff]/)
  })

  it('gives a sample that its own screen accepts', () => {
    for (const screen of ['settings', 'data'] as const) {
      const result = parseBulkJson(bulkSampleJson(screen, 'PRODUCT'), {
        screen,
      })
      expect(result.errors, screen).toEqual([])
    }
    expect(JSON.parse(bulkSampleJson('data', 'PRODUCT'))[0].settingCode).toBe(
      'PRODUCT'
    )
  })
})

describe('bulkAccessErrors', () => {
  const systems = [
    { id: 'app-a', label: 'App A' },
    { id: 'app-b', label: 'App B' },
    { id: 'shared', label: '共通' },
  ]
  const grants = (
    ...list: { systemId: string; settingCode: string; write: boolean }[]
  ) =>
    masterAccess(
      {
        enabled: true,
        grants: list.map((grant) => ({ ...grant, read: true })),
      },
      systems
    )

  it('refuses nothing without access', () => {
    expect(
      bulkAccessErrors([{ ...setting, systemId: 'app-z' }], OPEN_ACCESS)
    ).toEqual([])
  })

  it('needs a setting’s system to be writable, in any case', () => {
    const access = grants({ systemId: 'app-a', settingCode: '*', write: true })
    expect(
      bulkAccessErrors(
        [
          { ...setting, systemId: 'APP-A' },
          { ...setting, code: 'T', systemId: 'app-b' },
        ],
        access
      )
    ).toEqual([{ key: 'systemNotWritable', index: 1 }])
  })

  it('checks a setting without a system as shared', () => {
    expect(
      bulkAccessErrors(
        [setting],
        grants({ systemId: 'shared', settingCode: 'S', write: true })
      )
    ).toEqual([])
    expect(
      bulkAccessErrors(
        [setting],
        grants({ systemId: 'app-a', settingCode: '*', write: true })
      )
    ).toEqual([{ key: 'systemNotWritable', index: 0 }])
  })

  it('checks a record against a setting of the same import', () => {
    const access = grants(
      { systemId: 'app-a', settingCode: '*', write: true },
      { systemId: 'app-b', settingCode: '*', write: false }
    )
    expect(
      bulkAccessErrors(
        [
          { ...setting, systemId: 'app-a' },
          data,
          { ...setting, code: 'T', systemId: 'app-b' },
          { ...data, settingCode: 'T' },
        ],
        access
      )
    ).toEqual([
      { key: 'systemNotWritable', index: 2 },
      { key: 'settingNotWritable', index: 3 },
    ])
  })

  it('leaves a record of a setting it cannot see to the backend', () => {
    expect(
      bulkAccessErrors(
        [{ ...data, settingCode: 'ELSEWHERE' }],
        grants({ systemId: 'app-a', settingCode: '*', write: false })
      )
    ).toEqual([])
  })

  it('checks a data list’s records against its setting', () => {
    const access = grants({ systemId: 'app-a', settingCode: 'S', write: true })
    expect(
      bulkAccessErrors([data], access, { code: 'S', systemId: 'app-a' })
    ).toEqual([])
    expect(bulkAccessErrors([data], access, { code: 'S' })).toEqual([
      { key: 'settingNotWritable', index: 0 },
    ])
  })
})

describe('parseBulkJson with access', () => {
  const access = masterAccess(
    {
      enabled: true,
      grants: [
        { systemId: 'app-a', settingCode: '*', read: true, write: true },
      ],
    },
    [{ id: 'app-a', label: 'App A' }]
  )

  it('names a refused entry by its place in the JSON, after skipped ones', () => {
    const mapRawItem: BulkMapper = (raw) =>
      (raw as { skip?: boolean }).skip
        ? null
        : {
            kind: 'setting',
            value: { ...(raw as typeof setting), settingValue: {} },
          }
    const text = JSON.stringify([
      { skip: true },
      { ...setting, systemId: 'app-b' },
    ])
    expect(
      parseBulkJson(text, { screen: 'settings', mapRawItem, access }).errors
    ).toEqual([{ key: 'systemNotWritable', index: 1 }])
  })

  it('checks a data list’s entries against its setting', () => {
    const text = JSON.stringify([data])
    expect(
      parseBulkJson(text, {
        screen: 'data',
        access,
        settingCode: 'S',
        settingSystemId: 'app-a',
      }).errors
    ).toEqual([])
    expect(
      parseBulkJson(text, { screen: 'data', access, settingCode: 'S' }).errors
    ).toEqual([{ key: 'settingNotWritable', index: 0 }])
  })

  it('runs the access check only once the entries are valid', () => {
    const text = JSON.stringify([
      { ...setting, code: 'a#b', systemId: 'app-b' },
    ])
    expect(parseBulkJson(text, { screen: 'settings', access }).errors).toEqual([
      { key: 'invalidCode', index: 0 },
    ])
  })
})
