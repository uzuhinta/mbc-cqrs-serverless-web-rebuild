import { describe, expect, it } from 'vitest'

import {
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
