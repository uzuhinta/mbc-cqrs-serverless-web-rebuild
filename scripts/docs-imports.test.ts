import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))
const DOCS = [
  'packages/ui-web/README.md',
  'packages/client-web/README.md',
  'packages/survey-web/README.md',
  'packages/survey-web/MIGRATION.md',
  'packages/master-web/README.md',
  'packages/master-web/MIGRATION.md',
]

/** `@mbc-cqrs-serverless/<pkg>[/<entry>]` → the built module. */
function distOf(specifier: string): string {
  const [, pkg, entry] =
    specifier.match(/^@mbc-cqrs-serverless\/([a-z-]+)(?:\/(.+))?$/) ?? []
  return join(
    root,
    'packages',
    pkg ?? '',
    'dist',
    entry ? `${entry}/index.js` : 'index.js'
  )
}

function importsIn(markdown: string): { names: string[]; from: string }[] {
  const found: { names: string[]; from: string }[] = []
  for (const [, info, code] of markdown.matchAll(
    /```(\w[^\n]*)\n([\s\S]*?)```/g
  )) {
    if (!info || !/^(ts|tsx)\b/.test(info) || info.includes('v0')) continue
    for (const [, list, from] of (code ?? '').matchAll(
      /import\s*\{([^}]*)\}\s*from\s*'(@mbc-cqrs-serverless\/[^']+)'/g
    )) {
      const names = (list ?? '')
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name && !name.startsWith('type '))
        .map((name) => name.split(/\s+as\s+/)[0]!.trim())
      found.push({ names, from: from ?? '' })
    }
  }
  return found
}

describe('documentation imports', () => {
  for (const doc of DOCS) {
    it(`${doc} imports only names its packages export`, async () => {
      const path = join(root, doc)
      expect(existsSync(path), doc).toBe(true)
      const imports = importsIn(readFileSync(path, 'utf8'))
      expect(imports.length, doc).toBeGreaterThan(0)
      for (const { names, from } of imports) {
        const mod = (await import(distOf(from))) as Record<string, unknown>
        for (const name of names)
          expect(name in mod, `${doc}: ${name} from ${from}`).toBe(true)
      }
    }, 30_000) // cold imports of the built packages (Radix, lucide) take seconds
  }
})

describe('documentation stylesheets', () => {
  // Tailwind v3's preflight is unlayered, and unlayered CSS beats every
  // layer: with styles.layer.css a v3 host's reset wins over the library.
  it('never sends Tailwind v3 hosts to the layered stylesheet', () => {
    const offending = DOCS.flatMap((doc) =>
      readFileSync(join(root, doc), 'utf8')
        .split(/(?<=[.!?])\s+|\n/)
        .filter(
          (sentence) =>
            sentence.includes('Tailwind v3') &&
            sentence.includes('styles.layer.css')
        )
        .map((sentence) => `${doc}: ${sentence}`)
    )
    expect(offending).toEqual([])
  })
})
