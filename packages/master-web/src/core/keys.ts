import type { MasterError } from './errors'

/** The sort-key prefix of setting rows; as a setting code it would name them all. */
export const SETTING_KEY_PREFIX = 'MASTER_SETTING'

/** `#` joins key segments and `@` starts the version: neither may be in a code. */
const KEY_CHARS = /[#@]/

/**
 * What the backend rejects in a setting code (v1.8): `#` or `@`, or the
 * reserved `MASTER_SETTING`. Emptiness is the form's own check.
 */
export function settingCodeError(code: string): MasterError | undefined {
  if (KEY_CHARS.test(code)) return { key: 'keyChars' }
  if (code === SETTING_KEY_PREFIX) return { key: 'reserved' }
  return undefined
}

/** What the backend rejects in a data record's code (v1.8): `#` or `@`. */
export function dataCodeError(code: string): MasterError | undefined {
  return KEY_CHARS.test(code) ? { key: 'keyChars' } : undefined
}
