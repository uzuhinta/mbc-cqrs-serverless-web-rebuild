import { describe, expect, it } from 'vitest'

import {
  elementOnlyRules,
  layerNames,
  parseCss,
  topLevelOutsideLayer,
  unprefixedClasses,
} from './css-output.ts'

describe('layerNames', () => {
  it('lists block layers but not layer-order statements', () => {
    const root = parseCss(
      '@layer a, b;\n@layer properties { * { --x: 0 } }\n@layer mbc.base { .mbc\\:p-1 { padding: 1px } }'
    )
    expect(layerNames(root)).toEqual(['properties', 'mbc.base'])
  })
})

describe('unprefixedClasses', () => {
  it('finds classes without the mbc: prefix', () => {
    const root = parseCss(
      '.mbc\\:flex { display: flex }\n.host { color: red }\n.mbc\\:dark\\:bg-x:where(.dark, .dark *) { color: blue }'
    )
    expect(unprefixedClasses(root)).toEqual(['host'])
  })

  it('ignores keyframe selectors', () => {
    const root = parseCss(
      '@keyframes spin { from { opacity: 0 } to { opacity: 1 } }'
    )
    expect(unprefixedClasses(root)).toEqual([])
  })
})

describe('elementOnlyRules', () => {
  it('flags rules that style elements without an mbc: class', () => {
    const root = parseCss(
      'button { color: red }\n.mbc\\:p-1 { padding: 1px }\n:where([data-mbc]) * { margin: 0 }\n:root, :host { --mbc-x: 1 }'
    )
    expect(elementOnlyRules(root)).toEqual(['button'])
  })

  it('flags a selector list if any member is element-only', () => {
    const root = parseCss('.mbc\\:p-1, input { padding: 1px }')
    expect(elementOnlyRules(root)).toEqual(['.mbc\\:p-1, input'])
  })

  it('ignores @layer properties and keyframes', () => {
    const root = parseCss(
      '@layer properties { *, ::before { --mbc-tw-x: 0 } }\n@keyframes k { from { opacity: 0 } }'
    )
    expect(elementOnlyRules(root)).toEqual([])
  })
})

describe('topLevelOutsideLayer', () => {
  it('accepts layer statements, mbc layers, properties layer and @property', () => {
    const root = parseCss(
      '@layer theme, base, mbc, components, utilities;\n@layer mbc.theme { :root { --mbc-a: 1 } }\n@layer properties { * { --x: 0 } }\n@property --mbc-tw-y { syntax: "*"; inherits: false }'
    )
    expect(topLevelOutsideLayer(root, 'mbc')).toEqual([])
  })

  it('accepts top-level @keyframes and @font-face, which are not style rules', () => {
    const root = parseCss(
      '@keyframes spin { to { transform: rotate(360deg) } }\n@font-face { font-family: x; src: local(x) }'
    )
    expect(topLevelOutsideLayer(root, 'mbc')).toEqual([])
  })

  it('reports unlayered rules and foreign layers', () => {
    const root = parseCss(
      '.mbc\\:p-1 { padding: 1px }\n@layer utilities { .x { color: red } }'
    )
    expect(topLevelOutsideLayer(root, 'mbc')).toEqual([
      'rule .mbc\\:p-1',
      '@layer utilities',
    ])
  })
})
