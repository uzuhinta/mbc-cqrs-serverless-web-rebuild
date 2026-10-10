import type {
  CommandOptions,
  CommandRequest,
  MbcClient,
} from '@mbc-cqrs-serverless/client-web'
import { vi, type Mock } from 'vitest'

type Respond = (request: CommandRequest) => unknown

/**
 * An MbcClient whose `get`, `post` and `command` are mocks. `command`
 * behaves like client-web's: it answers with `respond(request)` (or throws
 * it, when it is an error), then reports one finish per expected item.
 */
export function createFakeClient(
  respond: Respond = () => ({ requestId: 'req-1' })
): MbcClient & { get: Mock; post: Mock; command: Mock } {
  const unused = () => {
    throw new Error('not used by /mbc')
  }
  const command = vi.fn(
    async (request: CommandRequest, options: CommandOptions = {}) => {
      const data = respond(request)
      if (data instanceof Error) throw data
      const requestId = options.requestIdOf
        ? options.requestIdOf(data)
        : (data as { requestId?: string } | null)?.requestId
      const expected =
        typeof options.expectedFinishes === 'function'
          ? options.expectedFinishes(data)
          : (options.expectedFinishes ?? 1)
      for (let finished = 1; finished <= expected; finished++)
        options.onProgress?.(finished, expected, {
          id: requestId ?? '',
          tenantCode: 'tenant-a',
          action: 'command-status',
          content: { status: 'finish:FINISHED' },
        })
      return { data, requestId }
    }
  )
  return {
    get: vi.fn(),
    post: vi.fn(),
    command,
    put: vi.fn(unused),
    patch: vi.fn(unused),
    delete: vi.fn(unused),
    messages: undefined,
    tenantCode: () => 'tenant-a',
    close: () => {},
  } as unknown as MbcClient & { get: Mock; post: Mock; command: Mock }
}
