import { describe, expect, it } from 'vitest'

import { unwrapLayers } from './build-css.ts'
import { layerNames, parseCss, unprefixedClasses } from './css-output.ts'

const LAYERED =
  '@layer theme,base,mbc,components,utilities;' +
  '@layer mbc.theme,mbc.base,mbc.utilities;' +
  '@layer mbc.theme{:root,:host{--mbc-spacing:.25rem}}' +
  '@layer properties{*,:before{--mbc-tw-x:0}}' +
  '@layer mbc.base{:where([data-mbc]){margin:0}}' +
  '@layer mbc.utilities{.mbc\\:p-1{padding:1px}}'

describe('unwrapLayers', () => {
  it('keeps only the properties layer', () => {
    const out = parseCss(unwrapLayers(LAYERED, 'mbc'))
    expect(layerNames(out)).toEqual(['properties'])
  })

  it('removes layer-order statements', () => {
    expect(unwrapLayers(LAYERED, 'mbc')).not.toMatch(/@layer[^{]*;/)
  })

  it('renames mapped layers instead of unwrapping them', () => {
    const out = parseCss(unwrapLayers(LAYERED, 'mbc', { 'mbc.base': 'base' }))
    expect(layerNames(out)).toEqual(['properties', 'base'])
  })

  it('keeps every rule, in order', () => {
    const out = parseCss(unwrapLayers(LAYERED, 'mbc'))
    const selectors: string[] = []
    out.walkRules((rule) => {
      selectors.push(rule.selector)
    })
    expect(selectors).toEqual([
      ':root,:host',
      '*,:before',
      ':where([data-mbc])',
      '.mbc\\:p-1',
    ])
    expect(unprefixedClasses(out)).toEqual([])
  })
})
