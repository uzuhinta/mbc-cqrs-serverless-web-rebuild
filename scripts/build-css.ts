import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import postcss from 'postcss'

export function unwrapLayers(css: string, layerPrefix: string): string {
  const root = postcss.parse(css)
  root.walkAtRules('layer', (atRule) => {
    if (!atRule.nodes) {
      atRule.remove()
      return
    }
    const name = atRule.params.trim()
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
    unwrapLayers(readFileSync(layeredOutput, 'utf8'), 'mbc')
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
