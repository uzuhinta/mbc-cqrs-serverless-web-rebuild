// @vitest-environment node
import { posix } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  FORBIDDEN_JS_PATTERNS,
  listFiles,
  readText,
} from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  parseCss,
  unprefixedClasses,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))
const css = readText(dist, 'styles.css')

describe('survey-web output', () => {
  it('ships every entry point', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'templates/index.js', 'mbc/index.js'])
    )
    expect(listFiles(dist, '.css')).toEqual(['styles.css', 'styles.layer.css'])
  })

  it('includes ui-web primitives’ classes, so one stylesheet is enough', () => {
    expect(css).toContain('.mbc\\:bg-primary')
    expect(css).toContain('--mbc-primary:')
  })

  it('keeps the CSS prefixed and scoped', () => {
    const root = parseCss(css)
    expect(
      unprefixedClasses(root, [
        'dark',
        'rdp-button_next',
        'rdp-button_previous',
      ])
    ).toEqual([])
    expect(elementOnlyRules(root)).toEqual([])
  })

  it('ships a ./core entry whose import graph reaches only zod', () => {
    const seen = new Set<string>()
    const external = new Set<string>()
    const visit = (file: string) => {
      if (seen.has(file)) return
      seen.add(file)
      const source = readText(dist, file)
      for (const [, specifier] of source.matchAll(
        /(?:from|import)\s*["']([^"']+)["']/g
      )) {
        if (!specifier) continue
        if (specifier.startsWith('.'))
          visit(posix.join(posix.dirname(file), specifier))
        else external.add(specifier)
      }
    }
    visit('core/index.js')
    expect([...external]).toEqual(['zod'])
  })

  it('contains no host-framework references', () => {
    for (const file of listFiles(dist, '.js')) {
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(readText(dist, file), `${file} ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
