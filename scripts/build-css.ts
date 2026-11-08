import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import postcss from 'postcss'

/**
 * Removes layer-order statements and unwraps `<layerPrefix>` / `<layerPrefix>.*`
 * blocks; blocks named in `rename` are kept as layers under their new name.
 */
export function unwrapLayers(
  css: string,
  layerPrefix: string,
  rename: Readonly<Record<string, string>> = {}
): string {
  const root = postcss.parse(css)
  root.walkAtRules('layer', (atRule) => {
    if (!atRule.nodes) {
      atRule.remove()
      return
    }
    const name = atRule.params.trim()
    const renamed = rename[name]
    if (renamed) {
      atRule.params = renamed
      return
    }
    if (name === layerPrefix || name.startsWith(`${layerPrefix}.`)) {
      atRule.replaceWith(atRule.nodes)
    }
  })
  return root.toString()
}

// Words an `animation` value may hold that are not keyframe names.
const ANIMATION_KEYWORDS = new Set([
  'none',
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
  'infinite',
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'running',
  'paused',
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
  'auto',
  'replace',
  'add',
  'accumulate',
])

/**
 * Renames every keyframe the stylesheet defines to `<prefix><name>` (unless
 * it has the prefix already) and its uses in animation declarations and
 * custom properties, so a host's own keyframes of the same name cannot
 * replace the library's. With `undefinedUses`, names an `animation` uses
 * without the sheet defining them are prefixed too (a library may refer to
 * keyframes it never ships, which a host's own would then supply).
 */
export function prefixKeyframes(
  css: string,
  prefix = 'mbc-',
  options: { undefinedUses?: boolean } = {}
): string {
  const root = postcss.parse(css)
  const names = new Set<string>()
  root.walkAtRules(/keyframes$/, (atRule) => {
    const name = atRule.params.trim()
    if (name.startsWith(prefix)) return
    names.add(name)
    atRule.params = `${prefix}${name}`
  })
  if (options.undefinedUses)
    root.walkDecls(/^animation(-name)?$/, (decl) => {
      decl.value = decl.value
        .split(',')
        .map((segment) =>
          segment.replace(
            /(^|\s)([a-zA-Z_][\w-]*)(?=\s|$)/g,
            (match, space: string, word: string) =>
              names.has(word) ||
              word.startsWith(prefix) ||
              ANIMATION_KEYWORDS.has(word)
                ? match
                : `${space}${prefix}${word}`
          )
        )
        .join(',')
    })
  if (names.size === 0) return root.toString()
  const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `(?<![\\w-])(${[...names].map(escape).join('|')})(?![\\w-])`,
    'g'
  )
  root.walkDecls((decl) => {
    if (!/animation/.test(decl.prop) && !decl.prop.startsWith('--')) return
    decl.value = decl.value.replace(pattern, `${prefix}$1`)
  })
  return root.toString()
}

function main(): void {
  const input = 'src/styles/index.css'
  const layeredOutput = 'dist/styles.layer.css'
  const unlayeredOutput = 'dist/styles.css'

  if (!existsSync(input)) {
    throw new Error(`${process.cwd()}/${input} is missing.`)
  }

  execFileSync(
    'tailwindcss',
    ['--input', input, '--output', layeredOutput, '--minify'],
    { stdio: 'inherit' }
  )
  writeFileSync(
    layeredOutput,
    prefixKeyframes(readFileSync(layeredOutput, 'utf8'))
  )
  writeFileSync(
    unlayeredOutput,
    // The scoped base joins the host's `base` layer, so host utilities (and
    // host resets) still beat it; utilities and theme stay unlayered.
    unwrapLayers(readFileSync(layeredOutput, 'utf8'), 'mbc', {
      'mbc.base': 'base',
    })
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
