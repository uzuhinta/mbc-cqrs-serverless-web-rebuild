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
