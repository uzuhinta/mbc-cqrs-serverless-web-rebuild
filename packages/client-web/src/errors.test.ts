import { describe, expect, it } from 'vitest'

import {
  MbcAbortError,
  MbcApiError,
  MbcCommandError,
  MbcError,
  MbcRealtimeError,
  MbcTimeoutError,
} from './errors'

describe('errors', () => {
  it('share a base class and carry their names', () => {
    const errors = [
      new MbcApiError(404, { message: 'nope' }),
      new MbcTimeoutError(1000),
      new MbcAbortError(),
      new MbcRealtimeError('socket closed'),
      new MbcCommandError('req-1', 'finish:FAILED'),
    ]
    expect(errors.every((error) => error instanceof MbcError)).toBe(true)
    expect(errors.every((error) => error instanceof Error)).toBe(true)
    expect(errors.map((error) => error.name)).toEqual([
      'MbcApiError',
      'MbcTimeoutError',
      'MbcAbortError',
      'MbcRealtimeError',
      'MbcCommandError',
    ])
  })

  it('keep their details', () => {
    const cause = new TypeError('fetch failed')
    const api = new MbcApiError(0, undefined, 'Network error', { cause })
    expect(api.status).toBe(0)
    expect(api.cause).toBe(cause)
    expect(new MbcApiError(422, { field: 'name' }).body).toEqual({
      field: 'name',
    })
    expect(new MbcApiError(500, null).message).toBe(
      'Request failed with status 500'
    )
    expect(new MbcTimeoutError(1500).timeoutMs).toBe(1500)
    expect(
      new MbcRealtimeError('x', { errors: [{ errorType: 'Unauthorized' }] })
        .errors
    ).toEqual([{ errorType: 'Unauthorized' }])
    const failed = new MbcCommandError('req-1', 'sync_data:FAILED')
    expect([failed.requestId, failed.status]).toEqual([
      'req-1',
      'sync_data:FAILED',
    ])
  })

  it('keep their names when constructors are renamed (minified builds)', () => {
    class Renamed extends MbcTimeoutError {}
    expect(new Renamed(1).name).toBe('MbcTimeoutError')
  })
})
