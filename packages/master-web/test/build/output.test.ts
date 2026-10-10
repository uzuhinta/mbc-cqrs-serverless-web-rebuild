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
  it('ships the root, /core and /editors entries and the three stylesheets', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'core/index.js', 'editors/index.js'])
    )
    expect(listFiles(dist, '.css')).toEqual([
      'editors.css',
      'styles.css',
      'styles.layer.css',
    ])
  })

  it('scopes editors.css to the editors’ own classes, its files beside it', () => {
    const root = parseCss(readText(dist, 'editors.css'))
    const offenders: string[] = []
    root.walkRules((rule) => {
      const parent = rule.parent as { name?: string } | undefined
      if (parent?.name?.endsWith('keyframes')) return
      for (const selector of rule.selectors)
        if (
          !/ql-|jsoneditor/.test(selector) ||
          /(^|[\s>+~(,])(:root|html|body)(?![\w-])/.test(selector)
        )
          offenders.push(selector)
    })
    expect(offenders).toEqual([])
    const urls = new Set(
      [...readText(dist, 'editors.css').matchAll(/url\("([^"]*)"\)/g)].map(
        ([, url]) => url
      )
    )
    expect([...urls]).toEqual(['./editors-assets/jsoneditor-icons.svg'])
    expect(listFiles(dist, '.svg')).toEqual([
      'editors-assets/jsoneditor-icons.svg',
    ])
  })

  it('loads the optional editors only with import() from editors/', () => {
    const library =
      /["'](?:react-quill-new|@uiw\/react-md-editor|jsoneditor)(?:\/[^"']*)?["']/
    for (const file of listFiles(dist, '.js')) {
      const source = readText(dist, file)
      expect(source, file).not.toMatch(new RegExp(`from\\s*${library.source}`))
      if (!file.startsWith('editors/'))
        expect(source, file).not.toMatch(library)
    }
    expect(readText(dist, 'editors/json-editor.js')).toMatch(
      /import\(\s*["']jsoneditor["']\s*\)/
    )
  })

  it('keeps the root and /core entries free of the editors', () => {
    for (const entry of ['index.js', 'core/index.js'])
      expect(readText(dist, entry), entry).not.toMatch(/editors\//)
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
