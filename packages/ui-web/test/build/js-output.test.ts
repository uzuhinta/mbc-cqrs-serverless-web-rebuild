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

  const CLIENT_MODULES = [
    'components/accordion.js',
    'components/alert-dialog.js',
    'components/badge.js',
    'components/button.js',
    'components/calendar.js',
    'components/checkbox.js',
    'components/command.js',
    'components/dialog.js',
    'components/dropdown-menu.js',
    'components/field.js',
    'components/input.js',
    'components/label.js',
    'components/multi-select.js',
    'components/pagination.js',
    'components/popover.js',
    'components/radio-group.js',
    'components/select.js',
    'components/separator.js',
    'components/switch.js',
    'components/tabs.js',
    'components/textarea.js',
    'i18n/provider.js',
    'lib/use-hydrated.js',
  ]
  const SERVER_SAFE_MODULES = [
    'components/alert.js',
    'components/badge-variants.js',
    'components/button-variants.js',
    'components/input-variants.js',
    'components/card.js',
    'components/skeleton.js',
    'components/table.js',
    'i18n/catalog.js',
    'i18n/merge.js',
    'i18n/ui-messages.js',
    'index.js',
    'lib/cn.js',
  ]

  it('covers every M1 module in the use-client allowlists', () => {
    for (const file of [
      'components/accordion.js',
      'components/command.js',
      'components/multi-select.js',
      'lib/use-hydrated.js',
    ]) {
      expect(CLIENT_MODULES, file).toContain(file)
    }
    expect(SERVER_SAFE_MODULES).toContain('components/table.js')
  })

  it('keeps "use client" on client modules only', () => {
    for (const file of CLIENT_MODULES) {
      expect(hasUseClientDirective(readText(dist, file)), file).toBe(true)
    }
    for (const file of SERVER_SAFE_MODULES) {
      expect(hasUseClientDirective(readText(dist, file)), file).toBe(false)
    }
  })

  it('keeps variant helpers callable from Server Components', () => {
    expect(
      hasUseClientDirective(readText(dist, 'components/button-variants.js'))
    ).toBe(false)
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
