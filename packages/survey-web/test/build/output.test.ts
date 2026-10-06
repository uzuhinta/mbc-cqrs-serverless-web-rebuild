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
const css = readText(dist, 'styles.css')

describe('survey-web output', () => {
  it('ships every entry point', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining([
        'index.js',
        'templates/index.js',
        'mbc/index.js',
        'SurveyForm/index.js',
        'SurveyCreator/index.js',
      ])
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
    expect([...externalsOf(dist, 'core/index.js')]).toEqual(['zod'])
  })

  it('keeps . , /templates, /core and the aliases free of client-web; /mbc uses it', () => {
    const CLIENT = '@mbc-cqrs-serverless/client-web'
    for (const entry of [
      'index.js',
      'templates/index.js',
      'core/index.js',
      'SurveyForm/index.js',
      'SurveyCreator/index.js',
    ]) {
      expect(
        [...externalsOf(dist, entry)].some((name) => name.startsWith(CLIENT)),
        entry
      ).toBe(false)
    }
    expect(
      [...externalsOf(dist, 'mbc/index.js')].some((name) =>
        name.startsWith(CLIENT)
      )
    ).toBe(true)
  })

  it('marks component modules as client modules and keeps the engine free of React', () => {
    for (const file of listFiles(dist, '.js')) {
      const source = readText(dist, file)
      if (/from\s*["']react\/jsx-runtime["']/.test(source)) {
        expect(hasUseClientDirective(source), file).toBe(true)
      }
      if (/^(engine|schema|answers)\//.test(file)) {
        expect(hasUseClientDirective(source), file).toBe(false)
        expect(source, file).not.toMatch(/from\s*["']react/)
      }
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
