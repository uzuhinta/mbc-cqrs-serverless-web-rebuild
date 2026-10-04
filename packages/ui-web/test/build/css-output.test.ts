// @vitest-environment node
import { fileURLToPath } from 'node:url'

import type { AtRule, Root } from 'postcss'
import { describe, expect, it } from 'vitest'

import { distDir, readText } from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  layerNames,
  parseCss,
  topLevelOutsideLayer,
  unprefixedClasses,
  zeroSpecificityUtilities,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))
const unlayeredCss = readText(dist, 'styles.css')
const layeredCss = readText(dist, 'styles.layer.css')
const unlayered = parseCss(unlayeredCss)
const layered = parseCss(layeredCss)

function keyframeNames(root: Root): string[] {
  const names: string[] = []
  root.walkAtRules(/keyframes$/i, (atRule) => {
    names.push(atRule.params.trim())
  })
  return names
}

function unlayeredRulesTargetingRoots(root: Root): string[] {
  const offenders: string[] = []
  root.walkRules((rule) => {
    let parent = rule.parent
    while (parent && parent.type !== 'root') {
      if (parent.type === 'atrule' && (parent as AtRule).name === 'layer')
        return
      parent = parent.parent
    }
    // `[data-mbc]` exactly: `[data-mbc-theme=dark]` in dark: utilities is fine.
    if (rule.selector.includes('[data-mbc]')) offenders.push(rule.selector)
  })
  return offenders
}

describe('styles.css (default)', () => {
  it('layers only the scoped base (as host `base`) and Tailwind’s @property fallback', () => {
    expect([...new Set(layerNames(unlayered))].sort()).toEqual([
      'base',
      'properties',
    ])
  })

  it('keeps every [data-mbc] reset in a layer so host utilities can beat it', () => {
    expect(unlayeredRulesTargetingRoots(unlayered)).toEqual([])
  })

  it('compiles no class that only test files use', () => {
    // mbc:px-8 appears only in button.test.tsx / cn.test.ts.
    expect(unlayeredCss).not.toContain('.mbc\\:px-8')
  })

  it('names every keyframes rule with the mbc- prefix', () => {
    const TW_ANIMATE = ['enter', 'exit']
    expect(
      keyframeNames(unlayered).filter(
        (name) => !name.startsWith('mbc-') && !TW_ANIMATE.includes(name)
      )
    ).toEqual([])
  })

  it('emits no zero-specificity utilities, which a host reset would beat', () => {
    expect(zeroSpecificityUtilities(unlayered)).toEqual([])
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
