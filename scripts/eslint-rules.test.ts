import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const eslint = new ESLint({ cwd: repoRoot })

async function ruleIds(
  code: string,
  filePath = 'packages/ui-web/src/lint-fixture.tsx'
): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return result?.messages.map((message) => message.ruleId) ?? []
}

describe('library rules in packages/*/src', () => {
  it('forbids reading process.env', async () => {
    expect(await ruleIds('export const url = process.env.API_URL\n')).toContain(
      'no-restricted-syntax'
    )
  })

  it('forbids next/* imports', async () => {
    const code =
      "import { useRouter } from 'next/navigation'\nexport const r = useRouter\n"
    expect(await ruleIds(code)).toContain('no-restricted-imports')
  })

  it('forbids nuqs and sonner', async () => {
    expect(
      await ruleIds("import { toast } from 'sonner'\nexport const t = toast\n")
    ).toContain('no-restricted-imports')
    expect(
      await ruleIds(
        "import { useQueryState } from 'nuqs'\nexport const q = useQueryState\n"
      )
    ).toContain('no-restricted-imports')
  })

  it('forbids React 19-only hooks', async () => {
    expect(
      await ruleIds("import { use } from 'react'\nexport const u = use\n")
    ).toContain('no-restricted-imports')
    expect(
      await ruleIds(
        "import * as React from 'react'\nexport const a = React.useActionState\n"
      )
    ).toContain('no-restricted-syntax')
  })

  it('forbids console', async () => {
    expect(await ruleIds("console.log('debug')\n")).toContain('no-console')
  })

  it('forbids any', async () => {
    expect(await ruleIds('export const value: any = 1\n')).toContain(
      '@typescript-eslint/no-explicit-any'
    )
  })

  it('accepts clean library code', async () => {
    const code =
      "import { useState } from 'react'\nexport function useFlag(): boolean {\n  const [flag] = useState(false)\n  return flag\n}\n"
    expect(await ruleIds(code)).toEqual([])
  })
})

describe('tooling files', () => {
  it('allow console and process.env in scripts', async () => {
    const code = 'console.log(process.env.HOME)\n'
    expect(await ruleIds(code, 'scripts/tool.ts')).toEqual([])
  })
})
