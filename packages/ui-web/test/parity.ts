import { expect } from 'vitest'

function classList(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

/**
 * The element's classes must all be `mbc:`-prefixed and, with the prefix
 * removed, be exactly v0's classes (order-insensitive).
 */
export function expectV0Classes(element: Element, v0: string): void {
  const actual = classList(element.getAttribute('class') ?? '')
  const unprefixed = actual.filter((name) => !name.startsWith('mbc:'))

  expect(unprefixed, 'classes without the mbc: prefix').toEqual([])
  expect(actual.map((name) => name.slice(4)).sort()).toEqual(
    classList(v0).sort()
  )
}
