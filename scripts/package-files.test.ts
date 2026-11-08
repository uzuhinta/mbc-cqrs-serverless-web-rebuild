import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { posix } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { reachableModules } from './prune-dist.ts'

const root = fileURLToPath(new URL('..', import.meta.url))

/** What `npm pack` would publish, without building (prepack) or writing a tarball. */
function packed(pkg: string): string[] {
  const out = execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: `${root}packages/${pkg}`, encoding: 'utf8' }
  )
  const [result] = JSON.parse(out) as { files: { path: string }[] }[]
  return (result?.files ?? []).map((file) => file.path)
}

describe('published files', () => {
  it.each(['ui-web', 'client-web', 'survey-web', 'master-web'])(
    '%s ships its licence, readme and changelog',
    (pkg) => {
      expect(packed(pkg)).toEqual(
        expect.arrayContaining(['LICENSE', 'README.md', 'CHANGELOG.md'])
      )
    },
    30_000
  )

  it.each(['survey-web', 'master-web'])(
    '%s ships its migration guide',
    (pkg) => {
      expect(packed(pkg)).toContain('MIGRATION.md')
    },
    30_000
  )

  // Each stylesheet is compiled from the sibling sources it was built with:
  // `workspace:*` publishes the exact version, so npm cannot mix releases.
  it.each(['survey-web', 'master-web'])(
    '%s depends on its sibling packages at their exact version',
    (pkg) => {
      const { dependencies } = JSON.parse(
        readFileSync(`${root}packages/${pkg}/package.json`, 'utf8')
      ) as { dependencies: Record<string, string> }
      const siblings = Object.entries(dependencies).filter(([name]) =>
        name.startsWith('@mbc-cqrs-serverless/')
      )
      expect(siblings.length).toBeGreaterThan(0)
      for (const [name, range] of siblings)
        expect(`${name}@${range}`).toBe(`${name}@workspace:*`)
    }
  )

  // A published module nothing imports is dead weight; one an import needs
  // but the package lacks breaks the install.
  it.each(['ui-web', 'client-web', 'survey-web', 'master-web'])(
    '%s publishes exactly the modules its entries reach',
    (pkg) => {
      const reached = reachableModules(`${root}packages/${pkg}`)
      const published = packed(pkg).filter((file) => file.endsWith('.js'))
      expect(published.sort()).toEqual([...reached].sort())
    },
    30_000
  )

  // A map comment for a file that is not shipped makes bundlers and editors
  // look for it (and warn).
  it.each(['ui-web', 'client-web', 'survey-web', 'master-web'])(
    '%s points only at source maps it ships',
    (pkg) => {
      const files = packed(pkg)
      const shipped = new Set(files)
      const missing = files.flatMap((file) => {
        if (!/\.(js|d\.ts|css)$/.test(file)) return []
        const source = readFileSync(`${root}packages/${pkg}/${file}`, 'utf8')
        const map = /[#@] sourceMappingURL=([^\s*]+)/.exec(source)?.[1]
        if (!map || map.startsWith('data:')) return []
        const target = posix.join(posix.dirname(file), map)
        return shipped.has(target) ? [] : [`${file} → ${target}`]
      })
      expect(missing).toEqual([])
    },
    30_000
  )
})
