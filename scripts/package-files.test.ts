import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

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
})
