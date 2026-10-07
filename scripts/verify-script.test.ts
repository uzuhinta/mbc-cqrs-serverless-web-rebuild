import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { scripts: Record<string, string> }

describe('pnpm verify', () => {
  // Packages resolve each other's types from dist/, so on a clean checkout
  // (CI) the typecheck only works after the build.
  it('builds before it typechecks', () => {
    const steps =
      pkg.scripts.verify?.split('&&').map((step) => step.trim()) ?? []
    expect(steps.indexOf('pnpm build')).toBeGreaterThan(-1)
    expect(steps.indexOf('pnpm build')).toBeLessThan(
      steps.indexOf('pnpm typecheck')
    )
  })
})
