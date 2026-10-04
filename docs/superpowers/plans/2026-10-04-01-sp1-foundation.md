# SP1 — Workspace Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pnpm monorepo in `rebuild/` whose lint, typecheck, build, test, and package checks pass on React 18 and React 19, proven end to end by a `ui-web` skeleton (`cn` + `Button`) that builds to unbundled ESM with `"use client"` preserved and to prefixed `styles.css` (unlayered) + `styles.layer.css` (layered).

**Architecture:** Tooling lives at the root (one copy of every dev tool). Shared build logic lives in `scripts/` (`tsdown-preset.ts`, `build-css.ts`) and shared build-output assertions in `scripts/build-output.ts` and `scripts/css-output.ts`. Each package owns only its `package.json`, tsconfigs, `tsdown.config.ts`, `vitest.config.ts`, and CSS entry files. React 18/19 switching rewrites `pnpm.overrides` and reinstalls.

**Tech Stack:** Node 24.13 (fnm), pnpm 10.29.2, TypeScript ~6.0.3, tsdown ^0.23.0, Tailwind CSS ^4.3.3 (+ `@tailwindcss/cli`), Vitest ^5.0.3, jsdom ^29.1.1, Testing Library (react ^16.3.3, dom ^10.4.2, jest-dom ^7.0.1, user-event ^14.6.7), ESLint ^10.12.0 + typescript-eslint ^8.71.0 + eslint-plugin-react-hooks ^7.1.1, Prettier ^3.9.9, postcss ^8.5.28 + postcss-selector-parser ^7.1.6, publint ^0.3.25, @arethetypeswrong/cli ^0.18.5, @changesets/cli ^3.0.3.

**Spec:** `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md` (§2, §3.1, §3.2, §8). Orchestrator: `docs/superpowers/plans/2026-10-04-00-orchestrator.md`.

## Global Constraints

- Run every command through Node 24.13: `fnm exec --using=v24.13.0 -- <command>`. Below, `$N` stands for `fnm exec --using=v24.13.0 --`.
- Working directory for every command: `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild` unless a step says otherwise.
- React peer range: `"react": "^18.2.0 || ^19.0.0"`, `"react-dom": "^18.2.0 || ^19.0.0"`.
- ESM-only, `"type": "module"`.
- No `process.env`, `next`, `next/*`, `nuqs`, `sonner`, `console.*`, or React-19-only APIs (`use`, `useActionState`, `useOptimistic`, `useFormStatus`) in `packages/*/src`.
- All CSS classes prefixed `mbc:`; tokens are `--mbc-*`; dark under `.dark` or `[data-mbc-theme="dark"]`.
- TypeScript `strict` + `noUncheckedIndexedAccess`; no `any`.
- Prettier style: no semicolons, single quotes, trailing commas `es5`.
- Commit messages: Conventional Commits, ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Tailwind v3 host preflight loaded after `styles.css`** → no library rule styles a bare element outside `:where(...)` / `:root`, so v3's element-level reset can't beat a library class. Pinned in Task 7 (`elementOnlyRules` must be empty).
2. **`"use client"` preceded by a comment or blank line in source** → still preserved in output. Pinned in Task 5 (plugin regex test).
3. **Fresh clone runs `pnpm test` before `pnpm build`** → build-output tests fail with a message telling the developer to build first, not a cryptic ENOENT. Pinned in Task 5 (`distDir` test).
4. **`pnpm use-react 18` then `pnpm use-react 19`** → the working tree returns to exactly the committed state. Pinned in Task 2 (round-trip test) and Task 9 (`git status` check).
5. **Host passes a conflicting `mbc:` class or an unprefixed host class through `className`** → the `mbc:` conflict resolves to the host's class; host classes are kept untouched. Pinned in Task 4 (`cn` tests).

---

## File Structure

```
rebuild/
├─ .changeset/config.json, .changeset/README.md      (Task 8, generated)
├─ .github/workflows/ci.yml                          (Task 8)
├─ .gitignore, .node-version, .prettierrc.json, .prettierignore   (Task 1)
├─ README.md                                         (Task 1)
├─ package.json, pnpm-workspace.yaml, pnpm-lock.yaml (Task 1)
├─ tsconfig.base.json      shared compiler options   (Task 1)
├─ tsconfig.json           typechecks scripts/ + root configs (Task 2)
├─ vitest.config.ts        root: lists projects      (Task 2)
├─ eslint.config.js        lint + library rules      (Task 3)
├─ scripts/
│  ├─ vitest.config.ts     "scripts" test project    (Task 2)
│  ├─ use-react.ts         React 18/19 switch        (Task 2)
│  ├─ use-react.test.ts                              (Task 2)
│  ├─ eslint-rules.test.ts                           (Task 3)
│  ├─ build-output.ts      dist helpers + hasUseClientDirective (Task 5)
│  ├─ build-output.test.ts                           (Task 5)
│  ├─ tsdown-preset.ts     shared library build config + preserveUseClient plugin (Task 5)
│  ├─ css-output.ts        postcss-based CSS assertions (Task 6)
│  ├─ css-output.test.ts                             (Task 6)
│  ├─ build-css.ts         Tailwind CLI → styles.layer.css, then unwrapLayers → styles.css (Task 7)
│  └─ build-css.test.ts                              (Task 7)
└─ packages/ui-web/
   ├─ package.json, tsconfig.json, tsconfig.build.json, vitest.config.ts (Task 4)
   ├─ tsdown.config.ts                               (Task 5)
   ├─ test/setup.ts                                  (Task 4)
   ├─ test/build/js-output.test.ts                   (Task 5)
   ├─ test/build/css-output.test.ts                  (Task 7)
   └─ src/
      ├─ index.ts                                    (Task 4)
      ├─ lib/cn.ts, lib/cn.test.ts                   (Task 4)
      ├─ components/button.tsx, components/button.test.tsx (Task 4)
      └─ styles/tokens.css, base.css, theme.css, index.css (Task 7)
```

---

### Task 1: Root workspace scaffold

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `tsconfig.base.json`, `README.md`

**Interfaces:**

- Consumes: nothing.
- Produces: root scripts `build`, `typecheck`, `lint`, `test`, `format`, `format:check`, `check:package`, `verify`, `use-react`, `changeset`; `tsconfig.base.json` that every package extends.

- [ ] **Step 1: Rename the default branch and create the SP1 branch**

```bash
git branch -m master main
git switch -c sp1-foundation
```

Expected: `git branch --show-current` prints `sp1-foundation`.

- [ ] **Step 2: Create `.node-version`**

```
24.13.0
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - packages/*
  - apps/*
```

- [ ] **Step 4: Create `package.json`**

```json
{
  "name": "mbc-cqrs-serverless-web-rebuild",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.29.2",
  "engines": {
    "node": ">=24.13.0"
  },
  "scripts": {
    "build": "pnpm --filter \"./packages/*\" -r build",
    "typecheck": "tsc -p tsconfig.json && pnpm --filter \"./packages/*\" -r typecheck",
    "lint": "eslint .",
    "test": "vitest run",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check:package": "pnpm --filter \"./packages/*\" -r check:package",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test && pnpm check:package",
    "use-react": "node scripts/use-react.ts",
    "changeset": "changeset"
  },
  "devDependencies": {
    "@arethetypeswrong/cli": "^0.18.5",
    "@changesets/cli": "^3.0.3",
    "@eslint/js": "^10.0.1",
    "@tailwindcss/cli": "^4.3.3",
    "@testing-library/dom": "^10.4.2",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.7",
    "@types/node": "^24.19.1",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "eslint": "^10.12.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "globals": "^17.13.0",
    "jsdom": "^29.1.1",
    "postcss": "^8.5.28",
    "postcss-selector-parser": "^7.1.6",
    "prettier": "^3.9.9",
    "publint": "^0.3.25",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tailwindcss": "^4.3.3",
    "tsdown": "^0.23.0",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.71.0",
    "vitest": "^5.0.3"
  },
  "pnpm": {
    "overrides": {
      "react": "19.3.0",
      "react-dom": "19.3.0",
      "@types/react": "19.3.0",
      "@types/react-dom": "19.3.0"
    }
  }
}
```

- [ ] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": []
  }
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
coverage/
.next/
*.tsbuildinfo
*.tgz
.DS_Store
.env*.local
```

- [ ] **Step 7: Create `.prettierrc.json` and `.prettierignore`**

`.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

`.prettierignore`:

```
dist
coverage
.next
pnpm-lock.yaml
.changeset/*.md
```

- [ ] **Step 8: Create `README.md`**

````markdown
# mbc-cqrs-serverless web packages (rebuild)

pnpm monorepo for `@mbc-cqrs-serverless/ui-web`, `@mbc-cqrs-serverless/client-web`, and `@mbc-cqrs-serverless/survey-web`.

## Requirements

- Node 24.13+ (`.node-version`), pnpm 10.29 (`packageManager`).

## Commands

```bash
pnpm install
pnpm verify          # format check → lint → typecheck → build → test → package checks
pnpm use-react 18    # switch the workspace to React 18 (reinstalls)
pnpm use-react 19    # switch back (the committed state)
```

Build-output tests read `packages/*/dist`, so run `pnpm build` before `pnpm test`.

Design: `docs/superpowers/specs/2026-10-04-survey-web-rebuild-design.md`.
````

- [ ] **Step 9: Install and check formatting**

Run: `$N pnpm install`
Expected: completes; `pnpm-lock.yaml` created; no errors (warnings about ignored build scripts are fine).

Run: `$N pnpm format` then `$N pnpm format:check`
Expected: `All matched files use Prettier code style!`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm workspace

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Vitest projects and the React version switch

**Files:**

- Create: `vitest.config.ts`, `scripts/vitest.config.ts`, `tsconfig.json`, `scripts/use-react.ts`, `scripts/use-react.test.ts`

**Interfaces:**

- Consumes: root `package.json` `pnpm.overrides` (Task 1).
- Produces: `REACT_VERSIONS`, `isReactMajor(value: string | undefined): value is ReactMajor`, `applyReactVersion(pkg: PackageJson, major: ReactMajor): PackageJson`; CLI `pnpm use-react <18|19>` (rewrites overrides, runs `pnpm install --no-frozen-lockfile`).

- [ ] **Step 1: Create root `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['scripts', 'packages/*'],
  },
})
```

- [ ] **Step 2: Create `scripts/vitest.config.ts`**

```ts
import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'scripts',
    environment: 'node',
    include: ['**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Create root `tsconfig.json`**

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"],
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true
  },
  "include": ["scripts/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Write the failing test `scripts/use-react.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { applyReactVersion, isReactMajor, REACT_VERSIONS } from './use-react.ts'

describe('applyReactVersion', () => {
  it('pins react, react-dom and their types to React 18', () => {
    const result = applyReactVersion({ name: 'root' }, '18')

    expect(result.pnpm?.overrides).toEqual(REACT_VERSIONS['18'])
  })

  it('keeps unrelated fields and overrides', () => {
    const result = applyReactVersion(
      { name: 'root', pnpm: { overrides: { foo: '1.0.0' } } },
      '19'
    )

    expect(result.name).toBe('root')
    expect(result.pnpm?.overrides).toEqual({
      foo: '1.0.0',
      ...REACT_VERSIONS['19'],
    })
  })

  it('returns to the committed state after switching 18 then 19', () => {
    const committed = applyReactVersion({ name: 'root' }, '19')

    expect(applyReactVersion(applyReactVersion(committed, '18'), '19')).toEqual(
      committed
    )
  })
})

describe('isReactMajor', () => {
  it('accepts only 18 and 19', () => {
    expect(isReactMajor('18')).toBe(true)
    expect(isReactMajor('19')).toBe(true)
    expect(isReactMajor('17')).toBe(false)
    expect(isReactMajor(undefined)).toBe(false)
  })
})
```

- [ ] **Step 5: Run it to verify it fails**

Run: `$N pnpm vitest run --project scripts`
Expected: FAIL — `Failed to load url ./use-react.ts` (module does not exist).

- [ ] **Step 6: Implement `scripts/use-react.ts`**

```ts
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const REACT_VERSIONS = {
  '18': {
    react: '18.3.1',
    'react-dom': '18.3.1',
    '@types/react': '18.3.31',
    '@types/react-dom': '18.3.7',
  },
  '19': {
    react: '19.3.0',
    'react-dom': '19.3.0',
    '@types/react': '19.3.0',
    '@types/react-dom': '19.3.0',
  },
} as const

export type ReactMajor = keyof typeof REACT_VERSIONS

export type PackageJson = {
  pnpm?: { overrides?: Record<string, string> }
  [key: string]: unknown
}

export function isReactMajor(value: string | undefined): value is ReactMajor {
  return value === '18' || value === '19'
}

export function applyReactVersion(
  pkg: PackageJson,
  major: ReactMajor
): PackageJson {
  return {
    ...pkg,
    pnpm: {
      ...pkg.pnpm,
      overrides: { ...pkg.pnpm?.overrides, ...REACT_VERSIONS[major] },
    },
  }
}

function main(): void {
  const major = process.argv[2]
  if (!isReactMajor(major)) {
    process.stderr.write('Usage: pnpm use-react <18|19>\n')
    process.exit(1)
  }

  const packageJsonPath = fileURLToPath(
    new URL('../package.json', import.meta.url)
  )
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(applyReactVersion(pkg, major), null, 2)}\n`
  )

  execFileSync('pnpm', ['install', '--no-frozen-lockfile'], {
    stdio: 'inherit',
  })
  process.stdout.write(`Workspace now uses React ${major}.\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `$N pnpm vitest run --project scripts`
Expected: PASS — 4 tests.

- [ ] **Step 8: Typecheck the root project**

Run: `$N pnpm tsc -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: add vitest projects and React version switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ESLint with library rules

**Files:**

- Create: `eslint.config.js`, `scripts/eslint-rules.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `pnpm lint`; rules that every later sub-plan relies on to keep `packages/*/src` free of host-framework code.

- [ ] **Step 1: Confirm the react-hooks flat config key**

Run: `$N node -e "import('eslint-plugin-react-hooks').then(m => console.log(Object.keys(m.default.configs.flat)))"`
Expected: output includes `recommended`. If it prints `recommended-latest` but not `recommended`, use `reactHooks.configs.flat['recommended-latest']` in Step 4.

- [ ] **Step 2: Write the failing test `scripts/eslint-rules.test.ts`**

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `$N pnpm vitest run --project scripts eslint-rules`
Expected: FAIL — ESLint reports `Could not find config file` (no `eslint.config.js` yet).

- [ ] **Step 4: Create `eslint.config.js`**

```js
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const REACT_19_ONLY = 'React 19-only API; the packages must support React 18.'

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/.next/**',
    '**/node_modules/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next',
              message: 'Library code must not depend on Next.js.',
            },
            { name: 'nuqs', message: 'URL state belongs to the host app.' },
            {
              name: 'sonner',
              message: 'Notifications belong to the host app.',
            },
            {
              name: 'react',
              importNames: ['use', 'useActionState', 'useOptimistic'],
              message: REACT_19_ONLY,
            },
            {
              name: 'react-dom',
              importNames: ['useFormStatus'],
              message: REACT_19_ONLY,
            },
          ],
          patterns: [
            {
              group: ['next/*'],
              message: 'Library code must not depend on Next.js.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Library code must not read process.env; take configuration as arguments.',
        },
        {
          selector:
            'MemberExpression[object.name=/^React(DOM)?$/][property.name=/^(use|useActionState|useOptimistic|useFormStatus)$/]',
          message: REACT_19_ONLY,
        },
      ],
    },
  },
  {
    files: [
      'scripts/**/*.ts',
      '**/*.config.{ts,js}',
      'packages/*/test/**/*.{ts,tsx}',
    ],
    languageOptions: { globals: globals.node },
  },
])
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `$N pnpm vitest run --project scripts eslint-rules`
Expected: PASS — 8 tests.

- [ ] **Step 6: Lint the repo**

Run: `$N pnpm lint`
Expected: exit 0, no problems.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add eslint with library rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `ui-web` package with `cn` and `Button`

**Files:**

- Create: `packages/ui-web/package.json`, `packages/ui-web/tsconfig.json`, `packages/ui-web/tsconfig.build.json`, `packages/ui-web/vitest.config.ts`, `packages/ui-web/test/setup.ts`, `packages/ui-web/src/index.ts`, `packages/ui-web/src/lib/cn.ts`, `packages/ui-web/src/lib/cn.test.ts`, `packages/ui-web/src/components/button.tsx`, `packages/ui-web/src/components/button.test.tsx`

**Interfaces:**

- Consumes: root tooling (Tasks 1–3).
- Produces (exported from `@mbc-cqrs-serverless/ui-web`):
  - `cn(...inputs: ClassValue[]): string` — clsx + tailwind-merge configured with `prefix: 'mbc'`.
  - `buttonVariants` (cva) with `variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'` and `size: 'default' | 'sm' | 'lg' | 'icon'`.
  - `Button` (`forwardRef<HTMLButtonElement, ButtonProps>`), `ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }`. Renders `data-mbc=""` and `data-slot="button"`; defaults `type="button"` when not `asChild`.

- [ ] **Step 1: Create `packages/ui-web/package.json`**

```json
{
  "name": "@mbc-cqrs-serverless/ui-web",
  "version": "0.0.0",
  "description": "Shared UI primitives, theme, and i18n for MBC CQRS Serverless web packages",
  "license": "MIT",
  "author": "Murakami Business Consulting, Inc.",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css",
    "./styles.layer.css": "./dist/styles.layer.css",
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown && node ../../scripts/build-css.ts",
    "typecheck": "tsc -p tsconfig.json",
    "check:package": "publint --strict && attw --pack . --profile esm-only --exclude-entrypoints ./styles.css ./styles.layer.css ./package.json"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.52.0",
    "radix-ui": "^1.6.7",
    "tailwind-merge": "^3.7.0"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/mbc-net/mbc-cqrs-serverless-web.git",
    "directory": "packages/ui-web"
  }
}
```

- [ ] **Step 2: Create `packages/ui-web/tsconfig.json` and `tsconfig.build.json`**

`tsconfig.json` (typecheck: sources + tests):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "test", "*.config.ts"]
}
```

`tsconfig.build.json` (declarations: sources only):

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

- [ ] **Step 3: Create `packages/ui-web/vitest.config.ts` and `test/setup.ts`**

`vitest.config.ts`:

```ts
import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'ui-web',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
})
```

`test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 4: Install the package's dependencies**

Run: `$N pnpm install`
Expected: completes; `packages/ui-web/node_modules` exists.

- [ ] **Step 5: Write the failing test `src/lib/cn.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('keeps the last of two conflicting mbc: utilities', () => {
    expect(cn('mbc:px-2 mbc:py-1', 'mbc:px-4')).toBe('mbc:py-1 mbc:px-4')
  })

  it('resolves conflicting theme colours', () => {
    expect(cn('mbc:bg-primary', 'mbc:bg-destructive')).toBe(
      'mbc:bg-destructive'
    )
  })

  it('keeps unprefixed host classes untouched', () => {
    expect(cn('mbc:px-2', 'host-card', 'px-8')).toBe('mbc:px-2 host-card px-8')
  })

  it('drops falsy values', () => {
    const hidden = false
    expect(cn('mbc:flex', hidden && 'mbc:hidden', undefined, null)).toBe(
      'mbc:flex'
    )
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `$N pnpm vitest run --project ui-web cn`
Expected: FAIL — cannot resolve `./cn`.

- [ ] **Step 7: Implement `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({ prefix: 'mbc' })

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `$N pnpm vitest run --project ui-web cn`
Expected: PASS — 4 tests.

- [ ] **Step 9: Write the failing test `src/components/button.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('renders a non-submitting button marked as a library root', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('data-mbc', '')
    expect(button).toHaveAttribute('data-slot', 'button')
  })

  it('keeps an explicit type', () => {
    render(<Button type="submit">Send</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('applies variant and size classes', () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>
    )
    const button = screen.getByRole('button')

    expect(button).toHaveClass('mbc:bg-destructive', 'mbc:h-8')
  })

  it('lets className override conflicting variant classes', () => {
    render(<Button className="mbc:px-8 host-extra">Wide</Button>)
    const button = screen.getByRole('button')

    expect(button).toHaveClass('mbc:px-8', 'host-extra')
    expect(button).not.toHaveClass('mbc:px-4')
  })

  it('forwards its ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref</Button>)

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders its child instead of a button when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/surveys">Surveys</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Surveys' })

    expect(link).toHaveClass('mbc:bg-primary')
    expect(link).toHaveAttribute('data-mbc', '')
    expect(link).not.toHaveAttribute('type')
  })

  it('is disabled and shows a spinner while loading', () => {
    render(<Button loading>Saving</Button>)
    const button = screen.getByRole('button')

    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).not.toBeNull()
  })

  it('stays disabled when disabled is passed explicitly', () => {
    render(<Button disabled>Off</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

- [ ] **Step 10: Run it to verify it fails**

Run: `$N pnpm vitest run --project ui-web button`
Expected: FAIL — cannot resolve `./button`.

- [ ] **Step 11: Implement `src/components/button.tsx`**

Classes are v0's button (`mbc-cqrs-serverless-web/packages/survey/src/ui/button.tsx`) with the `mbc:` prefix; the outline variant's hard-coded `#417E96` / `#369CA3` become the `brand` / `brand-accent` theme colours (Task 7).

```tsx
'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { Slot } from 'radix-ui'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '../lib/cn'

export const buttonVariants = cva(
  "mbc:inline-flex mbc:shrink-0 mbc:cursor-pointer mbc:items-center mbc:justify-center mbc:gap-2 mbc:whitespace-nowrap mbc:rounded-md mbc:text-sm mbc:font-medium mbc:outline-none mbc:transition-all mbc:focus-visible:ring-[3px] mbc:focus-visible:ring-ring/50 mbc:disabled:pointer-events-none mbc:disabled:opacity-50 mbc:aria-invalid:border-destructive mbc:aria-invalid:ring-destructive/20 mbc:dark:aria-invalid:ring-destructive/40 mbc:[&_svg:not([class*='size-'])]:size-4 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'mbc:bg-primary mbc:text-primary-foreground mbc:shadow-xs mbc:hover:bg-primary/90',
        destructive:
          'mbc:bg-destructive mbc:text-white mbc:shadow-xs mbc:hover:bg-destructive/90 mbc:focus-visible:ring-destructive/20 mbc:dark:bg-destructive/60 mbc:dark:focus-visible:ring-destructive/40',
        outline:
          'mbc:border mbc:border-brand mbc:bg-background mbc:text-brand mbc:shadow-xs mbc:hover:bg-background/90 mbc:hover:text-brand-accent/90',
        secondary:
          'mbc:bg-secondary mbc:text-secondary-foreground mbc:shadow-xs mbc:hover:bg-secondary/80',
        ghost:
          'mbc:hover:bg-accent mbc:hover:text-accent-foreground mbc:dark:hover:bg-accent/50',
        link: 'mbc:text-primary mbc:underline-offset-4 mbc:hover:underline',
      },
      size: {
        default: 'mbc:h-9 mbc:px-4 mbc:py-2 mbc:has-[>svg]:px-3',
        sm: 'mbc:h-8 mbc:gap-1.5 mbc:rounded-md mbc:px-3 mbc:has-[>svg]:px-2.5',
        lg: 'mbc:h-10 mbc:rounded-md mbc:px-6 mbc:text-base mbc:has-[>svg]:px-4',
        icon: 'mbc:size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      type,
      children,
      ...props
    },
    ref
  ) {
    const classes = cn(buttonVariants({ variant, size }), className)

    if (asChild) {
      return (
        <Slot.Root
          ref={ref}
          data-mbc=""
          data-slot="button"
          className={classes}
          {...props}
        >
          {children}
        </Slot.Root>
      )
    }

    return (
      <button
        ref={ref}
        data-mbc=""
        data-slot="button"
        type={type ?? 'button'}
        className={classes}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <LoaderCircle className="mbc:animate-spin" aria-hidden />}
        {children}
      </button>
    )
  }
)
```

- [ ] **Step 12: Create `src/index.ts`**

```ts
export { cn } from './lib/cn'
export { Button, buttonVariants, type ButtonProps } from './components/button'
```

- [ ] **Step 13: Run the tests to verify they pass**

Run: `$N pnpm vitest run --project ui-web`
Expected: PASS — 12 tests (4 `cn`, 8 `Button`).

- [ ] **Step 14: Typecheck and lint**

Run: `$N pnpm --filter @mbc-cqrs-serverless/ui-web typecheck && $N pnpm lint`
Expected: both exit 0.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat(ui-web): add package skeleton with cn and Button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Unbundled ESM build with `"use client"` preserved

**Files:**

- Create: `scripts/build-output.ts`, `scripts/build-output.test.ts`, `scripts/tsdown-preset.ts`, `packages/ui-web/tsdown.config.ts`, `packages/ui-web/test/build/js-output.test.ts`
- Modify: `packages/ui-web/tsconfig.json` (allow `.ts` import extensions)

**Interfaces:**

- Consumes: `packages/ui-web/src/**` (Task 4).
- Produces:
  - `scripts/build-output.ts`: `hasUseClientDirective(code: string): boolean`, `distDir(packageDir: string): string` (throws `… Run "pnpm build" …` when missing), `listFiles(dir: string, extension: string): string[]` (relative POSIX paths, sorted), `readText(dir: string, file: string): string`, `FORBIDDEN_JS_PATTERNS: readonly RegExp[]`.
  - `scripts/tsdown-preset.ts`: `preserveUseClient()` (tsdown/rolldown plugin), `libraryConfig(overrides?: UserConfig): UserConfig` — every package's `tsdown.config.ts` is `export default libraryConfig()`.

- [ ] **Step 1: Write the failing test `scripts/build-output.test.ts`**

```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  hasUseClientDirective,
  listFiles,
  readText,
} from './build-output.ts'

function makePackage(): string {
  return mkdtempSync(join(tmpdir(), 'mbc-build-output-'))
}

describe('hasUseClientDirective', () => {
  it('detects double- and single-quoted directives', () => {
    expect(hasUseClientDirective('"use client";\nexport {}')).toBe(true)
    expect(hasUseClientDirective("'use client'\nexport {}")).toBe(true)
  })

  it('detects a directive after comments and blank lines', () => {
    const code = "// Button\n/* licence */\n\n'use client'\nexport {}"
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('ignores the phrase when it is not the first statement', () => {
    expect(hasUseClientDirective("import x from 'y'\n'use client'")).toBe(false)
    expect(hasUseClientDirective("const s = 'use client'")).toBe(false)
  })
})

describe('distDir', () => {
  it('tells the developer to build first when dist is missing', () => {
    expect(() => distDir(makePackage())).toThrow(/Run "pnpm build"/)
  })

  it('returns the dist path when it exists', () => {
    const pkg = makePackage()
    mkdirSync(join(pkg, 'dist'))
    expect(distDir(pkg)).toBe(join(pkg, 'dist'))
  })
})

describe('listFiles / readText', () => {
  it('lists nested files by extension as sorted POSIX paths', () => {
    const dist = join(makePackage(), 'dist')
    mkdirSync(join(dist, 'components'), { recursive: true })
    writeFileSync(join(dist, 'index.js'), 'export {}')
    writeFileSync(join(dist, 'components', 'button.js'), '"use client";')
    writeFileSync(join(dist, 'index.d.ts'), 'export {}')

    expect(listFiles(dist, '.js')).toEqual(['components/button.js', 'index.js'])
    expect(readText(dist, 'components/button.js')).toBe('"use client";')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project scripts build-output`
Expected: FAIL — cannot load `./build-output.ts`.

- [ ] **Step 3: Implement `scripts/build-output.ts`**

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

const LEADING_USE_CLIENT =
  /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*(['"])use client\1/

export function hasUseClientDirective(code: string): boolean {
  return LEADING_USE_CLIENT.test(code)
}

export function distDir(packageDir: string): string {
  const dir = join(packageDir, 'dist')
  if (!existsSync(dir)) {
    throw new Error(
      `${dir} does not exist. Run "pnpm build" before the build-output tests.`
    )
  }
  return dir
}

export function listFiles(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith(extension))
    .map((file) => file.split(sep).join('/'))
    .sort()
}

export function readText(dir: string, file: string): string {
  return readFileSync(join(dir, file), 'utf8')
}

/** Host-framework references that must never appear in published JavaScript. */
export const FORBIDDEN_JS_PATTERNS: readonly RegExp[] = [
  /\bprocess\.env\b/,
  /from\s*["']next(?:\/[^"']*)?["']/,
  /from\s*["'](?:nuqs|sonner)["']/,
]
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project scripts build-output`
Expected: PASS — 6 tests.

- [ ] **Step 5: Implement `scripts/tsdown-preset.ts`**

```ts
import type { UserConfig } from 'tsdown'

import { hasUseClientDirective } from './build-output.ts'

/**
 * Rolldown may drop module-level directives. In unbundled output each source
 * module is its own chunk, so re-add "use client" to chunks whose source had it.
 */
export function preserveUseClient() {
  const clientModules = new Set<string>()

  return {
    name: 'mbc:preserve-use-client',
    transform: {
      order: 'pre' as const,
      handler(code: string, id: string) {
        if (hasUseClientDirective(code)) clientModules.add(id)
        return null
      },
    },
    renderChunk(code: string, chunk: { facadeModuleId: string | null }) {
      if (
        chunk.facadeModuleId &&
        clientModules.has(chunk.facadeModuleId) &&
        !hasUseClientDirective(code)
      ) {
        return { code: `"use client";\n${code}`, map: null }
      }
      return null
    },
  }
}

export function libraryConfig(overrides: UserConfig = {}): UserConfig {
  const config: UserConfig = {
    entry: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
    unbundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    tsconfig: 'tsconfig.build.json',
    dts: true,
    fixedExtension: false,
    sourcemap: true,
    clean: true,
    deps: {
      neverBundle: [/^react($|\/)/, /^react-dom($|\/)/],
    },
    plugins: [preserveUseClient()],
  }
  return { ...config, ...overrides }
}
```

- [ ] **Step 6: Create `packages/ui-web/tsdown.config.ts` and allow `.ts` imports**

`packages/ui-web/tsdown.config.ts`:

```ts
import { libraryConfig } from '../../scripts/tsdown-preset.ts'

export default libraryConfig()
```

Replace `packages/ui-web/tsconfig.json` with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"],
    "allowImportingTsExtensions": true
  },
  "include": ["src", "test", "*.config.ts"]
}
```

- [ ] **Step 7: Build the JavaScript (CSS comes in Task 7)**

Run: `$N pnpm --filter @mbc-cqrs-serverless/ui-web exec tsdown`
Expected: exit 0. `ls -R packages/ui-web/dist` shows `index.js`, `index.d.ts`, `lib/cn.js`, `lib/cn.d.ts`, `components/button.js`, `components/button.d.ts`. If tsdown reports an unknown option (`deps`, `fixedExtension`, `unbundle`), check `$N pnpm --filter @mbc-cqrs-serverless/ui-web exec tsdown --help` for the 0.23 name and update `scripts/tsdown-preset.ts`.

- [ ] **Step 8: Write the build-output test `packages/ui-web/test/build/js-output.test.ts`**

```ts
// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  FORBIDDEN_JS_PATTERNS,
  hasUseClientDirective,
  listFiles,
  readText,
} from '../../../../scripts/build-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))

describe('ui-web JavaScript output', () => {
  it('emits one ESM module and one declaration file per source module', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'lib/cn.js', 'components/button.js'])
    )
    expect(listFiles(dist, '.d.ts')).toEqual(
      expect.arrayContaining([
        'index.d.ts',
        'lib/cn.d.ts',
        'components/button.d.ts',
      ])
    )
  })

  it('keeps "use client" on client modules only', () => {
    expect(hasUseClientDirective(readText(dist, 'components/button.js'))).toBe(
      true
    )
    expect(hasUseClientDirective(readText(dist, 'lib/cn.js'))).toBe(false)
    expect(hasUseClientDirective(readText(dist, 'index.js'))).toBe(false)
  })

  it('uses the automatic JSX runtime and never bundles React', () => {
    const button = readText(dist, 'components/button.js')

    expect(button).toMatch(/from\s*["']react\/jsx-runtime["']/)
    expect(button).not.toMatch(/React\.createElement/)
  })

  it('contains no host-framework references', () => {
    for (const file of listFiles(dist, '.js')) {
      const code = readText(dist, file)
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(code, `${file} matches ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
```

- [ ] **Step 9: Run it to verify it passes**

Run: `$N pnpm vitest run --project ui-web js-output`
Expected: PASS — 4 tests. If "keeps use client" fails, open `dist/components/button.js`: if the directive is missing, log `id` in the plugin's `transform` and `chunk.facadeModuleId` in `renderChunk` to find why they differ (e.g. a query suffix), and normalise both the same way. Fix the plugin, not the test.

- [ ] **Step 10: Typecheck**

Run: `$N pnpm typecheck`
Expected: exit 0 (root project and `ui-web`).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "build: add unbundled tsdown preset that preserves use client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: CSS assertion helpers

**Files:**

- Create: `scripts/css-output.ts`, `scripts/css-output.test.ts`

**Interfaces:**

- Consumes: `postcss`, `postcss-selector-parser`.
- Produces:
  - `parseCss(css: string): Root`
  - `layerNames(root: Root): string[]` — params of every `@layer` at-rule that has a block, in document order.
  - `unprefixedClasses(root: Root, allowed?: readonly string[]): string[]` — unescaped class names in rule selectors that don't start with `mbc:` (default allowed: `['dark']`), skipping `@keyframes`.
  - `elementOnlyRules(root: Root): string[]` — selectors of rules (outside `@keyframes` and `@layer properties`) where some selector in the list has no `mbc:` class and doesn't start with `:where(`, `:root`, or `:host`.
  - `topLevelOutsideLayer(root: Root, layerPrefix: string): string[]` — descriptions of top-level nodes that aren't a `@layer` statement, a `@layer <layerPrefix>…` / `@layer properties` block, or an `@property` rule.

- [ ] **Step 1: Write the failing test `scripts/css-output.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import {
  elementOnlyRules,
  layerNames,
  parseCss,
  topLevelOutsideLayer,
  unprefixedClasses,
} from './css-output.ts'

describe('layerNames', () => {
  it('lists block layers but not layer-order statements', () => {
    const root = parseCss(
      '@layer a, b;\n@layer properties { * { --x: 0 } }\n@layer mbc.base { .mbc\\:p-1 { padding: 1px } }'
    )
    expect(layerNames(root)).toEqual(['properties', 'mbc.base'])
  })
})

describe('unprefixedClasses', () => {
  it('finds classes without the mbc: prefix', () => {
    const root = parseCss(
      '.mbc\\:flex { display: flex }\n.host { color: red }\n.mbc\\:dark\\:bg-x:where(.dark, .dark *) { color: blue }'
    )
    expect(unprefixedClasses(root)).toEqual(['host'])
  })

  it('ignores keyframe selectors', () => {
    const root = parseCss(
      '@keyframes spin { from { opacity: 0 } to { opacity: 1 } }'
    )
    expect(unprefixedClasses(root)).toEqual([])
  })
})

describe('elementOnlyRules', () => {
  it('flags rules that style elements without an mbc: class', () => {
    const root = parseCss(
      'button { color: red }\n.mbc\\:p-1 { padding: 1px }\n:where([data-mbc]) * { margin: 0 }\n:root, :host { --mbc-x: 1 }'
    )
    expect(elementOnlyRules(root)).toEqual(['button'])
  })

  it('flags a selector list if any member is element-only', () => {
    const root = parseCss('.mbc\\:p-1, input { padding: 1px }')
    expect(elementOnlyRules(root)).toEqual(['.mbc\\:p-1, input'])
  })

  it('ignores @layer properties and keyframes', () => {
    const root = parseCss(
      '@layer properties { *, ::before { --mbc-tw-x: 0 } }\n@keyframes k { from { opacity: 0 } }'
    )
    expect(elementOnlyRules(root)).toEqual([])
  })
})

describe('topLevelOutsideLayer', () => {
  it('accepts layer statements, mbc layers, properties layer and @property', () => {
    const root = parseCss(
      '@layer theme, base, mbc, components, utilities;\n@layer mbc.theme { :root { --mbc-a: 1 } }\n@layer properties { * { --x: 0 } }\n@property --mbc-tw-y { syntax: "*"; inherits: false }'
    )
    expect(topLevelOutsideLayer(root, 'mbc')).toEqual([])
  })

  it('reports unlayered rules and foreign layers', () => {
    const root = parseCss(
      '.mbc\\:p-1 { padding: 1px }\n@layer utilities { .x { color: red } }'
    )
    expect(topLevelOutsideLayer(root, 'mbc')).toEqual([
      'rule .mbc\\:p-1',
      '@layer utilities',
    ])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project scripts css-output`
Expected: FAIL — cannot load `./css-output.ts`.

- [ ] **Step 3: Implement `scripts/css-output.ts`**

```ts
import postcss, { type AtRule, type Node, type Root, type Rule } from 'postcss'
import selectorParser from 'postcss-selector-parser'

export function parseCss(css: string): Root {
  return postcss.parse(css)
}

function isInside(node: Node, test: (parent: AtRule) => boolean): boolean {
  let parent = node.parent
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule' && test(parent as AtRule)) return true
    parent = parent.parent
  }
  return false
}

const inKeyframes = (node: Node) =>
  isInside(node, (atRule) => /keyframes$/i.test(atRule.name))

const inPropertiesLayer = (node: Node) =>
  isInside(
    node,
    (atRule) => atRule.name === 'layer' && atRule.params.trim() === 'properties'
  )

function classesOf(selector: string): string[] {
  const classes: string[] = []
  selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      classes.push(node.value)
    })
  }).processSync(selector)
  return classes
}

export function layerNames(root: Root): string[] {
  const names: string[] = []
  root.walkAtRules('layer', (atRule) => {
    if (atRule.nodes) names.push(atRule.params.trim())
  })
  return names
}

export function unprefixedClasses(
  root: Root,
  allowed: readonly string[] = ['dark']
): string[] {
  const found = new Set<string>()
  root.walkRules((rule: Rule) => {
    if (inKeyframes(rule)) return
    for (const name of classesOf(rule.selector)) {
      if (!name.startsWith('mbc:') && !allowed.includes(name)) found.add(name)
    }
  })
  return [...found]
}

const SCOPED_PREFIXES = [':where(', ':root', ':host']

function isScoped(selector: string): boolean {
  const trimmed = selector.trim()
  if (SCOPED_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return true
  return classesOf(trimmed).some((name) => name.startsWith('mbc:'))
}

export function elementOnlyRules(root: Root): string[] {
  const offenders: string[] = []
  root.walkRules((rule: Rule) => {
    if (inKeyframes(rule) || inPropertiesLayer(rule)) return
    if (!rule.selectors.every(isScoped)) offenders.push(rule.selector)
  })
  return offenders
}

export function topLevelOutsideLayer(
  root: Root,
  layerPrefix: string
): string[] {
  const offenders: string[] = []
  for (const node of root.nodes) {
    if (node.type === 'comment') continue
    if (node.type === 'atrule') {
      const params = node.params.trim()
      if (node.name === 'property') continue
      if (node.name === 'layer' && !node.nodes) continue
      if (
        node.name === 'layer' &&
        (params === 'properties' ||
          params === layerPrefix ||
          params.startsWith(`${layerPrefix}.`))
      ) {
        continue
      }
      offenders.push(`@${node.name} ${params}`.trim())
      continue
    }
    offenders.push(node.type === 'rule' ? `rule ${node.selector}` : node.type)
  }
  return offenders
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project scripts css-output`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add css output assertion helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Tailwind CSS pipeline, tokens, and scoped base

**Files:**

- Create: `scripts/build-css.ts`, `scripts/build-css.test.ts`, `packages/ui-web/src/styles/tokens.css`, `packages/ui-web/src/styles/base.css`, `packages/ui-web/src/styles/theme.css`, `packages/ui-web/src/styles/index.css`, `packages/ui-web/test/build/css-output.test.ts`

**Interfaces:**

- Consumes: Task 6 helpers (`parseCss`, `layerNames`, `unprefixedClasses`, `elementOnlyRules`, `topLevelOutsideLayer`); `Button` classes (Task 4).
- Produces:
  - `unwrapLayers(css: string, layerPrefix: string): string` — removes every `@layer` statement and replaces every `@layer <layerPrefix>` / `@layer <layerPrefix>.*` block with its contents; other blocks (e.g. `@layer properties`) stay.
  - `node ../../scripts/build-css.ts` (run from a package dir): Tailwind compiles `src/styles/index.css` → `dist/styles.layer.css`; `unwrapLayers` derives `dist/styles.css`. One source, identical rules in both files.
  - Tokens (`--mbc-*`, v0 values, light + dark) and Tailwind theme mapping: colours `background, foreground, card(-foreground), popover(-foreground), primary(-foreground), secondary(-foreground), muted(-foreground), accent(-foreground), destructive(-foreground), border, input, ring, brand, brand-accent`; radii `sm, md, lg`; custom variant `dark`.
  - Later packages' `src/styles/index.css` import `ui-web`'s `theme.css`, `tokens.css`, `base.css` and add `@source` lines (SP4).

- [ ] **Step 1: Write the failing test `scripts/build-css.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { unwrapLayers } from './build-css.ts'
import { layerNames, parseCss, unprefixedClasses } from './css-output.ts'

const LAYERED =
  '@layer theme,base,mbc,components,utilities;' +
  '@layer mbc.theme,mbc.base,mbc.utilities;' +
  '@layer mbc.theme{:root,:host{--mbc-spacing:.25rem}}' +
  '@layer properties{*,:before{--mbc-tw-x:0}}' +
  '@layer mbc.base{:where([data-mbc]){margin:0}}' +
  '@layer mbc.utilities{.mbc\\:p-1{padding:1px}}'

describe('unwrapLayers', () => {
  it('keeps only the properties layer', () => {
    const out = parseCss(unwrapLayers(LAYERED, 'mbc'))
    expect(layerNames(out)).toEqual(['properties'])
  })

  it('removes layer-order statements', () => {
    expect(unwrapLayers(LAYERED, 'mbc')).not.toMatch(/@layer[^{]*;/)
  })

  it('keeps every rule, in order', () => {
    const out = parseCss(unwrapLayers(LAYERED, 'mbc'))
    const selectors: string[] = []
    out.walkRules((rule) => {
      selectors.push(rule.selector)
    })
    expect(selectors).toEqual([
      ':root,:host',
      '*,:before',
      ':where([data-mbc])',
      '.mbc\\:p-1',
    ])
    expect(unprefixedClasses(out)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `$N pnpm vitest run --project scripts build-css`
Expected: FAIL — cannot load `./build-css.ts`.

- [ ] **Step 3: Implement `scripts/build-css.ts`**

```ts
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `$N pnpm vitest run --project scripts build-css`
Expected: PASS — 3 tests.

- [ ] **Step 5: Create `packages/ui-web/src/styles/tokens.css`**

Values are v0's (`mbc-cqrs-serverless-web/packages/master/src/styles/globals.css`), written as complete colours.

```css
:where(:root) {
  --mbc-background: hsl(0 0% 100%);
  --mbc-foreground: hsl(222.2 84% 4.9%);
  --mbc-card: hsl(0 0% 100%);
  --mbc-card-foreground: hsl(222.2 84% 4.9%);
  --mbc-popover: hsl(0 0% 100%);
  --mbc-popover-foreground: hsl(222.2 84% 4.9%);
  --mbc-primary: hsl(222.2 47.4% 11.2%);
  --mbc-primary-foreground: hsl(210 40% 98%);
  --mbc-secondary: hsl(210 40% 96.1%);
  --mbc-secondary-foreground: hsl(222.2 47.4% 11.2%);
  --mbc-muted: hsl(210 40% 96.1%);
  --mbc-muted-foreground: hsl(215.4 16.3% 46.9%);
  --mbc-accent: hsl(210 40% 96.1%);
  --mbc-accent-foreground: hsl(222.2 47.4% 11.2%);
  --mbc-destructive: hsl(0 84.2% 60.2%);
  --mbc-destructive-foreground: hsl(210 40% 98%);
  --mbc-border: hsl(214.3 31.8% 91.4%);
  --mbc-input: hsl(214.3 31.8% 91.4%);
  --mbc-ring: hsl(222.2 84% 4.9%);
  --mbc-brand: #417e96;
  --mbc-brand-accent: #369ca3;
  --mbc-radius: 0.5rem;
}

:where(.dark, [data-mbc-theme='dark']) {
  --mbc-background: hsl(222.2 84% 4.9%);
  --mbc-foreground: hsl(210 40% 98%);
  --mbc-card: hsl(222.2 84% 4.9%);
  --mbc-card-foreground: hsl(210 40% 98%);
  --mbc-popover: hsl(222.2 84% 4.9%);
  --mbc-popover-foreground: hsl(210 40% 98%);
  --mbc-primary: hsl(210 40% 98%);
  --mbc-primary-foreground: hsl(222.2 47.4% 11.2%);
  --mbc-secondary: hsl(217.2 32.6% 17.5%);
  --mbc-secondary-foreground: hsl(210 40% 98%);
  --mbc-muted: hsl(217.2 32.6% 17.5%);
  --mbc-muted-foreground: hsl(215 20.2% 65.1%);
  --mbc-accent: hsl(217.2 32.6% 17.5%);
  --mbc-accent-foreground: hsl(210 40% 98%);
  --mbc-destructive: hsl(0 62.8% 30.6%);
  --mbc-destructive-foreground: hsl(210 40% 98%);
  --mbc-border: hsl(217.2 32.6% 17.5%);
  --mbc-input: hsl(217.2 32.6% 17.5%);
  --mbc-ring: hsl(212.7 26.8% 83.9%);
}
```

- [ ] **Step 6: Create `packages/ui-web/src/styles/base.css`**

A zero-specificity subset of Tailwind's preflight, applied only inside library roots, so the library looks the same with or without a host reset.

```css
:where([data-mbc], [data-mbc] *),
:where([data-mbc], [data-mbc] *)::before,
:where([data-mbc], [data-mbc] *)::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid var(--mbc-border);
}

:where([data-mbc]) {
  font-family: inherit;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

:where(h1, h2, h3, h4, h5, h6):where([data-mbc], [data-mbc] *) {
  font-size: inherit;
  font-weight: inherit;
}

:where(ol, ul, menu):where([data-mbc], [data-mbc] *) {
  list-style: none;
}

:where(img, svg, video, canvas):where([data-mbc], [data-mbc] *) {
  display: block;
  vertical-align: middle;
}

:where(img, video):where([data-mbc], [data-mbc] *) {
  max-width: 100%;
  height: auto;
}

:where(a):where([data-mbc], [data-mbc] *) {
  color: inherit;
  text-decoration: inherit;
}

:where(button, input, select, optgroup, textarea):where(
  [data-mbc],
  [data-mbc] *
) {
  font: inherit;
  font-feature-settings: inherit;
  letter-spacing: inherit;
  color: inherit;
  background-color: transparent;
  border-radius: 0;
  opacity: 1;
}

:where(textarea):where([data-mbc], [data-mbc] *) {
  resize: vertical;
}

:where([data-mbc], [data-mbc] *)::placeholder {
  opacity: 1;
  color: color-mix(in oklab, currentcolor 50%, transparent);
}

:where([hidden]:not([hidden='until-found'])):where([data-mbc], [data-mbc] *) {
  display: none !important;
}
```

- [ ] **Step 7: Create `packages/ui-web/src/styles/theme.css`**

```css
@custom-variant dark (&:where(.dark, .dark *, [data-mbc-theme='dark'], [data-mbc-theme='dark'] *));

@theme inline {
  --color-background: var(--mbc-background);
  --color-foreground: var(--mbc-foreground);
  --color-card: var(--mbc-card);
  --color-card-foreground: var(--mbc-card-foreground);
  --color-popover: var(--mbc-popover);
  --color-popover-foreground: var(--mbc-popover-foreground);
  --color-primary: var(--mbc-primary);
  --color-primary-foreground: var(--mbc-primary-foreground);
  --color-secondary: var(--mbc-secondary);
  --color-secondary-foreground: var(--mbc-secondary-foreground);
  --color-muted: var(--mbc-muted);
  --color-muted-foreground: var(--mbc-muted-foreground);
  --color-accent: var(--mbc-accent);
  --color-accent-foreground: var(--mbc-accent-foreground);
  --color-destructive: var(--mbc-destructive);
  --color-destructive-foreground: var(--mbc-destructive-foreground);
  --color-border: var(--mbc-border);
  --color-input: var(--mbc-input);
  --color-ring: var(--mbc-ring);
  --color-brand: var(--mbc-brand);
  --color-brand-accent: var(--mbc-brand-accent);
  --radius-sm: calc(var(--mbc-radius) - 4px);
  --radius-md: calc(var(--mbc-radius) - 2px);
  --radius-lg: var(--mbc-radius);
}
```

- [ ] **Step 8: Create the single entry `packages/ui-web/src/styles/index.css`**

```css
@layer theme, base, mbc, components, utilities;
@layer mbc.theme, mbc.base, mbc.utilities;

@import 'tailwindcss/theme.css' layer(mbc.theme) prefix(mbc);
@import 'tailwindcss/utilities.css' layer(mbc.utilities) prefix(mbc)
  source(none);
@source '../';

@import './theme.css';
@import './tokens.css' layer(mbc.base);
@import './base.css' layer(mbc.base);
```

- [ ] **Step 9: Build `ui-web`**

Run: `$N pnpm --filter @mbc-cqrs-serverless/ui-web build`
Expected: tsdown output as in Task 5, then one Tailwind run; `packages/ui-web/dist/styles.layer.css` and `packages/ui-web/dist/styles.css` exist.

- [ ] **Step 10: Write the build-output test `packages/ui-web/test/build/css-output.test.ts`**

```ts
// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { distDir, readText } from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  layerNames,
  parseCss,
  topLevelOutsideLayer,
  unprefixedClasses,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))
const unlayeredCss = readText(dist, 'styles.css')
const layeredCss = readText(dist, 'styles.layer.css')
const unlayered = parseCss(unlayeredCss)
const layered = parseCss(layeredCss)

describe('styles.css (default, unlayered)', () => {
  it('has no cascade layers except Tailwind’s @property fallback layer', () => {
    expect(
      layerNames(unlayered).filter((name) => name !== 'properties')
    ).toEqual([])
  })

  it('prefixes every class with mbc:', () => {
    expect(unprefixedClasses(unlayered)).toEqual([])
  })

  it('never styles bare elements outside library scopes', () => {
    expect(elementOnlyRules(unlayered)).toEqual([])
  })

  it('compiles the classes used by components', () => {
    expect(unlayeredCss).toContain('.mbc\\:bg-primary')
    expect(unlayeredCss).toContain('.mbc\\:h-9')
    expect(unlayeredCss).toContain('.mbc\\:border-brand')
  })

  it('defines light and dark tokens', () => {
    expect(unlayeredCss).toContain('--mbc-primary:')
    expect(unlayeredCss).toContain('--mbc-brand:')
    expect(unlayeredCss).toMatch(/\[data-mbc-theme=['"]?dark['"]?\]/)
  })
})

describe('styles.layer.css (opt-in, layered)', () => {
  it('puts every rule inside the mbc layer', () => {
    expect(topLevelOutsideLayer(layered, 'mbc')).toEqual([])
  })

  it('declares mbc between the host preflight and host utilities', () => {
    expect(layeredCss).toMatch(
      /@layer\s*theme\s*,\s*base\s*,\s*mbc\s*,\s*components\s*,\s*utilities\s*;/
    )
  })

  it('prefixes every class with mbc:', () => {
    expect(unprefixedClasses(layered)).toEqual([])
  })
})
```

- [ ] **Step 11: Run it to verify it passes**

Run: `$N pnpm vitest run --project ui-web css-output`
Expected: PASS — 8 tests.

If `puts every rule inside the mbc layer` fails because Tailwind rejects dotted layer names in `layer(...)`, change all four `layer(mbc.…)` in `index.css` to `layer(mbc)` and delete the `@layer mbc.theme, mbc.base, mbc.utilities;` line (one `mbc` layer, source order theme → utilities → tokens/base; tokens and base use `:where`, so order cannot beat a utility). Rebuild (Step 9) and re-run. The tests stay unchanged.

- [ ] **Step 12: Run the whole suite**

Run: `$N pnpm test`
Expected: PASS — all `scripts` and `ui-web` tests.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(ui-web): add prefixed tailwind pipeline, tokens and scoped base

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Package checks, Changesets, CI

**Files:**

- Create: `.changeset/config.json` (generated), `.changeset/README.md` (generated), `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: `check:package` script in `packages/ui-web/package.json` (Task 4).
- Produces: `pnpm check:package` green; `pnpm changeset` usable; CI running `pnpm verify` on React 18 and 19.

- [ ] **Step 1: Run the package checks**

Run: `$N pnpm check:package`
Expected: publint prints `All good!`; attw prints a table with 🟢 for `node16 (from ESM)` and `bundler` on `@mbc-cqrs-serverless/ui-web`. If publint flags something, fix `packages/ui-web/package.json` (not the checker flags).

- [ ] **Step 2: Initialise Changesets**

Run: `$N pnpm changeset init`
Expected: `.changeset/config.json` and `.changeset/README.md` created.

Edit `.changeset/config.json`: set `"access": "public"` and `"baseBranch": "main"`; leave other generated fields as generated.

- [ ] **Step 3: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    name: verify (React ${{ matrix.react }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        react: ['18', '19']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - if: matrix.react == '18'
        run: pnpm use-react 18
      - run: pnpm verify
```

- [ ] **Step 4: Run the full verification on React 19**

Run: `$N pnpm verify`
Expected: every stage passes (format check, lint, typecheck, build, test, package checks).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ci: add changesets and verify workflow for React 18 and 19

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Gate on React 18 and 19, merge

**Files:**

- Modify: `docs/superpowers/plans/2026-10-04-00-orchestrator.md` (tick SP1)

- [ ] **Step 1: Verify on React 18**

Run: `$N pnpm use-react 18 && $N pnpm verify`
Expected: install switches to `react@18.3.1`; every stage passes. Typecheck failures here mean a React-19-only type was used — fix the source, not the override.

- [ ] **Step 2: Restore React 19 and confirm a clean tree**

Run: `$N pnpm use-react 19 && git status --porcelain`
Expected: no output from `git status --porcelain`.

- [ ] **Step 3: Request code review**

Use superpowers:requesting-code-review on the `sp1-foundation` branch against `main`; fix findings, re-run `$N pnpm verify`.

- [ ] **Step 4: Tick SP1 in the orchestrator and merge**

In `docs/superpowers/plans/2026-10-04-00-orchestrator.md` change `- [ ] **SP1 — Workspace foundation**` to `- [x] **SP1 — Workspace foundation**`.

```bash
git add docs/superpowers/plans/2026-10-04-00-orchestrator.md
git commit -m "docs: mark SP1 complete

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git switch main
git merge --ff-only sp1-foundation
```

Expected: `main` fast-forwards; `git log --oneline -1` shows the SP1 completion commit.
