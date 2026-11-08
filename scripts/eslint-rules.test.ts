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

  it('forbids the HTTP, GraphQL and state libraries v0 master-web used', async () => {
    for (const code of [
      "import axios from 'axios'\nexport const a = axios\n",
      "import { gql } from '@apollo/client'\nexport const g = gql\n",
      "import { fetchAuthSession } from 'aws-amplify/auth'\nexport const f = fetchAuthSession\n",
      "import { createAuthLink } from 'aws-appsync-auth-link'\nexport const c = createAuthLink\n",
      "import useSWR from 'swr'\nexport const s = useSWR\n",
      "import { observer } from 'mobx-react-lite'\nexport const o = observer\n",
      "import Draggable from 'react-draggable'\nexport const d = Draggable\n",
      "import { Resizable } from 'react-resizable'\nexport const r = Resizable\n",
      "import { useQueryState } from 'next-usequerystate'\nexport const q = useQueryState\n",
      "import { useDebounceValue } from 'usehooks-ts'\nexport const u = useDebounceValue\n",
    ]) {
      expect(await ruleIds(code), code).toContain('no-restricted-imports')
    }
  })

  it('allows the rich editors only as dynamic imports in master-web/src/editors', async () => {
    const staticImport =
      "import ReactQuill from 'react-quill-new'\nexport const q = ReactQuill\n"
    const dynamicImport = "export const load = () => import('jsoneditor')\n"
    const editors = 'packages/master-web/src/editors/json-editor.tsx'
    const elsewhere = 'packages/master-web/src/data/editor.tsx'

    expect(await ruleIds(staticImport, editors)).toContain(
      'no-restricted-imports'
    )
    expect(await ruleIds(dynamicImport, elsewhere)).toContain(
      'no-restricted-syntax'
    )
    expect(await ruleIds(dynamicImport, editors)).toEqual([])
    expect(
      await ruleIds(
        "export const load = () => import('@uiw/react-md-editor')\n",
        'packages/survey-web/src/lint-fixture.tsx'
      )
    ).toContain('no-restricted-syntax')
  })

  it('still applies the process.env rule next to the editor rule', async () => {
    expect(
      await ruleIds(
        'export const url = process.env.API_URL\n',
        'packages/master-web/src/editors/json-editor.tsx'
      )
    ).toContain('no-restricted-syntax')
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
