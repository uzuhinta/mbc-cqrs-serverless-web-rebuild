// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const packageJsonPath = fileURLToPath(
  new URL('../package.json', import.meta.url)
)
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  dependencies: Record<string, string>
}
const radix = Object.entries(pkg.dependencies).filter(([name]) =>
  name.startsWith('@radix-ui/')
)

/** Directory of the package that contains `file` (Radix hides ./package.json). */
function packageRoot(file: string, name: string): string {
  let dir = dirname(file)
  while (dir !== dirname(dir)) {
    try {
      const json = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8')) as {
        name?: string
      }
      if (json.name === name) return dir
    } catch {
      // keep walking up
    }
    dir = dirname(dir)
  }
  throw new Error(`no package root for ${name}`)
}

/** Version of `shared` that `owner` resolves. */
function versionFrom(owner: string, shared: string): string {
  const ownerRoot = packageRoot(
    createRequire(packageJsonPath).resolve(owner),
    owner
  )
  const sharedEntry = createRequire(`${ownerRoot}/package.json`).resolve(shared)
  const sharedRoot = packageRoot(sharedEntry, shared)
  return (
    JSON.parse(readFileSync(`${sharedRoot}/package.json`, 'utf8')) as {
      version: string
    }
  ).version
}

describe('Radix dependencies', () => {
  // Caret ranges let a host on newer Radix (shadcn) dedupe to one copy;
  // exact pins would give it two registries (Escape in our popover closing
  // its dialog).
  it('uses caret ranges for every @radix-ui package', () => {
    expect(
      radix.filter(([, range]) => !/^\^\d+\.\d+\.\d+$/.test(range))
    ).toEqual([])
  })

  // Dismissable-layer / focus-scope keep module-level registries: two copies
  // make a Select inside a Dialog count as an outside click.
  it('shares one copy of the overlay registries', () => {
    const owners = [
      '@radix-ui/react-dialog',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
    ]
    for (const shared of [
      '@radix-ui/react-dismissable-layer',
      '@radix-ui/react-focus-scope',
      '@radix-ui/react-portal',
    ]) {
      const versions = new Set(
        owners.map((owner) => versionFrom(owner, shared))
      )
      expect([...versions], shared).toHaveLength(1)
    }
  })
})
