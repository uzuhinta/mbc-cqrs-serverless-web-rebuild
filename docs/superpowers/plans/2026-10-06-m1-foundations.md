# M1 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give master-web what it needs from the shared packages (ui-web `Table`, `Accordion`, `Command`, `MultiSelect`, `useHydrated`; client-web `command({ expectedFinishes, onProgress })` and a public `useQuery`) and create the `@mbc-cqrs-serverless/master-web` package skeleton wired into lint, build, tests, the release group and the Next smoke app.

**Architecture:** New ui-web components follow the existing ones (forwardRef, `mbc:` classes translated from master v0's `components/ui`, `data-mbc` on roots, text from `ui` messages, v0 class-parity tests). The two survey-web internals master-web also needs move to the shared packages unchanged. master-web starts with only the entries that have content (`.` and `./core`) and one message namespace (`master`); later sub-plans add `/editors`, `/mbc` and the other namespaces with their content.

**Tech Stack:** pnpm workspace, TypeScript ~6.0, tsdown, Tailwind v4 (`mbc:` prefix), Vitest + jsdom + Testing Library + axe-core, `@radix-ui/react-accordion` ^1.2.21, `cmdk` ^1.1.1, Changesets.

**Spec:** `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` (§2, §3 entry table, §3.5); orchestrator `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md` (M1).

## Global Constraints

- React peer range: `"react": "^18.2.0 || ^19.0.0"`, `"react-dom": "^18.2.0 || ^19.0.0"`.
- ESM-only; `"type": "module"`.
- No `process.env`, `next`, `next/*`, `nuqs`, `sonner`, axios, `@apollo/client`, `aws-amplify`, `aws-appsync-*`, mobx, swr, `react-draggable`, `react-resizable`, `patch-package` in `packages/*/src`.
- `react-quill-new`, `@uiw/react-md-editor`, `jsoneditor`: only under `packages/master-web/src/editors/`, only via dynamic `import()`.
- `packages/master-web/src/core/` imports nothing but `zod` and its own files.
- No React-19-only APIs; use `forwardRef` and `Context.Provider`.
- No `console.*` in `packages/*/src`.
- `"use client"` only where needed; classes prefixed `mbc:`; roots and portal content render `data-mbc`.
- UI strings from typed messages (`ja` default, `en`).
- No consumer-specific names anywhere.
- `strict` + `noUncheckedIndexedAccess`; no `any`.
- Run every command as `fnm exec --using=v24.13.0 -- <command>` from `rebuild/`.
- Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`MultiSelect` with a selected value that is not in `options`** (an option removed upstream) → its chip shows the raw value and toggling other options keeps it. _Test: Task 5 "keeps values that are not in the options"._
2. **`MultiSelect` options with the same label but different values** → selecting one toggles only its value. _Test: Task 5 "toggles only the chosen value when labels repeat"._
3. **Finish messages for another request id, or arriving before the HTTP response** → they are ignored / buffered and still count once toward `expectedFinishes`. _Test: Task 6 "waits for expectedFinishes …"._
4. **`useQuery` key changes while a request is in flight** → the old request is aborted and its late result never appears. _Test: Task 7 "ignores a late result for a key that changed" and "aborts the previous request"._
5. **`useHydrated` in `renderToString` on React 18 and 19** → `false` on the server, `true` after mount. _Test: Task 2 (runs on both React versions in the gate)._

## Rulings carried into this plan

- **`Combobox` dropped:** no v0 master screen uses a single-choice combobox (only `multi-select-combobox`). Spec §2's table is updated in Task 9.
- **Entries appear with their content:** M1 ships `.` and `./core`; `/editors` (with `editors.css`) arrives in M6 and `/mbc` in M7, so no empty entry is ever published. Orchestrator M1 text is updated in Task 9.
- **Namespaces appear with their strings:** M1 registers `master` (field-type labels); `masterSetting` and `masterData` arrive in M3, `masterCopy` in M7.
- **Command family trimmed to what `MultiSelect` uses:** `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` (no `CommandDialog`, `CommandShortcut`, `CommandSeparator`).

---

### Task 1: Lint rules for master-web's forbidden and optional dependencies

**Files:**

- Modify: `eslint.config.js`
- Test: `scripts/eslint-rules.test.ts`

**Interfaces:**

- Produces: lint errors (`no-restricted-imports`) for the forbidden packages in `packages/*/src`; static imports of the three editor libraries are errors everywhere in `packages/*/src`; dynamic `import()` of them is an error (`no-restricted-syntax`) outside `packages/master-web/src/editors/`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('library rules in packages/*/src', …)` in `scripts/eslint-rules.test.ts`, before `it('accepts clean library code', …)`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run scripts/eslint-rules.test.ts`
Expected: FAIL — the first two new tests (no `no-restricted-imports` for axios; no `no-restricted-syntax` for `import('jsoneditor')`).

- [ ] **Step 3: Implement the rules**

In `eslint.config.js`, below `const REACT_19_ONLY = …`, add:

```js
const HOST_LIBRARY = 'The host app owns this; take what you need as arguments.'
const EDITOR_LIBRARIES = [
  'react-quill-new',
  '@uiw/react-md-editor',
  'jsoneditor',
]
const EDITORS_ONLY =
  'Load rich editors with import() inside packages/master-web/src/editors only.'

const LIBRARY_SYNTAX = [
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message:
      'Library code must not read process.env; take configuration as arguments.',
  },
  {
    selector:
      'MemberExpression[object.name=/^React(DOM)?$/][property.name=/^(use|useActionState|useOptimistic|useFormStatus)$/]',
    message: REACT_19_ONLY,
  },
]
```

In the `packages/*/src/**/*.{ts,tsx}` block, extend `no-restricted-imports` `paths` with:

```js
            ...['axios', '@apollo/client', 'aws-amplify', 'swr', 'mobx', 'mobx-react-lite', 'react-draggable', 'react-resizable', 'patch-package'].map(
              (name) => ({ name, message: HOST_LIBRARY })
            ),
            ...EDITOR_LIBRARIES.map((name) => ({ name, message: EDITORS_ONLY })),
```

extend its `patterns` with:

```js
            {
              group: ['aws-amplify/*', 'aws-appsync-*', '@apollo/client/*'],
              message: HOST_LIBRARY,
            },
            {
              group: EDITOR_LIBRARIES.map((name) => `${name}/*`),
              message: EDITORS_ONLY,
            },
```

and replace its `'no-restricted-syntax'` value with `['error', ...LIBRARY_SYNTAX]`.

Then add a new block after it (a later block's rule replaces an earlier one's, so it repeats `LIBRARY_SYNTAX`):

```js
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    ignores: ['packages/master-web/src/editors/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...LIBRARY_SYNTAX,
        {
          selector:
            'ImportExpression[source.value=/^(react-quill-new|@uiw\\/react-md-editor|jsoneditor)($|\\/)/]',
          message: EDITORS_ONLY,
        },
      ],
    },
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run scripts/eslint-rules.test.ts && fnm exec --using=v24.13.0 -- pnpm lint`
Expected: all eslint-rules tests PASS; `pnpm lint` exits 0.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js scripts/eslint-rules.test.ts
git commit -m "build: forbid v0 master-web's host libraries; confine rich editors to master-web/src/editors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Move `useHydrated` to ui-web

**Files:**

- Create: `packages/ui-web/src/lib/use-hydrated.ts`
- Test: `packages/ui-web/src/lib/use-hydrated.test.tsx`
- Modify: `packages/ui-web/src/index.ts`, `packages/ui-web/test/exports.test.ts`
- Modify: `packages/survey-web/src/question-types/date.tsx`, `packages/survey-web/src/templates/template-card.tsx`
- Delete: `packages/survey-web/src/lib/use-hydrated.ts`

**Interfaces:**

- Produces: `useHydrated(): boolean` exported from `@mbc-cqrs-serverless/ui-web` — `false` on the server and during hydration, `true` after mount.

- [ ] **Step 1: Write the failing test**

`packages/ui-web/src/lib/use-hydrated.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { useHydrated } from './use-hydrated'

function Probe() {
  return <span>{useHydrated() ? 'client' : 'server'}</span>
}

describe('useHydrated', () => {
  it('is false when rendered on the server', () => {
    expect(renderToString(<Probe />)).toContain('server')
  })

  it('is true once mounted in the browser', () => {
    render(<Probe />)
    expect(screen.getByText('client')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/src/lib/use-hydrated.test.tsx`
Expected: FAIL — cannot resolve `./use-hydrated`.

- [ ] **Step 3: Move the hook**

```bash
git mv packages/survey-web/src/lib/use-hydrated.ts packages/ui-web/src/lib/use-hydrated.ts
```

In `packages/ui-web/src/index.ts`, after `export { cn } from './lib/cn'`, add:

```ts
export { useHydrated } from './lib/use-hydrated'
```

In `packages/ui-web/test/exports.test.ts`, add `'useHydrated',` to `EXPECTED` after `'useFieldControl',`.

In `packages/survey-web/src/question-types/date.tsx` and `packages/survey-web/src/templates/template-card.tsx`, replace the `useHydrated` import from the old relative path with an import from `'@mbc-cqrs-serverless/ui-web'` (merge it into the existing `@mbc-cqrs-serverless/ui-web` import in each file).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web packages/survey-web`
Expected: PASS (including `exports.test.ts` and the survey-web date / template-card tests).

- [ ] **Step 5: Commit**

```bash
git add -A packages/ui-web packages/survey-web
git commit -m "refactor: move useHydrated from survey-web to ui-web

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ui-web `Table`

**Files:**

- Create: `packages/ui-web/src/components/table.tsx`
- Test: `packages/ui-web/src/components/table.test.tsx`
- Modify: `packages/ui-web/test/v0-classes.ts`, `packages/ui-web/src/index.ts`, `packages/ui-web/test/exports.test.ts`, `packages/ui-web/test/a11y.test.tsx`

**Interfaces:**

- Produces: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` — forwardRef wrappers of the native elements; `Table` renders `<div data-mbc data-slot="table-container"><table data-slot="table" …/></div>` and spreads its props onto `<table>`.

- [ ] **Step 1: Add the v0 class strings**

Append to the `V0` object in `packages/ui-web/test/v0-classes.ts`:

```ts
  // master v0 ui/table.tsx — `hsl(var(--x))` → token utilities; border colour
  // stated (`border-border`), as for the other primitives.
  'table.container': 'relative w-full overflow-auto',
  table: 'w-full caption-bottom text-sm',
  'table.header': '[&_tr]:border-b',
  'table.body': '[&_tr:last-child]:border-0',
  'table.footer':
    'border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0',
  'table.row':
    'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
  'table.head':
    'px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
  'table.cell': 'p-2.5 align-middle [&:has([role=checkbox])]:pr-0',
  'table.caption': 'mt-4 text-sm text-muted-foreground',
```

- [ ] **Step 2: Write the failing test**

`packages/ui-web/src/components/table.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

describe('Table', () => {
  it('keeps v0 classes on every part and marks the container', () => {
    render(
      <Table aria-label="People">
        <TableCaption>Caption</TableCaption>
        <TableHeader data-testid="thead">
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody data-testid="tbody">
          <TableRow data-testid="row" data-state="selected">
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter data-testid="tfoot">
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    const table = screen.getByRole('table', { name: 'People' })
    const container = table.parentElement as HTMLElement

    expectV0Classes(table, V0.table)
    expectV0Classes(container, V0['table.container'])
    expect(container).toHaveAttribute('data-mbc', '')
    expectV0Classes(screen.getByTestId('thead'), V0['table.header'])
    expectV0Classes(screen.getByTestId('tbody'), V0['table.body'])
    expectV0Classes(screen.getByTestId('tfoot'), V0['table.footer'])
    expectV0Classes(screen.getByTestId('row'), V0['table.row'])
    expectV0Classes(
      screen.getByRole('columnheader', { name: 'Name' }),
      V0['table.head']
    )
    expectV0Classes(
      screen.getByRole('cell', { name: 'Alice' }),
      V0['table.cell']
    )
    expectV0Classes(screen.getByText('Caption'), V0['table.caption'])
  })

  it('merges a caller className after v0 classes', () => {
    render(
      <Table>
        <TableBody>
          <TableRow className="mbc:h-12">
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByRole('row')).toHaveClass('mbc:h-12', 'mbc:border-b')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/src/components/table.test.tsx`
Expected: FAIL — cannot resolve `./table`.

- [ ] **Step 4: Implement**

`packages/ui-web/src/components/table.tsx`:

```tsx
import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'

import { cn } from '../lib/cn'

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(function Table({ className, ...props }, ref) {
  return (
    <div
      data-mbc=""
      data-slot="table-container"
      className="mbc:relative mbc:w-full mbc:overflow-auto"
    >
      <table
        ref={ref}
        data-slot="table"
        className={cn('mbc:w-full mbc:caption-bottom mbc:text-sm', className)}
        {...props}
      />
    </div>
  )
})

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return (
    <thead
      ref={ref}
      data-slot="table-header"
      className={cn('mbc:[&_tr]:border-b', className)}
      {...props}
    />
  )
})

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return (
    <tbody
      ref={ref}
      data-slot="table-body"
      className={cn('mbc:[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
})

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableFooter({ className, ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      data-slot="table-footer"
      className={cn(
        'mbc:border-t mbc:border-border mbc:bg-muted/50 mbc:font-medium mbc:[&>tr]:last:border-b-0',
        className
      )}
      {...props}
    />
  )
})

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(function TableRow({ className, ...props }, ref) {
  return (
    <tr
      ref={ref}
      data-slot="table-row"
      className={cn(
        'mbc:border-b mbc:border-border mbc:transition-colors mbc:hover:bg-muted/50 mbc:data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
})

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      data-slot="table-head"
      className={cn(
        'mbc:px-4 mbc:text-left mbc:align-middle mbc:font-medium mbc:text-muted-foreground mbc:[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
})

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(function TableCell({ className, ...props }, ref) {
  return (
    <td
      ref={ref}
      data-slot="table-cell"
      className={cn(
        'mbc:p-2.5 mbc:align-middle mbc:[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
})

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(function TableCaption({ className, ...props }, ref) {
  return (
    <caption
      ref={ref}
      data-slot="table-caption"
      className={cn(
        'mbc:mt-4 mbc:text-sm mbc:text-muted-foreground',
        className
      )}
      {...props}
    />
  )
})
```

In `packages/ui-web/src/index.ts`, after the `Tabs` export, add:

```ts
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/table'
```

Add `'Table', 'TableBody', 'TableCaption', 'TableCell', 'TableFooter', 'TableHead', 'TableHeader', 'TableRow',` to `EXPECTED` in `packages/ui-web/test/exports.test.ts`.

In `packages/ui-web/test/a11y.test.tsx`, import `Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow` from `'../src/index'` and add inside `<main>` of the primitives test:

```tsx
<Table>
  <TableCaption>Members</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Alice</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-web
git commit -m "feat(ui-web): add Table primitives with master v0's classes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ui-web `Accordion`

**Files:**

- Create: `packages/ui-web/src/components/accordion.tsx`
- Test: `packages/ui-web/src/components/accordion.test.tsx`
- Modify: `packages/ui-web/package.json` (dependency), `packages/ui-web/test/v0-classes.ts`, `packages/ui-web/src/index.ts`, `packages/ui-web/test/exports.test.ts`, `packages/ui-web/test/a11y.test.tsx`, `packages/ui-web/test/build/css-output.test.ts`

**Interfaces:**

- Produces: `Accordion` (Radix `Root`, `type="single" | "multiple"` props as Radix), `AccordionItem`, `AccordionTrigger` (renders the chevron), `AccordionContent` (`className` applies to the inner padding div, as v0).

- [ ] **Step 1: Add the dependency**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web add @radix-ui/react-accordion@^1.2.21`
Expected: `packages/ui-web/package.json` lists `"@radix-ui/react-accordion": "^1.2.21"`; `pnpm-lock.yaml` updated.

- [ ] **Step 2: Add the v0 class strings**

Append to `V0` in `packages/ui-web/test/v0-classes.ts`:

```ts
  // master v0 ui/accordion.tsx — border colour stated.
  'accordion.item': 'border-b border-border',
  'accordion.trigger':
    'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
  'accordion.content':
    'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all',
  'accordion.content-inner': 'pb-4 pt-0',
```

- [ ] **Step 3: Write the failing test**

`packages/ui-web/src/components/accordion.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion'

function Sections() {
  return (
    <Accordion type="multiple" defaultValue={['search']}>
      <AccordionItem value="search" data-testid="item">
        <AccordionTrigger>Search</AccordionTrigger>
        <AccordionContent className="mbc:flex">Filters</AccordionContent>
      </AccordionItem>
      <AccordionItem value="result">
        <AccordionTrigger>Result</AccordionTrigger>
        <AccordionContent>Rows</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

describe('Accordion', () => {
  it('keeps v0 classes and puts className on the inner div', () => {
    render(<Sections />)
    const trigger = screen.getByRole('button', { name: 'Search' })
    const inner = screen.getByText('Filters')

    expectV0Classes(screen.getByTestId('item'), V0['accordion.item'])
    expectV0Classes(trigger, V0['accordion.trigger'])
    expectV0Classes(inner.parentElement as HTMLElement, V0['accordion.content'])
    expect(inner).toHaveClass('mbc:pb-4', 'mbc:pt-0', 'mbc:flex')
    expect(trigger.closest('[data-mbc]')).not.toBeNull()
  })

  it('opens and closes sections from the keyboard', async () => {
    render(<Sections />)
    const search = screen.getByRole('button', { name: 'Search' })
    const result = screen.getByRole('button', { name: 'Result' })
    expect(search).toHaveAttribute('aria-expanded', 'true')
    expect(result).toHaveAttribute('aria-expanded', 'false')

    result.focus()
    await userEvent.keyboard('{Enter}')
    expect(result).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Rows')).toBeVisible()

    search.focus()
    await userEvent.keyboard(' ')
    expect(search).toHaveAttribute('aria-expanded', 'false')
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/src/components/accordion.test.tsx`
Expected: FAIL — cannot resolve `./accordion`.

- [ ] **Step 5: Implement**

`packages/ui-web/src/components/accordion.tsx`:

```tsx
'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'

export const Accordion = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Root>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(function Accordion(props, ref) {
  return (
    <AccordionPrimitive.Root
      ref={ref}
      data-mbc=""
      data-slot="accordion"
      {...props}
    />
  )
})

export const AccordionItem = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      data-slot="accordion-item"
      className={cn('mbc:border-b mbc:border-border', className)}
      {...props}
    />
  )
})

export const AccordionTrigger = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="mbc:flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        data-slot="accordion-trigger"
        className={cn(
          'mbc:flex mbc:flex-1 mbc:items-center mbc:justify-between mbc:py-4 mbc:font-medium mbc:transition-all mbc:hover:underline mbc:[&[data-state=open]>svg]:rotate-180',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden
          className="mbc:h-4 mbc:w-4 mbc:shrink-0 mbc:transition-transform mbc:duration-200"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
})

export const AccordionContent = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      data-slot="accordion-content"
      className="mbc:data-[state=closed]:animate-accordion-up mbc:data-[state=open]:animate-accordion-down mbc:overflow-hidden mbc:text-sm mbc:transition-all"
      {...props}
    >
      <div className={cn('mbc:pb-4 mbc:pt-0', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
})
```

In `packages/ui-web/src/index.ts`, after the `cn` / `useHydrated` exports and before `Alert`, add:

```ts
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/accordion'
```

Add `'Accordion', 'AccordionContent', 'AccordionItem', 'AccordionTrigger',` to `EXPECTED` in `packages/ui-web/test/exports.test.ts`.

In `packages/ui-web/test/a11y.test.tsx`, import the four Accordion parts and add inside `<main>`:

```tsx
<Accordion type="single" collapsible defaultValue="a">
  <AccordionItem value="a">
    <AccordionTrigger>Details</AccordionTrigger>
    <AccordionContent>Body</AccordionContent>
  </AccordionItem>
</Accordion>
```

In `packages/ui-web/test/build/css-output.test.ts`, add inside its top-level `describe`:

```ts
it('ships the accordion open/close animations', () => {
  expect(unlayered).toContain('animate-accordion-down')
  expect(unlayered).toContain('animate-accordion-up')
})
```

(`unlayered` is the test file's existing variable holding `dist/styles.css`.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web build && fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web`
Expected: PASS, including the radix-deps caret-range test and the new CSS test.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-web pnpm-lock.yaml
git commit -m "feat(ui-web): add Accordion with master v0's classes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: ui-web `Command` and `MultiSelect`

**Files:**

- Create: `packages/ui-web/src/components/command.tsx`, `packages/ui-web/src/components/multi-select.tsx`
- Test: `packages/ui-web/src/components/command.test.tsx`, `packages/ui-web/src/components/multi-select.test.tsx`
- Modify: `packages/ui-web/package.json`, `packages/ui-web/src/i18n/ui-messages.ts`, `packages/ui-web/test/v0-classes.ts`, `packages/ui-web/src/index.ts`, `packages/ui-web/test/exports.test.ts`, `packages/ui-web/test/a11y.test.tsx`

**Interfaces:**

- Produces:
  - `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` — cmdk wrappers.
  - `type MultiSelectOption = { value: string; label: string }`
  - `type MultiSelectProps = { options: readonly MultiSelectOption[]; value: readonly string[]; onValueChange(value: string[]): void; placeholder?: string; disabled?: boolean; className?: string; id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }`
  - `MultiSelect(props: MultiSelectProps)` — trigger `button[role=combobox]` (labelled by a surrounding `Field`), chips for selected values (raw value when not in `options`), popover with search, list, empty state; selecting an item toggles its value.
  - `UiMessages['multiSelect'] = { placeholder: string; search: string; empty: string; selected: string }`.

- [ ] **Step 1: Add the dependency and messages**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web add cmdk@^1.1.1`

In `packages/ui-web/src/i18n/ui-messages.ts`, add to the `UiMessages` type:

```ts
multiSelect: {
  placeholder: string
  search: string
  empty: string
  /** Read by screen readers after a selected option. */
  selected: string
}
```

to `ja`:

```ts
  multiSelect: {
    placeholder: '選択してください',
    search: '検索...',
    empty: 'データがありません',
    selected: '選択済み',
  },
```

and to `en`:

```ts
  multiSelect: {
    placeholder: 'Select options...',
    search: 'Search...',
    empty: 'No data',
    selected: 'selected',
  },
```

- [ ] **Step 2: Add the v0 class strings**

Append to `V0` in `packages/ui-web/test/v0-classes.ts`:

```ts
  // master v0 ui/command.tsx (parts MultiSelect uses) — border colour stated.
  command:
    'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
  'command.input-wrapper': 'flex items-center border-b border-border px-3',
  'command.input':
    'placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
  'command.list': 'max-h-[300px] overflow-y-auto overflow-x-hidden',
  'command.empty': 'py-6 text-center text-sm',
  'command.group':
    'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
  'command.item':
    'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
```

- [ ] **Step 3: Write the failing tests**

`packages/ui-web/src/components/command.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'

describe('Command', () => {
  it('keeps v0 classes and filters items as you type', async () => {
    const onSelect = vi.fn()
    render(
      <Command data-testid="command" label="Fruit">
        <CommandInput placeholder="Search" />
        <CommandList data-testid="list">
          <CommandEmpty>Nothing</CommandEmpty>
          <CommandGroup data-testid="group">
            <CommandItem onSelect={onSelect}>Apple</CommandItem>
            <CommandItem>Banana</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )
    const input = screen.getByPlaceholderText('Search')

    expectV0Classes(screen.getByTestId('command'), V0.command)
    expect(screen.getByTestId('command')).toHaveAttribute('data-mbc', '')
    expectV0Classes(input, V0['command.input'])
    expectV0Classes(
      input.parentElement as HTMLElement,
      V0['command.input-wrapper']
    )
    expectV0Classes(screen.getByTestId('list'), V0['command.list'])
    expectV0Classes(screen.getByTestId('group'), V0['command.group'])
    expectV0Classes(
      screen.getByRole('option', { name: 'Apple' }),
      V0['command.item']
    )

    await userEvent.type(input, 'ban')
    expect(screen.queryByRole('option', { name: 'Apple' })).toBeNull()
    await userEvent.clear(input)
    await userEvent.type(input, 'zzz')
    expectV0Classes(screen.getByText('Nothing'), V0['command.empty'])

    await userEvent.clear(input)
    await userEvent.type(input, 'app{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
```

`packages/ui-web/src/components/multi-select.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { Field, FieldLabel } from './field'
import { MultiSelect, type MultiSelectOption } from './multi-select'

const OPTIONS: MultiSelectOption[] = [
  { value: 't1', label: 'Tokyo' },
  { value: 't2', label: 'Osaka' },
  { value: 't3', label: 'Osaka' },
]

function Harness({ initial = [] as string[], locale = 'en' as const }) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <MbcProvider locale={locale}>
      <Field>
        <FieldLabel>Tenants</FieldLabel>
        <MultiSelect options={OPTIONS} value={value} onValueChange={setValue} />
      </Field>
      <output>{JSON.stringify(value)}</output>
    </MbcProvider>
  )
}

const stored = () =>
  JSON.parse(document.querySelector('output')?.textContent ?? '[]') as string[]

describe('MultiSelect', () => {
  it('is a labelled combobox with a translated placeholder', () => {
    render(<Harness locale="ja" />)
    const trigger = screen.getByRole('combobox', { name: 'Tenants' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('選択してください')
    expect(trigger).toHaveClass(
      'mbc:h-auto',
      'mbc:w-full',
      'mbc:justify-between'
    )
  })

  it('searches and toggles options from the keyboard', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox', { name: 'Tenants' })
    trigger.focus()
    await userEvent.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await userEvent.keyboard('tok{Enter}')
    expect(stored()).toEqual(['t1'])
    expect(within(trigger).getByText('Tokyo')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Tokyo selected' })
    ).toBeInTheDocument()

    await userEvent.keyboard('{Enter}')
    expect(stored()).toEqual([])

    await userEvent.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('toggles only the chosen value when labels repeat', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Tenants' }))
    const [, second] = screen.getAllByRole('option', { name: 'Osaka' })
    await userEvent.click(second!)
    expect(stored()).toEqual(['t3'])
  })

  it('keeps values that are not in the options', async () => {
    render(<Harness initial={['gone']} />)
    const trigger = screen.getByRole('combobox', { name: 'Tenants' })
    expect(within(trigger).getByText('gone')).toBeInTheDocument()
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('option', { name: 'Tokyo' }))
    expect(stored()).toEqual(['gone', 't1'])
  })

  it('shows the empty state when nothing matches', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Tenants' }))
    await userEvent.keyboard('zzz')
    expect(screen.getByText('No data')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/src/components/command.test.tsx packages/ui-web/src/components/multi-select.test.tsx`
Expected: FAIL — cannot resolve `./command` / `./multi-select`.

- [ ] **Step 5: Implement `Command`**

`packages/ui-web/src/components/command.tsx`:

```tsx
'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react'

import { cn } from '../lib/cn'

export const Command = forwardRef<
  ComponentRef<typeof CommandPrimitive>,
  ComponentPropsWithoutRef<typeof CommandPrimitive>
>(function Command({ className, ...props }, ref) {
  return (
    <CommandPrimitive
      ref={ref}
      data-mbc=""
      data-slot="command"
      className={cn(
        'mbc:bg-popover mbc:text-popover-foreground mbc:flex mbc:h-full mbc:w-full mbc:flex-col mbc:overflow-hidden mbc:rounded-md',
        className
      )}
      {...props}
    />
  )
})

export const CommandInput = forwardRef<
  ComponentRef<typeof CommandPrimitive.Input>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(function CommandInput({ className, ...props }, ref) {
  return (
    <div
      className="mbc:flex mbc:items-center mbc:border-b mbc:border-border mbc:px-3"
      cmdk-input-wrapper=""
    >
      <Search
        aria-hidden
        className="mbc:mr-2 mbc:h-4 mbc:w-4 mbc:shrink-0 mbc:opacity-50"
      />
      <CommandPrimitive.Input
        ref={ref}
        data-slot="command-input"
        className={cn(
          'mbc:placeholder:text-muted-foreground mbc:flex mbc:h-11 mbc:w-full mbc:rounded-md mbc:bg-transparent mbc:py-3 mbc:text-sm mbc:outline-none mbc:disabled:cursor-not-allowed mbc:disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
})

export const CommandList = forwardRef<
  ComponentRef<typeof CommandPrimitive.List>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(function CommandList({ className, ...props }, ref) {
  return (
    <CommandPrimitive.List
      ref={ref}
      data-slot="command-list"
      className={cn(
        'mbc:max-h-[300px] mbc:overflow-y-auto mbc:overflow-x-hidden',
        className
      )}
      {...props}
    />
  )
})

export const CommandEmpty = forwardRef<
  ComponentRef<typeof CommandPrimitive.Empty>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(function CommandEmpty({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Empty
      ref={ref}
      data-slot="command-empty"
      className={cn('mbc:py-6 mbc:text-center mbc:text-sm', className)}
      {...props}
    />
  )
})

export const CommandGroup = forwardRef<
  ComponentRef<typeof CommandPrimitive.Group>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(function CommandGroup({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Group
      ref={ref}
      data-slot="command-group"
      className={cn(
        'mbc:text-foreground mbc:[&_[cmdk-group-heading]]:text-muted-foreground mbc:overflow-hidden mbc:p-1 mbc:[&_[cmdk-group-heading]]:px-2 mbc:[&_[cmdk-group-heading]]:py-1.5 mbc:[&_[cmdk-group-heading]]:text-xs mbc:[&_[cmdk-group-heading]]:font-medium',
        className
      )}
      {...props}
    />
  )
})

export const CommandItem = forwardRef<
  ComponentRef<typeof CommandPrimitive.Item>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(function CommandItem({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      data-slot="command-item"
      className={cn(
        'mbc:data-[selected=true]:bg-accent mbc:data-[selected=true]:text-accent-foreground mbc:relative mbc:flex mbc:cursor-default mbc:select-none mbc:items-center mbc:gap-2 mbc:rounded-sm mbc:px-2 mbc:py-1.5 mbc:text-sm mbc:outline-none mbc:data-[disabled=true]:pointer-events-none mbc:data-[disabled=true]:opacity-50 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:size-4 mbc:[&_svg]:shrink-0',
        className
      )}
      {...props}
    />
  )
})
```

- [ ] **Step 6: Implement `MultiSelect`**

`packages/ui-web/src/components/multi-select.tsx`:

```tsx
'use client'

import { Check, ChevronsUpDown, Inbox } from 'lucide-react'
import { useState } from 'react'

import { useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'
import { Badge } from './badge'
import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'
import { useFieldControl } from './field'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type MultiSelectOption = { value: string; label: string }

export type MultiSelectProps = {
  options: readonly MultiSelectOption[]
  value: readonly string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** v0's multi-select combobox: chips in the trigger, search and a check list in a popover. */
export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  ...rest
}: MultiSelectProps) {
  const t = useMessages(uiMessages)
  const control = useFieldControl(rest)
  const [open, setOpen] = useState(false)
  // A value that is no longer an option keeps its chip (shown as the raw value).
  const labelOf = (item: string) =>
    options.find((option) => option.value === item)?.label ?? item
  const toggle = (item: string) =>
    onValueChange(
      value.includes(item)
        ? value.filter((entry) => entry !== item)
        : [...value, item]
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          {...control}
          className={cn('mbc:h-auto mbc:w-full mbc:justify-between', className)}
        >
          <span className="mbc:flex mbc:flex-wrap mbc:gap-1">
            {value.length > 0 ? (
              value.map((item) => (
                <Badge key={item} variant="secondary" className="mbc:mr-1">
                  {labelOf(item)}
                </Badge>
              ))
            ) : (
              <span className="mbc:text-muted-foreground mbc:font-normal">
                {placeholder ?? t.multiSelect.placeholder}
              </span>
            )}
          </span>
          <ChevronsUpDown
            aria-hidden
            className="mbc:h-4 mbc:w-4 mbc:shrink-0 mbc:opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="mbc:w-(--radix-popover-trigger-width) mbc:p-0">
        <Command>
          <CommandInput
            placeholder={t.multiSelect.search}
            aria-label={t.multiSelect.search}
          />
          <CommandList>
            <CommandEmpty>
              <div className="mbc:text-muted-foreground mbc:flex mbc:flex-col mbc:items-center mbc:justify-center mbc:gap-4">
                {/* v0 faded the whole block to 20%; only the icon stays faded so the text is readable. */}
                <Inbox
                  aria-hidden
                  className="mbc:h-16 mbc:w-16 mbc:opacity-20"
                />
                <p>{t.multiSelect.empty}</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = value.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    // cmdk matches on `value`; the option value keeps repeated labels apart.
                    value={`${option.label} ${option.value}`}
                    onSelect={() => toggle(option.value)}
                  >
                    <Check
                      aria-hidden
                      className={cn(
                        'mbc:mr-2 mbc:h-4 mbc:w-4',
                        selected ? 'mbc:opacity-100' : 'mbc:opacity-0'
                      )}
                    />
                    {option.label}
                    {selected && (
                      <span className="mbc:sr-only">
                        {` ${t.multiSelect.selected}`}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 7: Export and cover in the shared tests**

In `packages/ui-web/src/index.ts`, after the `Checkbox` export, add:

```ts
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './components/command'
```

and after the `Label` export:

```ts
export {
  MultiSelect,
  type MultiSelectOption,
  type MultiSelectProps,
} from './components/multi-select'
```

Add `'Command', 'CommandEmpty', 'CommandGroup', 'CommandInput', 'CommandItem', 'CommandList', 'MultiSelect',` to `EXPECTED` in `packages/ui-web/test/exports.test.ts`.

In `packages/ui-web/test/a11y.test.tsx`, import `MultiSelect` and add inside `<main>`:

```tsx
<Field>
  <FieldLabel>Tenants</FieldLabel>
  <MultiSelect
    options={[{ value: 'a', label: 'Alpha' }]}
    value={['a']}
    onValueChange={() => {}}
  />
</Field>
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web`
Expected: PASS (command, multi-select, exports, a11y, radix-deps).

- [ ] **Step 9: Commit**

```bash
git add packages/ui-web pnpm-lock.yaml
git commit -m "feat(ui-web): add Command and MultiSelect (v0 multi-select combobox)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: client-web `command({ expectedFinishes, onProgress })`

**Files:**

- Modify: `packages/client-web/src/command.ts`
- Test: `packages/client-web/src/command.test.ts`

**Interfaces:**

- Consumes: existing `createCommand(http, realtime)`, test helpers `setup`, `connected`, `status`, `flush` in `command.test.ts`.
- Produces: `CommandOptions.expectedFinishes?: number` (default 1; values below 1 count as 1; fractions round down) and `CommandOptions.onProgress?: (done: number, expected: number) => void`, called once per `finish:FINISHED` for the request id. Without realtime the command still resolves after the HTTP response and `onProgress` is never called.

- [ ] **Step 1: Write the failing tests**

Append to `describe('command', …)` in `packages/client-web/src/command.test.ts`:

```ts
it('waits for expectedFinishes finish messages and reports progress', async () => {
  const { command, responses } = setup()
  const progress: [number, number][] = []
  let settled = false
  const pending = command<{ requestId: string }>(
    { method: 'POST', path: '/api/master-bulk', body: { items: [] } },
    {
      expectedFinishes: 3,
      onProgress: (done, expected) => progress.push([done, expected]),
    }
  )
  void pending.then(() => {
    settled = true
  })
  const socket = await connected()

  status(socket, 'req-other', 'finish:FINISHED')
  status(socket, 'req-1', 'finish:FINISHED') // before the HTTP response: buffered
  responses[0]?.resolve({ requestId: 'req-1' })
  await flush()
  status(socket, 'req-1', 'finish:FINISHED')
  await flush()
  expect(settled).toBe(false)

  status(socket, 'req-1', 'finish:FINISHED')
  await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
  expect(progress).toEqual([
    [1, 3],
    [2, 3],
    [3, 3],
  ])
})

it('rejects on a FAILED status after some items finished', async () => {
  const { command, responses } = setup()
  const pending = command(
    { method: 'POST', path: '/api/master-bulk' },
    { expectedFinishes: 2 }
  )
  const socket = await connected()
  responses[0]?.resolve({ requestId: 'req-1' })
  await flush()
  status(socket, 'req-1', 'finish:FINISHED')
  status(socket, 'req-1', 'import:FAILED')
  await expect(pending).rejects.toBeInstanceOf(MbcCommandError)
})

it('counts expectedFinishes below 1 as 1', async () => {
  const { command, responses } = setup()
  const pending = command(
    { method: 'POST', path: '/api/x' },
    { expectedFinishes: 0 }
  )
  const socket = await connected()
  responses[0]?.resolve({ requestId: 'req-1' })
  await flush()
  status(socket, 'req-1', 'finish:FINISHED')
  await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
})

it('resolves after the HTTP response without realtime, with no progress', async () => {
  const { http, responses } = setup()
  const command = createCommand(http, undefined)
  const onProgress = vi.fn()
  const pending = command(
    { method: 'POST', path: '/api/master-bulk' },
    { expectedFinishes: 5, onProgress }
  )
  await flush()
  responses[0]?.resolve({ requestId: 'req-1' })
  await expect(pending).resolves.toMatchObject({ requestId: 'req-1' })
  expect(onProgress).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/client-web/src/command.test.ts`
Expected: FAIL — "waits for expectedFinishes …" resolves on the first finish (`progress` is `[]`, `settled` is `true`); TypeScript accepts the options only after Step 3 (vitest does not typecheck, so the failures are behavioural).

- [ ] **Step 3: Implement**

In `packages/client-web/src/command.ts`, extend `CommandOptions`:

```ts
export type CommandOptions = {
  timeoutMs?: number
  signal?: AbortSignal
  onPhase?: (phase: 'sending' | 'waiting') => void
  /**
   * How many `finish:FINISHED` messages complete the command; bulk commands
   * send one per item. Default 1; values below 1 count as 1.
   */
  expectedFinishes?: number
  /** Called on each `finish:FINISHED` with the number finished so far. */
  onProgress?: (done: number, expected: number) => void
}
```

Inside `command`, next to `const timeoutMs = …`, add:

```ts
const expected = Math.max(1, Math.floor(options.expectedFinishes ?? 1))
let finished = 0
```

and replace the body of `check` with:

```ts
const check = (message: MbcMessage) => {
  const { requestId, data } = sent
  if (requestId === undefined || message.id !== requestId) return
  const status = statusOf(message)
  if (status === FINISHED) {
    finished += 1
    options.onProgress?.(finished, expected)
    if (finished >= expected) resolve({ data: data as T, requestId })
  } else if (status?.endsWith(':FAILED'))
    reject(new MbcCommandError(requestId, status))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/client-web`
Expected: PASS (new and existing command tests).

- [ ] **Step 5: Commit**

```bash
git add packages/client-web/src/command.ts packages/client-web/src/command.test.ts
git commit -m "feat(client-web): let a command wait for several finish messages with progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Public `useQuery` in `client-web/react`

**Files:**

- Create: `packages/client-web/src/react/use-query.ts`
- Test: `packages/client-web/src/react/use-query.test.tsx`
- Modify: `packages/client-web/src/react/index.ts`, `packages/survey-web/src/mbc/hooks.ts`

**Interfaces:**

- Produces: `useQuery<T>(key: string, load: ((signal: AbortSignal) => Promise<T>) | null): QueryState<T>` and `type QueryState<T> = { data: T | undefined; loading: boolean; error: unknown; refetch(): void }` from `@mbc-cqrs-serverless/client-web/react`. `load === null` is idle. A key change or unmount aborts the running request; a late result for an old key is ignored.
- survey-web keeps exporting `type QueryState` from `/mbc` (now re-exported from client-web).

- [ ] **Step 1: Write the failing test**

`packages/client-web/src/react/use-query.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useQuery } from './use-query'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const strict = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
)

describe('useQuery', () => {
  it('loads by key and reloads on refetch', async () => {
    const load = vi.fn(async () => 'A')
    const { result } = renderHook(() => useQuery('a', load), {
      wrapper: strict,
    })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('A'))
    expect(result.current.loading).toBe(false)

    const calls = load.mock.calls.length
    act(() => result.current.refetch())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(load.mock.calls.length).toBeGreaterThan(calls)
  })

  it('ignores a late result for a key that changed', async () => {
    const pending = { a: deferred<string>(), b: deferred<string>() }
    const { result, rerender } = renderHook(
      ({ id }: { id: 'a' | 'b' }) => useQuery(id, () => pending[id].promise),
      { initialProps: { id: 'a' } }
    )
    rerender({ id: 'b' })
    await act(async () => pending.a.resolve('A'))
    expect(result.current.data).toBeUndefined()
    expect(result.current.loading).toBe(true)

    await act(async () => pending.b.resolve('B'))
    expect(result.current.data).toBe('B')
  })

  it('aborts the previous request', () => {
    const signals: AbortSignal[] = []
    const { rerender } = renderHook(
      ({ id }: { id: string }) =>
        useQuery(id, (signal) => {
          signals.push(signal)
          return new Promise<string>(() => {})
        }),
      { initialProps: { id: 'a' } }
    )
    rerender({ id: 'b' })
    expect(signals[0]?.aborted).toBe(true)
    expect(signals.at(-1)?.aborted).toBe(false)
  })

  it('is idle without a loader', () => {
    const { result } = renderHook(() => useQuery<string>('x', null))
    expect(result.current).toMatchObject({
      data: undefined,
      loading: false,
      error: undefined,
    })
  })

  it('reports a failed load', async () => {
    const { result } = renderHook(() =>
      useQuery('e', async () => {
        throw new Error('boom')
      })
    )
    await waitFor(() => expect(result.current.error).toEqual(new Error('boom')))
    expect(result.current.loading).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/client-web/src/react/use-query.test.tsx`
Expected: FAIL — cannot resolve `./use-query`.

- [ ] **Step 3: Move the hook**

Create `packages/client-web/src/react/use-query.ts`:

```ts
'use client'

import { useEffect, useRef, useState } from 'react'

export type QueryState<T> = {
  data: T | undefined
  loading: boolean
  error: unknown
  refetch(): void
}

type Settled<T> = { key: string; data?: T; error?: unknown }

/**
 * Fetch keyed by `key`; `load === null` means idle. Loading is derived (the
 * latest request has not settled), so no state is set synchronously in effects.
 */
export function useQuery<T>(
  key: string,
  load: ((signal: AbortSignal) => Promise<T>) | null
): QueryState<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  const active = load !== null
  const requestKey = `${nonce}\u0000${key}`

  useEffect(() => {
    const run = loadRef.current
    if (!run) return
    const controller = new AbortController()
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, error })
      }
    )
    return () => controller.abort()
  }, [requestKey, active])

  const current = active && settled?.key === requestKey ? settled : null
  return {
    data: current?.data,
    loading: active && current === null,
    error: current?.error,
    refetch: () => setNonce((n) => n + 1),
  }
}
```

In `packages/client-web/src/react/index.ts`, add:

```ts
export { useQuery, type QueryState } from './use-query'
```

In `packages/survey-web/src/mbc/hooks.ts`: delete the local `QueryState` type, the `Settled` type and the `useQuery` function (and the `useEffect`, `useRef`, `useState` imports if nothing else uses them); change the client-web import to

```ts
import {
  useCommand,
  useMbcClient,
  useQuery,
  type QueryState,
} from '@mbc-cqrs-serverless/client-web/react'
```

and add, below the imports,

```ts
export type { QueryState }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/client-web packages/survey-web/src/mbc && fnm exec --using=v24.13.0 -- pnpm typecheck`
Expected: PASS; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/client-web packages/survey-web
git commit -m "refactor: make useQuery a public client-web/react hook; survey-web uses it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: master-web package skeleton

**Files:**

- Create: `packages/master-web/package.json`, `tsconfig.json`, `tsconfig.build.json`, `tsdown.config.ts`, `vitest.config.ts`, `LICENSE` (copy of root), `CHANGELOG.md`
- Create: `packages/master-web/src/index.ts`, `src/core/index.ts`, `src/core/field-type-names.ts`, `src/i18n/master-messages.ts`, `src/styles/index.css`
- Create tests: `packages/master-web/test/setup.ts`, `test/exports.test.tsx`, `src/core/field-type-names.test.ts`, `test/build/output.test.ts`
- Modify: `scripts/build-output.ts` (shared `externalsOf`, wider `FORBIDDEN_JS_PATTERNS`), `packages/survey-web/test/build/output.test.ts` (use the shared `externalsOf`)

**Interfaces:**

- Consumes: `defineMessages`, `MbcProvider`, `useMessages`, `MbcProviderProps` from ui-web; `libraryConfig` from `scripts/tsdown-preset.ts`.
- Produces:
  - `MASTER_FIELD_TYPES` (readonly tuple of the ten v0 types, v0 order) and `type MasterFieldType` from `@mbc-cqrs-serverless/master-web/core` and the root.
  - `masterMessages` (`master` namespace) and `type MasterMessages = { fieldTypes: Record<MasterFieldType, string> }`.
  - Root re-exports `MbcProvider`, `useMessages`, `type MbcProviderProps`.
  - `externalsOf(dist: string, entry: string): Set<string>` in `scripts/build-output.ts`.

- [ ] **Step 1: Create the package files**

`packages/master-web/package.json`:

```json
{
  "name": "@mbc-cqrs-serverless/master-web",
  "version": "0.0.0",
  "description": "Master setting and master data screens for MBC CQRS Serverless web apps",
  "license": "MIT",
  "author": "Murakami Business Consulting, Inc.",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./core": {
      "types": "./dist/core/index.d.ts",
      "default": "./dist/core/index.js"
    },
    "./styles.css": "./dist/styles.css",
    "./styles.layer.css": "./dist/styles.layer.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "CHANGELOG.md"],
  "scripts": {
    "build": "tsdown && node ../../scripts/build-css.ts",
    "prepack": "pnpm run build",
    "typecheck": "tsc -p tsconfig.json",
    "check:package": "publint --strict && attw --pack . --profile esm-only --exclude-entrypoints ./styles.css ./styles.layer.css ./package.json"
  },
  "dependencies": {
    "@mbc-cqrs-serverless/ui-web": "workspace:^"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tw-animate-css": "^1.4.0"
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
    "directory": "packages/master-web"
  }
}
```

`packages/master-web/tsconfig.json`:

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

`packages/master-web/tsconfig.build.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.test-d.ts"]
}
```

`packages/master-web/tsdown.config.ts`:

```ts
import { libraryConfig } from '../../scripts/tsdown-preset.ts'

export default libraryConfig()
```

`packages/master-web/vitest.config.ts`:

```ts
import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'master-web',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
})
```

```bash
cp packages/survey-web/test/setup.ts packages/master-web/test/setup.ts
cp LICENSE packages/master-web/LICENSE
printf '# @mbc-cqrs-serverless/master-web\n' > packages/master-web/CHANGELOG.md
cp packages/survey-web/src/styles/index.css packages/master-web/src/styles/index.css
fnm exec --using=v24.13.0 -- pnpm install
```

(`src/styles/index.css` is survey-web's 15-line entry: theme, utilities, `tw-animate-css/prefix`, `@source` of the package and of `ui-web/src`, ui-web's theme, tokens and base. Its relative paths are the same from `packages/master-web/src/styles/`.)

- [ ] **Step 2: Write the failing tests**

`packages/master-web/src/core/field-type-names.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { MASTER_FIELD_TYPES } from './field-type-names'

describe('MASTER_FIELD_TYPES', () => {
  it('lists v0’s ten field types in v0’s order', () => {
    expect(MASTER_FIELD_TYPES).toEqual([
      'string',
      'number',
      'auto_number',
      'boolean',
      'date',
      'array',
      'json',
      'text-area',
      'text-html',
      'text-markdown',
    ])
  })
})
```

`packages/master-web/test/exports.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import * as root from '../src/index'
import * as core from '../src/core/index'
import {
  MASTER_FIELD_TYPES,
  MbcProvider,
  masterMessages,
  useMessages,
} from '../src/index'

function Labels() {
  const t = useMessages(masterMessages)
  return <p>{MASTER_FIELD_TYPES.map((type) => t.fieldTypes[type]).join('|')}</p>
}

describe('master-web entries', () => {
  it('exports the core from the root, plus messages and the provider', () => {
    expect(Object.keys(core).sort()).toEqual(['MASTER_FIELD_TYPES'])
    expect(Object.keys(root).sort()).toEqual([
      'MASTER_FIELD_TYPES',
      'MbcProvider',
      'masterMessages',
      'useMessages',
    ])
  })

  it('labels every field type in Japanese by default and in English', () => {
    const { unmount } = render(
      <MbcProvider>
        <Labels />
      </MbcProvider>
    )
    expect(screen.getByText(/^文字列\|数値\|自動採番\|/)).toBeInTheDocument()
    unmount()
    render(
      <MbcProvider locale="en">
        <Labels />
      </MbcProvider>
    )
    expect(screen.getByText(/\|JSON\|/)).toBeInTheDocument()
    expect(screen.getByText(/^Text\|Number\|/)).toBeInTheDocument()
  })
})
```

`packages/master-web/test/build/output.test.ts`:

```ts
// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  distDir,
  externalsOf,
  FORBIDDEN_JS_PATTERNS,
  hasUseClientDirective,
  listFiles,
  readText,
} from '../../../../scripts/build-output'
import {
  elementOnlyRules,
  parseCss,
  unprefixedClasses,
} from '../../../../scripts/css-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))

describe('master-web output', () => {
  it('ships the root and /core entries and both stylesheets', () => {
    expect(listFiles(dist, '.js')).toEqual(
      expect.arrayContaining(['index.js', 'core/index.js'])
    )
    expect(listFiles(dist, '.css')).toEqual(['styles.css', 'styles.layer.css'])
  })

  it('includes ui-web’s styles, prefixed and scoped', () => {
    const css = readText(dist, 'styles.css')
    expect(css).toContain('--mbc-primary:')
    const root = parseCss(css)
    expect(
      unprefixedClasses(root, [
        'dark',
        'rdp-button_next',
        'rdp-button_previous',
      ])
    ).toEqual([])
    expect(elementOnlyRules(root)).toEqual([])
  })

  it('keeps /core free of React and of every package but zod', () => {
    expect(
      [...externalsOf(dist, 'core/index.js')].filter((name) => name !== 'zod')
    ).toEqual([])
    for (const file of listFiles(dist, '.js').filter((f) =>
      f.startsWith('core/')
    )) {
      expect(hasUseClientDirective(readText(dist, file)), file).toBe(false)
    }
  })

  it('contains no host-framework or host-library references', () => {
    for (const file of listFiles(dist, '.js')) {
      for (const pattern of FORBIDDEN_JS_PATTERNS) {
        expect(readText(dist, file), `${file} ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web`
Expected: FAIL — `./field-type-names`, `../src/index`, `../src/core/index` cannot be resolved; the build-output test fails with "…/dist does not exist" or a missing `externalsOf` export.

- [ ] **Step 4: Implement the sources**

`packages/master-web/src/core/field-type-names.ts`:

```ts
/** v0's field types, in v0's order (the settings editor lists them this way). */
export const MASTER_FIELD_TYPES = [
  'string',
  'number',
  'auto_number',
  'boolean',
  'date',
  'array',
  'json',
  'text-area',
  'text-html',
  'text-markdown',
] as const

export type MasterFieldType = (typeof MASTER_FIELD_TYPES)[number]
```

`packages/master-web/src/core/index.ts`:

```ts
export { MASTER_FIELD_TYPES, type MasterFieldType } from './field-type-names'
```

`packages/master-web/src/i18n/master-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterFieldType } from '../core/field-type-names'

export type MasterMessages = {
  fieldTypes: Record<MasterFieldType, string>
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    master: MasterMessages
  }
}

const ja: MasterMessages = {
  fieldTypes: {
    string: '文字列',
    number: '数値',
    auto_number: '自動採番',
    boolean: 'ブール値',
    date: '日付',
    array: '文字列(配列)',
    json: 'JSON',
    'text-area': 'テキストエリア',
    'text-html': 'HTML形式',
    'text-markdown': 'Markdown形式',
  },
}

const en: MasterMessages = {
  fieldTypes: {
    string: 'Text',
    number: 'Number',
    auto_number: 'Auto number',
    boolean: 'Boolean',
    date: 'Date',
    array: 'Text list',
    json: 'JSON',
    'text-area': 'Text area',
    'text-html': 'HTML',
    'text-markdown': 'Markdown',
  },
}

export const masterMessages = defineMessages('master', { ja, en })
```

`packages/master-web/src/index.ts`:

```ts
// One MbcContext: hosts may import the provider from here or from ui-web.
export {
  MbcProvider,
  useMessages,
  type MbcProviderProps,
} from '@mbc-cqrs-serverless/ui-web'
export * from './core'
export { masterMessages, type MasterMessages } from './i18n/master-messages'
```

- [ ] **Step 5: Share `externalsOf` and widen the forbidden patterns**

In `scripts/build-output.ts`, add `posix` to the `node:path` import (`import { join, posix, sep } from 'node:path'`), extend `FORBIDDEN_JS_PATTERNS` with

```ts
  /from\s*["'](?:axios|swr|mobx|mobx-react-lite|react-draggable|react-resizable)["']/,
  /from\s*["'](?:@apollo\/client|aws-amplify|aws-appsync-[^"']*)(?:\/[^"']*)?["']/,
```

and append:

```ts
/** Bare module specifiers reachable from `entry` through relative imports. */
export function externalsOf(dist: string, entry: string): Set<string> {
  const seen = new Set<string>()
  const external = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    const source = readText(dist, file)
    for (const [, specifier] of source.matchAll(
      /(?:from|import)\s*["']([^"']+)["']/g
    )) {
      if (!specifier) continue
      if (specifier.startsWith('.'))
        visit(posix.join(posix.dirname(file), specifier))
      else external.add(specifier)
    }
  }
  visit(entry)
  return external
}
```

In `packages/survey-web/test/build/output.test.ts`, delete its local `externalsOf` function and the `posix` import, import `externalsOf` from `'../../../../scripts/build-output'`, and change each call `externalsOf(entry)` to `externalsOf(dist, entry)`.

- [ ] **Step 6: Build and run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web --project survey-web --project scripts && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web check:package`
Expected: PASS; publint and attw report no problems for `.` and `./core`.

- [ ] **Step 7: Commit**

```bash
git add packages/master-web packages/survey-web/test/build/output.test.ts scripts/build-output.ts pnpm-lock.yaml
git commit -m "feat(master-web): package skeleton with /core field types and the master message namespace

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Release group, smoke app, playground gallery, docs

**Files:**

- Modify: `.changeset/config.json`, `.changeset/first-release.md`
- Modify: `apps/next-smoke/package.json`, `apps/next-smoke/app/page.tsx`
- Create: `apps/next-smoke/app/master-screens.tsx`
- Create: `apps/playground/src/gallery-master.tsx`; Modify: `apps/playground/src/gallery.tsx`
- Modify: `README.md` (packages table), `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` (§2 ui-web table, §3 entry note), `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md` (M1 text)

**Interfaces:**

- Consumes: everything from Tasks 2–8.

- [ ] **Step 1: Add master-web to the release group**

In `.changeset/config.json`, add `"@mbc-cqrs-serverless/master-web"` as the fourth entry of the `fixed` group. In `.changeset/first-release.md`, add the line `'@mbc-cqrs-serverless/master-web': major` to the front matter and append to its text: ` \`master-web\` 1.0.0 replaces 0.0.x; see \`packages/master-web/MIGRATION.md\`.`

Run: `fnm exec --using=v24.13.0 -- pnpm changeset status`
Expected: `major` lists client-web, master-web, survey-web and ui-web.

- [ ] **Step 2: Render master-web in the Next smoke app**

In `apps/next-smoke/package.json` add `"@mbc-cqrs-serverless/master-web": "workspace:*"` to `dependencies`, then run `fnm exec --using=v24.13.0 -- pnpm install`.

`apps/next-smoke/app/master-screens.tsx`:

```tsx
'use client'

import {
  MASTER_FIELD_TYPES,
  MbcProvider,
  masterMessages,
  useMessages,
} from '@mbc-cqrs-serverless/master-web'
import { MultiSelect } from '@mbc-cqrs-serverless/ui-web'

function FieldTypes() {
  const t = useMessages(masterMessages)
  return (
    <ul>
      {MASTER_FIELD_TYPES.map((type) => (
        <li key={type}>{t.fieldTypes[type]}</li>
      ))}
    </ul>
  )
}

/** master-web's client entry and the new ui-web parts, rendered on the server and hydrated. */
export function MasterScreens() {
  return (
    <MbcProvider locale="ja">
      <FieldTypes />
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
        value={['a']}
        onValueChange={() => {}}
      />
    </MbcProvider>
  )
}
```

In `apps/next-smoke/app/page.tsx`, add `import { MASTER_FIELD_TYPES } from '@mbc-cqrs-serverless/master-web/core'` and `import { MasterScreens } from './master-screens'`, then inside `<main>` after the existing `<p>`:

```tsx
      <p>master field types: {MASTER_FIELD_TYPES.length}</p>
      <MasterScreens />
```

Run: `fnm exec --using=v24.13.0 -- pnpm build && fnm exec --using=v24.13.0 -- pnpm smoke && grep -c "Markdown形式" apps/next-smoke/.next/server/app/index.html`
Expected: the build succeeds; grep prints `1` or more.

- [ ] **Step 3: Show the new primitives in the playground gallery**

`apps/playground/src/gallery-master.tsx`:

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Field,
  FieldLabel,
  MultiSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mbc-cqrs-serverless/ui-web'
import { useState } from 'react'

const TENANTS = [
  { value: 'tenant-a', label: 'Tenant A' },
  { value: 'tenant-b', label: 'Tenant B' },
  { value: 'tenant-c', label: 'Tenant C' },
]

/** Primitives added for master-web. */
export function MasterPrimitives() {
  const [tenants, setTenants] = useState<string[]>(['tenant-a'])
  return (
    <section className="mbc:flex mbc:flex-col mbc:gap-6 mbc:p-6">
      <Accordion type="multiple" defaultValue={['search', 'result']}>
        <AccordionItem value="search">
          <AccordionTrigger>Search</AccordionTrigger>
          <AccordionContent>
            <Field>
              <FieldLabel>Tenants</FieldLabel>
              <MultiSelect
                options={TENANTS}
                value={tenants}
                onValueChange={setTenants}
              />
            </Field>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="result">
          <AccordionTrigger>Result</AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TENANTS.map((tenant) => (
                  <TableRow
                    key={tenant.value}
                    data-state={
                      tenants.includes(tenant.value) ? 'selected' : undefined
                    }
                  >
                    <TableCell>{tenant.value}</TableCell>
                    <TableCell>{tenant.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
```

In `apps/playground/src/gallery.tsx`, import `MasterPrimitives` from `'./gallery-master'` and render `<MasterPrimitives />` as the last child of the element `Gallery` returns.

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/playground typecheck`
Expected: exits 0.

- [ ] **Step 4: Update the docs**

- `README.md`: add a row to the packages table: ``| [`@mbc-cqrs-serverless/master-web`](packages/master-web) | Master setting and master data screens (in progress) |`` (match the table's column count).
- Spec §2 "ui-web additions" table: delete the `Combobox` row and add under the table: "`Combobox` (single choice) was dropped in M1: no v0 master screen uses one."
- Spec §3, under the entry table, add: "Entries ship with their content: `.` and `/core` from M1, `/editors` and `editors.css` from M6, `/mbc` from M7."
- Orchestrator M1 "Builds": replace "`Combobox`, " with nothing; replace the master-web bullet's export list with "`package.json` exports for `.`, `./core`, `./styles.css`, `./styles.layer.css` (`/editors` added in M6, `/mbc` in M7)"; replace "message namespaces `master`, `masterSetting`, `masterData`, `masterCopy` registered (ja + en skeletons)" with "`master` namespace registered with the field-type labels (`masterSetting`/`masterData` in M3, `masterCopy` in M7)".

Run: `fnm exec --using=v24.13.0 -- pnpm format:check`
Expected: exits 0 (run `pnpm format` first if it reports the edited files).

- [ ] **Step 5: Run the standard gate**

```bash
fnm exec --using=v24.13.0 -- pnpm verify
fnm exec --using=v24.13.0 -- pnpm use-react 18 && fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke
fnm exec --using=v24.13.0 -- pnpm use-react 19 && fnm exec --using=v24.13.0 -- pnpm smoke
git status --porcelain
```

Expected: every command exits 0 on both React versions; `git status --porcelain` is empty after the restore.

- [ ] **Step 6: Commit**

```bash
git add .changeset apps README.md docs pnpm-lock.yaml
git commit -m "chore: release master-web with the group; smoke and playground cover the new parts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
