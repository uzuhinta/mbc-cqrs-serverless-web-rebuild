import {
  createMbcClient,
  type MbcClient,
} from '@mbc-cqrs-serverless/client-web'

const TENANT = 'tenant-a'
const PK = `MASTER#${TENANT}`

type Entity = {
  id: string
  pk: string
  sk: string
  code: string
  name: string
  version: number
  tenantCode: string
  seq?: number
  isDeleted: boolean
  attributes: Record<string, unknown>
}

type Task = {
  id: string
  pk: string
  sk: string
  status: string
  createdAt: string
  updatedAt: string
  input?: unknown
  attributes?: Record<string, unknown>
}

const field = (
  physicalName: string,
  name: string,
  dataType: string,
  extra: Record<string, unknown> = {}
) => ({
  physicalName,
  name,
  dataType,
  isRequired: physicalName === 'code' || physicalName === 'name',
  isShowedOnList: true,
  ...extra,
})

/**
 * An in-memory master backend behind a real MbcClient: settings, data, bulk,
 * sequences, copies and their tasks. No realtime, so commands resolve on the
 * HTTP answer. Each task read finishes one more tenant of each copy.
 */
export function createFakeMasterBackend(): MbcClient {
  const settings = new Map<string, Entity>()
  const records = new Map<string, Entity>()
  const counters = new Map<string, number>()
  const parents: Task[] = []
  const children = new Map<string, Task[]>()
  const now = () => new Date().toISOString()

  const putSetting = (
    code: string,
    name: string,
    attributes: Record<string, unknown>
  ) => {
    const sk = `MASTER_SETTING#${code}`
    const old = settings.get(`${PK}#${sk}`)
    settings.set(`${PK}#${sk}`, {
      id: `${PK}#${sk}`,
      pk: PK,
      sk,
      code,
      name,
      version: (old?.version ?? 0) + 1,
      tenantCode: TENANT,
      isDeleted: false,
      attributes,
    })
  }
  const putRecord = (
    settingCode: string,
    body: { code: string; name: string; seq?: number; attributes?: object }
  ) => {
    const sk = `${settingCode}#${body.code}`
    const old = records.get(`${PK}#${sk}`)
    records.set(`${PK}#${sk}`, {
      id: `${PK}#${sk}`,
      pk: PK,
      sk,
      code: body.code,
      name: body.name,
      version: (old?.version ?? 0) + 1,
      tenantCode: TENANT,
      seq: body.seq,
      isDeleted: false,
      attributes: { ...(body.attributes as Record<string, unknown>) },
    })
  }

  putSetting('PRODUCT', '商品', {
    description: '商品のマスタ',
    fields: [
      field('code', 'コード', 'auto_number', {
        formatCode: 'sequence_setting#PRODUCT',
        dataFormat: 'P-%%no%%',
        formatName: '商品番号',
      }),
      field('name', '名称', 'string', { length: '255' }),
      field('seq', '並び順', 'number'),
      field('price', '価格', 'number', { min: '0' }),
    ],
  })
  putSetting('sequence_setting', '採番設定', {
    description: '自動採番の書式',
    fields: [
      field('code', 'コード', 'string'),
      field('name', '名称', 'string'),
      field('seq', '並び順', 'number'),
      field('format', '書式', 'string'),
    ],
  })
  for (let n = 1; n <= 12; n++)
    putRecord('PRODUCT', {
      code: `P-${String(n).padStart(4, '0')}`,
      name: `商品 ${n}`,
      seq: n,
      attributes: { price: String(n * 120) },
    })
  counters.set('sequence_setting#PRODUCT', 12)
  putRecord('sequence_setting', {
    code: 'PRODUCT',
    name: '商品番号',
    attributes: { format: 'P-%%no%%' },
  })
  putRecord('sequence_setting', {
    code: 'ORDER',
    name: '注文番号',
    attributes: { format: 'O-%%no%%' },
  })

  const listRow = (record: Entity) => {
    const settingCode = record.sk.slice(0, record.sk.indexOf('#'))
    return {
      ...record,
      code: `${settingCode}#${record.code}`,
      masterCode: record.code,
    }
  }
  const sortPage = <T extends Record<string, unknown>>(
    rows: T[],
    query: URLSearchParams
  ) => {
    const order = query.get('orderBys')
    if (order) {
      const desc = order.startsWith('-')
      const column = desc ? order.slice(1) : order
      rows.sort((a, b) => {
        const x = String(a[column] ?? '')
        const y = String(b[column] ?? '')
        return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1)
      })
    }
    const page = Number(query.get('page') ?? 1)
    const pageSize = Number(query.get('pageSize') ?? 10)
    return {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
    }
  }
  /** One more tenant of each copy finishes; the last of several fails. */
  const advance = () => {
    for (const parent of parents) {
      const tasks = children.get(parent.id) ?? []
      const next = tasks.find((task) => task.status === 'QUEUED')
      if (next) {
        const fails = tasks.length > 1 && next === tasks.at(-1)
        next.status = fails ? 'FAILED' : 'COMPLETED'
        next.updatedAt = now()
        if (fails)
          next.attributes = {
            error: 'Error: the tenant is not ready\n    at copy (playground)',
          }
      }
      const of = (status: string) =>
        tasks.filter((task) => task.status === status).length
      parent.attributes = {
        subTaskCount: tasks.length,
        subTaskRunningCount: of('QUEUED'),
        subTaskSucceedCount: of('COMPLETED'),
        subTaskFailedCount: of('FAILED'),
      }
      if (of('QUEUED') === 0 && parent.status !== 'COMPLETED') {
        parent.status = 'COMPLETED'
        parent.updatedAt = now()
      }
    }
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  const accepted = () => json({ requestId: `req-${Date.now()}` })

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    )
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const query = url.searchParams
    const path = url.pathname
    await new Promise((resolve) => setTimeout(resolve, 250))
    const part = (prefix: string) =>
      decodeURIComponent(path.slice(prefix.length))

    // Settings
    if (method === 'GET' && path === '/api/master-setting/list') {
      const rows = [...settings.values()]
        .filter((entity) => !entity.isDeleted)
        .filter((entity) => entity.code.includes(query.get('code') ?? ''))
        .filter((entity) => entity.name.includes(query.get('name') ?? ''))
        .filter((entity) =>
          String(entity.attributes.description ?? '').includes(
            query.get('keyword') ?? ''
          )
        )
        .map((entity) => ({ ...entity, code: entity.sk }))
      return json(sortPage(rows, query))
    }
    if (method === 'GET' && path.startsWith('/api/master-setting/detail/')) {
      const entity = settings.get(part('/api/master-setting/detail/'))
      return entity ? json(entity) : json({ message: 'not found' }, 404)
    }
    if (
      method === 'POST' &&
      path.startsWith('/api/master-setting/check-exist/')
    ) {
      const code = part('/api/master-setting/check-exist/')
      const entity = settings.get(`${PK}#MASTER_SETTING#${code}`)
      return json(Boolean(entity && !entity.isDeleted))
    }
    if (method === 'POST' && path === '/api/master-setting/copy') {
      const code = String(body.masterSettingId).split('#').at(-1)
      const sk = `MASTER_COPY_${code}#${Date.now().toString(36).toUpperCase()}`
      const parent: Task = {
        id: `SFN_TASK#${TENANT}#${sk}`,
        pk: `SFN_TASK#${TENANT}`,
        sk,
        status: 'PROCESSING',
        createdAt: now(),
        updatedAt: now(),
      }
      children.set(
        parent.id,
        (body.targetTenants as string[]).map((tenant, n) => ({
          id: `${parent.id}#${n}`,
          pk: parent.pk,
          sk: `${sk}#${n}`,
          status: 'QUEUED',
          createdAt: now(),
          updatedAt: now(),
          input: { ...body, targetTenants: [tenant] },
        }))
      )
      parents.unshift(parent)
      return json(parent)
    }
    if (method === 'POST' && path === '/api/master-setting') {
      putSetting(body.code, body.name, body.settingValue)
      return accepted()
    }
    if (path.startsWith('/api/master-setting/')) {
      const entity = settings.get(part('/api/master-setting/'))
      if (!entity) return json({ message: 'not found' }, 404)
      if (method === 'PUT') putSetting(entity.code, body.name, body.attributes)
      if (method === 'DELETE') entity.isDeleted = true
      return accepted()
    }

    // Data
    if (method === 'GET' && path === '/api/master-data/list') {
      const settingCode = query.get('settingCode') ?? ''
      const rows = [...records.values()]
        .filter((record) => record.sk.startsWith(`${settingCode}#`))
        .filter(
          (record) => query.get('isDeleted') === 'true' || !record.isDeleted
        )
        .filter((record) => record.code.includes(query.get('code') ?? ''))
        .filter((record) => record.name.includes(query.get('keyword') ?? ''))
        .map(listRow)
      return json(sortPage(rows, query))
    }
    if (method === 'GET' && path.startsWith('/api/master-data/detail/')) {
      const record = records.get(part('/api/master-data/detail/'))
      return record ? json(record) : json({ message: 'not found' }, 404)
    }
    if (method === 'POST' && path.startsWith('/api/master-data/check-exist/')) {
      const [settingCode, code] = path
        .slice('/api/master-data/check-exist/'.length)
        .split('/')
        .map(decodeURIComponent)
      const record = records.get(`${PK}#${settingCode}#${code}`)
      return json(Boolean(record && !record.isDeleted))
    }
    if (method === 'POST' && path === '/api/master-data/create') {
      putRecord(body.settingCode, body)
      return accepted()
    }
    if (path.startsWith('/api/master-data/')) {
      const record = records.get(part('/api/master-data/'))
      if (!record) return json({ message: 'not found' }, 404)
      if (method === 'DELETE') record.isDeleted = true
      else if (body.isDeleted === false) record.isDeleted = false
      else
        Object.assign(record, {
          name: body.name,
          seq: body.seq,
          attributes: body.attributes,
          version: record.version + 1,
        })
      return accepted()
    }

    // Bulk, sequences, tasks
    if (method === 'POST' && path === '/api/master-bulk') {
      const requestId = `req-${Date.now()}`
      for (const item of body.items as Record<string, unknown>[]) {
        if (item.settingCode) putRecord(String(item.settingCode), item as never)
        else
          putSetting(
            String(item.code),
            String(item.name),
            item.attributes as Record<string, unknown>
          )
      }
      return json((body.items as unknown[]).map(() => ({ requestId })))
    }
    if (method === 'POST' && path.startsWith('/api/sequence')) {
      const next = (counters.get(body.typeCode) ?? 0) + 1
      counters.set(body.typeCode, next)
      const number = String(next).padStart(4, '0')
      const formatted = body.format
        ? String(body.format).replace('%%no%%', number)
        : number
      return json({
        formattedNo: `${body.prefix ?? ''}${formatted}${body.postfix ?? ''}`,
      })
    }
    if (method === 'GET' && path === '/api/tasks/sfn-task-parent') {
      advance()
      const prefix = `MASTER_COPY_${query.get('masterSettingCode') ?? ''}`
      return json(parents.filter((task) => task.sk.startsWith(prefix)))
    }
    if (method === 'GET' && path.startsWith('/api/tasks/')) {
      advance()
      const id = part('/api/tasks/').replace(/#0$/, '')
      return json(children.get(id) ?? [])
    }
    return json({ message: `no route for ${method} ${path}` }, 404)
  }

  return createMbcClient({
    apiUrl: 'https://fake.local',
    tenantCode: TENANT,
    fetch,
  })
}
