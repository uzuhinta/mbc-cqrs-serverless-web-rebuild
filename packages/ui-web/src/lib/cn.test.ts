import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('keeps the last of two conflicting mbc: utilities', () => {
    expect(cn('mbc:px-2 mbc:py-1', 'mbc:px-4')).toBe('mbc:py-1 mbc:px-4')
  })

  it('resolves conflicting theme colours', () => {
    expect(cn('mbc:bg-primary', 'mbc:bg-destructive')).toBe(
      'mbc:bg-destructive'
    )
  })

  it('keeps unprefixed host classes untouched', () => {
    expect(cn('mbc:px-2', 'host-card', 'px-8')).toBe('mbc:px-2 host-card px-8')
  })

  it('drops falsy values', () => {
    const hidden = false
    expect(cn('mbc:flex', hidden && 'mbc:hidden', undefined, null)).toBe(
      'mbc:flex'
    )
  })
})
