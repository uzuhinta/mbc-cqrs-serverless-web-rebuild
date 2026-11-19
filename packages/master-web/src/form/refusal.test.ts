import { MbcApiError, MbcTimeoutError } from '@mbc-cqrs-serverless/client-web'
import { describe, expect, it } from 'vitest'

import { MasterBulkError } from '../mbc/bulk'
import { failureOf } from './failure'
import { refusalOf } from './refusal'

const on = { enabled: true, permissionDenied: 'no permission' }
const off = { enabled: false, permissionDenied: 'no permission' }
const t = { failedHint: 'check and retry', timeout: 'unknown outcome' }

describe('refusalOf', () => {
  it('explains a 403 as no permission', () => {
    expect(refusalOf(new MbcApiError(403, {}), on)).toBe('no permission')
  })

  it('shows the backend’s reason for a 400', () => {
    expect(
      refusalOf(new MbcApiError(400, { message: 'systemId conflicts' }), on)
    ).toBe('systemId conflicts')
    expect(
      refusalOf(new MbcApiError(400, { message: ['a is bad', 'b is bad'] }), on)
    ).toBe('a is bad b is bad')
    expect(refusalOf(new MbcApiError(400, {}), on)).toBeUndefined()
  })

  it('says nothing for other errors or with access off', () => {
    expect(
      refusalOf(new MbcApiError(500, { message: 'x' }), on)
    ).toBeUndefined()
    expect(refusalOf(new MbcApiError(403, {}), off)).toBeUndefined()
    expect(refusalOf(new MbcApiError(403, {}), undefined)).toBeUndefined()
    expect(refusalOf(new Error('x'), on)).toBeUndefined()
  })

  it('reads a bulk batch’s cause', () => {
    const batch = new MasterBulkError(new MbcApiError(403, {}), {
      done: 0,
      from: 1,
      to: 100,
    })
    expect(refusalOf(batch, on)).toBe('no permission')
  })
})

describe('failureOf with a refusal', () => {
  it('puts the refusal in the hint', () => {
    expect(failureOf(new MbcApiError(403, {}), 'Save failed', t, on)).toEqual({
      title: 'Save failed',
      hint: 'no permission',
    })
  })

  it('keeps the usual hint and the timeout text', () => {
    expect(failureOf(new MbcApiError(403, {}), 'Save failed', t, off)).toEqual({
      title: 'Save failed',
      hint: 'check and retry',
    })
    expect(failureOf(new MbcTimeoutError(1000), 'Save failed', t, on)).toEqual({
      title: 'unknown outcome',
    })
  })
})
