// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  FORBIDDEN_JS_PATTERNS,
  hasUseClientDirective,
  listFiles,
  readText,
} from '../../../../scripts/build-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))

describe('ui-web JavaScript output', () => {
  it('emits one ESM module and one declaration file per source module', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'lib/cn.js', 'components/button.js'])
    )
    expect(listFiles(dist, '.d.ts')).toEqual(
      expect.arrayContaining([
        'index.d.ts',
        'lib/cn.d.ts',
        'components/button.d.ts',
      ])
    )
  })

  it('keeps "use client" on client modules only', () => {
    expect(hasUseClientDirective(readText(dist, 'components/button.js'))).toBe(
      true
    )
    expect(hasUseClientDirective(readText(dist, 'lib/cn.js'))).toBe(false)
    expect(hasUseClientDirective(readText(dist, 'index.js'))).toBe(false)
  })

  it('uses the automatic JSX runtime and never bundles React', () => {
    const button = readText(dist, 'components/button.js')

    expect(button).toMatch(/from\s*["']react\/jsx-runtime["']/)
    expect(button).not.toMatch(/React\.createElement/)
  })

  it('contains no host-framework references', () => {
    for (const file of listFiles(dist, '.js')) {
      const code = readText(dist, file)
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(code, `${file} matches ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
