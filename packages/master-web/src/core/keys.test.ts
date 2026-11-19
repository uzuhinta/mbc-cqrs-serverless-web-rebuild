import { describe, expect, it } from 'vitest'

import { dataCodeError, settingCodeError } from './keys'

describe('settingCodeError', () => {
  it.each(['a#b', 'a@b', '#', 'USER#u1#S1', 'S1@2'])(
    'rejects %s for its key characters',
    (code) => expect(settingCodeError(code)).toEqual({ key: 'keyChars' })
  )
  it('rejects the reserved MASTER_SETTING', () => {
    expect(settingCodeError('MASTER_SETTING')).toEqual({ key: 'reserved' })
  })
  it.each(['PRODUCT', 'master_setting', 'a-b_c.d'])('accepts %s', (code) =>
    expect(settingCodeError(code)).toBeUndefined()
  )
})

describe('dataCodeError', () => {
  it.each(['a#b', 'a@b'])('rejects %s', (code) =>
    expect(dataCodeError(code)).toEqual({ key: 'keyChars' })
  )
  it('accepts MASTER_SETTING as a data code', () => {
    expect(dataCodeError('MASTER_SETTING')).toBeUndefined()
  })
})
