# M5 — Data Editor Implementation Plan

> **For agentic workers:** Implement this plan task by task, in order. Every task is test-first: write the test, run it and watch it fail for the stated reason, write the code, run it and watch it pass, commit. If your harness has the superpowers skills, use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `MasterDataEditor`, master v0's data editor. Its form comes from the setting's fields, each drawn by a renderer for its type. It has view and edit modes, a code locked after create, an auto-numbered code generated on save, delete and restore with confirmation, and a JSON dialog for the record. Another tenant's record opens read-only.

**Architecture:** The screen is prop-driven. The host passes the setting, the stored record and async callbacks (`checkCodeUnique`, `generateCode`, `onSave`, `onDelete`, `onRestore`); M7's connected page will supply them from the API.

- M2's `/core` already turns records into input values and back (`toFormValues`, `fromFormValues`), validates them (`validateMasterData`) and builds the request bodies (`toDataPayload`).
- `/core` now also reads and writes the record JSON (`dataJson`, `parseDataJson`).
- `renderers/` holds one built-in renderer per field type; a host replaces any of them through `components`.
- `form/` gains a confirm button and a failure alert, which both editors share.

**Tech Stack:** TypeScript ~6.0 (`strict`, `noUncheckedIndexedAccess`), React 18/19, ui-web primitives (Radix, react-day-picker `Calendar`), lucide-react 1.52, Tailwind v4 with the `mbc:` prefix, Vitest + jsdom + Testing Library + axe-core, pnpm 10 workspace, Node 24.13 via fnm.

**Spec:** `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` §3.1 (`toDataPayload`), §3.2 (`MasterDataEditor`, field renderers), §4 (forms, accessibility, SSR), §5 (auto-number note). Orchestrator: `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, sub-plan M5.

## Orientation (read once)

- **Repository:** `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`, a pnpm monorepo:
  - `packages/ui-web`: UI primitives and i18n;
  - `packages/client-web`: HTTP and realtime;
  - `packages/survey-web`: finished, and the reference for conventions (its date question uses the same Calendar-in-Popover pattern);
  - `packages/master-web`: this work;
  - `apps/playground` (Vite) and `apps/next-smoke` (Next).
- **Start** from an up-to-date `main` (M4 merged): `git switch main && git switch -c m5-data-editor`. Check that `packages/master-web/src/settings/master-setting-editor.tsx` exists.
- **Commands:** run every command from the repository root, prefixed with `fnm exec --using=v24.13.0 --`.
  - Install and build once: `fnm exec --using=v24.13.0 -- pnpm install && fnm exec --using=v24.13.0 -- pnpm build`.
  - Packages import each other through their built `dist/`.
- **Tests:** they sit next to the code (`src/**/x.test.tsx`); build-output and export tests sit in each package's `test/`. `pnpm vitest run <paths>` runs files; `pnpm vitest run --project master-web` runs a package.
- **What exists already:**
  - master-web `/core`:
    - `MasterSetting`, `MasterData`, `MasterField`, `parseMasterSetting`, `parseMasterData`;
    - `dataFields`, `isEntityField`, `toFormValues`, `fromFormValues`, `formatDateValue`, `MasterFormValues`;
    - `fieldTypeOf` / `fieldTypes` (`toFormValue`, `empty`), `numberOption`, `dateParts`;
    - `validateMasterData`, `toDataPayload`, `settingCodeOf`, `MasterError`.
  - `i18n/`: `formatMasterError`; the `master` namespace (`validation`, `jsonDialog`, `table.loading`); `masterData` (`list`).
  - M4's settings editor (`settings/master-setting-editor.tsx`), `json/JsonDialog`, `form/RequiredMark`, `list/ListError`, `routing/MasterLink`; the test fixtures `V0_SETTING`, `V0_DATA`, `V0_DATA_ODD` in `test/fixtures/v0-master.ts`.
- **Look (user decision):** master screens use ui-web's controls as they are, one shared look with survey-web. From master v0 come layout, section structure, colour roles and Japanese text. Do not copy master v0's control classes.
- **Messages** follow ui-web's pattern:
  - a typed object per locale (`ja` default, `en`);
  - a message is a string or a function of named parameters;
  - a namespace registers itself by augmenting `MbcMessageRegistry`.
- **Edit steps** say "In `<file>`, replace:" followed by two code blocks. Find the first block's text in the file (it occurs exactly once) and replace it with the second. The `<!-- prettier-ignore -->` line above each of those blocks keeps the formatter from changing them; it is not part of the text. Every other code block headed by a file path is the whole file: create it, or replace it entirely.
- **The code in this plan has been run:** every task passes on its own, in order, and the full gate is green on the result. Type it exactly. If a step's output differs from its `Expected:` line, stop and find out why before changing anything.

## Global Constraints

- No `process.env`, `console.*`, `any`, `next`, axios or other host libraries in `packages/*/src` (lint enforces it). No React-19-only APIs.
- No reading or writing a ref during render, and no component created during render (lint: `react-hooks/refs`, `react-hooks/static-components`). Pick a renderer with an inline lookup, as `MasterDataEditor` does.
- `"use client"` on every module that renders (a build test checks it). `packages/master-web/src/core/**` imports only zod and its own files.
- Every UI string comes from messages. Roots and portal content render `data-mbc` (ui-web primitives do this).
- Records stay v0-compatible: attribute keys no field owns, and untouched values of any stored type, survive a save.
- survey-web's public API and tests must keep passing unchanged.
- No consumer-specific names in code, tests, fixtures, docs or commit messages.
- Change only the files each task lists.
- Commits follow Conventional Commits, one per task, with the messages given. Append your tool's co-author trailer if it adds one.

## Review Focus

Each item is pinned by a test in the task that owns it:

1. **Values v0 stored in another type** (a number stored as a number, `'true'` for a switch, JSON stored as text, a `null` list) show correctly. An unrelated edit saves them unchanged. _Task 4: "saves values v0 stored in other types unchanged when they were not edited"._
2. **A record owned by another tenant (including `common`)** opens read-only, with a way back to its setting's list. It offers no Edit, Delete, Restore or JSON dialog. _Task 4: "opens another tenant's record read-only with a way back to the list"._
3. **An auto-numbered code** is asked for once per save, even when the form is submitted twice in one tick. After a create, Save stays off, so a second click cannot number another record. _Task 4: "numbers an auto-numbered code once, when saving"._
4. **A host's renderer** gets the field's `id`, so the label names its control, and its changes are what is saved. _Task 4: "renders a field with the host's renderer for its type"._
5. **Server rendering and mounting:** no renderer changes a value on mount. Every renderer renders with `renderToString`. A date shows the calendar date as stored, whatever the time zone. _Task 2: "leaves every value alone on mount and renders on the server", "picks a date and stores it as v0 did, with the time zone"._

## Rulings already made (do not undo)

- **Component state, not react-hook-form.** The renderers are controlled (`value` / `onChange`), so react-hook-form would add a dependency without simplifying anything. Task 5 updates the spec, which drops it from master-web's dependencies.
- **`text-html` and `text-markdown` render as plain text areas.** A safe HTML preview needs a sanitizer, and Markdown needs a parser; previews and rich editing come with `/editors` (M6).
- **A `text-area` does not refuse keystrokes past `maxRow`;** v0 silently dropped them. The save reports "n行以内で入力してください。" (M2's rule).
- **Dates:**
  - the picker shows the stored calendar date (`yyyy/MM/dd`, v0's format) with no time-zone conversion, so the server and the browser agree;
  - a picked day is stored at local midnight with its offset (`2026-10-15T00:00:00+09:00`), as v0 stored it.
- **An auto-numbered code input is read-only, with the sequence's name as its placeholder;** v0 put the name in the input itself. `generateCode(field, setting)` is asked once per save. After a successful create, Save stays off: navigating is the host's job, and a second save would number another record.
- **The save button reads 登録,** as in v0's data editor.
- **Delete and restore swap after success, as in v0;** the editor does not navigate.
- **The JSON dialog** shows v0's record shape with every field present, using each type's empty value when a field is empty. Applying it in edit mode keeps the stored code. It applies v0's check: `settingCode`, `code` and `name` must be present.
- **A typed code is checked for uniqueness on create** once it passes its own rules (v0 checked it in the input's validation).
- **`FieldRendererProps` gains `labelId`,** for renderers that are a group (the list) or a button (the date picker), which `htmlFor` cannot label.
- **`ConfirmButton` and the failure alert are shared.** M4's editor switches to them in Task 3 with no change in behaviour; its tests pin that.
- **v0's two sequence requests move to M7** (`createMasterApi`, behind `generateCode`). Task 5 updates the spec's §5 note.

---

### Task 1: The record JSON (`/core`)

**Files:**

- Create: `packages/master-web/src/core/data-json.ts`
- Test: `packages/master-web/src/core/data-json.test.ts`
- Modify: `packages/master-web/src/core/index.ts`, `packages/master-web/test/exports.test.tsx`

**Interfaces:**

- Consumes: M2's `dataFields`, `fromFormValues`, `isEntityField`, `toFormValues`, `fieldTypeOf(...).empty`, `settingCodeOf`.
- Produces, from `/core` and the root:
  - `dataJson(setting, values, previous?)`: pretty-printed `{ settingCode, code, name, seq?, attributes }`, as the record would be saved. Every field is present; an empty one is written as its type's empty value (`0`, `false`, `[]`, `''`).
  - `parseDataJson(text, setting)` → `{ ok: true; values: MasterFormValues } | { ok: false; error: { key: 'invalidJson' } | { key: 'invalidData' } }`. `invalidData` is v0's check: an object with `settingCode`, `code` and `name`, whose `attributes`, when present, is an object.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/core/data-json.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { V0_DATA, V0_SETTING } from '../../test/fixtures/v0-master'
import { dataJson, parseDataJson } from './data-json'
import { parseMasterData, parseMasterSetting } from './parse'
import type { MasterData, MasterSetting } from './types'
import { dataFields, toFormValues } from './values'

function setting(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

function record(): MasterData {
  const parsed = parseMasterData(V0_DATA)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

describe('dataJson', () => {
  it('writes v0’s shape with every field: defaults, and v0’s empty value for the rest', () => {
    const values = toFormValues(dataFields(setting()))
    const json = JSON.parse(dataJson(setting(), values))
    expect(Object.keys(json)).toEqual([
      'settingCode',
      'code',
      'name',
      'attributes',
    ])
    expect(json.settingCode).toBe('PRODUCT')
    expect(json.attributes).toMatchObject({
      price: 0,
      // Defaults: the switch is on, the JSON is parsed.
      active: true,
      spec: { size: 'M' },
      tags: [],
      memo: '',
    })
  })

  it('writes a stored record as it would be saved, keys no field owns included', () => {
    const stored = record()
    const values = toFormValues(dataFields(setting()), stored)
    const json = JSON.parse(dataJson(setting(), values, stored))
    expect(json).toMatchObject({ code: 'P-001', name: 'りんご', seq: 3 })
    expect(json.attributes).toMatchObject({
      price: '1200',
      spec: { size: 'L' },
      importedBy: 'batch-7',
    })
  })
})

describe('parseDataJson', () => {
  it('reads back what dataJson wrote', () => {
    const stored = record()
    const values = toFormValues(dataFields(setting()), stored)
    const result = parseDataJson(dataJson(setting(), values, stored), setting())
    expect(result).toEqual({ ok: true, values })
  })

  it('refuses text that is not JSON, and a record without settingCode, code or name (v0)', () => {
    expect(parseDataJson('{', setting())).toEqual({
      ok: false,
      error: { key: 'invalidJson' },
    })
    const invalid = { ok: false, error: { key: 'invalidData' } }
    expect(parseDataJson('[]', setting())).toEqual(invalid)
    expect(
      parseDataJson(
        JSON.stringify({ settingCode: 'PRODUCT', code: 'A', name: '' }),
        setting()
      )
    ).toEqual(invalid)
    expect(
      parseDataJson(
        JSON.stringify({
          settingCode: 'PRODUCT',
          code: 'A',
          name: 'B',
          attributes: [],
        }),
        setting()
      )
    ).toEqual(invalid)
  })
})
```

The exports test lists every `/core` export. Add the new names:

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      'dateParts',
      'DEFAULT_PAGE_SIZE',
```

with:

<!-- prettier-ignore -->
```tsx
      'dataJson',
      'dateParts',
      'DEFAULT_PAGE_SIZE',
```

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      'parseBulkJson',
```

with:

<!-- prettier-ignore -->
```tsx
      'parseBulkJson',
      'parseDataJson',
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/core/data-json.test.ts`
Expected: FAIL: `./data-json` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/core/data-json.ts`:

```ts
import { fieldTypeOf } from './field-types'
import { settingCodeOf } from './payload'
import type { MasterData, MasterSetting } from './types'
import {
  dataFields,
  fromFormValues,
  isEntityField,
  toFormValues,
  type MasterFormValues,
} from './values'

export type DataJsonError = { key: 'invalidJson' } | { key: 'invalidData' }

export type DataJsonResult =
  { ok: true; values: MasterFormValues } | { ok: false; error: DataJsonError }

const INTEGER = /^-?[0-9]+$/

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

/**
 * The JSON a record's dialog opens with, in v0's shape: `settingCode`,
 * `code`, `name`, `seq` and the attributes as they would be saved, with
 * every field present (an empty one as v0's empty value for its type).
 */
export function dataJson(
  setting: MasterSetting,
  values: MasterFormValues,
  previous?: MasterData
): string {
  const fields = dataFields(setting)
  const attributes = fromFormValues(fields, values, previous?.attributes)
  for (const field of fields) {
    if (isEntityField(field) || Object.hasOwn(attributes, field.physicalName))
      continue
    attributes[field.physicalName] = fieldTypeOf(field).empty
  }
  const seq = text(values.seq).trim()
  const record = {
    settingCode: settingCodeOf(setting),
    code: text(values.code),
    name: text(values.name),
    ...(seq === '' ? {} : { seq: INTEGER.test(seq) ? Number(seq) : seq }),
    attributes,
  }
  return JSON.stringify(record, null, 2)
}

/**
 * The input values of a record JSON. v0's check: an object with a
 * `settingCode`, a `code` and a `name`; `attributes`, when present, is an object.
 */
export function parseDataJson(
  text: string,
  setting: MasterSetting
): DataJsonResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: { key: 'invalidJson' } }
  }
  if (
    !isObject(value) ||
    !value.settingCode ||
    !value.code ||
    !value.name ||
    (value.attributes !== undefined && !isObject(value.attributes))
  )
    return { ok: false, error: { key: 'invalidData' } }

  const seq =
    typeof value.seq === 'number'
      ? value.seq
      : typeof value.seq === 'string' && INTEGER.test(value.seq.trim())
        ? Number(value.seq)
        : undefined
  const record: MasterData = {
    id: '',
    pk: '',
    sk: '',
    version: 0,
    code: String(value.code),
    name: String(value.name),
    seq,
    attributes: isObject(value.attributes) ? value.attributes : {},
  }
  return { ok: true, values: toFormValues(dataFields(setting), record) }
}
```

In `packages/master-web/src/core/index.ts`, replace:

<!-- prettier-ignore -->
```ts
} from './field-types'
export {
```

with:

<!-- prettier-ignore -->
```ts
} from './field-types'
export {
  dataJson,
  parseDataJson,
  type DataJsonError,
  type DataJsonResult,
} from './data-json'
export {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (169 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): read and write a record as JSON in /core"
```

---

### Task 2: Field renderers and the data editor's messages

**Files:**

- Modify: `packages/master-web/src/i18n/master-data-messages.ts`
- Create: `packages/master-web/src/renderers/types.ts`, `text-renderers.tsx`, `array-renderer.tsx`, `date-renderer.tsx`, `registry.ts` (all in `packages/master-web/src/renderers/`)
- Test: `packages/master-web/src/renderers/renderers.test.tsx`

**Interfaces:**

- Consumes: `numberOption`, `dateParts`, `formatDateValue` (M2); ui-web's `Input`, `Textarea`, `Switch`, `Button`, `Calendar`, `Popover`.
- Produces:
  - `masterData` messages with the editor's groups: `editor`, `renderers`, `json` (Task 4 uses `editor` and `json`);
  - `type FieldRendererProps = { field; value: FormValue; onChange(value); onBlur(); id; labelId; describedBy?; invalid; disabled }`;
  - `type FieldRenderer`, and `type FieldRenderers = Partial<Record<MasterFieldType, FieldRenderer>>`;
  - `defaultRenderers: Record<MasterFieldType, FieldRenderer>`;
  - `rendererType(field)`: the field's type, or `'string'` for a type this version does not know.
- Built-ins:
  - `string`: an input, or a text area when `maxRow` > 1;
  - `number`: a numeric text input;
  - `auto_number`: read-only, with the sequence's name as its placeholder;
  - `boolean`: a switch;
  - `date`: the calendar picker;
  - `array`: v0's list with "アイテム追加";
  - `json`: a monospace text area;
  - `text-area` / `text-html` / `text-markdown`: a text area.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/renderers/renderers.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { useId, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { MASTER_FIELD_TYPES } from '../core/field-type-names'
import { fieldTypes, type FormValue } from '../core/field-types'
import type { MasterField } from '../core/types'
import { defaultRenderers, rendererType } from './registry'

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'value',
  name: '項目',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: true,
  ...overrides,
})

/** A renderer under a real label, holding its own value. */
function Harness({
  of,
  initial,
  onChange = () => {},
  disabled = false,
}: {
  of: MasterField
  initial: FormValue
  onChange?: (value: FormValue) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState(initial)
  const id = useId()
  const Renderer = defaultRenderers[rendererType(of)]
  return (
    <div>
      <label id={`${id}label`} htmlFor={`${id}control`}>
        {of.name}
      </label>
      <Renderer
        field={of}
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        onBlur={() => {}}
        id={`${id}control`}
        labelId={`${id}label`}
        describedBy={`${id}hint`}
        invalid={false}
        disabled={disabled}
      />
      <p id={`${id}hint`}>※説明</p>
    </div>
  )
}

describe('field renderers', () => {
  it('edits text and numbers in labelled inputs with v0’s placeholders', async () => {
    const onChange = vi.fn()
    render(<Harness of={field({})} initial="" onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: '項目' })
    expect(input).toHaveAttribute('placeholder', 'テキストを入力してください。')
    expect(input).toHaveAccessibleDescription('※説明')
    await userEvent.type(input, 'ab')
    expect(onChange).toHaveBeenLastCalledWith('ab')
  })

  it('uses a text area for a string with more than one row, and for the text types', () => {
    render(
      <>
        <Harness of={field({ name: '複数行', maxRow: 3 })} initial="" />
        <Harness
          of={field({ name: '本文', dataType: 'text-html' })}
          initial=""
        />
      </>
    )
    expect(screen.getByRole('textbox', { name: '複数行' }).tagName).toBe(
      'TEXTAREA'
    )
    expect(screen.getByRole('textbox', { name: '本文' }).tagName).toBe(
      'TEXTAREA'
    )
  })

  it('switches a boolean', async () => {
    const onChange = vi.fn()
    render(
      <Harness
        of={field({ name: '有効', dataType: 'boolean' })}
        initial={false}
        onChange={onChange}
      />
    )
    await userEvent.click(screen.getByRole('switch', { name: '有効' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('edits a list: add, change and remove items (v0)', async () => {
    const onChange = vi.fn()
    render(
      <Harness
        of={field({ name: 'タグ', dataType: 'array' })}
        initial={['fruit']}
        onChange={onChange}
      />
    )
    expect(screen.getByRole('group', { name: 'タグ' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'アイテム追加' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'タグ 2件目' }),
      'red'
    )
    expect(onChange).toHaveBeenLastCalledWith(['fruit', 'red'])
    await userEvent.click(
      screen.getByRole('button', { name: 'タグ 2件目を削除' })
    )
    expect(onChange).toHaveBeenLastCalledWith(['fruit'])
  })

  it('picks a date and stores it as v0 did, with the time zone', async () => {
    const onChange = vi.fn()
    render(
      <Harness
        of={field({ name: '発売日', dataType: 'date' })}
        initial="2026-10-07T00:00:00+09:00"
        onChange={onChange}
      />
    )
    const trigger = screen.getByRole('button', { name: /発売日/ })
    // The stored calendar date, whatever the browser's time zone.
    expect(trigger).toHaveTextContent('2026/10/07')
    await userEvent.click(trigger)
    await userEvent.click(
      await screen.findByRole('button', { name: /10月15日/ })
    )
    expect(onChange).toHaveBeenCalledWith(
      expect.stringMatching(/^2026-10-15T00:00:00[+-]\d{2}:\d{2}$/)
    )
    expect(screen.getByRole('button', { name: /発売日/ })).toHaveTextContent(
      '2026/10/15'
    )
  })

  it('shows an auto-numbered code as read-only, naming its sequence', () => {
    render(
      <Harness
        of={field({
          name: 'コード',
          dataType: 'auto_number',
          formatName: '商品番号',
        })}
        initial=""
      />
    )
    const input = screen.getByRole('textbox', { name: 'コード' })
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('placeholder', '商品番号')
  })

  it('renders a type this version does not know as text', () => {
    expect(rendererType(field({ dataType: 'geo' }))).toBe('string')
    expect(rendererType(field({ dataType: 'json' }))).toBe('json')
  })

  it('leaves every value alone on mount and renders on the server', () => {
    const onChange = vi.fn()
    const all = MASTER_FIELD_TYPES.map((type) =>
      field({ physicalName: type, name: type, dataType: type })
    )
    const element = (
      <MbcProvider>
        {all.map((each) => (
          <Harness
            key={each.physicalName}
            of={each}
            initial={fieldTypes[each.dataType as 'string'].toFormValue(
              undefined
            )}
            onChange={onChange}
          />
        ))}
      </MbcProvider>
    )
    expect(renderToString(element)).toContain('アイテム追加')
    render(element)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('has no axe violations', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <Harness
            of={field({ dataType: 'array', name: 'Tags' })}
            initial={['a']}
          />
          <Harness of={field({ dataType: 'date', name: 'Day' })} initial="" />
          <Harness of={field({ dataType: 'json', name: 'Spec' })} initial="" />
        </main>
      </MbcProvider>
    )
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/renderers`
Expected: FAIL: `./registry` cannot be resolved.

- [ ] **Step 3: Implement**

Replace the whole messages file (adds `editor`, `renderers` and `json`):

`packages/master-web/src/i18n/master-data-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

export type MasterDataMessages = {
  /** A setting's data list. */
  list: {
    settingInfo: (params: { code: string; name: string }) => string
    code: string
    name: string
    description: string
    details: string
    searchSection: string
    resultSection: string
    includeDeleted: string
    search: string
    clear: string
    create: string
    back: string
    /** Accessible name of the table. */
    table: string
    /** A JSON cell with nothing in it (v0 showed "empty"). */
    emptyJson: string
    date: (params: { year: string; month: string; day: string }) => string
    loadFailed: string
    retry: string
  }
  /** The data editor. */
  editor: {
    /** Accessible name of the button bar. */
    actions: string
    edit: string
    save: string
    cancel: string
    delete: string
    restore: string
    back: string
    /** Labels of the code / name inputs added when the setting has no such fields. */
    code: string
    name: string
    codeTaken: string
    /** An auto-numbered code before it is saved. */
    autoNumber: string
    readOnly: string
    loadFailed: string
    retry: string
    createFailed: string
    updateFailed: string
    deleteFailed: string
    restoreFailed: string
    failedHint: string
    /** A change whose outcome is unknown (the wait for it timed out). */
    timeout: string
    deleteTitle: string
    restoreTitle: string
    deleteConfirm: string
    restoreConfirm: string
  }
  /** The built-in field renderers. */
  renderers: {
    textPlaceholder: string
    numberPlaceholder: string
    datePlaceholder: string
    date: (params: { year: string; month: string; day: string }) => string
    addItem: string
    item: (params: { name: string; n: number }) => string
    removeItem: (params: { name: string; n: number }) => string
  }
  /** The record JSON dialog. */
  json: {
    fileName: string
    invalidJson: string
    invalidData: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    masterData: MasterDataMessages
  }
}

const ja: MasterDataMessages = {
  list: {
    settingInfo: ({ code, name }) => `${code}:${name} 設定情報`,
    code: 'コード',
    name: '名称',
    description: '説明',
    details: '詳細',
    searchSection: 'データを検索する',
    resultSection: 'データ一覧',
    includeDeleted: '削除済み含む',
    search: '検索',
    clear: 'クリア',
    create: '新規登録',
    back: '戻る',
    table: 'データ一覧',
    emptyJson: 'empty',
    date: ({ year, month, day }) => `${year}年${month}月${day}日`,
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  editor: {
    actions: '操作',
    edit: '編集',
    save: '登録',
    cancel: 'キャンセル',
    delete: '削除',
    restore: '復旧',
    back: '戻る',
    code: 'コード',
    name: '名称',
    codeTaken: '既にこのコードは登録されています。',
    autoNumber: '登録時に自動採番されます',
    readOnly: '他のテナントのデータのため、編集できません。',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
    createFailed: 'データ登録に失敗しました。',
    updateFailed: 'データ更新に失敗しました。',
    deleteFailed: 'データ削除に失敗しました。',
    restoreFailed: 'データ復旧に失敗しました。',
    failedHint: '入力内容を確認した上で再度やり直してください。',
    timeout:
      '時間内に結果を確認できませんでした。反映されたかどうか、読み込み直して確認してください。',
    deleteTitle: '削除してもよろしいですか？',
    restoreTitle: '復旧してもよろしいですか？',
    deleteConfirm: '削除',
    restoreConfirm: '復旧',
  },
  renderers: {
    textPlaceholder: 'テキストを入力してください。',
    numberPlaceholder: '数値を入力してください。',
    datePlaceholder: '日時を選択してください',
    date: ({ year, month, day }) => `${year}/${month}/${day}`,
    addItem: 'アイテム追加',
    item: ({ name, n }) => `${name} ${n}件目`,
    removeItem: ({ name, n }) => `${name} ${n}件目を削除`,
  },
  json: {
    fileName: 'master-data.json',
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    invalidData: 'JSON が無効です。settingCode、code、name が必要です。',
  },
}

const en: MasterDataMessages = {
  list: {
    settingInfo: ({ code, name }) => `${code}: ${name} settings`,
    code: 'Code',
    name: 'Name',
    description: 'Description',
    details: 'Details',
    searchSection: 'Search data',
    resultSection: 'Data',
    includeDeleted: 'Include deleted',
    search: 'Search',
    clear: 'Clear',
    create: 'Create',
    back: 'Back',
    table: 'Data',
    emptyJson: 'empty',
    date: ({ year, month, day }) => `${year}-${month}-${day}`,
    loadFailed: 'Could not load the list.',
    retry: 'Reload',
  },
  editor: {
    actions: 'Actions',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    restore: 'Restore',
    back: 'Back',
    code: 'Code',
    name: 'Name',
    codeTaken: 'This code is already in use.',
    autoNumber: 'Numbered automatically when saved',
    readOnly: 'This record belongs to another tenant and cannot be edited.',
    loadFailed: 'Could not load the record.',
    retry: 'Reload',
    createFailed: 'Could not create the record.',
    updateFailed: 'Could not update the record.',
    deleteFailed: 'Could not delete the record.',
    restoreFailed: 'Could not restore the record.',
    failedHint: 'Check your input and try again.',
    timeout:
      'The result did not arrive in time. Reload to check whether the change was made.',
    deleteTitle: 'Delete this record?',
    restoreTitle: 'Restore this record?',
    deleteConfirm: 'Delete',
    restoreConfirm: 'Restore',
  },
  renderers: {
    textPlaceholder: 'Enter text.',
    numberPlaceholder: 'Enter a number.',
    datePlaceholder: 'Pick a date',
    date: ({ year, month, day }) => `${year}-${month}-${day}`,
    addItem: 'Add item',
    item: ({ name, n }) => `${name} ${n}`,
    removeItem: ({ name, n }) => `Remove ${name} ${n}`,
  },
  json: {
    fileName: 'master-data.json',
    invalidJson: 'The JSON is not valid.',
    invalidData: 'The JSON needs settingCode, code and name.',
  },
}

export const masterDataMessages = defineMessages('masterData', { ja, en })
```

`packages/master-web/src/renderers/types.ts`:

```ts
import type { ComponentType } from 'react'

import type { MasterFieldType } from '../core/field-type-names'
import type { FormValue } from '../core/field-types'
import type { MasterField } from '../core/types'

/** What the data editor gives each field's renderer. */
export type FieldRendererProps = {
  field: MasterField
  /** The input value (`fieldTypes[type].toFormValue` of the stored value). */
  value: FormValue
  onChange(value: FormValue): void
  onBlur(): void
  /** The control's id; the field's label points at it. */
  id: string
  /** The label's id, for a control that is a group of inputs. */
  labelId: string
  /** Ids of the field's description and error, when shown. */
  describedBy?: string
  invalid: boolean
  disabled: boolean
}

export type FieldRenderer = ComponentType<FieldRendererProps>

/** Renderers by field type; a host's replace the built-ins (`components`). */
export type FieldRenderers = Partial<Record<MasterFieldType, FieldRenderer>>
```

`packages/master-web/src/renderers/text-renderers.tsx`:

```tsx
'use client'

import {
  cn,
  Input,
  Switch,
  Textarea,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'

import { numberOption, type FormValue } from '../core/field-types'
import { masterDataMessages } from '../i18n/master-data-messages'
import type { FieldRendererProps } from './types'

const text = (value: FormValue) =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.join('\n')
      : String(value)

/** The props every built-in passes to its control. */
function control({
  id,
  describedBy,
  invalid,
  disabled,
  onBlur,
}: FieldRendererProps) {
  return {
    id,
    disabled,
    onBlur,
    'aria-describedby': describedBy,
    'aria-invalid': invalid || undefined,
  }
}

/** `string`: one line, or a text area when the field allows more than one row (v0). */
export function StringRenderer(props: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  const rows = numberOption(props.field.maxRow)
  const common = {
    ...control(props),
    value: text(props.value),
    placeholder: t.textPlaceholder,
  }
  if (rows !== undefined && rows > 1)
    return (
      <Textarea
        {...common}
        rows={rows}
        className="mbc:resize-none"
        onChange={(event) => props.onChange(event.target.value)}
      />
    )
  return (
    <Input
      {...common}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `number`: a text input, checked as a whole number on save (v0). */
export function NumberRenderer(props: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  return (
    <Input
      {...control(props)}
      inputMode="numeric"
      value={text(props.value)}
      placeholder={t.numberPlaceholder}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `auto_number`: generated on save, so read-only; names its sequence until then. */
export function AutoNumberRenderer(props: FieldRendererProps) {
  const t = useMessages(masterDataMessages).editor
  return (
    <Input
      {...control(props)}
      disabled
      value={text(props.value)}
      placeholder={props.field.formatName || t.autoNumber}
      onChange={() => {}}
    />
  )
}

/** `text-area`, `text-html`, `text-markdown`: a plain text area (rich editors come from `/editors`). */
export function TextAreaRenderer(props: FieldRendererProps) {
  return (
    <Textarea
      {...control(props)}
      value={text(props.value)}
      className="mbc:min-h-32"
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `json`: JSON as text, checked on save. */
export function JsonRenderer(props: FieldRendererProps) {
  return (
    <Textarea
      {...control(props)}
      value={text(props.value)}
      spellCheck={false}
      className={cn('mbc:min-h-48 mbc:font-mono mbc:text-xs')}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}

/** `boolean`: a switch. */
export function BooleanRenderer(props: FieldRendererProps) {
  return (
    <Switch
      {...control(props)}
      checked={props.value === true}
      onCheckedChange={(checked) => props.onChange(checked)}
    />
  )
}
```

`packages/master-web/src/renderers/array-renderer.tsx`:

```tsx
'use client'

import { Button, Input, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { Plus, Trash2 } from 'lucide-react'

import { masterDataMessages } from '../i18n/master-data-messages'
import type { FieldRendererProps } from './types'

/** `array`: v0's list of texts, each with a remove button, and "アイテム追加". */
export function ArrayRenderer({
  field,
  value,
  onChange,
  onBlur,
  id,
  labelId,
  describedBy,
  invalid,
  disabled,
}: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  const items = Array.isArray(value) ? value : []
  const name = field.name || field.physicalName
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      className="mbc:flex mbc:flex-col mbc:gap-2"
    >
      {items.map((item, index) => (
        <div key={index} className="mbc:flex mbc:items-center mbc:gap-2">
          <Input
            value={item}
            disabled={disabled}
            onBlur={onBlur}
            aria-label={t.item({ name, n: index + 1 })}
            aria-invalid={invalid || undefined}
            className="mbc:flex-1"
            onChange={(event) =>
              onChange(
                items.map((entry, at) =>
                  at === index ? event.target.value : entry
                )
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={t.removeItem({ name, n: index + 1 })}
            onClick={() => onChange(items.filter((_, at) => at !== index))}
          >
            <Trash2 aria-hidden className="mbc:h-4 mbc:w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        className="mbc:w-fit"
        onClick={() => onChange([...items, ''])}
      >
        <Plus aria-hidden />
        {t.addItem}
      </Button>
    </div>
  )
}
```

`packages/master-web/src/renderers/date-renderer.tsx`:

```tsx
'use client'

import {
  Button,
  Calendar,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { CalendarIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { dateParts } from '../core/list'
import { formatDateValue } from '../core/values'
import { masterDataMessages } from '../i18n/master-data-messages'
import type { FieldRendererProps } from './types'

/**
 * `date`: a calendar in a popover. It shows the calendar date as stored
 * (no time-zone shift, so the server and the browser agree) and stores the
 * picked day at local midnight with its offset, as v0 did.
 */
export function DateRenderer({
  value,
  onChange,
  onBlur,
  id,
  labelId,
  describedBy,
  invalid,
  disabled,
}: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  const valueId = useId()
  const [open, setOpen] = useState(false)
  const parts = dateParts(value)
  const selected = parts
    ? new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
    : undefined
  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          onBlur={onBlur}
          // The label, then the date: the button's text alone is not its name.
          aria-labelledby={`${labelId} ${valueId}`}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            'mbc:w-full mbc:pl-3 mbc:text-left mbc:font-normal',
            !parts && 'mbc:text-muted-foreground'
          )}
        >
          <span id={valueId}>{parts ? t.date(parts) : t.datePlaceholder}</span>
          <CalendarIcon
            aria-hidden
            className="mbc:ml-auto mbc:h-4 mbc:w-4 mbc:opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="mbc:w-auto mbc:p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(day) => {
            onChange(day ? formatDateValue(day) : '')
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
```

`packages/master-web/src/renderers/registry.ts`:

```ts
import {
  isMasterFieldType,
  type MasterFieldType,
} from '../core/field-type-names'
import type { MasterField } from '../core/types'
import { ArrayRenderer } from './array-renderer'
import { DateRenderer } from './date-renderer'
import {
  AutoNumberRenderer,
  BooleanRenderer,
  JsonRenderer,
  NumberRenderer,
  StringRenderer,
  TextAreaRenderer,
} from './text-renderers'
import type { FieldRenderer } from './types'

export type { FieldRenderer, FieldRendererProps, FieldRenderers } from './types'

/** The built-in renderer of each field type. */
export const defaultRenderers: Readonly<
  Record<MasterFieldType, FieldRenderer>
> = {
  string: StringRenderer,
  number: NumberRenderer,
  auto_number: AutoNumberRenderer,
  boolean: BooleanRenderer,
  date: DateRenderer,
  array: ArrayRenderer,
  json: JsonRenderer,
  'text-area': TextAreaRenderer,
  'text-html': TextAreaRenderer,
  'text-markdown': TextAreaRenderer,
}

/** The type whose renderer a field uses: unknown types render as `string`. */
export function rendererType(
  field: Pick<MasterField, 'dataType'>
): MasterFieldType {
  return isMasterFieldType(field.dataType) ? field.dataType : 'string'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (178 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): a renderer for every field type"
```

---

### Task 3: A shared confirm button and failure alert

**Files:**

- Create: `packages/master-web/src/form/confirm-button.tsx`, `packages/master-web/src/form/failure.tsx`
- Modify: `packages/master-web/src/settings/master-setting-editor.tsx`

**Interfaces:**

- Produces (internal):
  - `ConfirmButton({ label, title, confirm, cancel, onConfirm, loading?, disabled?, variant? })`: v0's button that asks before it acts;
  - `type Failure = { title; hint? }`;
  - `failureOf(reason, title, { failedHint, timeout })`: an error named `MbcTimeoutError` gets the timeout text;
  - `FailureAlert({ failure, className? })`.
- `MasterSettingEditor` uses them, with no change in behaviour. This is a refactor: its tests are the check.

- [ ] **Step 1: Create the shared parts**

`packages/master-web/src/form/confirm-button.tsx`:

```tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  buttonVariants,
} from '@mbc-cqrs-serverless/ui-web'

/** v0's ConfirmButton: a button that asks before it acts (delete, restore). */
export function ConfirmButton({
  label,
  title,
  confirm,
  cancel,
  onConfirm,
  loading = false,
  disabled = false,
  variant = 'destructive',
}: {
  label: string
  title: string
  confirm: string
  cancel: string
  onConfirm(): void
  loading?: boolean
  disabled?: boolean
  variant?: 'destructive' | 'default'
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          loading={loading}
          disabled={disabled}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancel}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant })}
            onClick={onConfirm}
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

`packages/master-web/src/form/failure.tsx`:

```tsx
'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@mbc-cqrs-serverless/ui-web'

/** Why a save, delete or restore did not go through. */
export type Failure = { title: string; hint?: string }

/**
 * The editors' failure text. An error named `MbcTimeoutError` (client-web's)
 * means the outcome is unknown, so it gets its own text instead of the hint.
 */
export function failureOf(
  reason: unknown,
  title: string,
  t: { failedHint: string; timeout: string }
): Failure {
  if (reason instanceof Error && reason.name === 'MbcTimeoutError')
    return { title: t.timeout }
  return { title, hint: t.failedHint }
}

export function FailureAlert({
  failure,
  className,
}: {
  failure: Failure
  className?: string
}) {
  return (
    <Alert variant="destructive" role="alert" className={cn(className)}>
      <AlertTitle>{failure.title}</AlertTitle>
      {failure.hint && <AlertDescription>{failure.hint}</AlertDescription>}
    </Alert>
  )
}
```

- [ ] **Step 2: Use them in the settings editor**

In `packages/master-web/src/settings/master-setting-editor.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  Button,
  buttonVariants,
```

with:

<!-- prettier-ignore -->
```tsx
  Button,
```

In `packages/master-web/src/settings/master-setting-editor.tsx`, replace:

<!-- prettier-ignore -->
```tsx
import type { MasterField, MasterSetting } from '../core/types'
```

with:

<!-- prettier-ignore -->
```tsx
import type { MasterField, MasterSetting } from '../core/types'
import { ConfirmButton } from '../form/confirm-button'
import { FailureAlert, failureOf, type Failure } from '../form/failure'
```

In `packages/master-web/src/settings/master-setting-editor.tsx`, replace:

<!-- prettier-ignore -->
```tsx
type Snapshot = { values: SettingFormValues; rows: FieldRow[] }
type Failure = { title: string; hint?: string }

const isTimeout = (error: unknown) =>
  error instanceof Error && error.name === 'MbcTimeoutError'
```

with:

<!-- prettier-ignore -->
```tsx
type Snapshot = { values: SettingFormValues; rows: FieldRow[] }
```

In `packages/master-web/src/settings/master-setting-editor.tsx`, replace:

<!-- prettier-ignore -->
```tsx
    setFailure(
      isTimeout(reason) ? { title: t.timeout } : { title, hint: t.failedHint }
    )
```

with:

<!-- prettier-ignore -->
```tsx
    setFailure(failureOf(reason, title, t))
```

In `packages/master-web/src/settings/master-setting-editor.tsx`, replace:

<!-- prettier-ignore -->
```tsx
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      loading={deleting}
                      disabled={saving}
                    >
                      {t.delete}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        className={buttonVariants({ variant: 'destructive' })}
                        onClick={() => void remove()}
                      >
                        {t.deleteConfirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
```

with:

<!-- prettier-ignore -->
```tsx
                <ConfirmButton
                  label={t.delete}
                  title={t.deleteTitle}
                  confirm={t.deleteConfirm}
                  cancel={t.cancel}
                  onConfirm={() => void remove()}
                  loading={deleting}
                  disabled={saving}
                />
```

In `packages/master-web/src/settings/master-setting-editor.tsx`, replace:

<!-- prettier-ignore -->
```tsx
          {failure && (
            <Alert variant="destructive" role="alert" className="mbc:mt-4">
              <AlertTitle>{failure.title}</AlertTitle>
              {failure.hint && (
                <AlertDescription>{failure.hint}</AlertDescription>
              )}
            </Alert>
          )}
```

with:

<!-- prettier-ignore -->
```tsx
          {failure && <FailureAlert failure={failure} className="mbc:mt-4" />}
```

- [ ] **Step 3: Run the settings tests to verify nothing changed**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/settings && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (37 tests, the same as before this task); typecheck exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/master-web
git commit -m "refactor(master-web): share the confirm button and the failure alert"
```

---

### Task 4: `MasterDataEditor`

**Files:**

- Create: `packages/master-web/src/data/master-data-editor.tsx`
- Test: `packages/master-web/src/data/master-data-editor.test.tsx`

**Interfaces:**

- Consumes:
  - Tasks 1–3 (`dataJson`, `parseDataJson`, `defaultRenderers`, `rendererType`, `FieldRenderers`, `ConfirmButton`, `failureOf`, `FailureAlert`, messages);
  - M2's `dataFields`, `toFormValues`, `validateMasterData`, `toDataPayload`;
  - M3's `ListError` and `MasterLink`, and M4's `JsonDialog` and `RequiredMark`.
- Produces: `MasterDataEditor(props: MasterDataEditorProps)`, where `MasterDataEditorProps` is:

  <!-- prettier-ignore -->
  ```ts
  {
    mode: 'create' | 'edit'
    setting?: MasterSetting
    data?: MasterData
    routing: MasterRouting
    tenantCode?: string
    loading?: boolean
    error?: unknown
    onRetry?(): void
    checkCodeUnique?(code): Promise<boolean>
    generateCode?(field, setting): Promise<string>
    onSave(body: MasterDataCreateBody | MasterDataUpdateBody): Promise<void>
    onDelete?(): Promise<void>
    onRestore?(): Promise<void>
    components?: FieldRenderers
  }
  ```

  - **Ownership:** with `tenantCode` given, a record whose `tenantCode` differs opens read-only.
  - **Remounting:** a new setting or record `id` / `version` restarts the editor.
  - **Each field** gets a label (`htmlFor` its control), v0's "※" description, a required mark and its error, all linked through `describedBy`.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/data/master-data-editor.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { V0_DATA, V0_DATA_ODD, V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterData, parseMasterSetting } from '../core/parse'
import type {
  MasterDataCreateBody,
  MasterDataUpdateBody,
} from '../core/payload'
import type { MasterData, MasterField, MasterSetting } from '../core/types'
import type { FieldRendererProps } from '../renderers/registry'
import type { MasterRouting } from '../routing/routing'
import {
  MasterDataEditor,
  type MasterDataEditorProps,
} from './master-data-editor'

const routing: MasterRouting = {
  href: (to) =>
    'settingId' in to
      ? `/${to.screen}/${encodeURIComponent(to.settingId)}`
      : `/${to.screen}`,
  navigate: vi.fn(),
}

/** The fixture's setting; its price field gets a description. */
function setting(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  const price = parsed.data.attributes.fields.find(
    (field) => field.physicalName === 'price'
  )!
  price.description = '税込'
  return parsed.data
}

/** The fixture's setting with a typed code instead of an auto-numbered one. */
function typedCodeSetting(): MasterSetting {
  const result = setting()
  result.attributes.fields = result.attributes.fields.map((field) =>
    field.physicalName === 'code'
      ? {
          physicalName: 'code',
          name: 'コード',
          dataType: 'string',
          isRequired: true,
          isShowedOnList: true,
        }
      : field
  )
  return result
}

function record(): MasterData {
  const parsed = parseMasterData(V0_DATA)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

function setup(overrides: Partial<MasterDataEditorProps> = {}) {
  const onSave = vi.fn<MasterDataEditorProps['onSave']>(async () => {})
  const props: MasterDataEditorProps = {
    mode: 'edit',
    setting: setting(),
    data: record(),
    routing,
    tenantCode: 'tenant-a',
    onSave,
    ...overrides,
  }
  render(<MasterDataEditor {...props} />)
  return { onSave }
}

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })
const lastBody = (fn: { mock: { calls: unknown[][] } }) =>
  fn.mock.calls.at(-1)?.[0] as MasterDataCreateBody & MasterDataUpdateBody

describe('MasterDataEditor', () => {
  it('creates a record from the setting’s fields, starting from their defaults', async () => {
    const checkCodeUnique = vi.fn(async () => true)
    const { onSave } = setup({
      mode: 'create',
      setting: typedCodeSetting(),
      data: undefined,
      checkCodeUnique,
    })
    expect(input('価格')).toHaveAccessibleDescription('※税込')
    expect(screen.getByRole('switch', { name: '有効' })).toBeChecked()
    await userEvent.type(input('コード'), ' P-9 ')
    await userEvent.type(input('名称'), 'なし')
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    expect(checkCodeUnique).toHaveBeenCalledWith('P-9')
    expect(lastBody(onSave)).toMatchObject({
      settingCode: 'PRODUCT',
      code: 'P-9',
      name: 'なし',
      attributes: { code: 'P-9', price: '500', active: true },
    })
  })

  it('numbers an auto-numbered code once, when saving', async () => {
    const pending: ((code: string) => void)[] = []
    const generateCode = vi.fn(
      (_field: MasterField, _setting: MasterSetting) =>
        new Promise<string>((resolve) => pending.push(resolve))
    )
    const { onSave } = setup({ mode: 'create', data: undefined, generateCode })
    const code = input('コード')
    expect(code).toBeDisabled()
    expect(code).toHaveAttribute('placeholder', '商品番号')
    await userEvent.type(input('名称'), 'なし')
    await userEvent.type(input('価格'), '500')
    // Two submits in one tick (a double Enter): the second must not number again.
    const form = button('登録').closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(generateCode).toHaveBeenCalledTimes(1)
    expect(generateCode.mock.calls[0]![0].physicalName).toBe('code')
    for (const resolve of pending) resolve('P-100')
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(lastBody(onSave)).toMatchObject({
      code: 'P-100',
      attributes: { code: 'P-100' },
    })
    // Created: the host moves on; saving again would number another record.
    expect(button('登録')).toBeDisabled()
  })

  it('refuses values the fields do not allow, says why and focuses the first', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: typedCodeSetting(),
      data: undefined,
      checkCodeUnique: async () => false,
    })
    await userEvent.type(input('価格'), '1.5')
    await userEvent.click(button('登録'))
    expect(input('コード')).toHaveAccessibleDescription('入力してください。')
    expect(input('コード')).toHaveFocus()
    expect(input('価格')).toHaveAccessibleDescription(
      '※税込 数字を入力してください。'
    )
    await userEvent.type(input('コード'), 'P-001')
    await userEvent.click(button('登録'))
    expect(input('コード')).toHaveAccessibleDescription(
      '既にこのコードは登録されています。'
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('opens a stored record for viewing, then edits and saves it', async () => {
    const { onSave } = setup()
    expect(input('価格')).toBeDisabled()
    expect(input('価格')).toHaveValue('1200')
    await userEvent.click(button('編集'))
    expect(input('コード')).toBeDisabled()
    expect(button('登録')).toBeDisabled()
    await userEvent.clear(input('価格'))
    await userEvent.type(input('価格'), '1300')
    await userEvent.click(button('登録'))
    const body = lastBody(onSave)
    expect(body).not.toHaveProperty('settingCode')
    expect(body).toMatchObject({ name: 'りんご', seq: 3 })
    expect(body.attributes).toMatchObject({
      price: '1300',
      importedBy: 'batch-7',
      spec: { size: 'L' },
    })
    expect(await screen.findByRole('button', { name: '編集' })).toBeVisible()
    expect(input('価格')).toHaveValue('1300')
  })

  it('saves values v0 stored in other types unchanged when they were not edited', async () => {
    const parsed = parseMasterData(V0_DATA_ODD)
    if (!parsed.success) throw parsed.error
    const { onSave } = setup({
      data: { ...parsed.data, tenantCode: 'tenant-a' },
    })
    expect(input('価格')).toHaveValue('980')
    expect(screen.getByRole('switch', { name: '有効' })).toBeChecked()
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), '!')
    await userEvent.click(button('登録'))
    expect(lastBody(onSave)).toMatchObject({ name: 'みかん!', seq: 0 })
    // Untouched values keep their stored type; like v0, the record's code,
    // name and seq are written into the attributes too.
    expect(lastBody(onSave).attributes).toEqual({
      ...(V0_DATA_ODD as { attributes: object }).attributes,
      code: 'P-002',
      name: 'みかん!',
      seq: '0',
    })
  })

  it('cancels editing back to the stored values; a typed code stays locked', async () => {
    setup({ setting: typedCodeSetting() })
    await userEvent.click(button('編集'))
    expect(input('コード')).toBeDisabled()
    await userEvent.type(input('価格'), '9')
    await userEvent.click(button('キャンセル'))
    expect(input('価格')).toHaveValue('1200')
  })

  it('asks for a code and a name when the setting has no such fields (v0)', async () => {
    const bare = setting()
    bare.attributes.fields = bare.attributes.fields.filter(
      (field) => !['code', 'name'].includes(field.physicalName)
    )
    const { onSave } = setup({ mode: 'create', setting: bare, data: undefined })
    await userEvent.type(input('コード'), 'X-1')
    await userEvent.type(input('名称'), 'エックス')
    await userEvent.type(input('価格'), '1')
    await userEvent.click(button('登録'))
    expect(lastBody(onSave)).toMatchObject({ code: 'X-1', name: 'エックス' })
    expect(lastBody(onSave).attributes).not.toHaveProperty('name')
  })

  it('deletes and restores after confirmation, swapping the two buttons (v0)', async () => {
    const onDelete = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue()
    const onRestore = vi.fn(async () => {})
    setup({ onDelete, onRestore })
    const confirm = async (trigger: string, action: string) => {
      await userEvent.click(button(trigger))
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', {
          name: action,
        })
      )
    }
    await confirm('削除', '削除')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'データ削除に失敗しました。'
    )
    await confirm('削除', '削除')
    await screen.findByRole('button', { name: '復旧' })
    await confirm('復旧', '復旧')
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: '削除' })).toBeVisible()
  })

  it('applies a record JSON, keeping the stored code', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('JSONエディタ'))
    const json = screen.getByRole('textbox', { name: 'JSON' })
    const current = JSON.parse((json as HTMLTextAreaElement).value)
    expect(current).toMatchObject({ settingCode: 'PRODUCT', code: 'P-001' })
    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste('{"settingCode":"PRODUCT"}')
    await userEvent.click(button('データ反映'))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'settingCode、code、name'
    )
    const next = {
      ...current,
      code: 'OTHER',
      attributes: { ...current.attributes, price: '777' },
    }
    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste(JSON.stringify(next))
    await userEvent.click(button('データ反映'))
    expect(input('価格')).toHaveValue('777')
    expect(input('コード')).toHaveValue('P-001')
  })

  it('says when saving failed, and when the outcome is unknown', async () => {
    const timeout = Object.assign(new Error('late'), {
      name: 'MbcTimeoutError',
    })
    const onSave = vi
      .fn<MasterDataEditorProps['onSave']>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(timeout)
    setup({ onSave })
    await userEvent.click(button('編集'))
    await userEvent.type(input('価格'), '1')
    await userEvent.click(button('登録'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'データ更新に失敗しました。'
    )
    await userEvent.click(button('登録'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '時間内に結果を確認できませんでした。'
    )
  })

  it('opens another tenant’s record read-only with a way back to the list', () => {
    setup({
      data: { ...record(), tenantCode: 'common' },
      onDelete: async () => {},
    })
    expect(
      screen.getByText('他のテナントのデータのため、編集できません。')
    ).toBeVisible()
    for (const link of screen.getAllByRole('link', { name: '戻る' }))
      expect(link).toHaveAttribute(
        'href',
        `/data/${encodeURIComponent(setting().id)}`
      )
    for (const name of ['編集', '削除', '復旧', 'JSONエディタ'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(input('価格')).toBeDisabled()
  })

  it('renders a field with the host’s renderer for its type', async () => {
    function Shout({ id, value, onChange, disabled }: FieldRendererProps) {
      return (
        <input
          id={id}
          value={String(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      )
    }
    const { onSave } = setup({ components: { 'text-area': Shout } })
    await userEvent.click(button('編集'))
    await userEvent.clear(input('メモ'))
    await userEvent.type(input('メモ'), 'abc')
    await userEvent.click(button('登録'))
    expect(lastBody(onSave).attributes.memo).toBe('ABC')
  })

  it('shows loading, then a load failure with a reload button', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <MasterDataEditor
        mode="edit"
        routing={routing}
        loading
        onSave={async () => {}}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(
      <MasterDataEditor
        mode="edit"
        routing={routing}
        error={new Error('x')}
        onRetry={onRetry}
        onSave={async () => {}}
      />
    )
    await userEvent.click(button('再読み込み'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations and renders on the server', async () => {
    const element = (
      <MbcProvider locale="en">
        <main>
          <MasterDataEditor
            mode="edit"
            setting={setting()}
            data={record()}
            routing={routing}
            tenantCode="tenant-a"
            onSave={async () => {}}
            onDelete={async () => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(renderToString(element)).toContain('Add item')
    render(element)
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/data/master-data-editor.test.tsx`
Expected: FAIL: `./master-data-editor` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/data/master-data-editor.tsx`:

```tsx
'use client'

import { Button, cn, Skeleton, useMessages } from '@mbc-cqrs-serverless/ui-web'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import { dataJson, parseDataJson } from '../core/data-json'
import {
  toDataPayload,
  type MasterDataCreateBody,
  type MasterDataUpdateBody,
} from '../core/payload'
import type { MasterData, MasterField, MasterSetting } from '../core/types'
import { validateMasterData } from '../core/validate'
import {
  dataFields,
  isEntityField,
  toFormValues,
  type MasterFormValues,
} from '../core/values'
import { ConfirmButton } from '../form/confirm-button'
import { FailureAlert, failureOf, type Failure } from '../form/failure'
import { RequiredMark } from '../form/required-mark'
import { formatMasterError } from '../i18n/format-error'
import { masterDataMessages } from '../i18n/master-data-messages'
import { masterMessages } from '../i18n/master-messages'
import { JsonDialog } from '../json/json-dialog'
import { ListError } from '../list/list-error'
import {
  defaultRenderers,
  rendererType,
  type FieldRenderers,
} from '../renderers/registry'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'

export type MasterDataEditorProps = {
  mode: 'create' | 'edit'
  /** The record's setting; its fields make the form. */
  setting?: MasterSetting
  /** The stored record (edit). A new `id` or `version` restarts the editor. */
  data?: MasterData
  routing: MasterRouting
  /** The current tenant: another tenant's record opens read-only. */
  tenantCode?: string
  /** The setting or the record is loading. */
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRetry`. */
  error?: unknown
  onRetry?(): void
  /** Create, typed code: resolves `false` when the code is already used. */
  checkCodeUnique?(code: string): Promise<boolean>
  /** Create, auto-numbered code: the next code, asked for once per save. */
  generateCode?(field: MasterField, setting: MasterSetting): Promise<string>
  /**
   * Saves the record; reject to show the failure. After an update the
   * editor shows the saved values; after a create, navigating is the host's.
   */
  onSave(body: MasterDataCreateBody | MasterDataUpdateBody): Promise<void>
  /** Deletes the record (soft delete) after the user confirms. */
  onDelete?(): Promise<void>
  /** Restores a deleted record after the user confirms. */
  onRestore?(): Promise<void>
  /** Renderers that replace the built-ins, by field type. */
  components?: FieldRenderers
}

// Wide inputs take the whole row (v0).
const WIDE = new Set(['json', 'text-area', 'text-html', 'text-markdown'])

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

/** v0's data editor: the setting's fields, view / edit, delete / restore and the JSON dialog. */
export function MasterDataEditor(props: MasterDataEditorProps) {
  const t = useMessages(masterDataMessages).editor
  const m = useMessages(masterMessages)
  const { mode, setting, data, loading = false, error, onRetry } = props
  if (!setting || (mode === 'edit' && !data) || loading) {
    if (!loading && error !== undefined)
      return (
        <div data-mbc="" className="mbc:p-4">
          <ListError message={t.loadFailed} retry={t.retry} onRetry={onRetry} />
        </div>
      )
    return (
      <div data-mbc="" role="status" className="mbc:grid mbc:gap-4 mbc:p-4">
        <span className="mbc:sr-only">{m.table.loading}</span>
        <Skeleton className="mbc:h-10 mbc:w-1/3" />
        <Skeleton className="mbc:h-48 mbc:w-full" />
      </div>
    )
  }
  const key = [setting.id, setting.version, data?.id, data?.version].join(':')
  return <EditorBody key={key} {...props} setting={setting} />
}

function EditorBody({
  mode,
  setting,
  data,
  routing,
  tenantCode,
  checkCodeUnique,
  generateCode,
  onSave,
  onDelete,
  onRestore,
  components,
}: MasterDataEditorProps & { setting: MasterSetting }) {
  const messages = useMessages(masterDataMessages)
  const t = messages.editor
  const m = useMessages(masterMessages)
  const formId = useId()
  const fields = useMemo(() => dataFields(setting), [setting])
  const owned =
    mode === 'create' ||
    tenantCode === undefined ||
    data?.tenantCode === tenantCode

  const [baseline, setBaseline] = useState<MasterFormValues>(() =>
    toFormValues(fields, data)
  )
  const [values, setValues] = useState(baseline)
  const [editing, setEditing] = useState(mode === 'create')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState(0)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)
  const [deleted, setDeleted] = useState(data?.isDeleted === true)
  const [acting, setActing] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const busy = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const readOnly = !editing || !owned

  // After a refused save: focus the first field with an error.
  useEffect(() => {
    if (attempts === 0) return
    const first = fields.find((field) => errors[field.physicalName])
    if (!first) return
    const wrapper = [
      ...(formRef.current?.querySelectorAll<HTMLElement>('[data-field]') ?? []),
    ].find((element) => element.dataset.field === first.physicalName)
    wrapper
      ?.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
      ?.focus()
  }, [attempts, errors, fields])

  const changed = JSON.stringify(values) !== JSON.stringify(baseline)
  const codeField = fields.find((field) => field.physicalName === 'code')
  const generated = codeField?.dataType === 'auto_number'

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy.current || readOnly || created) return
    busy.current = true
    setSaving(true)
    setFailure(null)
    const failedTitle = mode === 'create' ? t.createFailed : t.updateFailed
    try {
      const found = validateMasterData(fields, values, {
        mode: mode === 'create' ? 'create' : 'update',
      })
      const next: Record<string, string> = {}
      for (const [name, problem] of Object.entries(found))
        next[name] = formatMasterError(problem, m.validation)
      if (mode === 'create' && !generated && !next.code && checkCodeUnique) {
        if (!(await checkCodeUnique(text(values.code).trim())))
          next.code = t.codeTaken
      }
      setErrors(next)
      if (Object.keys(next).length > 0) {
        setAttempts((count) => count + 1)
        return
      }
      if (mode === 'create') {
        let generatedCode: string | undefined
        if (generated && codeField) {
          if (!generateCode)
            throw new Error(
              'MasterDataEditor: an auto-numbered code needs generateCode'
            )
          generatedCode = await generateCode(codeField, setting)
        }
        await onSave(
          toDataPayload(setting, values, { mode: 'create', generatedCode })
        )
        setCreated(true)
      } else if (data) {
        await onSave(
          toDataPayload(setting, values, { mode: 'update', previous: data })
        )
        setBaseline(values)
        setEditing(false)
      }
    } catch (reason) {
      setFailure(failureOf(reason, failedTitle, t))
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  const cancel = () => {
    setValues(baseline)
    setErrors({})
    setFailure(null)
    setEditing(false)
  }

  const act = async (
    action: (() => Promise<void>) | undefined,
    failedTitle: string,
    next: boolean
  ) => {
    if (!action) return
    setFailure(null)
    setActing(true)
    try {
      await action()
      setDeleted(next)
    } catch (reason) {
      setFailure(failureOf(reason, failedTitle, t))
    } finally {
      setActing(false)
    }
  }

  const applyJson = (json: string) => {
    const parsed = parseDataJson(json, setting)
    if (!parsed.ok) return messages.json[parsed.error.key]
    // The code of a stored record cannot change.
    setValues(
      mode === 'edit'
        ? { ...parsed.values, code: values.code ?? '' }
        : parsed.values
    )
    return undefined
  }

  const label = (field: MasterField) =>
    field.name ||
    (isEntityField(field)
      ? field.physicalName === 'code'
        ? t.code
        : t.name
      : field.physicalName)

  const back = (
    <Button asChild variant="outline" className="mbc:min-w-[200px]">
      <MasterLink
        routing={routing}
        to={{ screen: 'data', settingId: setting.id }}
      >
        {t.back}
      </MasterLink>
    </Button>
  )

  return (
    <div data-mbc="" className="mbc:w-full">
      <form
        ref={formRef}
        noValidate
        onSubmit={save}
        className="mbc:bg-background mbc:w-full"
      >
        <div
          role="group"
          aria-label={t.actions}
          className="mbc:bg-muted/50 mbc:p-4"
        >
          {owned ? (
            <div className="mbc:flex mbc:justify-between mbc:gap-4">
              <div className="mbc:flex mbc:flex-wrap mbc:gap-4">
                {mode === 'edit' && !editing ? (
                  <Button type="button" onClick={() => setEditing(true)}>
                    {t.edit}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      loading={saving}
                      disabled={created || (mode === 'edit' && !changed)}
                    >
                      {t.save}
                    </Button>
                    {mode === 'edit' && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancel}
                      >
                        {t.cancel}
                      </Button>
                    )}
                    <JsonDialog
                      text={() => dataJson(setting, values, data)}
                      fileName={messages.json.fileName}
                      onApply={applyJson}
                      disabled={saving}
                    />
                  </>
                )}
              </div>
              {mode === 'edit' && (
                <div className="mbc:flex mbc:items-center mbc:gap-4">
                  {deleted
                    ? onRestore && (
                        <ConfirmButton
                          label={t.restore}
                          title={t.restoreTitle}
                          confirm={t.restoreConfirm}
                          cancel={t.cancel}
                          variant="default"
                          onConfirm={() =>
                            void act(onRestore, t.restoreFailed, false)
                          }
                          loading={acting}
                          disabled={saving}
                        />
                      )
                    : onDelete && (
                        <ConfirmButton
                          label={t.delete}
                          title={t.deleteTitle}
                          confirm={t.deleteConfirm}
                          cancel={t.cancel}
                          onConfirm={() =>
                            void act(onDelete, t.deleteFailed, true)
                          }
                          loading={acting}
                          disabled={saving}
                        />
                      )}
                </div>
              )}
            </div>
          ) : (
            <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-4">
              <Button asChild>
                <MasterLink
                  routing={routing}
                  to={{ screen: 'data', settingId: setting.id }}
                >
                  {t.back}
                </MasterLink>
              </Button>
              <p className="mbc:text-muted-foreground mbc:text-sm">
                {t.readOnly}
              </p>
            </div>
          )}
          {failure && <FailureAlert failure={failure} className="mbc:mt-4" />}
        </div>

        <div className="mbc:w-full mbc:p-4">
          <div className="mbc:grid mbc:grid-cols-1 mbc:gap-x-10 mbc:gap-y-4 mbc:p-6 mbc:pb-10 mbc:pt-2 mbc:md:grid-cols-2">
            {fields.map((field, index) => {
              const name = field.physicalName
              const id = `${formId}-${index}`
              const description = text(field.description)
              const problem = errors[name]
              const describedBy =
                [
                  description ? `${id}-description` : undefined,
                  problem ? `${id}-error` : undefined,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              const type = rendererType(field)
              const Renderer = components?.[type] ?? defaultRenderers[type]
              const isCode = name === 'code'
              return (
                <div
                  key={name}
                  data-field={name}
                  className={cn(
                    'mbc:block',
                    isCode && 'mbc:col-start-1',
                    WIDE.has(field.dataType) && 'mbc:md:col-span-2'
                  )}
                >
                  <label
                    id={`${id}-label`}
                    htmlFor={`${id}-control`}
                    className={cn(
                      'mbc:text-sm mbc:font-semibold mbc:leading-5',
                      problem && 'mbc:text-destructive'
                    )}
                  >
                    {label(field)}
                    {(field.isRequired || isEntityField(field)) && (
                      <RequiredMark />
                    )}
                  </label>
                  <div className="mbc:relative mbc:mt-2">
                    <Renderer
                      field={field}
                      value={values[name] ?? ''}
                      onChange={(value) =>
                        setValues((current) => ({ ...current, [name]: value }))
                      }
                      onBlur={() => {}}
                      id={`${id}-control`}
                      labelId={`${id}-label`}
                      describedBy={describedBy}
                      invalid={problem !== undefined}
                      disabled={readOnly || (isCode && mode === 'edit')}
                    />
                    {description && (
                      <p
                        id={`${id}-description`}
                        className="mbc:text-muted-foreground mbc:mt-1.5 mbc:text-xs"
                      >
                        ※{description}
                      </p>
                    )}
                    {problem && (
                      <p
                        id={`${id}-error`}
                        className="mbc:text-destructive mbc:mt-2 mbc:text-xs mbc:font-semibold"
                      >
                        {problem}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </form>
      <div className="mbc:flex mbc:justify-center mbc:pt-10">{back}</div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (192 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): MasterDataEditor"
```

---

### Task 5: Exports, playground page, smoke app, docs

**Files:**

- Modify: `packages/master-web/src/index.ts`, `packages/master-web/test/exports.test.tsx`
- Modify: `apps/playground/src/master-pages.tsx`, `apps/next-smoke/app/master-screens.tsx`
- Modify: `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`

**Interfaces:**

- Produces: the root entry exports `MasterDataEditor`, `type MasterDataEditorProps`, `defaultRenderers`, and the types `FieldRenderer`, `FieldRendererProps` and `FieldRenderers`. `rendererType`, `ConfirmButton` and the failure helpers stay internal.
- The playground gains `#master/newData/<setting id>` and `#master/dataItem/<setting id>/<id>`, reached through the data list's 新規登録 button and code links:
  - PRODUCT's records live in an in-memory store, so saves, deletes and restores show in the list;
  - its code is auto-numbered (P-027, P-028, …);
  - P-025 belongs to another tenant, so it opens read-only.

- [ ] **Step 1: Write the failing test**

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
        'BulkImportDialog',
```

with:

<!-- prettier-ignore -->
```tsx
        'BulkImportDialog',
        'defaultRenderers',
        'MasterDataEditor',
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/test/exports.test.tsx`
Expected: FAIL in "exports the core from the root…": the root lacks `MasterDataEditor` and `defaultRenderers`.

- [ ] **Step 3: Implement the exports**

In `packages/master-web/src/index.ts`, replace:

<!-- prettier-ignore -->
```ts
  masterSettingMessages,
```

with:

<!-- prettier-ignore -->
```ts
  MasterDataEditor,
  type MasterDataEditorProps,
} from './data/master-data-editor'
export {
  defaultRenderers,
  type FieldRenderer,
  type FieldRendererProps,
  type FieldRenderers,
} from './renderers/registry'
export {
  masterSettingMessages,
```

- [ ] **Step 4: Add the playground page**

Replace the whole file:

`apps/playground/src/master-pages.tsx`:

```tsx
import {
  initialDataListState,
  initialSettingListState,
  MasterDataEditor,
  MasterDataList,
  MasterSettingEditor,
  MasterSettingList,
  parseMasterSetting,
  type BulkJsonItem,
  type ListSort,
  type MasterData,
  type MasterDataCreateBody,
  type MasterDataListItem,
  type MasterDataListState,
  type MasterDataUpdateBody,
  type MasterRouting,
  type MasterSetting,
  type MasterSettingCreateBody,
  type MasterSettingListItem,
  type MasterSettingListState,
  type MasterSettingUpdateBody,
  type SequenceFormat,
  type SettingOption,
} from '@mbc-cqrs-serverless/master-web'
import { useState } from 'react'

const TENANT = 'tenant-a'

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
  { code: 'SEQ#ORDER', name: '注文番号', format: 'O-%%no%%' },
]

const OPTIONS: SettingOption[] = [
  { key: 'copyOnTenantCreate', label: '新規テナント作成時に設定をコピー' },
]

function settingOf(code: string, name: string, tenant = TENANT): MasterSetting {
  const parsed = parseMasterSetting({
    id: `MASTER#${tenant}#MASTER_SETTING#${code}`,
    pk: `MASTER#${tenant}`,
    sk: `MASTER_SETTING#${code}`,
    code,
    name,
    version: 1,
    tenantCode: tenant,
    attributes: {
      description: `${name}のマスタ`,
      fields: [
        {
          physicalName: 'code',
          name: 'コード',
          dataType: code === 'PRODUCT' ? 'auto_number' : 'string',
          formatCode: code === 'PRODUCT' ? 'SEQ#PRODUCT' : undefined,
          dataFormat: code === 'PRODUCT' ? '%%no%%' : undefined,
          formatName: code === 'PRODUCT' ? '商品番号' : undefined,
          isRequired: true,
          isShowedOnList: true,
        },
        {
          physicalName: 'name',
          name: '名称',
          dataType: 'string',
          length: '255',
          isRequired: true,
          isShowedOnList: true,
        },
        {
          physicalName: 'seq',
          name: '並び順',
          dataType: 'number',
          isRequired: false,
          isShowedOnList: true,
        },
        {
          physicalName: 'price',
          name: '価格',
          dataType: 'number',
          min: '0',
          max: '100000',
          isRequired: true,
          isShowedOnList: true,
        },
        {
          physicalName: 'released',
          name: '発売日',
          dataType: 'date',
          defaultValue: '2026-10-07T00:00:00+09:00',
          isRequired: false,
          isShowedOnList: true,
        },
        {
          physicalName: 'spec',
          name: '仕様',
          dataType: 'json',
          defaultValue: { size: 'M' },
          isRequired: false,
          isShowedOnList: true,
        },
      ],
    },
  })
  if (!parsed.success) throw parsed.error
  return parsed.data
}

/** The playground's settings, kept while it runs; PREF belongs to another tenant. */
const store = new Map<string, MasterSetting>(
  [
    settingOf('PRODUCT', '商品'),
    settingOf('PREF', '都道府県', 'common'),
    ...Array.from({ length: 22 }, (_, i) =>
      settingOf(
        `EXTRA_${String(i + 1).padStart(2, '0')}`,
        `追加マスタ ${i + 1}`
      )
    ),
  ].map((setting) => [setting.id, setting])
)

const settingRows = (): MasterSettingListItem[] =>
  [...store.values()].map((setting) => ({
    id: setting.id,
    pk: setting.pk,
    sk: setting.sk,
    code: `MASTER_SETTING#${setting.code}`,
    name: setting.name,
    tenantCode: setting.tenantCode,
    attributes: { description: setting.attributes.description },
  }))

/** PRODUCT's records, kept while the playground runs; P-025 belongs to another tenant. */
const records = new Map<string, MasterData>(
  Array.from({ length: 26 }, (_, i): [string, MasterData] => {
    const code = `P-${String(i + 1).padStart(3, '0')}`
    const tenant = i === 24 ? 'common' : TENANT
    const record: MasterData = {
      id: `MASTER#${tenant}#PRODUCT#${code}`,
      pk: `MASTER#${tenant}`,
      sk: `PRODUCT#${code}`,
      code,
      name:
        i === 3
          ? '名前がとても長い商品で、表のセルで折り返されることを確かめるための行'
          : `商品 ${i + 1}`,
      version: 1,
      tenantCode: tenant,
      seq: i,
      isDeleted: i === 25,
      attributes: {
        code,
        price: String((i + 1) * 120),
        released: `2026-${String((i % 12) + 1).padStart(2, '0')}-07T00:00:00+09:00`,
        spec: i % 3 === 0 ? { size: 'L' } : {},
      },
    }
    return [record.id, record]
  })
)
let nextNumber = records.size + 1

const dataRows = (): MasterDataListItem[] =>
  [...records.values()].map((record) => ({
    id: record.id,
    pk: record.pk,
    sk: record.sk,
    masterCode: record.code,
    name: record.name,
    seq: record.seq,
    isDeleted: record.isDeleted,
    attributes: record.attributes,
  }))

function sorted<T>(
  rows: T[],
  sort: ListSort | undefined,
  value: (row: T, column: string) => string | number
) {
  if (!sort) return rows
  return [...rows].sort((a, b) => {
    const x = value(a, sort.column)
    const y = value(b, sort.column)
    const order = x < y ? -1 : x > y ? 1 : 0
    return sort.desc ? -order : order
  })
}

const pageOf = <T,>(rows: T[], state: { page: number; pageSize: number }) =>
  rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Pretends to import: one item finishes every 300 ms. */
async function fakeImport(
  items: BulkJsonItem[],
  onProgress: (done: number, total: number) => void
) {
  for (let done = 1; done <= items.length; done++) {
    await wait(300)
    onProgress(done, items.length)
  }
}

const routing: MasterRouting = {
  href: (to) =>
    to.screen === 'data'
      ? `#master/data/${encodeURIComponent(to.settingId)}`
      : to.screen === 'setting'
        ? `#master/setting/${encodeURIComponent(to.id)}`
        : to.screen === 'newData'
          ? `#master/newData/${encodeURIComponent(to.settingId)}`
          : to.screen === 'dataItem'
            ? `#master/dataItem/${encodeURIComponent(to.settingId)}/${encodeURIComponent(to.id)}`
            : `#master/${to.screen}`,
  navigate: (to) => {
    location.hash = routing.href(to)
  },
}

function SettingsPage() {
  const [state, setState] = useState<MasterSettingListState>(
    initialSettingListState
  )
  const matches = settingRows().filter(
    (row) =>
      row.code.includes(state.code) &&
      row.name.includes(state.name) &&
      String(row.attributes?.description ?? '').includes(state.keyword)
  )
  const rows = sorted(matches, state.sort, (row, column) =>
    column === 'name' ? row.name : row.code
  )
  return (
    <MasterSettingList
      items={pageOf(rows, state)}
      total={rows.length}
      state={state}
      onStateChange={setState}
      routing={routing}
      tenantCode={TENANT}
      onImport={fakeImport}
      onBack={() => {
        location.hash = ''
      }}
    />
  )
}

function SettingPage({ id }: { id?: string }) {
  const [setting, setSetting] = useState(() =>
    id === undefined ? undefined : store.get(id)
  )
  const save = async (
    body: MasterSettingCreateBody | MasterSettingUpdateBody
  ) => {
    await wait(600)
    if (!setting) {
      const created = settingOf(body.code, body.name)
      created.attributes = body.attributes
      store.set(created.id, created)
      routing.navigate({ screen: 'data', settingId: created.id })
      return
    }
    const next = {
      ...setting,
      name: body.name,
      attributes: body.attributes,
      version: setting.version + 1,
    }
    store.set(next.id, next)
    setSetting(next)
  }
  return (
    <MasterSettingEditor
      mode={id === undefined ? 'create' : 'edit'}
      setting={setting}
      routing={routing}
      tenantCode={TENANT}
      canCopy
      settingOptions={OPTIONS}
      formats={FORMATS}
      checkCodeUnique={async (code) => {
        await wait(200)
        return ![...store.values()].some((entry) => entry.code === code)
      }}
      onSave={save}
      onDelete={async () => {
        await wait(600)
        if (setting) store.delete(setting.id)
        routing.navigate({ screen: 'settings' })
      }}
    />
  )
}

function DataPage({ settingId }: { settingId: string }) {
  const [state, setState] = useState<MasterDataListState>(initialDataListState)
  const setting = store.get(settingId) ?? [...store.values()][0]!
  const source = setting.code === 'PRODUCT' ? dataRows() : []
  const matches = source.filter(
    (row) =>
      (row.masterCode ?? '').includes(state.code) &&
      row.name.includes(state.keyword) &&
      (state.isDeleted || !row.isDeleted)
  )
  const rows = sorted(matches, state.sort, (row, column) =>
    column === 'name'
      ? row.name
      : column === 'seq'
        ? (row.seq ?? 0)
        : (row.masterCode ?? '')
  )
  return (
    <MasterDataList
      setting={setting}
      items={pageOf(rows, state)}
      total={rows.length}
      state={state}
      onStateChange={setState}
      routing={routing}
      tenantCode={TENANT}
      onImport={fakeImport}
    />
  )
}

function DataEditorPage({ settingId, id }: { settingId: string; id?: string }) {
  const setting = store.get(settingId)
  const [data, setData] = useState(() =>
    id === undefined ? undefined : records.get(id)
  )
  const save = async (body: MasterDataCreateBody | MasterDataUpdateBody) => {
    await wait(600)
    if (!setting) return
    if (!data && 'code' in body) {
      const created: MasterData = {
        id: `MASTER#${TENANT}#${body.settingCode}#${body.code}`,
        pk: `MASTER#${TENANT}`,
        sk: `${body.settingCode}#${body.code}`,
        code: body.code,
        name: body.name,
        version: 1,
        tenantCode: TENANT,
        seq: body.seq,
        attributes: body.attributes,
      }
      records.set(created.id, created)
      routing.navigate({ screen: 'data', settingId })
      return
    }
    if (!data) return
    const next = { ...data, ...body, version: data.version + 1 }
    records.set(next.id, next)
    setData(next)
  }
  const mark = (isDeleted: boolean) => async () => {
    await wait(600)
    if (data) records.set(data.id, { ...data, isDeleted })
  }
  return (
    <MasterDataEditor
      mode={id === undefined ? 'create' : 'edit'}
      setting={setting}
      data={data}
      routing={routing}
      tenantCode={TENANT}
      checkCodeUnique={async (code) => {
        await wait(200)
        return ![...records.values()].some((record) => record.code === code)
      }}
      generateCode={async () => {
        await wait(300)
        return `P-${String(nextNumber++).padStart(3, '0')}`
      }}
      onSave={save}
      onDelete={mark(true)}
      onRestore={mark(false)}
    />
  )
}

/**
 * `#master` (settings list), `#master/newSetting`, `#master/setting/<id>`,
 * `#master/data/<setting id>`, `#master/newData/<setting id>` and
 * `#master/dataItem/<setting id>/<id>`, on in-memory data.
 */
export function MasterPage({ route }: { route: string }) {
  const [, screen, id, item] = route.split('/')
  const decoded = id === undefined ? undefined : decodeURIComponent(id)
  const itemId = item === undefined ? undefined : decodeURIComponent(item)
  return (
    <div style={{ padding: 16 }}>
      {screen === 'data' && decoded ? (
        <DataPage key={decoded} settingId={decoded} />
      ) : screen === 'newData' && decoded ? (
        <DataEditorPage key={`new:${decoded}`} settingId={decoded} />
      ) : screen === 'dataItem' && decoded && itemId ? (
        <DataEditorPage key={itemId} settingId={decoded} id={itemId} />
      ) : screen === 'setting' && decoded ? (
        <SettingPage key={decoded} id={decoded} />
      ) : screen === 'newSetting' ? (
        <SettingPage key="new" />
      ) : (
        <SettingsPage />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Render the editor in the Next smoke app**

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
  MASTER_FIELD_TYPES,
```

with:

<!-- prettier-ignore -->
```tsx
  MASTER_FIELD_TYPES,
  MasterDataEditor,
```

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      <MasterSettingEditor
```

with:

<!-- prettier-ignore -->
```tsx
      <MasterDataEditor
        mode="create"
        setting={setting}
        routing={routing}
        onSave={async () => {}}
      />
      <MasterSettingEditor
```

- [ ] **Step 6: Update the docs**

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
- `master-web` depends on `ui-web` and `client-web` (same version, `workspace:^`), `react-hook-form`, `zod` 4, `@dnd-kit/*`, `lucide-react`. Peer: `react`, `react-dom` `^18.2 || ^19`.
```

with:

<!-- prettier-ignore -->
```md
- `master-web` depends on `ui-web` and `client-web` (same version, `workspace:^`), `zod` 4, `@dnd-kit/*`, `lucide-react`. Peer: `react`, `react-dom` `^18.2 || ^19`.
```

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
**Field renderers.** `MasterDataEditor` renders each field with `renderers[field.dataType]`; `components={{ [dataType]: Renderer }}` replaces any of them (`FieldRendererProps`: `field`, `value`, `onChange`, `onBlur`, `disabled`, `invalid`, `describedBy`, `id`). Built-ins: input (`string`, `auto_number` read-only), number input, switch (`boolean`), date picker (ui-web `Calendar`), list input (`array`), textarea with JSON check (`json`), textarea with `maxRow` (`text-area`), textarea + preview (`text-html`, `text-markdown`).
```

with:

<!-- prettier-ignore -->
```md
**Field renderers.** `MasterDataEditor` renders each field with `defaultRenderers[field.dataType]`; `components={{ [dataType]: Renderer }}` replaces any of them (`FieldRendererProps`: `field`, `value`, `onChange`, `onBlur`, `disabled`, `invalid`, `describedBy`, `id`, and `labelId` for a control that is a group). Built-ins: input (`string`; a text area when `maxRow` > 1), read-only input naming its sequence (`auto_number`), number input, switch (`boolean`), date picker (ui-web `Calendar`), list input (`array`), monospace textarea (`json`), textarea (`text-area`, `text-html`, `text-markdown`; previews and rich editing come with `/editors`, M6, as an HTML preview needs a sanitizer). Unknown types render as `string`.
```

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
- **Forms:** validation from `/core` on submit; async code-uniqueness runs on submit (v0 ran it in `validate`); errors are linked to inputs (`aria-invalid`, `aria-describedby`) and focus moves to the first error on submit. The settings editor's two fixed forms (the setting, the field dialog) keep their values in component state; react-hook-form arrives with the data editor (M5), whose inputs come from the setting.
```

with:

<!-- prettier-ignore -->
```md
- **Forms:** validation from `/core` on submit; async code-uniqueness runs on submit (v0 ran it in `validate`); errors are linked to inputs (`aria-invalid`, `aria-describedby`) and focus moves to the first error on submit. Both editors keep their values in component state: the renderers are controlled (`value` / `onChange`), so react-hook-form would add a dependency without simplifying anything (rulings in M4 and M5).
```

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
- `auto_number` without `formatCode` sends the setting's `MASTER_SETTING#<code>` type code as v0 does (its outer variable); M5 confirms against the sequence backend and documents the result.
```

with:

<!-- prettier-ignore -->
```md
- `auto_number` without `formatCode` sends the setting's `MASTER_SETTING#<code>` type code as v0 does (its outer variable). The data editor asks the host's `generateCode(field, setting)` once per save (M5); M7's `createMasterApi` builds v0's two sequence requests, confirms them against the sequence backend and documents the result.
```

In `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, replace:

<!-- prettier-ignore -->
```md
  - Builds: renderer registry + `FieldRendererProps`; built-ins for all ten types; `components` override; form from `/core` validators with focus-first-error; view/edit mode; code locked after create; `generateCode` on save (once per save, StrictMode-safe); delete / restore confirms; JSON dialog; read-only mode; playground page.
```

with:

<!-- prettier-ignore -->
```md
  - Builds: renderer registry + `FieldRendererProps`; built-ins for all ten types; `components` override; form from `/core` validators with focus-first-error; view/edit mode; code locked after create; `generateCode` on save (once per save, StrictMode-safe); delete / restore confirms; JSON dialog; read-only mode; playground page. Also: `/core` `dataJson` / `parseDataJson` (the record JSON); a shared `ConfirmButton` and failure alert, which M4's editor now uses too. The sequence request bodies move to M7 (`createMasterApi`).
```

In `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, replace:

<!-- prettier-ignore -->
```md
  - Builds: `MasterCopyRequest`, `MasterCopyTaskList`, `MasterCopyTaskDetail` screens; `createMasterApi(client, { paths })` with every endpoint in §3.4 (bulk batches of 100, `expectedFinishes` per batch, ids encoded); hooks; seven connected pages; re-exports of `createMbcClient`, `MbcClientProvider` and the client errors; playground fake master backend (commands, tasks, sequence) and connected playground pages.
```

with:

<!-- prettier-ignore -->
```md
  - Builds: `MasterCopyRequest`, `MasterCopyTaskList`, `MasterCopyTaskDetail` screens; `createMasterApi(client, { paths })` with every endpoint in §3.4 (bulk batches of 100, `expectedFinishes` per batch, ids encoded; v0's two sequence requests behind the data editor's `generateCode`, checked against the sequence backend, §5); hooks; seven connected pages; re-exports of `createMbcClient`, `MbcClientProvider` and the client errors; playground fake master backend (commands, tasks, sequence) and connected playground pages.
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm typecheck && fnm exec --using=v24.13.0 -- pnpm smoke && grep -c "テキストを入力してください。" apps/next-smoke/.next/server/app/index.html`
Expected: PASS (master-web 192 tests); typecheck and the smoke build exit 0; grep prints `1`.

- [ ] **Step 8: Commit**

```bash
git add packages/master-web apps/playground apps/next-smoke docs
git commit -m "feat(master-web): export the data editor; playground page, smoke and docs for M5"
```

---

### Task 6: Gate and hand-back

**Files:** none (verification only).

- [ ] **Step 1: Format and lint**

Run: `fnm exec --using=v24.13.0 -- pnpm format:check && fnm exec --using=v24.13.0 -- pnpm lint`
Expected: both exit 0. If `format:check` lists files, run `fnm exec --using=v24.13.0 -- pnpm format`, check the diff is whitespace only, and commit it as `style: format`.

- [ ] **Step 2: Full gate on React 19**

Run: `fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke`
Expected: both exit 0; every test passes (780 in all after this plan).

- [ ] **Step 3: Full gate on React 18, then restore**

```bash
fnm exec --using=v24.13.0 -- pnpm use-react 18
fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke
fnm exec --using=v24.13.0 -- pnpm use-react 19
git status --porcelain
```

Expected: `verify` and `smoke` exit 0 on React 18; `git status --porcelain` prints nothing after the restore.

- [ ] **Step 4: Hand back**

Do not merge `m5-data-editor` into `main` and do not tick M5 in the orchestrator — an independent review comes first. Report: the branch name, the commit range (`git log --oneline main..m5-data-editor`), the gate results from Steps 2–3, and any step whose output did not match its `Expected:` line together with what you did about it.
