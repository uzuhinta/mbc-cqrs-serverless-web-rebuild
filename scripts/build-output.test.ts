import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  hasUseClientDirective,
  listFiles,
  readText,
} from './build-output.ts'

function makePackage(): string {
  return mkdtempSync(join(tmpdir(), 'mbc-build-output-'))
}

describe('hasUseClientDirective', () => {
  it('detects double- and single-quoted directives', () => {
    expect(hasUseClientDirective('"use client";\nexport {}')).toBe(true)
    expect(hasUseClientDirective("'use client'\nexport {}")).toBe(true)
  })

  it('detects a directive after comments and blank lines', () => {
    const code = "// Button\n/* licence */\n\n'use client'\nexport {}"
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('ignores the phrase when it is not the first statement', () => {
    expect(hasUseClientDirective("import x from 'y'\n'use client'")).toBe(false)
    expect(hasUseClientDirective("const s = 'use client'")).toBe(false)
  })
})

describe('distDir', () => {
  it('tells the developer to build first when dist is missing', () => {
    expect(() => distDir(makePackage())).toThrow(/Run "pnpm build"/)
  })

  it('returns the dist path when it exists', () => {
    const pkg = makePackage()
    mkdirSync(join(pkg, 'dist'))
    expect(distDir(pkg)).toBe(join(pkg, 'dist'))
  })
})

describe('listFiles / readText', () => {
  it('lists nested files by extension as sorted POSIX paths', () => {
    const dist = join(makePackage(), 'dist')
    mkdirSync(join(dist, 'components'), { recursive: true })
    writeFileSync(join(dist, 'index.js'), 'export {}')
    writeFileSync(join(dist, 'components', 'button.js'), '"use client";')
    writeFileSync(join(dist, 'index.d.ts'), 'export {}')

    expect(listFiles(dist, '.js')).toEqual(['components/button.js', 'index.js'])
    expect(readText(dist, 'components/button.js')).toBe('"use client";')
  })
})
