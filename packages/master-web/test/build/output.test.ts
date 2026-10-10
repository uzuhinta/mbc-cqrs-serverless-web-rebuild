// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  externalsOf,
  FORBIDDEN_JS_PATTERNS,
  hasUseClientDirective,
  listFiles,
  readText,
} from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  parseCss,
  unprefixedClasses,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))

describe('master-web output', () => {
  it('ships the root and /core entries and both stylesheets', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'core/index.js'])
    )
    expect(listFiles(dist, '.css')).toEqual(['styles.css', 'styles.layer.css'])
  })

  it('includes ui-web’s styles, prefixed and scoped', () => {
    const css = readText(dist, 'styles.css')
    expect(css).toContain('--mbc-primary:')
    const root = parseCss(css)
    expect(
      unprefixedClasses(root, [
        'dark',
        // The rich-text editor hides Quill's toolbar from an mbc: class.
        'ql-toolbar',
        'rdp-button_next',
        'rdp-button_previous',
      ])
    ).toEqual([])
    expect(elementOnlyRules(root)).toEqual([])
  })

  it('keeps /core free of React and of every package but zod', () => {
    expect(
      [...externalsOf(dist, 'core/index.js')].filter((name) => name !== 'zod')
    ).toEqual([])
    for (const file of listFiles(dist, '.js').filter((f) =>
      f.startsWith('core/')
    )) {
      expect(hasUseClientDirective(readText(dist, file)), file).toBe(false)
    }
  })

  it('marks every module that renders as a client module', () => {
    for (const file of listFiles(dist, '.js')) {
      const source = readText(dist, file)
      if (/from\s*["']react\/jsx-runtime["']/.test(source))
        expect(hasUseClientDirective(source), file).toBe(true)
    }
  })

  it('contains no host-framework or host-library references', () => {
    for (const file of listFiles(dist, '.js')) {
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(readText(dist, file), `${file} ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
