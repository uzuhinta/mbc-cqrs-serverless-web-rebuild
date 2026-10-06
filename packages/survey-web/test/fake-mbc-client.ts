import type { MbcClient } from '@mbc-cqrs-serverless/client-web'
import { vi, type Mock } from 'vitest'

/** An MbcClient whose `get` and `command` are mocks; everything else is unused by `/mbc`. */
export function createFakeClient(): MbcClient & { get: Mock; command: Mock } {
  const unused = () => {
    throw new Error('not used by /mbc')
  }
  return {
    get: vi.fn(),
    command: vi.fn(),
    post: vi.fn(unused),
    put: vi.fn(unused),
    patch: vi.fn(unused),
    delete: vi.fn(unused),
    messages: undefined,
    tenantCode: () => 'demo',
    close: () => {},
  } as unknown as MbcClient & { get: Mock; command: Mock }
}
