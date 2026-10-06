import { afterEach, describe, expect, it, vi } from 'vitest'

import { createId } from './id'

describe('createId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('prefixes question ids with q_ and section ids with sec_', () => {
    expect(createId('q')).toMatch(/^q_/)
    expect(createId('sec')).toMatch(/^sec_/)
  })

  it('never collides across a tight loop', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10_000; i++) ids.add(createId('q'))
    expect(ids.size).toBe(10_000)
  })

  it('produces ids usable as form field names (no "." or "[")', () => {
    expect(createId('q')).not.toMatch(/[.[\]]/)
  })

  it('falls back when crypto.randomUUID is unavailable (insecure origins)', () => {
    vi.stubGlobal('crypto', undefined)
    const ids = new Set<string>()
    for (let i = 0; i < 1_000; i++) ids.add(createId('sec'))
    expect(ids.size).toBe(1_000)
    expect([...ids][0]).toMatch(/^sec_[a-z0-9_]+$/)
  })
})
