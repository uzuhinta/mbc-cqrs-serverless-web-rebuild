import { MbcApiError, MbcCommandError } from '@mbc-cqrs-serverless/client-web'
import { describe, expect, it } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import { V0_DATA, V0_SETTING } from '../../test/fixtures/v0-master'
import { initialDataListState, initialSettingListState } from '../core/list'
import { parseMasterSetting } from '../core/parse'
import type { MasterField, MasterSetting } from '../core/types'
import { createMasterApi, settingCodeOfId } from './api'
import { MasterBulkError } from './bulk'

const SETTING_ID = 'MASTER#tenant-a#MASTER_SETTING#PRODUCT'
const ODD_ID = 'MASTER#tenant-a#PRODUCT#P/002 a?b'

function setting(): MasterSetting {
  const result = parseMasterSetting(V0_SETTING)
  if (!result.success) throw result.error
  return result.data
}

describe('createMasterApi: reads', () => {
  it('lists settings with v0’s query', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [{ id: SETTING_ID }], total: 7 })
    const page = await createMasterApi(client).settings.list({
      ...initialSettingListState(),
      code: ' PRO ',
      keyword: '',
      page: 2,
      sort: { column: 'name', desc: true },
    })
    expect(client.get).toHaveBeenCalledWith('/api/master-setting/list', {
      query: {
        code: 'PRO',
        name: undefined,
        keyword: undefined,
        page: 2,
        pageSize: 20,
        orderBys: ['-name'],
      },
      signal: undefined,
    })
    expect(page).toEqual({ items: [{ id: SETTING_ID }], total: 7 })
  })

  it('lists a setting’s data with v0’s query', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ items: [], total: 0 })
    await createMasterApi(client).data.list('PRODUCT', {
      ...initialDataListState(),
      keyword: 'りんご',
      isDeleted: true,
      sort: { column: 'seq', desc: false },
    })
    expect(client.get).toHaveBeenCalledWith('/api/master-data/list', {
      query: {
        settingCode: 'PRODUCT',
        code: undefined,
        keyword: 'りんご',
        isDeleted: true,
        page: 1,
        pageSize: 20,
        orderBys: ['seq'],
      },
      signal: undefined,
    })
  })

  it('reads an answer that is not a page as an empty one', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ message: 'odd' })
    expect(
      await createMasterApi(client).settings.list(initialSettingListState())
    ).toEqual({ items: [], total: 0 })
  })

  it('gets a setting and a record by their encoded ids, keeping unknown keys', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValueOnce(V0_SETTING).mockResolvedValueOnce(V0_DATA)
    const api = createMasterApi(client)
    const loaded = await api.settings.get(SETTING_ID)
    const record = await api.data.get(ODD_ID)
    expect(client.get.mock.calls.map(([path]) => path)).toEqual([
      `/api/master-setting/detail/${encodeURIComponent(SETTING_ID)}`,
      `/api/master-data/detail/${encodeURIComponent(ODD_ID)}`,
    ])
    expect(loaded.attributes.extraFlag).toBe(true)
    expect(record.code).toBe('P-001')
  })

  it('rejects an answer that is not a setting', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ message: 'not found' })
    await expect(
      createMasterApi(client).settings.get(SETTING_ID)
    ).rejects.toThrow()
  })

  it('asks whether a code is taken, encoding it', async () => {
    const client = createFakeClient()
    client.post.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const api = createMasterApi(client)
    expect(await api.settings.codeExists('A/B')).toBe(true)
    expect(await api.data.codeExists('PRODUCT', 'P 1')).toBe(false)
    expect(client.post.mock.calls.map(([path]) => path)).toEqual([
      '/api/master-setting/check-exist/A%2FB',
      '/api/master-data/check-exist/PRODUCT/P%201',
    ])
  })

  it('reads a setting’s code from its id', () => {
    expect(settingCodeOfId(SETTING_ID)).toBe('PRODUCT')
    expect(settingCodeOfId('MASTER#t#MASTER_SETTING#A#B')).toBe('A#B')
    expect(settingCodeOfId('PRODUCT')).toBe('PRODUCT')
  })
})

describe('createMasterApi: writes', () => {
  it('sends each write as a command, ids encoded', async () => {
    const client = createFakeClient()
    const api = createMasterApi(client)
    const signal = new AbortController().signal
    const settingBody = {
      code: 'PRODUCT',
      name: '商品',
      attributes: { description: '', fields: [] },
      settingValue: { description: '', fields: [] },
    }
    const dataBody = {
      settingCode: 'PRODUCT',
      code: 'P/002',
      name: 'みかん',
      attributes: {},
    }
    const updateBody = { name: 'みかん', seq: 0, attributes: {} }
    await api.settings.create(settingBody, { signal })
    await api.settings.update(SETTING_ID, settingBody)
    await api.settings.delete(SETTING_ID)
    await api.data.create(dataBody)
    await api.data.update(ODD_ID, updateBody)
    await api.data.delete(ODD_ID)
    await api.data.restore(ODD_ID)
    const setting = encodeURIComponent(SETTING_ID)
    const data = encodeURIComponent(ODD_ID)
    expect(client.command.mock.calls.map(([request]) => request)).toEqual([
      { method: 'POST', path: '/api/master-setting', body: settingBody },
      {
        method: 'PUT',
        path: `/api/master-setting/${setting}`,
        body: settingBody,
      },
      { method: 'DELETE', path: `/api/master-setting/${setting}` },
      { method: 'POST', path: '/api/master-data/create', body: dataBody },
      { method: 'PUT', path: `/api/master-data/${data}`, body: updateBody },
      { method: 'DELETE', path: `/api/master-data/${data}` },
      {
        method: 'PUT',
        path: `/api/master-data/${data}`,
        body: { isDeleted: false },
      },
    ])
    expect(client.command.mock.calls[0]?.[1]).toEqual({ signal })
  })

  it('resolves a create with the new item’s id, as the backend wrote it', async () => {
    // The backend lowercases the tenant (core 1.1.0) and answers with the
    // command's keys, the sort key carrying its version.
    const client = createFakeClient((request) =>
      request.path.endsWith('/create')
        ? { requestId: 'r', pk: 'MASTER#tenant-a', sk: 'PRODUCT#P@002@1' }
        : { requestId: 'r', pk: 'MASTER#tenant-a', sk: 'MASTER_SETTING#P@3' }
    )
    const api = createMasterApi(client)
    await expect(
      api.settings.create({
        code: 'P',
        name: 'P',
        attributes: { description: '', fields: [] },
        settingValue: { description: '', fields: [] },
      })
    ).resolves.toBe('MASTER#tenant-a#MASTER_SETTING#P')
    await expect(
      api.data.create({
        settingCode: 'PRODUCT',
        code: 'P@002',
        name: 'P',
        attributes: {},
      })
    ).resolves.toBe('MASTER#tenant-a#PRODUCT#P@002')
    // An answer without the keys gives no id.
    await expect(
      createMasterApi(createFakeClient()).data.create({
        settingCode: 'PRODUCT',
        code: 'P',
        name: 'P',
        attributes: {},
      })
    ).resolves.toBeUndefined()
  })

  it('treats a write that changed nothing as done', async () => {
    const client = createFakeClient(
      () => new MbcApiError(200, {}, 'The command response has no requestId')
    )
    await expect(
      createMasterApi(client).data.restore(ODD_ID)
    ).resolves.toBeUndefined()
  })

  it('passes a failed write on', async () => {
    const failure = new MbcCommandError('req-1', 'transform:FAILED')
    const client = createFakeClient(() => failure)
    await expect(
      createMasterApi(client).settings.delete(SETTING_ID)
    ).rejects.toBe(failure)
  })

  it('imports in batches through the bulk path', async () => {
    const client = createFakeClient(() => new MbcApiError(400, {}, 'Bad item'))
    const error = await createMasterApi(client, {
      paths: { bulk: '/api/my-bulk' },
    })
      .bulk.importItems([{ code: 'A', name: 'A', attributes: {} }])
      .catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(MasterBulkError)
    expect(client.command.mock.calls[0]?.[0].path).toBe('/api/my-bulk')
  })
})

describe('createMasterApi: sequence', () => {
  const field = (extra: Partial<MasterField>): MasterField => ({
    physicalName: 'code',
    name: 'コード',
    dataType: 'auto_number',
    isRequired: true,
    isShowedOnList: true,
    ...extra,
  })

  it('asks for a formatted code with the format’s sequence (v0)', async () => {
    const client = createFakeClient()
    client.post.mockResolvedValue({ formattedNo: 'P-0007' })
    const code = await createMasterApi(client).sequence.generateCode(
      field({
        formatCode: 'SEQ#PRODUCT',
        dataFormat: 'P-%%no%%',
        prefix: 'X',
      }),
      setting()
    )
    expect(code).toBe('P-0007')
    expect(client.post).toHaveBeenCalledWith(
      '/api/sequence/with-provided-setting',
      {
        tenantCode: 'tenant-a',
        typeCode: 'SEQ#PRODUCT',
        rotateBy: 'none',
        params: { code1: 'PRODUCT' },
        prefix: 'X',
        postfix: undefined,
        format: 'P-%%no%%',
      },
      { signal: undefined }
    )
  })

  it('asks for a plain code with the setting’s own sequence (v0)', async () => {
    const client = createFakeClient()
    client.post.mockResolvedValue({ formattedNo: '12' })
    await createMasterApi(client).sequence.generateCode(
      field({ dataFormat: '%%no%%' }),
      { ...setting(), code: 'MASTER_SETTING#PRODUCT' }
    )
    expect(client.post).toHaveBeenCalledWith(
      '/api/sequence',
      {
        tenantCode: 'tenant-a',
        typeCode: 'MASTER_SETTING#PRODUCT',
        rotateBy: 'none',
        params: { code1: 'PRODUCT' },
        prefix: undefined,
        postfix: undefined,
      },
      { signal: undefined }
    )
  })

  it('rejects an answer without a code', async () => {
    const client = createFakeClient()
    client.post.mockResolvedValue({})
    await expect(
      createMasterApi(client).sequence.generateCode(field({}), setting())
    ).rejects.toBeInstanceOf(MbcApiError)
  })
})

describe('createMasterApi: copy', () => {
  const task = (sk: string) => ({
    id: `SFN_TASK#tenant-a#${sk}`,
    pk: 'SFN_TASK#tenant-a',
    sk,
  })

  it('posts a copy request', async () => {
    const client = createFakeClient()
    const body = {
      masterSettingId: SETTING_ID,
      targetTenants: ['tenant-b'],
      copyType: 'BOTH' as const,
    }
    await createMasterApi(client).copy.request(body)
    expect(client.post).toHaveBeenCalledWith('/api/master-setting/copy', body, {
      signal: undefined,
    })
  })

  it('lists the setting’s own copy requests only', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue([
      task('MASTER_COPY_PRODUCT#01J9B'),
      task('MASTER_COPY_PRODUCT2#01J9C'),
      { message: 'not a task' },
      task('MASTER_COPY_PRODUCT#01J9A'),
    ])
    const tasks = await createMasterApi(client).copy.tasks('PRODUCT')
    expect(client.get).toHaveBeenCalledWith('/api/tasks/sfn-task-parent', {
      query: { masterSettingCode: 'PRODUCT' },
      signal: undefined,
    })
    expect(tasks.map((entry) => entry.sk)).toEqual([
      'MASTER_COPY_PRODUCT#01J9B',
      'MASTER_COPY_PRODUCT#01J9A',
    ])
  })

  it('gets a request’s tenant tasks through a child’s key (v0)', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue({ message: 'not a list' })
    const id = 'SFN_TASK#tenant-a#MASTER_COPY_A/B#01J9'
    expect(await createMasterApi(client).copy.task(id)).toEqual([])
    expect(client.get).toHaveBeenCalledWith(
      `/api/tasks/${encodeURIComponent(`${id}#0`)}`,
      { signal: undefined }
    )
  })

  it('uses the paths a host gives', async () => {
    const client = createFakeClient()
    client.get.mockResolvedValue([])
    await createMasterApi(client, {
      paths: { tasks: '/x/tasks', copy: '/x/copy' },
    }).copy.tasks('PRODUCT')
    expect(client.get.mock.calls[0]?.[0]).toBe('/x/tasks/sfn-task-parent')
  })
})
