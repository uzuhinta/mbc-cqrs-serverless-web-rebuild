import {
  createMbcClient,
  MbcApiError,
  type CommandRequest,
} from '@mbc-cqrs-serverless/client-web'
import { describe, expect, it, vi } from 'vitest'

import { createFakeClient } from '../../test/fake-mbc-client'
import type { BulkJsonItem } from '../core/bulk'
import { BULK_BATCH_SIZE, importBulk, MasterBulkError } from './bulk'

const items = (count: number): BulkJsonItem[] =>
  Array.from({ length: count }, (_, n) => ({
    settingCode: 'PRODUCT',
    code: `P-${n + 1}`,
    name: `商品 ${n + 1}`,
    attributes: {},
  }))

const batchOf = (request: CommandRequest) =>
  (request.body as { items: BulkJsonItem[] }).items

/** Every item changed, under one request id per batch. */
const allChanged = (request: CommandRequest) =>
  batchOf(request).map(() => ({
    requestId: `req-${batchOf(request)[0]?.code}`,
  }))

describe('importBulk', () => {
  it('sends 250 items as batches of 100, 100 and 50, in order', async () => {
    const client = createFakeClient(allChanged)
    await importBulk(client, '/api/master-bulk', items(250))
    expect(BULK_BATCH_SIZE).toBe(100)
    expect(
      client.command.mock.calls.map(([request]) => [
        request.method,
        request.path,
        batchOf(request).length,
        batchOf(request)[0]?.code,
      ])
    ).toEqual([
      ['POST', '/api/master-bulk', 100, 'P-1'],
      ['POST', '/api/master-bulk', 100, 'P-101'],
      ['POST', '/api/master-bulk', 50, 'P-201'],
    ])
  })

  it('waits for each changed item, under the id the batch’s items share', async () => {
    const client = createFakeClient((request) =>
      batchOf(request).map((item, n) =>
        n % 2 ? { code: item.code } : { code: item.code, requestId: 'req-a' }
      )
    )
    await importBulk(client, '/api/master-bulk', items(4))
    const options = client.command.mock.calls[0]?.[1]
    const answer = [{ requestId: 'req-a' }, {}, { requestId: 'req-a' }, {}]
    expect(options.requestIdOf(answer)).toBe('req-a')
    expect(options.expectedFinishes(answer)).toBe(2)
    expect(options.expectedFinishes([{}, {}])).toBe(0)
    expect(options.expectedFinishes({ message: 'not a list' })).toBe(0)
  })

  it('reports progress across batches, never going back', async () => {
    const client = createFakeClient((request) =>
      // The second batch changed nothing: it counts as done at once.
      batchOf(request)[0]?.code === 'P-101' ? [] : allChanged(request)
    )
    const progress: number[] = []
    await importBulk(client, '/api/master-bulk', items(250), (done, total) => {
      expect(total).toBe(250)
      progress.push(done)
    })
    expect(progress.at(-1)).toBe(250)
    expect(progress).toContain(100)
    expect(progress).toContain(200)
    expect(progress).toEqual([...progress].sort((a, b) => a - b))
  })

  it('stops at a failed batch and names its items', async () => {
    const failure = new MbcApiError(400, {}, 'Invalid tenant code: other')
    const client = createFakeClient((request) =>
      batchOf(request)[0]?.code === 'P-101' ? failure : allChanged(request)
    )
    const onProgress = vi.fn()
    const error = await importBulk(
      client,
      '/api/master-bulk',
      items(250),
      onProgress
    ).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(MasterBulkError)
    expect(error).toMatchObject({
      name: 'MasterBulkError',
      message: 'Invalid tenant code: other',
      done: 100,
      from: 101,
      to: 200,
      cause: failure,
    })
    expect(client.command).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenLastCalledWith(100, 250)
  })

  it('posts through a real client, which answers at once without realtime', async () => {
    const fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { items: unknown[] }
      return new Response(
        JSON.stringify(body.items.map(() => ({ requestId: 'req-1' }))),
        { headers: { 'content-type': 'application/json' } }
      )
    })
    const client = createMbcClient({
      apiUrl: 'https://api.example',
      tenantCode: 'tenant-a',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    const onProgress = vi.fn()
    await importBulk(client, '/api/master-bulk', items(101), onProgress)
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.example/api/master-bulk',
      'https://api.example/api/master-bulk',
    ])
    expect(onProgress).toHaveBeenLastCalledWith(101, 101)
  })
})
