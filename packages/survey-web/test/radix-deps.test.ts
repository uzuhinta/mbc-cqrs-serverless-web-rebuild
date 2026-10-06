// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

type Manifest = { dependencies: Record<string, string> }
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Manifest
const own = read('../package.json')
const uiWeb = read('../../ui-web/package.json')

describe('Radix dependencies', () => {
  // Same range as ui-web, so a host resolves one copy of each Radix package.
  it('uses ui-web’s caret range for every @radix-ui package', () => {
    const radix = Object.entries(own.dependencies).filter(([name]) =>
      name.startsWith('@radix-ui/')
    )
    expect(radix.length).toBeGreaterThan(0)
    for (const [name, range] of radix) {
      expect(range, name).toMatch(/^\^\d+\.\d+\.\d+$/)
      expect(range, name).toBe(uiWeb.dependencies[name])
    }
  })
})
