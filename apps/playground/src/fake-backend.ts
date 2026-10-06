import {
  createMbcClient,
  type MbcClient,
} from '@mbc-cqrs-serverless/client-web'

type Entity = {
  id: string
  name: string
  version: number
  createdAt: string
  attributes: { description?: string; surveyTemplate: unknown }
}

/** An in-memory survey-template backend behind a real MbcClient (no realtime: commands resolve after HTTP). */
export function createFakeBackend(): MbcClient {
  const store = new Map<string, Entity>()
  let seq = 0
  const add = (name: string, description: string) => {
    seq += 1
    const id = `SURVEY#demo#${seq}`
    store.set(id, {
      id,
      name,
      version: 1,
      createdAt: new Date(Date.UTC(2026, 9, seq)).toISOString(),
      attributes: {
        description,
        surveyTemplate: {
          title: name,
          description,
          items: [
            { id: `sec_${seq}`, type: 'section-header', title: '基本情報' },
            { id: `q_${seq}`, type: 'short-text', label: 'お名前' },
          ],
        },
      },
    })
  }
  for (let i = 1; i <= 14; i++) add(`アンケート ${i}`, i % 3 ? `説明 ${i}` : '')

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    )
    const method = init?.method ?? 'GET'
    await new Promise((resolve) => setTimeout(resolve, 300))
    const match = url.pathname.match(/^\/api\/survey-template\/?(.*)$/)
    if (!match) return json({ message: 'not found' }, 404)
    const id = decodeURIComponent(match[1] ?? '')
    if (method === 'GET' && !id) {
      const keyword = url.searchParams.get('keyword') ?? ''
      const page = Number(url.searchParams.get('page') ?? 1)
      const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
      const all = [...store.values()].filter((e) => e.name.includes(keyword))
      return json({
        items: all.slice((page - 1) * pageSize, page * pageSize),
        total: all.length,
      })
    }
    if (method === 'GET')
      return store.has(id)
        ? json(store.get(id))
        : json({ message: 'not found' }, 404)
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (method === 'POST') add(body.name, body.attributes?.description ?? '')
    if (method === 'PUT') {
      const entity = store.get(id)
      if (!entity) return json({ message: 'not found' }, 404)
      store.set(id, {
        ...entity,
        name: body.name,
        version: entity.version + 1,
        attributes: body.attributes,
      })
    }
    if (method === 'DELETE') store.delete(id)
    return json({ requestId: `req-${Date.now()}` })
  }

  return createMbcClient({
    apiUrl: 'https://fake.local',
    tenantCode: 'demo',
    fetch,
  })
}
