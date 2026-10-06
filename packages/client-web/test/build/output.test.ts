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

describe('client-web output', () => {
  it('keeps "use client" on the React entry modules only', () => {
    for (const file of listFiles(dist, '.js')) {
      expect(hasUseClientDirective(readText(dist, file)), file).toBe(
        file === 'react/provider.js' ||
          file === 'react/use-command.js' ||
          file === 'react/use-query.js'
      )
    }
  })

  it('never imports React outside /react', () => {
    for (const file of listFiles(dist, '.js').filter(
      (f) => !f.startsWith('react/')
    )) {
      expect(readText(dist, file), file).not.toMatch(/from\s*["']react/)
    }
  })

  it('contains no host-framework references', () => {
    for (const file of listFiles(dist, '.js')) {
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(readText(dist, file), `${file} ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
