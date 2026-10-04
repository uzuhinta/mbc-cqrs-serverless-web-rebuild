// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { distDir, readText } from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  layerNames,
  parseCss,
  topLevelOutsideLayer,
  unprefixedClasses,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))
const unlayeredCss = readText(dist, 'styles.css')
const layeredCss = readText(dist, 'styles.layer.css')
const unlayered = parseCss(unlayeredCss)
const layered = parseCss(layeredCss)

describe('styles.css (default, unlayered)', () => {
  it('has no cascade layers except Tailwind’s @property fallback layer', () => {
    expect(
      layerNames(unlayered).filter((name) => name !== 'properties')
    ).toEqual([])
  })

  it('prefixes every class with mbc:', () => {
    expect(unprefixedClasses(unlayered)).toEqual([])
  })

  it('never styles bare elements outside library scopes', () => {
    expect(elementOnlyRules(unlayered)).toEqual([])
  })

  it('compiles the classes used by components', () => {
    expect(unlayeredCss).toContain('.mbc\\:bg-primary')
    expect(unlayeredCss).toContain('.mbc\\:h-9')
    expect(unlayeredCss).toContain('.mbc\\:border-brand')
  })

  it('defines light and dark tokens', () => {
    expect(unlayeredCss).toContain('--mbc-primary:')
    expect(unlayeredCss).toContain('--mbc-brand:')
    expect(unlayeredCss).toMatch(/\[data-mbc-theme=['"]?dark['"]?\]/)
  })
})

describe('styles.layer.css (opt-in, layered)', () => {
  it('puts every rule inside the mbc layer', () => {
    expect(topLevelOutsideLayer(layered, 'mbc')).toEqual([])
  })

  it('declares mbc between the host preflight and host utilities', () => {
    expect(layeredCss).toMatch(
      /@layer\s*theme\s*,\s*base\s*,\s*mbc\s*,\s*components\s*,\s*utilities\s*;/
    )
  })

  it('prefixes every class with mbc:', () => {
    expect(unprefixedClasses(layered)).toEqual([])
  })
})
