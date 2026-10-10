import type { CommandOptions, MbcClient } from '@mbc-cqrs-serverless/client-web'

import type { BulkJsonItem } from '../core/bulk'

/** The backend's limit for one `POST /api/master-bulk`. */
export const BULK_BATCH_SIZE = 100

export type BulkImportOptions = Pick<
  CommandOptions,
  'signal' | 'onPhase' | 'timeoutMs'
>

/**
 * A bulk import that stopped at a batch. The `done` items before it went
 * in; items `from`–`to` (1-based) and the ones after did not, or, after a
 * timeout, may have. `message` and `cause` are the batch's own error.
 */
export class MasterBulkError extends Error {
  override name = 'MasterBulkError'
  readonly done: number
  readonly from: number
  readonly to: number

  constructor(
    cause: unknown,
    range: { done: number; from: number; to: number }
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    this.done = range.done
    this.from = range.from
    this.to = range.to
  }
}

/** The request ids of a batch's changed items (unchanged ones have none). */
function changed(data: unknown): string[] {
  if (!Array.isArray(data)) return []
  return data
    .map((item) => (item as { requestId?: unknown } | null)?.requestId)
    .filter((id): id is string => typeof id === 'string' && id !== '')
}

/**
 * Sends `items` in batches of 100, one after another. Each batch is a
 * command that finishes once per changed item; a batch with no change
 * finishes at once. `onProgress(done, total)` counts across batches.
 */
export async function importBulk(
  client: MbcClient,
  path: string,
  items: readonly BulkJsonItem[],
  onProgress?: (done: number, total: number) => void,
  options: BulkImportOptions = {}
): Promise<void> {
  const total = items.length
  let done = 0
  for (let start = 0; start < total; start += BULK_BATCH_SIZE) {
    const batch = items.slice(start, start + BULK_BATCH_SIZE)
    try {
      await client.command<unknown>(
        { method: 'POST', path, body: { items: batch } },
        {
          ...options,
          // The changed items of one request share its request id.
          requestIdOf: (data) => changed(data)[0],
          expectedFinishes: (data) => changed(data).length,
          onProgress: (finished) => onProgress?.(done + finished, total),
        }
      )
    } catch (error) {
      throw new MasterBulkError(error, {
        done,
        from: start + 1,
        to: start + batch.length,
      })
    }
    done += batch.length
    onProgress?.(done, total)
  }
}
