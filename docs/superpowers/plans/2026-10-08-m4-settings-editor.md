# M4 — Settings Editor Implementation Plan

> **For agentic workers:** Implement this plan task by task, in order. Every task is test-first: write the test, run it and watch it fail for the stated reason, write the code, run it and watch it pass, commit. If your harness has the superpowers skills, use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `MasterSettingEditor`, master v0's settings editor. It covers view and edit modes, save, delete with confirmation, and copy links. It edits the setting's code, name, description and host-specific option flags, and its fields: a sortable table and an add/edit dialog. Its JSON dialog edits, loads and downloads the whole setting. Another tenant's setting opens read-only.

**Architecture:** The screen is prop-driven. The host passes the stored setting and async callbacks (`checkCodeUnique`, `onSave`, `onDelete`); M7's connected page will supply them from the API.

- `/core` gains the React-free parts: form conversions, `toSettingPayload` (v0's request bodies) and `parseSettingJson` / `settingJson`.
- `json/JsonDialog` is a shared dialog for one setting or record (M5 reuses it).
- `settings/` holds the field dialog, the dnd-kit fields table and the editor.
- ui-web's destructive red is darkened so its text passes 4.5:1.

**Tech Stack:** TypeScript ~6.0 (`strict`, `noUncheckedIndexedAccess`), React 18/19, ui-web primitives (Radix), dnd-kit (core 6, sortable 10), lucide-react 1.52, Tailwind v4 with the `mbc:` prefix, Vitest + jsdom + Testing Library + axe-core, pnpm 10 workspace, Node 24.13 via fnm.

**Spec:** `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md` §3.2 (`MasterSettingEditor`, host-specific props), §4 (forms, fields table, accessibility). Orchestrator: `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, sub-plan M4.

## Orientation (read once)

- **Repository:** `/Users/uzumakiruto017/Workspace/self/lib-web/rebuild`, a pnpm monorepo:
  - `packages/ui-web`: UI primitives and i18n;
  - `packages/client-web`: HTTP and realtime;
  - `packages/survey-web`: finished, and the reference for conventions (its creator uses the same dnd-kit pattern);
  - `packages/master-web`: this work;
  - `apps/playground` (Vite) and `apps/next-smoke` (Next).
- **Start** from an up-to-date `main` (M3b merged): `git switch main && git switch -c m4-settings-editor`. Check that `packages/master-web/src/settings/master-setting-list.tsx` exists.
- **Commands:** run every command from the repository root, prefixed with `fnm exec --using=v24.13.0 --`.
  - Install and build once: `fnm exec --using=v24.13.0 -- pnpm install && fnm exec --using=v24.13.0 -- pnpm build`.
  - Packages import each other through their built `dist/`. After changing ui-web, run `pnpm --filter @mbc-cqrs-serverless/ui-web build` before testing against it.
- **Tests:** they sit next to the code (`src/**/x.test.tsx`); build-output and export tests sit in each package's `test/`. `pnpm vitest run <paths>` runs files; `pnpm vitest run --project master-web` runs a package.
- **What exists already:**
  - master-web `/core`:
    - `MasterSetting`, `MasterField`, `parseMasterSetting`;
    - `defaultSettingFields`, `FIXED_FIELD_NAMES`, `allowedFieldTypes`, `validateFieldDefinition`, `normalizeFieldDefinition`;
    - `fieldTypeOf` (`options`, `hasDefault`), `dateParts`;
    - `MasterError`.
  - `i18n/`:
    - the `master` namespace (`fieldTypes`, `validation`, `fieldDefinition`, `bulkDialog`, `table`);
    - `masterSetting` (`list`);
    - `formatMasterError`, `formatFieldDefinitionError`.
  - `routing/` (`MasterRouting`, `MasterLink`), `list/ListError`, `bulk/BulkImportDialog`, and the test fixture `test/fixtures/v0-master.ts` (`V0_SETTING`).
- **Look (user decision):** master screens use ui-web's controls as they are, one shared look with survey-web. From master v0 come layout, section structure, colour roles and Japanese text. Do not copy master v0's control classes.
- **Messages** follow ui-web's pattern:
  - a typed object per locale (`ja` default, `en`);
  - a message is a string or a function of named parameters;
  - a namespace registers itself by augmenting `MbcMessageRegistry`.
- **Edit steps** say "In `<file>`, replace:" followed by two code blocks. Find the first block's text in the file (it occurs exactly once) and replace it with the second. The `<!-- prettier-ignore -->` line above each of those blocks keeps the formatter from changing them; it is not part of the text. Every other code block headed by a file path is the whole file: create it, or replace it entirely.
- **The code in this plan has been run:** every task passes on its own, in order, and the full gate is green on the result. Type it exactly. If a step's output differs from its `Expected:` line, stop and find out why before changing anything.

## Global Constraints

- No `process.env`, `console.*`, `any`, `next`, axios or other host libraries in `packages/*/src` (lint enforces it). No React-19-only APIs.
- No reading or writing a ref during render (lint: `react-hooks/refs`).
- `"use client"` on every module that renders (a build test checks it). `packages/master-web/src/core/**` imports only zod and its own files.
- Every UI string comes from messages. Roots and portal content render `data-mbc` (ui-web primitives do this).
- Settings stay v0-compatible: attribute keys and field keys this editor does not know survive a load-and-save.
- survey-web's public API and tests must keep passing unchanged.
- No consumer-specific names in code, tests, fixtures, docs or commit messages.
- Change only the files each task lists, plus `pnpm-lock.yaml` when a task adds a dependency.
- Commits follow Conventional Commits, one per task, with the messages given. Append your tool's co-author trailer if it adds one.

## Review Focus

Each item is pinned by a test in the task that owns it:

1. **A setting owned by another tenant (including `common`)** opens read-only, with a way back. It offers no Edit, Delete, JSON dialog, field changes or copy links. _Task 7: "opens another tenant's setting read-only with a way back"._
2. **Keys this editor does not know** survive a save: attribute keys (`extraFlag`), field keys, and option flags the host did not pass. A JSON default that v0 stored as a string stays a string. _Task 2: "updates the attributes and keeps keys this editor does not know", "edits a JSON default as text and stores it parsed again"; Task 7: "opens a stored setting for viewing, then edits and saves it"._
3. **A setting JSON with wrong keys, duplicate physical names or a bad default** is refused, naming the field; the form stays as it was. Applying a good JSON in edit mode keeps the stored code. _Task 3: "names the first field the field dialog would refuse"; Task 7: "applies a setting JSON to the form, keeping the stored code"._
4. **A save or delete that fails or times out** leaves the editor where it was and says so. A timeout says the outcome is unknown. Save stays available to retry. _Task 7: "says when saving failed, and when the outcome is unknown", "deletes after confirmation and says when it failed"._
5. **Reordering without a mouse and server rendering:** fields move with the keyboard, with translated announcements, and the table and the editor render with `renderToString`. _Task 6: "moves a field with the keyboard and says so"; Tasks 6 and 7: the axe / server tests._

## Rulings already made (do not undo)

- **Component state, not react-hook-form,** for the editor's two fixed forms (the setting and the field dialog). Validation comes from `/core` on submit; errors are linked to their inputs and the first one gets focus. react-hook-form arrives with M5's data editor, whose inputs come from the setting. Task 8 updates the spec.
- **One type list:** v0's "文字列（複数行）" plus a separate "エディタ" select becomes one select of the ten types (`master.fieldTypes` labels), filtered by `allowedFieldTypes`. Only the code field can be auto-numbered. The text-area type gets a "最大行数" input (v0 stored `maxRow` but had no input for it).
- **Default-value inputs are plain controls:** text, number, date, a switch, or a text area (monospace for JSON). M6's rich editors may replace them later.
- **Fixed fields:** a stored setting without a `code` field gets only the fixed fields it lacks, in front. v0 added all three, duplicating `name` and `seq`.
- **The edit dialog is titled 項目編集;** v0 titled both dialogs 項目追加.
- **Cancel restores the stored values.** v0 only switched back to view mode, leaving unsaved edits on screen.
- **Save is disabled until something changes** in edit mode (v0). After an update the editor shows the saved values in view mode; after a create, navigating is the host's (M7's page goes to the new setting's data list, as v0 did).
- **The JSON dialog shows the setting as it will be saved,** with JSON defaults as objects. v0 showed the editor's text form and encoded JSON defaults twice on apply. In edit mode, the JSON's `code` is ignored, because a stored setting's code cannot change. Applying checks every field with the field dialog's rules (an M2 review note).
- **Sequences for auto-numbering come in through the `formats` prop** (`{ code, name, format }`). Choosing one stores `formatCode`, `dataFormat` and `formatName`, as v0 did. The table falls back to the stored `formatName` when the code is unknown; v0 showed "undefined".
- **The copy link reads "テナントへコピー".** v0's label named one host's kind of tenant; hosts can override it through messages. The links go to the `copyRequest` and `copyTasks` targets (M7 builds those screens).
- **Fields table columns are pinned only from `md` up.** v0 pinned three columns (392px), which covered the whole table at 375px.
- **ui-web's destructive red becomes `#dc2626`,** which is 4.83:1 with white text and on white; `#ef4444` measured 3.76:1. survey-web's error text and delete buttons get it too.
- **`JsonDialog` is shared** (M5's data editor reuses it). `BulkImportDialog` keeps its own UI and now shares the file helpers.
- **Removing a field needs no confirmation** (v0): nothing is saved until 保存.
- **Another tenant's setting shows 戻る twice,** in the button bar and below the form, as in v0.

---

### Task 1: ui-web destructive red at 4.5:1

**Files:**

- Modify: `packages/ui-web/src/styles/tokens.css`
- Test: `packages/ui-web/test/build/css-output.test.ts`

**Interfaces:**

- Produces: the light theme's `--mbc-destructive` is `hsl(0 72.2% 50.6%)`, which the build writes as `#dc2626` (4.83:1 with white text and on white). Task 5's required marks and Task 7's delete button use it. The dark theme does not change.

- [ ] **Step 1: Write the failing test**

In `packages/ui-web/test/build/css-output.test.ts`, replace:

<!-- prettier-ignore -->
```ts
  it('compiles classes from every primitive', () => {
```

with:

<!-- prettier-ignore -->
```ts
  it('uses a destructive red that keeps 4.5:1 with white, as text and as a background', () => {
    // hsl(0 72.2% 50.6%) in tokens.css: 4.83:1 against white (#ef4444 was 3.76:1).
    expect(unlayeredCss).toContain('--mbc-destructive:#dc2626')
  })

  it('compiles classes from every primitive', () => {
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web build && fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/test/build/css-output.test.ts`
Expected: FAIL in "uses a destructive red that keeps 4.5:1…"; the other 16 pass.

- [ ] **Step 3: Implement**

In `packages/ui-web/src/styles/tokens.css`, replace:

<!-- prettier-ignore -->
```css
  --mbc-destructive: hsl(0 84.2% 60.2%);
```

with:

<!-- prettier-ignore -->
```css
  --mbc-destructive: hsl(0 72.2% 50.6%);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/ui-web build && fnm exec --using=v24.13.0 -- pnpm vitest run packages/ui-web/test/build/css-output.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ui-web
git commit -m "fix(ui-web): a destructive red that passes 4.5:1"
```

---

### Task 2: Setting form helpers and request bodies (`/core`)

**Files:**

- Create: `packages/master-web/src/core/setting-form.ts`
- Test: `packages/master-web/src/core/setting-form.test.ts`

**Interfaces:**

- Consumes: `defaultSettingFields`, `normalizeFieldDefinition` (M2), `MasterError`, `MasterField`, `MasterSetting`, `MasterSettingAttributes`.
- Produces:
  - `type SequenceFormat = { code; name; format }`;
  - `type SettingOption = { key; label }`;
  - `type SettingFormValues = { code; name; description; options: Record<string, boolean> }`;
  - `type MasterSettingCreateBody = { code; name; attributes; settingValue }` and `type MasterSettingUpdateBody = { code; name; attributes }`;
  - `fieldToForm(field)` / `fieldFromForm(field)`. The editor holds a JSON default as text and a boolean default as `'true'` / `'false'`; storing parses the JSON (a string that does not parse stays as it is), stores a boolean, and sets `uiComponent: 'string'` (v0).
  - `settingToForm(setting | undefined, optionKeys)` → `{ values, fields }`; a stored setting without a `code` field gets the fixed fields it lacks, in front.
  - `formatCodeOf(field, formats)`: the field's `formatCode`, or a `dataFormat` that names a format's code, else `''`.
  - `applyFieldDialog(field, format | undefined)`: `normalizeFieldDefinition`, plus the chosen sequence's `formatCode` / `dataFormat` / `formatName` on `auto_number`; it drops the sequence keys (`dataFormat`, `formatCode`, `formatName`, `prefix`, `postfix`) on other types.
  - `validateSettingForm(values)` → `{ code?, name? }` of `MasterError` (`required`, `blank`).
  - `toSettingPayload(values, fields, { mode: 'create' } | { mode: 'update'; previous })`:
    - create trims the code and sends the attributes twice (`settingValue`);
    - update keeps the previous attribute keys;
    - both write `values.options` and `description` into the attributes.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/core/setting-form.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { V0_SETTING } from '../../test/fixtures/v0-master'
import { defaultSettingFields } from './field-definition'
import { parseMasterSetting } from './parse'
import {
  applyFieldDialog,
  fieldFromForm,
  fieldToForm,
  formatCodeOf,
  settingToForm,
  toSettingPayload,
  validateSettingForm,
  type SequenceFormat,
} from './setting-form'
import type { MasterField, MasterSetting } from './types'

function stored(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
  { code: 'SEQ#ORDER', name: '注文番号', format: 'O-%%no%%' },
]

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'memo',
  name: 'メモ',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
  ...overrides,
})

describe('settingToForm', () => {
  it('starts a new setting with empty inputs and v0’s three fixed fields', () => {
    const form = settingToForm(undefined, ['flagA'])
    expect(form.values).toEqual({
      code: '',
      name: '',
      description: '',
      options: { flagA: false },
    })
    expect(form.fields).toEqual(defaultSettingFields)
    expect(form.fields[0]).not.toBe(defaultSettingFields[0])
  })

  it('reads a stored setting, its option flags and its fields', () => {
    const setting = stored()
    setting.attributes.flagA = true
    const form = settingToForm(setting, ['flagA', 'flagB'])
    expect(form.values).toEqual({
      code: 'PRODUCT',
      name: '商品',
      description: '商品マスタ',
      options: { flagA: true, flagB: false },
    })
    expect(form.fields.map((f) => f.physicalName)).toEqual(
      setting.attributes.fields.map((f) => f.physicalName)
    )
  })

  it('adds the fixed fields a stored setting lacks, in front (v0)', () => {
    const setting = stored()
    setting.attributes.fields = [field({ physicalName: 'name', name: '名前' })]
    const names = settingToForm(setting, []).fields.map((f) => f.physicalName)
    expect(names).toEqual(['code', 'seq', 'name'])
  })
})

describe('field conversions', () => {
  it('edits a JSON default as text and stores it parsed again', () => {
    const json = field({ dataType: 'json', defaultValue: { size: 'L' } })
    const form = fieldToForm(json)
    expect(form.defaultValue).toBe('{"size":"L"}')
    expect(fieldFromForm(form).defaultValue).toEqual({ size: 'L' })
    // A JSON default v0 stored as a string survives the round trip.
    const text = field({ dataType: 'json', defaultValue: '{"a":1}' })
    expect(fieldFromForm(fieldToForm(text)).defaultValue).toBe('{"a":1}')
    expect(fieldFromForm(field({ dataType: 'json' })).defaultValue).toBe('')
  })

  it('edits a boolean default as "true" / "false" and stores a boolean (v0)', () => {
    expect(
      fieldToForm(field({ dataType: 'boolean', defaultValue: true }))
        .defaultValue
    ).toBe('true')
    expect(
      fieldFromForm(field({ dataType: 'boolean', defaultValue: 'true' }))
        .defaultValue
    ).toBe(true)
    expect(fieldFromForm(field({ dataType: 'boolean' })).defaultValue).toBe(
      false
    )
  })

  it('marks every stored field with v0’s uiComponent and keeps unknown keys', () => {
    const stored = fieldFromForm(field({ extra: 1, uiComponent: 'other' }))
    expect(stored).toMatchObject({ extra: 1, uiComponent: 'string' })
  })
})

describe('applyFieldDialog', () => {
  it('stores the chosen sequence as v0 did: its code, its format and its name', () => {
    const code = field({ physicalName: 'code', dataType: 'auto_number' })
    expect(applyFieldDialog(code, FORMATS[1])).toMatchObject({
      formatCode: 'SEQ#ORDER',
      dataFormat: 'O-%%no%%',
      formatName: '注文番号',
    })
  })

  it('drops options the type does not use, including the sequence', () => {
    const changed = field({
      dataType: 'number',
      length: '10',
      min: '1',
      formatCode: 'SEQ#ORDER',
      dataFormat: 'O-%%no%%',
      formatName: '注文番号',
      prefix: 'P',
    })
    const result = applyFieldDialog(changed, undefined)
    expect(result).toMatchObject({ min: '1' })
    for (const key of [
      'length',
      'formatCode',
      'dataFormat',
      'formatName',
      'prefix',
    ])
      expect(result).not.toHaveProperty(key)
  })
})

describe('formatCodeOf', () => {
  it('finds the sequence by its code, or by the format v0 sometimes stored there', () => {
    const code = (overrides: Partial<MasterField>) =>
      field({ physicalName: 'code', dataType: 'auto_number', ...overrides })
    expect(formatCodeOf(code({ formatCode: 'SEQ#ORDER' }), FORMATS)).toBe(
      'SEQ#ORDER'
    )
    expect(formatCodeOf(code({ dataFormat: 'SEQ#PRODUCT' }), FORMATS)).toBe(
      'SEQ#PRODUCT'
    )
    expect(formatCodeOf(code({ dataFormat: '%%no%%' }), FORMATS)).toBe('')
  })
})

describe('validateSettingForm', () => {
  it('needs a code and a name that are not only spaces', () => {
    const values = { code: '', name: '  ', description: '', options: {} }
    expect(validateSettingForm(values)).toEqual({
      code: { key: 'required' },
      name: { key: 'blank' },
    })
    expect(validateSettingForm({ ...values, code: 'A', name: 'B' })).toEqual({})
  })
})

describe('toSettingPayload', () => {
  const values = {
    code: ' NEW ',
    name: '新規',
    description: '説明',
    options: { flagA: true },
  }

  it('creates with a trimmed code and the attributes twice, as settingValue too (v0)', () => {
    const body = toSettingPayload(values, settingToForm(undefined, []).fields, {
      mode: 'create',
    })
    expect(body).toEqual({
      code: 'NEW',
      name: '新規',
      attributes: body.attributes,
      settingValue: body.attributes,
    })
    expect(body.attributes).toMatchObject({ description: '説明', flagA: true })
    expect(body.attributes.fields).toHaveLength(3)
  })

  it('updates the attributes and keeps keys this editor does not know', () => {
    const previous = stored()
    const form = settingToForm(previous, [])
    const body = toSettingPayload(
      { ...form.values, name: '商品2' },
      form.fields,
      { mode: 'update', previous }
    )
    expect(body).not.toHaveProperty('settingValue')
    expect(body).toMatchObject({ code: 'PRODUCT', name: '商品2' })
    expect(body.attributes.extraFlag).toBe(true)
    expect(body.attributes.fields).toHaveLength(
      previous.attributes.fields.length
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/core/setting-form.test.ts`
Expected: FAIL: `./setting-form` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/core/setting-form.ts`:

```ts
import type { MasterError } from './errors'
import {
  defaultSettingFields,
  normalizeFieldDefinition,
} from './field-definition'
import type {
  MasterField,
  MasterSetting,
  MasterSettingAttributes,
} from './types'

/**
 * A sequence the code field can number from (v0: the records of the
 * `sequence_setting` master). `format` is stored as the field's `dataFormat`.
 */
export type SequenceFormat = { code: string; name: string; format: string }

/** An extra on/off flag stored in `attributes[key]`, for hosts whose backend reads one. */
export type SettingOption = { key: string; label: string }

export type SettingFormValues = {
  code: string
  name: string
  description: string
  /** `SettingOption` flags by key. */
  options: Record<string, boolean>
}

/** `POST /api/master-setting` body. */
export type MasterSettingCreateBody = {
  code: string
  name: string
  attributes: MasterSettingAttributes
  /** v0 sends the attributes twice; the backend reads this one on create. */
  settingValue: MasterSettingAttributes
}

/** `PUT /api/master-setting/:id` body. */
export type MasterSettingUpdateBody = {
  code: string
  name: string
  attributes: MasterSettingAttributes
}

/**
 * A field as the editor holds it: a JSON default as text, a boolean default
 * as 'true' / 'false'. Everything else as stored.
 */
export function fieldToForm(field: MasterField): MasterField {
  const { defaultValue } = field
  if (field.dataType === 'json' && defaultValue)
    return { ...field, defaultValue: JSON.stringify(defaultValue) }
  if (field.dataType === 'boolean' && typeof defaultValue === 'boolean')
    return { ...field, defaultValue: String(defaultValue) }
  return { ...field }
}

/** The stored shape of an editor field (v0's save): JSON parsed, booleans as booleans. */
export function fieldFromForm(field: MasterField): MasterField {
  const next: MasterField = { ...field, uiComponent: 'string' }
  const { defaultValue } = field
  if (field.dataType === 'boolean')
    next.defaultValue = defaultValue === true || defaultValue === 'true'
  if (field.dataType === 'json') {
    if (typeof defaultValue !== 'string' || defaultValue === '')
      next.defaultValue = defaultValue || ''
    else {
      try {
        next.defaultValue = JSON.parse(defaultValue)
      } catch {
        next.defaultValue = defaultValue
      }
    }
  }
  return next
}

/**
 * The editor's starting point. A stored setting without a `code` field gets
 * the fixed fields it lacks in front (v0 added them on load).
 */
export function settingToForm(
  setting: Pick<MasterSetting, 'code' | 'name' | 'attributes'> | undefined,
  optionKeys: readonly string[]
): { values: SettingFormValues; fields: MasterField[] } {
  const attributes = setting?.attributes
  const options = Object.fromEntries(
    optionKeys.map((key) => [key, attributes?.[key] === true])
  )
  const values: SettingFormValues = {
    code: setting?.code ?? '',
    name: setting?.name ?? '',
    description:
      typeof attributes?.description === 'string' ? attributes.description : '',
    options,
  }
  const stored = attributes?.fields ?? []
  const names = new Set(stored.map((field) => field.physicalName))
  const missing = names.has('code')
    ? []
    : defaultSettingFields.filter((field) => !names.has(field.physicalName))
  const fields = [...missing, ...stored].map(fieldToForm)
  return { values, fields }
}

/** The sequence a code field uses: its `formatCode`, or a `dataFormat` that names one. */
export function formatCodeOf(
  field: MasterField,
  formats: readonly SequenceFormat[]
): string {
  if (field.formatCode) return field.formatCode
  return formats.find((format) => format.code === field.dataFormat)?.code ?? ''
}

const SEQUENCE_KEYS = [
  'dataFormat',
  'formatCode',
  'formatName',
  'prefix',
  'postfix',
] as const

/**
 * A field as the field dialog saves it: `normalizeFieldDefinition`, plus the
 * chosen sequence on an `auto_number` field (v0 stored its code, format and
 * name) or no sequence keys on any other type.
 */
export function applyFieldDialog(
  field: MasterField,
  format: SequenceFormat | undefined
): MasterField {
  const next = normalizeFieldDefinition(field)
  if (field.dataType !== 'auto_number') {
    for (const key of SEQUENCE_KEYS) delete next[key]
    return next
  }
  if (format) {
    next.formatCode = format.code
    next.dataFormat = format.format
    next.formatName = format.name
  }
  return next
}

/** v0's checks of the code and name inputs. */
export function validateSettingForm(
  values: SettingFormValues
): Partial<Record<'code' | 'name', MasterError>> {
  const errors: Partial<Record<'code' | 'name', MasterError>> = {}
  for (const key of ['code', 'name'] as const) {
    if (values[key] === '') errors[key] = { key: 'required' }
    else if (values[key].trim() === '') errors[key] = { key: 'blank' }
  }
  return errors
}

export function toSettingPayload(
  values: SettingFormValues,
  fields: readonly MasterField[],
  options: { mode: 'create' }
): MasterSettingCreateBody
export function toSettingPayload(
  values: SettingFormValues,
  fields: readonly MasterField[],
  options: { mode: 'update'; previous: MasterSetting }
): MasterSettingUpdateBody
/**
 * v0's request bodies. On update, attribute keys this editor does not know
 * are kept; option flags are written only for the given `values.options`.
 */
export function toSettingPayload(
  values: SettingFormValues,
  fields: readonly MasterField[],
  options: { mode: 'create' } | { mode: 'update'; previous: MasterSetting }
): MasterSettingCreateBody | MasterSettingUpdateBody {
  const previous = options.mode === 'update' ? options.previous.attributes : {}
  const attributes: MasterSettingAttributes = {
    ...previous,
    ...values.options,
    description: values.description,
    fields: fields.map(fieldFromForm),
  }
  if (options.mode === 'update')
    return { code: values.code, name: values.name, attributes }
  return {
    code: values.code.trim(),
    name: values.name,
    attributes,
    settingValue: attributes,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (127 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): setting form helpers and request bodies in /core"
```

---

### Task 3: The setting JSON (`/core`) and the new `/core` exports

**Files:**

- Create: `packages/master-web/src/core/setting-json.ts`
- Test: `packages/master-web/src/core/setting-json.test.ts`
- Modify: `packages/master-web/src/core/index.ts`, `packages/master-web/test/exports.test.tsx`

**Interfaces:**

- Consumes: Task 2's `fieldToForm`, `fieldFromForm`, `SettingFormValues`; `validateFieldDefinition` (M2).
- Produces:
  - `settingJson(values, fields)`: pretty-printed `{ code, name, attributes }`, as the setting would be saved;
  - `parseSettingJson(text)` → `{ ok: true; setting: SettingJson } | { ok: false; error: SettingJsonError }`, where `SettingJsonError` is one of:
    - `{ key: 'invalidJson' }`;
    - `{ key: 'invalidSetting' }`: v0's checks of `code`, `name`, `attributes.fields` and each field's five keys;
    - `{ key: 'invalidField'; params: { n, name }; error: FieldDefinitionError }`: the first field the field dialog would refuse, each checked against the fields before it.
- `/core` (and the root) now also export `settingToForm`, `toSettingPayload`, `validateSettingForm`, `parseSettingJson`, `settingJson` and their types. `fieldToForm`, `fieldFromForm`, `applyFieldDialog` and `formatCodeOf` stay internal.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/core/setting-json.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterSetting } from './parse'
import { settingToForm } from './setting-form'
import { parseSettingJson, settingJson } from './setting-json'

function stored() {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

const minimal = (fields: unknown[]) =>
  JSON.stringify({ code: 'P', name: '商品', attributes: { fields } })

const FIELD = {
  physicalName: 'code',
  name: 'コード',
  dataType: 'string',
  isRequired: true,
  isShowedOnList: true,
}

describe('settingJson', () => {
  it('writes the code, name and attributes as they would be saved', () => {
    const setting = stored()
    const spec = setting.attributes.fields.find((f) => f.dataType === 'json')!
    spec.defaultValue = { size: 'L' }
    const form = settingToForm(setting, [])
    const json = JSON.parse(settingJson(form.values, form.fields))
    expect(Object.keys(json)).toEqual(['code', 'name', 'attributes'])
    expect(json.attributes.description).toBe('商品マスタ')
    // The JSON default is an object again, not the editor's text.
    expect(
      json.attributes.fields.find(
        (field: { dataType: string }) => field.dataType === 'json'
      ).defaultValue
    ).toEqual({ size: 'L' })
  })

  it('reads back what it wrote', () => {
    const form = settingToForm(stored(), [])
    const result = parseSettingJson(settingJson(form.values, form.fields))
    expect(result.ok).toBe(true)
    // Saving marks every field with v0's uiComponent.
    if (result.ok)
      expect(settingToForm(result.setting, []).fields).toEqual(
        form.fields.map((field) => ({ ...field, uiComponent: 'string' }))
      )
  })
})

describe('parseSettingJson', () => {
  it('refuses text that is not JSON', () => {
    expect(parseSettingJson('{')).toEqual({
      ok: false,
      error: { key: 'invalidJson' },
    })
  })

  it('needs a code, a name and fields with v0’s five keys', () => {
    const invalid = { ok: false, error: { key: 'invalidSetting' } }
    expect(parseSettingJson('[]')).toEqual(invalid)
    expect(
      parseSettingJson(JSON.stringify({ code: 'P', name: '', attributes: {} }))
    ).toEqual(invalid)
    expect(
      parseSettingJson(minimal([{ ...FIELD, isRequired: 'yes' }]))
    ).toEqual(invalid)
    expect(parseSettingJson(minimal([FIELD])).ok).toBe(true)
  })

  it('names the first field the field dialog would refuse', () => {
    const result = parseSettingJson(
      minimal([FIELD, { ...FIELD, name: '重複' }])
    )
    expect(result).toEqual({
      ok: false,
      error: {
        key: 'invalidField',
        params: { n: 2, name: 'code' },
        error: { key: 'duplicate' },
      },
    })
  })
})
```

The exports test lists every `/core` export. Add the new names:

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      'settingCodeOf',
      'toDataPayload',
      'toFormValues',
      'validateFieldDefinition',
      'validateMasterData',
```

with:

<!-- prettier-ignore -->
```tsx
      'parseSettingJson',
      'settingCodeOf',
      'settingJson',
      'settingToForm',
      'toDataPayload',
      'toFormValues',
      'toSettingPayload',
      'validateFieldDefinition',
      'validateMasterData',
      'validateSettingForm',
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/core/setting-json.test.ts`
Expected: FAIL: `./setting-json` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/core/setting-json.ts`:

```ts
import {
  validateFieldDefinition,
  type FieldDefinitionError,
} from './field-definition'
import {
  fieldFromForm,
  fieldToForm,
  type SettingFormValues,
} from './setting-form'
import type { MasterField, MasterSetting } from './types'

/** What the settings editor's JSON dialog edits. */
export type SettingJson = Pick<MasterSetting, 'code' | 'name' | 'attributes'>

export type SettingJsonError =
  | { key: 'invalidJson' }
  | { key: 'invalidSetting' }
  | {
      key: 'invalidField'
      /** `n` counts from 1; `name` is the field's physical name. */
      params: { n: number; name: string }
      error: FieldDefinitionError
    }

export type SettingJsonResult =
  { ok: true; setting: SettingJson } | { ok: false; error: SettingJsonError }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFilled = (value: unknown) => typeof value === 'string' && value !== ''

/** v0's check of one field's keys. */
function isField(value: unknown): value is MasterField {
  return (
    isObject(value) &&
    isFilled(value.physicalName) &&
    isFilled(value.name) &&
    isFilled(value.dataType) &&
    typeof value.isRequired === 'boolean' &&
    typeof value.isShowedOnList === 'boolean'
  )
}

/** The JSON the dialog opens with: the setting as it would be saved. */
export function settingJson(
  values: SettingFormValues,
  fields: readonly MasterField[]
): string {
  const setting = {
    code: values.code,
    name: values.name,
    attributes: {
      description: values.description,
      ...values.options,
      fields: fields.map(fieldFromForm),
    },
  }
  return JSON.stringify(setting, null, 2)
}

/**
 * v0's checks (an object with a code, a name and `attributes.fields`, each
 * field with its five keys), then the field dialog's rules on every field:
 * a setting the dialog could not have made is refused, naming the field.
 */
export function parseSettingJson(text: string): SettingJsonResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: { key: 'invalidJson' } }
  }
  if (
    !isObject(value) ||
    !isFilled(value.code) ||
    !isFilled(value.name) ||
    !isObject(value.attributes) ||
    !Array.isArray(value.attributes.fields) ||
    !value.attributes.fields.every(isField)
  )
    return { ok: false, error: { key: 'invalidSetting' } }

  const fields = value.attributes.fields.map(fieldToForm)
  for (const [index, field] of fields.entries()) {
    // Against the fields before it: of two duplicates, the second is named.
    const errors = validateFieldDefinition(field, fields.slice(0, index))
    const first = Object.values(errors)[0]
    if (first)
      return {
        ok: false,
        error: {
          key: 'invalidField',
          params: { n: index + 1, name: field.physicalName },
          error: first,
        },
      }
  }
  const setting = value as SettingJson
  return { ok: true, setting }
}
```

In `packages/master-web/src/core/index.ts`, replace:

<!-- prettier-ignore -->
```ts
export { parseMasterData, parseMasterSetting, type ParseResult } from './parse'
export {
```

with:

<!-- prettier-ignore -->
```ts
export { parseMasterData, parseMasterSetting, type ParseResult } from './parse'
export {
  settingToForm,
  toSettingPayload,
  validateSettingForm,
  type MasterSettingCreateBody,
  type MasterSettingUpdateBody,
  type SequenceFormat,
  type SettingFormValues,
  type SettingOption,
} from './setting-form'
export {
  parseSettingJson,
  settingJson,
  type SettingJson,
  type SettingJsonError,
  type SettingJsonResult,
} from './setting-json'
export {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (132 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): read and write a setting as JSON, checked like the field dialog"
```

---

### Task 4: The shared JSON dialog

**Files:**

- Create: `packages/master-web/src/json/json-file.ts`, `packages/master-web/src/json/json-dialog.tsx`
- Test: `packages/master-web/src/json/json-dialog.test.tsx`
- Modify: `packages/master-web/src/i18n/master-messages.ts`, `packages/master-web/src/bulk/bulk-import-dialog.tsx`

**Interfaces:**

- Produces:
  - `readJsonFile(event, onText)` and `downloadJson(text, fileName)`, which `BulkImportDialog` now uses too;
  - internal `JsonDialog({ text(): string; fileName; onApply(text): string | undefined; disabled? })`:
    - `text` is read each time the dialog opens;
    - `onApply` returns why the text was refused (shown in an alert; the dialog stays open), or `undefined` to close;
  - `master.jsonDialog` messages: `open`, `title`, `json`, `cancel`, `load`, `save`, `apply`.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/json/json-dialog.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { JsonDialog, type JsonDialogProps } from './json-dialog'

afterEach(() => vi.restoreAllMocks())

function setup(overrides: Partial<JsonDialogProps> = {}) {
  const onApply = vi.fn<JsonDialogProps['onApply']>(() => undefined)
  render(
    <JsonDialog
      text={() => '{"code":"P"}'}
      fileName="master-setting.json"
      onApply={onApply}
      {...overrides}
    />
  )
  return { onApply }
}

const open = () =>
  userEvent.click(screen.getByRole('button', { name: 'JSONエディタ' }))
const editor = () => screen.getByRole('textbox', { name: 'JSON' })

describe('JsonDialog', () => {
  it('opens with the current text, read when it opens', async () => {
    let current = '{"code":"A"}'
    setup({ text: () => current })
    current = '{"code":"B"}'
    await open()
    expect(screen.getByRole('dialog', { name: 'JSONエディタ' })).toBeVisible()
    expect(editor()).toHaveValue('{"code":"B"}')
  })

  it('applies the edited text and closes', async () => {
    const { onApply } = setup()
    await open()
    await userEvent.clear(editor())
    await userEvent.type(editor(), '{{}')
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(onApply).toHaveBeenCalledWith('{}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stays open and shows why when the text is refused', async () => {
    setup({ onApply: () => 'JSON が無効です。' })
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(screen.getByRole('alert')).toHaveTextContent('JSON が無効です。')
    expect(editor()).toHaveAttribute('aria-invalid', 'true')
    // Reopening starts clean.
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    await open()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('loads a JSON file and saves the text under its file name', async () => {
    setup()
    await open()
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    await userEvent.upload(
      input,
      new File(['{"code":"F"}'], 'x.json', { type: 'application/json' })
    )
    await waitFor(() => expect(editor()).toHaveValue('{"code":"F"}'))

    const created: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      created.push(blob as Blob)
      return 'blob:x'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('master-setting.json')
      })
    await userEvent.click(screen.getByRole('button', { name: 'JSON保存' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(await created[0]?.text()).toBe('{"code":"F"}')
  })

  it('has no axe violations while open', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <JsonDialog
            text={() => '{}'}
            fileName="x.json"
            onApply={() => undefined}
          />
        </main>
      </MbcProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'JSON editor' }))
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/json`
Expected: FAIL: `./json-dialog` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/json/json-file.ts`:

```ts
import type { ChangeEvent } from 'react'

/** Reads the chosen file as UTF-8 text, then clears the input so the same file can be chosen again. */
export function readJsonFile(
  event: ChangeEvent<HTMLInputElement>,
  onText: (text: string) => void
) {
  const input = event.currentTarget
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') onText(reader.result)
    input.value = ''
  }
  reader.onerror = () => {
    input.value = ''
  }
  reader.readAsText(file, 'UTF-8')
}

/** Saves the text as a JSON file through a temporary link. */
export function downloadJson(text: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
```

`packages/master-web/src/json/json-dialog.tsx`:

```tsx
'use client'

import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Download, Save, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { masterMessages } from '../i18n/master-messages'
import { downloadJson, readJsonFile } from './json-file'

export type JsonDialogProps = {
  /** The text the dialog opens with; read each time it opens. */
  text(): string
  /** The file name "JSON保存" saves under. */
  fileName: string
  /** Applies the text. Return why it was refused to keep the dialog open, or nothing to close it. */
  onApply(text: string): string | undefined
  disabled?: boolean
}

/** v0's JSON editor for one setting or record, as a normal dialog with a text box. */
export function JsonDialog({
  text,
  fileName,
  onApply,
  disabled = false,
}: JsonDialogProps) {
  const t = useMessages(masterMessages)
  const errorId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const changeOpen = (next: boolean) => {
    if (next) {
      setValue(text())
      setError(null)
    }
    setOpen(next)
  }

  const apply = () => {
    const refused = onApply(value)
    if (refused === undefined) setOpen(false)
    else setError(refused)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          {t.jsonDialog.open}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        // The textarea grows with its text: keep the buttons reachable.
        className="mbc:max-h-[calc(100dvh-2rem)] mbc:overflow-y-auto mbc:sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{t.jsonDialog.title}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={t.jsonDialog.json}
          aria-invalid={error !== null || undefined}
          aria-describedby={error !== null ? errorId : undefined}
          spellCheck={false}
          className="mbc:max-h-[50vh] mbc:min-h-[50vh] mbc:font-mono mbc:text-xs"
        />
        {error !== null && (
          <Alert variant="destructive" id={errorId} role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="mbc:gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            {t.jsonDialog.cancel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden />
            {t.jsonDialog.load}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            tabIndex={-1}
            aria-hidden
            className="mbc:hidden"
            onChange={(event) => readJsonFile(event, setValue)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadJson(value, fileName)}
          >
            <Download aria-hidden />
            {t.jsonDialog.save}
          </Button>
          <Button type="button" onClick={apply}>
            <Save aria-hidden />
            {t.jsonDialog.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

In `packages/master-web/src/i18n/master-messages.ts`, replace:

<!-- prettier-ignore -->
```ts
    partial: (params: { done: number; total: number }) => string
    failed: string
```

with:

<!-- prettier-ignore -->
```ts
    partial: (params: { done: number; total: number }) => string
    failed: string
  }
  /** The editors' JSON dialog (one setting or record). */
  jsonDialog: {
    open: string
    title: string
    json: string
    cancel: string
    load: string
    save: string
    apply: string
```

In `packages/master-web/src/i18n/master-messages.ts`, replace:

<!-- prettier-ignore -->
```ts
    failed: 'マスターデータの反映に失敗しました。',
  },
```

with:

<!-- prettier-ignore -->
```ts
    failed: 'マスターデータの反映に失敗しました。',
  },
  jsonDialog: {
    open: 'JSONエディタ',
    title: 'JSONエディタ',
    json: 'JSON',
    cancel: 'キャンセル',
    load: 'JSON読込',
    save: 'JSON保存',
    apply: 'データ反映',
  },
```

In `packages/master-web/src/i18n/master-messages.ts`, replace:

<!-- prettier-ignore -->
```ts
    failed: 'The import failed.',
  },
```

with:

<!-- prettier-ignore -->
```ts
    failed: 'The import failed.',
  },
  jsonDialog: {
    open: 'JSON editor',
    title: 'JSON editor',
    json: 'JSON',
    cancel: 'Cancel',
    load: 'Load JSON',
    save: 'Save JSON',
    apply: 'Apply',
  },
```

`BulkImportDialog` uses the shared file helpers. Its tests pin the behaviour.

In `packages/master-web/src/bulk/bulk-import-dialog.tsx`, replace:

<!-- prettier-ignore -->
```tsx
import { useId, useRef, useState, type ChangeEvent } from 'react'
```

with:

<!-- prettier-ignore -->
```tsx
import { useId, useRef, useState } from 'react'
```

In `packages/master-web/src/bulk/bulk-import-dialog.tsx`, replace:

<!-- prettier-ignore -->
```tsx
import { masterMessages } from '../i18n/master-messages'
```

with:

<!-- prettier-ignore -->
```tsx
import { masterMessages } from '../i18n/master-messages'
import { downloadJson, readJsonFile } from '../json/json-file'
```

In `packages/master-web/src/bulk/bulk-import-dialog.tsx`, replace:

<!-- prettier-ignore -->
```tsx
    }
  }

  const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setText(reader.result)
      input.value = ''
    }
    reader.onerror = () => {
      input.value = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'application/json' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = FILE_NAMES[screen]
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
```

with:

<!-- prettier-ignore -->
```tsx
    }
```

In `packages/master-web/src/bulk/bulk-import-dialog.tsx`, replace:

<!-- prettier-ignore -->
```tsx
            onChange={loadFile}
```

with:

<!-- prettier-ignore -->
```tsx
            onChange={(event) => readJsonFile(event, setText)}
```

In `packages/master-web/src/bulk/bulk-import-dialog.tsx`, replace:

<!-- prettier-ignore -->
```tsx
            onClick={download}
```

with:

<!-- prettier-ignore -->
```tsx
            onClick={() => downloadJson(text, FILE_NAMES[screen])}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (137 tests); typecheck exits 0. `bulk-import-dialog.test.tsx` passes unchanged.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): a JSON dialog for one setting or record, sharing the file helpers"
```

---

### Task 5: The field dialog and the editor's messages

**Files:**

- Create: `packages/master-web/src/form/required-mark.tsx`, `packages/master-web/src/settings/field-dialog.tsx`
- Test: `packages/master-web/src/settings/field-dialog.test.tsx`
- Modify: `packages/master-web/src/i18n/master-setting-messages.ts`

**Interfaces:**

- Consumes: Task 2's `applyFieldDialog`, `formatCodeOf`, `SequenceFormat`; M2's `allowedFieldTypes`, `FIXED_FIELD_NAMES`, `validateFieldDefinition`, `fieldTypeOf`; `dateParts`; `formatFieldDefinitionError`.
- Produces:
  - `masterSetting` messages with the editor's groups: `editor`, `fieldsTable`, `fieldDialog`, `dnd`, `json` (Tasks 6 and 7 use them);
  - internal `RequiredMark()`: v0's red `*`, hidden from screen readers, because the input carries `aria-required`;
  - internal `FieldDialog({ open; onOpenChange; field?; siblings; formats; onSubmit(field) })`:
    - `field` is in the editor's shape (`fieldToForm`); omit it to add a field;
    - the inputs follow `fieldTypeOf(draft).options` and `hasDefault`;
    - a fixed field (`code`, `name`, `seq`) keeps its name, flags and default, and offers only its own types;
    - submitting validates with `validateFieldDefinition(applyFieldDialog(draft, format), siblings)`, moves focus to the first error, and on success calls `onSubmit` then `onOpenChange(false)`;
    - its form stops `submit` from reaching the editor's form (portalled, but still inside the editor's React tree).

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/settings/field-dialog.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'

import { defaultSettingFields } from '../core/field-definition'
import type { SequenceFormat } from '../core/setting-form'
import type { MasterField } from '../core/types'
import { FieldDialog, type FieldDialogProps } from './field-dialog'

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
  { code: 'SEQ#ORDER', name: '注文番号', format: 'O-%%no%%' },
]

const [CODE, NAME] = defaultSettingFields as [MasterField, MasterField]

function setup(overrides: Partial<FieldDialogProps> = {}) {
  const onSubmit = vi.fn<FieldDialogProps['onSubmit']>()
  const onOpenChange = vi.fn<FieldDialogProps['onOpenChange']>()
  render(
    <FieldDialog
      open
      onOpenChange={onOpenChange}
      siblings={defaultSettingFields}
      formats={FORMATS}
      onSubmit={onSubmit}
      {...overrides}
    />
  )
  return { onSubmit, onOpenChange }
}

const input = (name: string) => screen.getByRole('textbox', { name })
const number = (name: string) => screen.getByRole('spinbutton', { name })
const submit = () =>
  userEvent.click(screen.getByRole('button', { name: '登録' }))

async function choose(label: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

describe('FieldDialog', () => {
  it('adds a field from the inputs its type uses', async () => {
    const { onSubmit, onOpenChange } = setup()
    expect(screen.getByRole('dialog', { name: '項目追加' })).toBeVisible()
    await userEvent.type(input('コード'), 'price')
    await userEvent.type(input('名称'), '価格')
    await choose('データ型', '数値')
    expect(screen.queryByRole('spinbutton', { name: '文字数' })).toBeNull()
    await userEvent.type(number('Min'), '0')
    await userEvent.type(number('Max'), '100')
    await userEvent.type(input('デフォルト値'), '10')
    await userEvent.click(screen.getByRole('switch', { name: '必須項目' }))
    await submit()
    expect(onSubmit).toHaveBeenCalledWith({
      physicalName: 'price',
      name: '価格',
      description: '',
      dataType: 'number',
      min: '0',
      max: '100',
      defaultValue: '10',
      isRequired: true,
      isShowedOnList: false,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows each type’s options and default input', async () => {
    setup()
    expect(number('文字数')).toBeInTheDocument()
    expect(input('正規表現パターン')).toBeInTheDocument()
    await choose('データ型', 'テキストエリア')
    expect(number('最大行数')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: '文字数' })).toBeNull()
    await choose('データ型', 'ブール値')
    expect(
      screen.getByRole('switch', { name: 'デフォルト値' })
    ).not.toBeChecked()
    await choose('データ型', '文字列(配列)')
    expect(screen.queryByLabelText('デフォルト値')).toBeNull()
    // Only the code field can be numbered automatically.
    await userEvent.click(screen.getByRole('combobox', { name: 'データ型' }))
    expect(screen.queryByRole('option', { name: '自動採番' })).toBeNull()
  })

  it('refuses a definition the setting cannot use and says why', async () => {
    const { onSubmit } = setup()
    await userEvent.type(input('コード'), 'name')
    await choose('データ型', 'JSON')
    await userEvent.type(input('デフォルト値'), '{{')
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    const code = input('コード')
    expect(code).toHaveAttribute('aria-invalid', 'true')
    expect(code).toHaveAccessibleDescription('同じ物理名の項目が既にあります。')
    expect(code).toHaveFocus()
    expect(input('名称')).toHaveAccessibleDescription('入力してください。')
    expect(input('デフォルト値')).toHaveAccessibleDescription(
      'デフォルト値は有効な JSON である必要があります。'
    )
  })

  it('keeps a fixed field’s name, flags and default, and offers its own types', async () => {
    const { onSubmit } = setup({
      field: CODE,
      siblings: defaultSettingFields.slice(1),
    })
    expect(screen.getByRole('dialog', { name: '項目編集' })).toBeVisible()
    expect(input('コード')).toBeDisabled()
    expect(screen.getByRole('switch', { name: '必須項目' })).toBeDisabled()
    expect(screen.queryByLabelText('デフォルト値')).toBeNull()
    await choose('データ型', '自動採番')
    await submit()
    expect(
      screen.getByRole('combobox', { name: 'フォーマット' })
    ).toHaveAccessibleDescription('選択してください。')
    await choose('フォーマット', '注文番号')
    await userEvent.type(input('接頭辞'), 'P-')
    await submit()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        physicalName: 'code',
        dataType: 'auto_number',
        formatCode: 'SEQ#ORDER',
        dataFormat: 'O-%%no%%',
        formatName: '注文番号',
        prefix: 'P-',
      })
    )
    expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty('length')
  })

  it('edits a field with its stored sequence chosen and unknown keys kept', async () => {
    const { onSubmit } = setup({
      field: {
        ...CODE,
        dataType: 'auto_number',
        dataFormat: '%%no%%',
        formatCode: 'SEQ#PRODUCT',
        extra: 'kept',
      },
      siblings: [NAME],
    })
    expect(
      screen.getByRole('combobox', { name: 'フォーマット' })
    ).toHaveTextContent('商品番号')
    await submit()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ extra: 'kept', formatCode: 'SEQ#PRODUCT' })
    )
  })

  it('cancels without saving', async () => {
    const { onSubmit, onOpenChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('has no axe violations', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <FieldDialog
            open
            onOpenChange={() => {}}
            siblings={[]}
            formats={FORMATS}
            onSubmit={() => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(screen.getByRole('dialog', { name: 'Add field' })).toBeVisible()
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/settings/field-dialog.test.tsx`
Expected: FAIL: `./field-dialog` cannot be resolved.

- [ ] **Step 3: Implement**

Replace the whole messages file (adds the editor's groups):

`packages/master-web/src/i18n/master-setting-messages.ts`:

```ts
import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

export type MasterSettingMessages = {
  /** The settings list. */
  list: {
    /** Accessible name of the table. */
    table: string
    code: string
    name: string
    description: string
    search: string
    clear: string
    create: string
    back: string
    loadFailed: string
    retry: string
  }
  /** The settings editor. */
  editor: {
    /** Accessible name of the button bar. */
    actions: string
    edit: string
    save: string
    cancel: string
    delete: string
    back: string
    copy: string
    copyResults: string
    basics: string
    fields: string
    code: string
    name: string
    description: string
    codeTaken: string
    readOnly: string
    loadFailed: string
    retry: string
    createFailed: string
    updateFailed: string
    deleteFailed: string
    failedHint: string
    /** A save or delete whose outcome is unknown (the wait for it timed out). */
    timeout: string
    deleteTitle: string
    deleteConfirm: string
  }
  /** The editor's fields table. */
  fieldsTable: {
    /** Accessible name of the table. */
    table: string
    /** Header of the drag-handle column (screen readers only). */
    move: string
    drag: (params: { name: string }) => string
    code: string
    name: string
    description: string
    dataType: string
    format: string
    rangeMin: string
    rangeMax: string
    defaultValue: string
    required: string
    showOnList: string
    actions: string
    actionsFor: (params: { name: string }) => string
    edit: string
    remove: string
    yes: string
    date: (params: { year: string; month: string; day: string }) => string
  }
  /** The add / edit field dialog. */
  fieldDialog: {
    add: string
    addTitle: string
    editTitle: string
    physicalName: string
    name: string
    dataType: string
    length: string
    pattern: string
    patternPlaceholder: string
    min: string
    max: string
    maxRow: string
    format: string
    prefix: string
    postfix: string
    defaultValue: string
    isRequired: string
    isShowedOnList: string
    description: string
    cancel: string
    submit: string
  }
  /** Moving fields with the keyboard or a pointer. */
  dnd: {
    roleDescription: string
    instructions: string
    pickedUp: (params: { label: string }) => string
    movedOver: (params: { label: string; over: string }) => string
    dropped: (params: { label: string; over: string }) => string
    droppedNowhere: (params: { label: string }) => string
    cancelled: (params: { label: string }) => string
  }
  /** Errors of the setting JSON (`SettingJsonError`). */
  json: {
    fileName: string
    invalidJson: string
    invalidSetting: string
    field: (params: { n: number; name: string }) => string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    masterSetting: MasterSettingMessages
  }
}

const ja: MasterSettingMessages = {
  list: {
    table: 'マスター設定一覧',
    code: 'コード',
    name: '名称',
    description: '説明',
    search: '検索',
    clear: 'クリア',
    create: '新規作成',
    back: '戻る',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
  },
  editor: {
    actions: '操作',
    edit: '編集',
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    back: '戻る',
    copy: 'テナントへコピー',
    copyResults: 'コピー結果を確認',
    basics: '名称登録',
    fields: '項目一覧',
    code: 'コード',
    name: '名称',
    description: '説明',
    codeTaken: '既にこのコードは登録されています。',
    readOnly: '他のテナントの設定のため、編集できません。',
    loadFailed: '読み込みに失敗しました。',
    retry: '再読み込み',
    createFailed: 'データ登録に失敗しました。',
    updateFailed: 'データ更新に失敗しました。',
    deleteFailed: 'データ削除に失敗しました。',
    failedHint: '入力内容を確認した上で再度やり直してください。',
    timeout:
      '時間内に結果を確認できませんでした。反映されたかどうか、読み込み直して確認してください。',
    deleteTitle: '削除してもよろしいですか？',
    deleteConfirm: '削除',
  },
  fieldsTable: {
    table: '項目一覧',
    move: '並べ替え',
    drag: ({ name }) => `「${name}」をドラッグして並べ替え`,
    code: 'コード',
    name: '名称',
    description: '説明',
    dataType: 'データ型',
    format: 'フォーマット',
    rangeMin: 'Min/Max',
    rangeMax: '文字数',
    defaultValue: 'デフォルト値',
    required: '必須',
    showOnList: '一覧表示',
    actions: 'アクション',
    actionsFor: ({ name }) => `「${name}」の操作`,
    edit: '編集',
    remove: '削除',
    yes: 'はい',
    date: ({ year, month, day }) => `${year}年${month}月${day}日`,
  },
  fieldDialog: {
    add: '項目追加',
    addTitle: '項目追加',
    editTitle: '項目編集',
    physicalName: 'コード',
    name: '名称',
    dataType: 'データ型',
    length: '文字数',
    pattern: '正規表現パターン',
    patternPlaceholder: '正規表現パターンを入力してください',
    min: 'Min',
    max: 'Max',
    maxRow: '最大行数',
    format: 'フォーマット',
    prefix: '接頭辞',
    postfix: '接尾辞',
    defaultValue: 'デフォルト値',
    isRequired: '必須項目',
    isShowedOnList: '一覧表示',
    description: '説明',
    cancel: 'キャンセル',
    submit: '登録',
  },
  dnd: {
    roleDescription: '並べ替え可能',
    instructions:
      'スペースキーで項目を持ち上げ、矢印キーで移動し、もう一度スペースキーで置きます。Escape キーで取り消します。',
    pickedUp: ({ label }) => `「${label}」を持ち上げました。`,
    movedOver: ({ label, over }) =>
      `「${label}」を「${over}」の位置に移動しました。`,
    dropped: ({ label, over }) =>
      `「${label}」を「${over}」の位置に置きました。`,
    droppedNowhere: ({ label }) => `「${label}」を元の位置に戻しました。`,
    cancelled: ({ label }) => `「${label}」の移動を取り消しました。`,
  },
  json: {
    fileName: 'master-setting.json',
    invalidJson:
      'JSON が無効です。正しいJSONフォーマットである必要があります。',
    invalidSetting:
      'JSON が無効です。code、name と attributes.fields（各項目に physicalName、name、dataType、isRequired、isShowedOnList）が必要です。',
    field: ({ n, name }) => `${n}件目の項目（${name}）: `,
  },
}

const en: MasterSettingMessages = {
  list: {
    table: 'Master settings',
    code: 'Code',
    name: 'Name',
    description: 'Description',
    search: 'Search',
    clear: 'Clear',
    create: 'Create',
    back: 'Back',
    loadFailed: 'Could not load the list.',
    retry: 'Reload',
  },
  editor: {
    actions: 'Actions',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    copy: 'Copy to tenants',
    copyResults: 'Copy results',
    basics: 'Setting',
    fields: 'Fields',
    code: 'Code',
    name: 'Name',
    description: 'Description',
    codeTaken: 'This code is already in use.',
    readOnly: 'This setting belongs to another tenant and cannot be edited.',
    loadFailed: 'Could not load the setting.',
    retry: 'Reload',
    createFailed: 'Could not create the setting.',
    updateFailed: 'Could not update the setting.',
    deleteFailed: 'Could not delete the setting.',
    failedHint: 'Check your input and try again.',
    timeout:
      'The result did not arrive in time. Reload to check whether the change was made.',
    deleteTitle: 'Delete this setting?',
    deleteConfirm: 'Delete',
  },
  fieldsTable: {
    table: 'Fields',
    move: 'Move',
    drag: ({ name }) => `Drag "${name}" to reorder`,
    code: 'Code',
    name: 'Name',
    description: 'Description',
    dataType: 'Type',
    format: 'Format',
    rangeMin: 'Min/Max',
    rangeMax: 'Length',
    defaultValue: 'Default',
    required: 'Required',
    showOnList: 'In list',
    actions: 'Actions',
    actionsFor: ({ name }) => `Actions for "${name}"`,
    edit: 'Edit',
    remove: 'Delete',
    yes: 'Yes',
    date: ({ year, month, day }) => `${year}-${month}-${day}`,
  },
  fieldDialog: {
    add: 'Add field',
    addTitle: 'Add field',
    editTitle: 'Edit field',
    physicalName: 'Code',
    name: 'Name',
    dataType: 'Type',
    length: 'Length',
    pattern: 'Pattern',
    patternPlaceholder: 'A regular expression',
    min: 'Min',
    max: 'Max',
    maxRow: 'Maximum lines',
    format: 'Format',
    prefix: 'Prefix',
    postfix: 'Suffix',
    defaultValue: 'Default',
    isRequired: 'Required',
    isShowedOnList: 'Show in list',
    description: 'Description',
    cancel: 'Cancel',
    submit: 'Save',
  },
  dnd: {
    roleDescription: 'sortable',
    instructions:
      'Press Space to pick up an item, use the arrow keys to move it, and press Space again to drop it. Press Escape to cancel.',
    pickedUp: ({ label }) => `Picked up "${label}".`,
    movedOver: ({ label, over }) =>
      `"${label}" moved to the position of "${over}".`,
    dropped: ({ label, over }) =>
      `"${label}" dropped at the position of "${over}".`,
    droppedNowhere: ({ label }) => `"${label}" returned to its place.`,
    cancelled: ({ label }) => `Moving "${label}" was cancelled.`,
  },
  json: {
    fileName: 'master-setting.json',
    invalidJson: 'The JSON is not valid.',
    invalidSetting:
      'The JSON needs code, name and attributes.fields (each field with physicalName, name, dataType, isRequired and isShowedOnList).',
    field: ({ n, name }) => `Field ${n} (${name}): `,
  },
}

export const masterSettingMessages = defineMessages('masterSetting', {
  ja,
  en,
})
```

`packages/master-web/src/form/required-mark.tsx`:

```tsx
'use client'

/** v0's red asterisk after a required input's label; the input itself says `aria-required`. */
export function RequiredMark() {
  return (
    <span aria-hidden className="mbc:text-destructive mbc:ml-1">
      *
    </span>
  )
}
```

`packages/master-web/src/settings/field-dialog.tsx`:

```tsx
'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import {
  allowedFieldTypes,
  FIXED_FIELD_NAMES,
  validateFieldDefinition,
  type FieldDefinitionError,
  type FieldDefinitionErrors,
} from '../core/field-definition'
import type { MasterFieldType } from '../core/field-type-names'
import { fieldTypeOf } from '../core/field-types'
import { dateParts } from '../core/list'
import {
  applyFieldDialog,
  formatCodeOf,
  type SequenceFormat,
} from '../core/setting-form'
import type { MasterField } from '../core/types'
import { RequiredMark } from '../form/required-mark'
import { formatFieldDefinitionError } from '../i18n/format-error'
import { masterMessages } from '../i18n/master-messages'
import { masterSettingMessages } from '../i18n/master-setting-messages'

export type FieldDialogProps = {
  open: boolean
  onOpenChange(open: boolean): void
  /** The field to edit, as the editor holds it (`fieldToForm`); omit to add one. */
  field?: MasterField
  /** The setting's other fields: physical names must be unique. */
  siblings: readonly MasterField[]
  /** Sequences an auto-numbered code field can use. */
  formats: readonly SequenceFormat[]
  onSubmit(field: MasterField): void
}

const NEW_FIELD: MasterField = {
  physicalName: '',
  name: '',
  description: '',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
}

const TEXTAREA_DEFAULTS = new Set([
  'json',
  'text-area',
  'text-html',
  'text-markdown',
])

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

function TextInput({
  label,
  value,
  onChange,
  error,
  type = 'text',
  disabled,
  placeholder,
  required = false,
}: {
  label: string
  value: unknown
  onChange(value: string): void
  error: string | undefined
  type?: 'text' | 'number' | 'date'
  disabled?: boolean
  placeholder?: string
  required?: boolean
}) {
  return (
    <Field invalid={error !== undefined}>
      <FieldLabel className="mbc:font-semibold">
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
      <Input
        type={type}
        value={text(value)}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-required={required || undefined}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

/** v0's add / edit field dialog; the inputs follow the chosen type. */
export function FieldDialog(props: FieldDialogProps) {
  const t = useMessages(masterSettingMessages)
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="mbc:max-h-[calc(100dvh-2rem)] mbc:overflow-y-auto mbc:sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>
            {props.field ? t.fieldDialog.editTitle : t.fieldDialog.addTitle}
          </DialogTitle>
        </DialogHeader>
        {/* Mounted while open: each opening starts from the given field. */}
        <FieldForm {...props} />
      </DialogContent>
    </Dialog>
  )
}

function FieldForm({
  field,
  siblings,
  formats,
  onSubmit,
  onOpenChange,
}: FieldDialogProps) {
  const t = useMessages(masterSettingMessages).fieldDialog
  const m = useMessages(masterMessages)
  const fixed =
    field !== undefined && FIXED_FIELD_NAMES.includes(field.physicalName)
  const [draft, setDraft] = useState<MasterField>(() =>
    field ? { ...field } : { ...NEW_FIELD }
  )
  const [format, setFormat] = useState(() =>
    field ? formatCodeOf(field, formats) : ''
  )
  const [errors, setErrors] = useState<FieldDefinitionErrors>({})
  const [attempts, setAttempts] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (attempts > 0)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
  }, [attempts])

  const type = fieldTypeOf(draft)
  const types = allowedFieldTypes(fixed ? field.physicalName : '')
  const message = (error: FieldDefinitionError | undefined) =>
    error && formatFieldDefinitionError(error, m.fieldDefinition)
  const set = (key: string, value: unknown) =>
    setDraft((current) => ({ ...current, [key]: value }))
  // v0: a new type starts from its empty default.
  const setType = (dataType: string) =>
    setDraft((current) => ({
      ...current,
      dataType,
      defaultValue: dataType === 'boolean' ? 'false' : '',
    }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    // The dialog is portalled but still inside the editor's React tree.
    event.stopPropagation()
    const chosen = formats.find((option) => option.code === format)
    const candidate = applyFieldDialog(draft, chosen)
    const found = validateFieldDefinition(candidate, siblings)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setAttempts((count) => count + 1)
      return
    }
    onSubmit(candidate)
    onOpenChange(false)
  }

  const date = dateParts(draft.defaultValue)
  const defaultInput =
    fixed || !type.hasDefault ? null : draft.dataType === 'boolean' ? (
      <Field invalid={errors.defaultValue !== undefined}>
        <FieldLabel className="mbc:font-semibold">{t.defaultValue}</FieldLabel>
        <Switch
          checked={draft.defaultValue === true || draft.defaultValue === 'true'}
          onCheckedChange={(checked) => set('defaultValue', String(checked))}
        />
        <FieldError>{message(errors.defaultValue)}</FieldError>
      </Field>
    ) : TEXTAREA_DEFAULTS.has(draft.dataType) ? (
      <Field
        invalid={errors.defaultValue !== undefined}
        className="mbc:md:col-span-2"
      >
        <FieldLabel className="mbc:font-semibold">{t.defaultValue}</FieldLabel>
        <Textarea
          value={text(draft.defaultValue)}
          onChange={(event) => set('defaultValue', event.target.value)}
          spellCheck={draft.dataType !== 'json'}
          className={cn(draft.dataType === 'json' && 'mbc:font-mono')}
        />
        <FieldError>{message(errors.defaultValue)}</FieldError>
      </Field>
    ) : (
      <TextInput
        label={t.defaultValue}
        type={draft.dataType === 'date' ? 'date' : 'text'}
        value={
          draft.dataType === 'date' && date
            ? `${date.year}-${date.month}-${date.day}`
            : draft.defaultValue
        }
        onChange={(value) => set('defaultValue', value)}
        error={message(errors.defaultValue)}
      />
    )

  return (
    <form ref={formRef} noValidate onSubmit={save}>
      <div className="mbc:grid mbc:gap-x-10 mbc:gap-y-4 mbc:md:grid-cols-2">
        <TextInput
          label={t.physicalName}
          value={draft.physicalName}
          onChange={(value) => set('physicalName', value)}
          error={message(errors.physicalName)}
          disabled={fixed}
          required
        />
        <TextInput
          label={t.name}
          value={draft.name}
          onChange={(value) => set('name', value)}
          error={message(errors.name)}
          required
        />
        <Field invalid={errors.dataType !== undefined}>
          <FieldLabel className="mbc:font-semibold">
            {t.dataType}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={draft.dataType}
            onValueChange={setType}
            disabled={fixed && types.length === 1}
          >
            <SelectTrigger className="mbc:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((option: MasterFieldType) => (
                <SelectItem key={option} value={option}>
                  {m.fieldTypes[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{message(errors.dataType)}</FieldError>
        </Field>
        {type.options.includes('maxRow') && (
          <TextInput
            label={t.maxRow}
            type="number"
            value={draft.maxRow}
            onChange={(value) => set('maxRow', value)}
            error={message(errors.maxRow)}
          />
        )}
        {type.options.includes('min') && (
          <div className="mbc:grid mbc:grid-cols-2 mbc:gap-x-10">
            <TextInput
              label={t.min}
              type="number"
              value={draft.min}
              onChange={(value) => set('min', value)}
              error={message(errors.min)}
            />
            <TextInput
              label={t.max}
              type="number"
              value={draft.max}
              onChange={(value) => set('max', value)}
              error={message(errors.max)}
            />
          </div>
        )}
        {type.options.includes('length') && (
          <TextInput
            label={t.length}
            type="number"
            value={draft.length}
            onChange={(value) => set('length', value)}
            error={message(errors.length)}
          />
        )}
        {type.options.includes('format') && (
          <>
            <Field invalid={errors.dataFormat !== undefined}>
              <FieldLabel className="mbc:font-semibold">
                {t.format}
                {draft.physicalName === 'code' && <RequiredMark />}
              </FieldLabel>
              <Select value={format || undefined} onValueChange={setFormat}>
                <SelectTrigger className="mbc:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{message(errors.dataFormat)}</FieldError>
            </Field>
            <TextInput
              label={t.prefix}
              value={draft.prefix}
              onChange={(value) => set('prefix', value)}
              error={undefined}
            />
            <TextInput
              label={t.postfix}
              value={draft.postfix}
              onChange={(value) => set('postfix', value)}
              error={undefined}
            />
          </>
        )}
        {defaultInput}
        {type.options.includes('pattern') && (
          <TextInput
            label={t.pattern}
            value={draft.pattern}
            onChange={(value) => set('pattern', value)}
            error={undefined}
            placeholder={t.patternPlaceholder}
          />
        )}
        <div className="mbc:flex mbc:items-start mbc:gap-10">
          <Field className="mbc:w-fit">
            <FieldLabel className="mbc:font-semibold">
              {t.isRequired}
            </FieldLabel>
            <Switch
              checked={draft.isRequired}
              onCheckedChange={(checked) => set('isRequired', checked)}
              disabled={fixed}
            />
          </Field>
          <Field className="mbc:w-fit">
            <FieldLabel className="mbc:font-semibold">
              {t.isShowedOnList}
            </FieldLabel>
            <Switch
              checked={draft.isShowedOnList}
              onCheckedChange={(checked) => set('isShowedOnList', checked)}
              disabled={fixed}
            />
          </Field>
        </div>
        <Field className="mbc:md:col-span-2">
          <FieldLabel className="mbc:font-semibold">{t.description}</FieldLabel>
          <Textarea
            value={text(draft.description)}
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>
      </div>
      <DialogFooter className="mbc:mt-8 mbc:gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t.cancel}
        </Button>
        <Button type="submit">{t.submit}</Button>
      </DialogFooter>
    </form>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (144 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): the add / edit field dialog"
```

---

### Task 6: The sortable fields table

**Files:**

- Modify: `packages/master-web/package.json` (dnd-kit, via `pnpm add`)
- Create: `packages/master-web/src/settings/fields-table.tsx`
- Test: `packages/master-web/src/settings/fields-table.test.tsx`

**Interfaces:**

- Consumes: Task 5's messages (`fieldsTable`, `dnd`); `SequenceFormat`; `FIXED_FIELD_NAMES`; `dateParts`.
- Produces: internal `FieldsTable({ rows: FieldRow[]; formats; readOnly; onMove(from, to); onEdit(key); onRemove(key) })` and `type FieldRow = { key: string; field: MasterField }`.
  - v0's columns: handle, code, name, description, type, sequence, Min/Max or length, default, required, in list, actions.
  - A drag handle per row is named after its field, with dnd-kit's keyboard sensor and translated announcements (survey-web's pattern).
  - A row menu offers edit, and remove for all but the fixed fields.
  - The handle, code and name columns are pinned from `md` up; on a phone the table keeps its width and scrolls.

- [ ] **Step 1: Add dnd-kit**

Run: `fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web add @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2`
Expected: `packages/master-web/package.json` lists the three packages, at the versions survey-web uses, and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Write the failing test**

`packages/master-web/src/settings/fields-table.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { defaultSettingFields } from '../core/field-definition'
import type { SequenceFormat } from '../core/setting-form'
import type { MasterField } from '../core/types'
import {
  FieldsTable,
  type FieldRow,
  type FieldsTableProps,
} from './fields-table'

const FORMATS: SequenceFormat[] = [
  { code: 'SEQ#PRODUCT', name: '商品番号', format: '%%no%%' },
]

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'memo',
  name: 'メモ',
  description: '',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: false,
  ...overrides,
})

const ROWS: FieldRow[] = [
  {
    key: 'f0',
    field: {
      ...defaultSettingFields[0]!,
      dataType: 'auto_number',
      formatCode: 'SEQ#PRODUCT',
    },
  },
  { key: 'f1', field: defaultSettingFields[1]! },
  {
    key: 'f2',
    field: field({
      physicalName: 'price',
      name: '価格',
      dataType: 'number',
      min: '1',
      max: '10',
      isRequired: true,
    }),
  },
  {
    key: 'f3',
    field: field({
      physicalName: 'released',
      name: '発売日',
      dataType: 'date',
      defaultValue: '2026-10-07T00:00:00+09:00',
      isShowedOnList: true,
    }),
  },
]

function setup(overrides: Partial<FieldsTableProps> = {}) {
  const props = {
    onMove: vi.fn<FieldsTableProps['onMove']>(),
    onEdit: vi.fn<FieldsTableProps['onEdit']>(),
    onRemove: vi.fn<FieldsTableProps['onRemove']>(),
  }
  render(
    <FieldsTable
      rows={ROWS}
      formats={FORMATS}
      readOnly={false}
      {...props}
      {...overrides}
    />
  )
  return props
}

const table = () => screen.getByRole('table', { name: '項目一覧' })
const row = (name: string) =>
  within(table()).getByRole('cell', { name }).closest('tr')!

function stackRects() {
  const rows = () => [...document.querySelectorAll<HTMLElement>('tbody tr')]
  for (const element of rows()) {
    element.getBoundingClientRect = () => {
      const top = rows().indexOf(element) * 50
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        bottom: top + 40,
        right: 800,
        width: 800,
        height: 40,
        toJSON: () => ({}),
      } as DOMRect
    }
  }
}

describe('FieldsTable', () => {
  it('shows v0’s columns: type, sequence, range, default and the two flags', () => {
    setup()
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(headers).toEqual([
      '並べ替え',
      'コード',
      '名称',
      '説明',
      'データ型',
      'フォーマット',
      'Min/Max文字数',
      'デフォルト値',
      '必須',
      '一覧表示',
      'アクション',
    ])
    expect(row('code')).toHaveTextContent('自動採番')
    expect(row('code')).toHaveTextContent('商品番号')
    expect(row('name')).toHaveTextContent('255')
    expect(row('price')).toHaveTextContent('1 ~ 10')
    expect(row('released')).toHaveTextContent('2026年10月07日')
    const flags = (name: string) =>
      within(row(name))
        .getAllByRole('cell')
        .slice(8, 10)
        .map((cell) => cell.textContent)
    expect(flags('price')).toEqual(['◯はい', ''])
    expect(flags('released')).toEqual(['', '◯はい'])
  })

  it('scrolls on a phone: the table keeps its width, columns stay in view from md up', () => {
    setup()
    expect(table()).toHaveClass('mbc:w-max', 'mbc:min-w-full')
    const [handle, code, name] = within(table()).getAllByRole('columnheader')
    for (const header of [handle, code, name])
      expect(header).toHaveClass('mbc:md:sticky')
    expect(code).not.toHaveClass('mbc:sticky')
    expect(within(row('price')).getByText('1 ~ 10')).toHaveClass(
      'mbc:whitespace-nowrap'
    )
  })

  it('edits any field and removes all but the fixed ones from the row menu', async () => {
    const { onEdit, onRemove } = setup()
    await userEvent.click(
      screen.getByRole('button', { name: '「価格」の操作' })
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }))
    expect(onRemove).toHaveBeenCalledWith('f2')
    await userEvent.click(
      screen.getByRole('button', { name: '「名称」の操作' })
    )
    expect(screen.queryByRole('menuitem', { name: '削除' })).toBeNull()
    await userEvent.click(screen.getByRole('menuitem', { name: '編集' }))
    expect(onEdit).toHaveBeenCalledWith('f1')
  })

  it('moves a field with the keyboard and says so', async () => {
    const { onMove } = setup()
    stackRects()
    const handle = screen.getByRole('button', {
      name: '「価格」をドラッグして並べ替え',
    })
    expect(handle).toHaveAttribute('aria-roledescription', '並べ替え可能')
    handle.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowUp}')
    expect(
      await screen.findByText('「価格」を「名称」の位置に移動しました。')
    ).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(onMove).toHaveBeenCalledWith(2, 1)
  })

  it('offers no moves or changes when read-only', () => {
    setup({ readOnly: true })
    for (const button of within(table()).getAllByRole('button'))
      expect(button).toBeDisabled()
  })

  it('has no axe violations and renders on the server', async () => {
    const element = (
      <MbcProvider locale="en">
        <main>
          <FieldsTable
            rows={ROWS}
            formats={FORMATS}
            readOnly={false}
            onMove={() => {}}
            onEdit={() => {}}
            onRemove={() => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(renderToString(element)).toContain('Fields')
    render(element)
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/settings/fields-table.test.tsx`
Expected: FAIL: `./fields-table` cannot be resolved.

- [ ] **Step 4: Implement**

`packages/master-web/src/settings/fields-table.tsx`:

```tsx
'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Edit3, GripVertical, MoreVertical, Trash2 } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'

import { FIXED_FIELD_NAMES } from '../core/field-definition'
import { isMasterFieldType } from '../core/field-type-names'
import { dateParts } from '../core/list'
import type { SequenceFormat } from '../core/setting-form'
import type { MasterField } from '../core/types'
import { masterMessages } from '../i18n/master-messages'
import {
  masterSettingMessages,
  type MasterSettingMessages,
} from '../i18n/master-setting-messages'

/** A field with a key that stays the same while fields move. */
export type FieldRow = { key: string; field: MasterField }

export type FieldsTableProps = {
  rows: readonly FieldRow[]
  formats: readonly SequenceFormat[]
  readOnly: boolean
  /** Moves the field at `from` to `to` (indexes into `rows`). */
  onMove(from: number, to: number): void
  onEdit(key: string): void
  onRemove(key: string): void
}

// v0 kept the handle, code and name columns in view while the table scrolls;
// on a phone they are wider than the screen, so only from md up.
const HANDLE = 'mbc:md:sticky mbc:left-0 mbc:z-10 mbc:w-[52px] mbc:min-w-[52px]'
const CODE =
  'mbc:md:sticky mbc:left-[52px] mbc:z-10 mbc:w-[170px] mbc:min-w-[170px]'
const NAME =
  'mbc:md:sticky mbc:left-[222px] mbc:z-10 mbc:w-[170px] mbc:min-w-[170px]'
const ACTIONS = 'mbc:md:sticky mbc:right-0 mbc:z-10 mbc:w-[72px]'
const HEAD =
  'mbc:bg-emphasis mbc:text-emphasis-foreground mbc:whitespace-nowrap mbc:text-center mbc:font-bold'
const BODY = 'mbc:bg-background'

const text = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

function label(field: MasterField) {
  return field.name || field.physicalName
}

function announcements(
  t: MasterSettingMessages['dnd'],
  name: (id: string) => string
): Announcements {
  const of = (id: string | number) => name(String(id))
  return {
    onDragStart: ({ active }) => t.pickedUp({ label: of(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t.movedOver({ label: of(active.id), over: of(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t.dropped({ label: of(active.id), over: of(over.id) })
        : t.droppedNowhere({ label: of(active.id) }),
    onDragCancel: ({ active }) => t.cancelled({ label: of(active.id) }),
  }
}

function SortableRow({
  row,
  readOnly,
  children,
}: {
  row: FieldRow
  readOnly: boolean
  children: ReactNode
}) {
  const t = useMessages(masterSettingMessages)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.key,
    disabled: readOnly,
    attributes: { roleDescription: t.dnd.roleDescription },
  })
  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: isDragging ? 'relative' : undefined,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      <TableCell className={cn(HANDLE, BODY)}>
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon"
          className="mbc:h-8 mbc:w-8 mbc:cursor-grab"
          {...attributes}
          {...listeners}
          disabled={readOnly}
          aria-label={t.fieldsTable.drag({ name: label(row.field) })}
        >
          <GripVertical aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  )
}

function Mark({ on, yes }: { on: boolean; yes: string }) {
  if (!on) return null
  return (
    <>
      <span aria-hidden>◯</span>
      <span className="mbc:sr-only">{yes}</span>
    </>
  )
}

/** v0's fields table: drag to reorder, edit or remove from each row's menu. */
export function FieldsTable({
  rows,
  formats,
  readOnly,
  onMove,
  onEdit,
  onRemove,
}: FieldsTableProps) {
  const messages = useMessages(masterSettingMessages)
  const t = messages.fieldsTable
  const m = useMessages(masterMessages)
  const dndId = useId()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const accessibility = useMemo(
    () => ({
      announcements: announcements(messages.dnd, (id) => {
        const row = rows.find((entry) => entry.key === id)
        return row ? label(row.field) : ''
      }),
      screenReaderInstructions: { draggable: messages.dnd.instructions },
    }),
    [messages.dnd, rows]
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = rows.findIndex((row) => row.key === active.id)
    const to = rows.findIndex((row) => row.key === over.id)
    if (from >= 0 && to >= 0) onMove(from, to)
  }

  const typeName = (field: MasterField) =>
    isMasterFieldType(field.dataType)
      ? m.fieldTypes[field.dataType]
      : field.dataType
  const formatName = (field: MasterField) => {
    if (field.dataType !== 'auto_number') return ''
    const code = field.formatCode || field.dataFormat
    return (
      formats.find((format) => format.code === code)?.name ??
      text(field.formatName)
    )
  }
  const range = (field: MasterField) => {
    if (text(field.length) !== '') return text(field.length)
    if (text(field.min) !== '' && text(field.max) !== '')
      return `${text(field.min)} ~ ${text(field.max)}`
    return ''
  }
  const fallback = (field: MasterField) => {
    if (field.dataType === 'date') {
      const parts = dateParts(field.defaultValue)
      return parts ? t.date(parts) : text(field.defaultValue)
    }
    return text(field.defaultValue)
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={accessibility}
    >
      {/* Its own width: the container scrolls instead of squeezing columns. */}
      <Table aria-label={t.table} className="mbc:w-max mbc:min-w-full">
        <TableHeader>
          <TableRow className="mbc:bg-emphasis mbc:hover:bg-emphasis">
            <TableHead className={cn(HEAD, HANDLE)}>
              <span className="mbc:sr-only">{t.move}</span>
            </TableHead>
            <TableHead className={cn(HEAD, CODE)}>{t.code}</TableHead>
            <TableHead className={cn(HEAD, NAME)}>{t.name}</TableHead>
            <TableHead className={HEAD}>{t.description}</TableHead>
            <TableHead className={HEAD}>{t.dataType}</TableHead>
            <TableHead className={HEAD}>{t.format}</TableHead>
            <TableHead className={HEAD}>
              <div>{t.rangeMin}</div>
              <div>{t.rangeMax}</div>
            </TableHead>
            <TableHead className={HEAD}>{t.defaultValue}</TableHead>
            <TableHead className={HEAD}>{t.required}</TableHead>
            <TableHead className={HEAD}>{t.showOnList}</TableHead>
            <TableHead className={cn(HEAD, ACTIONS)}>{t.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={rows.map((row) => row.key)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row) => {
              const { field } = row
              return (
                <SortableRow key={row.key} row={row} readOnly={readOnly}>
                  <TableCell className={cn(CODE, BODY)}>
                    <div className="mbc:w-[150px] mbc:truncate mbc:text-center">
                      {field.physicalName}
                    </div>
                  </TableCell>
                  <TableCell className={cn(NAME, BODY)}>
                    <div className="mbc:w-[150px] mbc:truncate mbc:text-center">
                      {field.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="mbc:max-w-[150px] mbc:truncate mbc:text-center">
                      {text(field.description)}
                    </div>
                  </TableCell>
                  <TableCell className="mbc:text-center">
                    {typeName(field)}
                  </TableCell>
                  <TableCell className="mbc:whitespace-nowrap mbc:text-center">
                    {formatName(field)}
                  </TableCell>
                  <TableCell className="mbc:whitespace-nowrap mbc:text-center">
                    {range(field)}
                  </TableCell>
                  <TableCell>
                    <div className="mbc:max-w-[200px] mbc:truncate mbc:text-center">
                      {fallback(field)}
                    </div>
                  </TableCell>
                  <TableCell className="mbc:text-center">
                    <Mark on={field.isRequired} yes={t.yes} />
                  </TableCell>
                  <TableCell className="mbc:text-center">
                    <Mark on={field.isShowedOnList} yes={t.yes} />
                  </TableCell>
                  <TableCell className={cn(ACTIONS, BODY, 'mbc:text-center')}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mbc:h-8 mbc:w-8"
                          disabled={readOnly}
                          aria-label={t.actionsFor({ name: label(field) })}
                        >
                          <MoreVertical
                            aria-hidden
                            className="mbc:h-4 mbc:w-4"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(row.key)}>
                          <Edit3
                            aria-hidden
                            className="mbc:text-muted-foreground mbc:mr-2 mbc:h-4 mbc:w-4"
                          />
                          {t.edit}
                        </DropdownMenuItem>
                        {!FIXED_FIELD_NAMES.includes(field.physicalName) && (
                          <DropdownMenuItem
                            className="mbc:text-destructive"
                            onSelect={() => onRemove(row.key)}
                          >
                            <Trash2
                              aria-hidden
                              className="mbc:text-destructive mbc:mr-2 mbc:h-4 mbc:w-4"
                            />
                            {t.remove}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </SortableRow>
              )
            })}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (150 tests); typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/master-web pnpm-lock.yaml
git commit -m "feat(master-web): the sortable fields table"
```

---

### Task 7: `MasterSettingEditor`

**Files:**

- Create: `packages/master-web/src/settings/master-setting-editor.tsx`
- Test: `packages/master-web/src/settings/master-setting-editor.test.tsx`

**Interfaces:**

- Consumes: Tasks 2–6 (`settingToForm`, `toSettingPayload`, `validateSettingForm`, `parseSettingJson`, `settingJson`, `JsonDialog`, `FieldDialog`, `FieldsTable`, `RequiredMark`, messages); `ListError`, `MasterLink` (M3).
- Produces: `MasterSettingEditor(props: MasterSettingEditorProps)`, where `MasterSettingEditorProps` is:

  <!-- prettier-ignore -->
  ```ts
  {
    mode: 'create' | 'edit'
    setting?: MasterSetting
    routing: MasterRouting
    tenantCode?: string
    loading?: boolean
    error?: unknown
    onRetry?(): void
    checkCodeUnique?(code): Promise<boolean>
    onSave(body: MasterSettingCreateBody | MasterSettingUpdateBody): Promise<void>
    onDelete?(): Promise<void>
    canCopy?: boolean
    settingOptions?: SettingOption[]
    formats?: SequenceFormat[]
  }
  ```

  - **Ownership:** with `tenantCode` given, a setting whose `tenantCode` differs opens read-only.
  - **Remounting:** a new `setting.id` or `version` restarts the editor.
  - **Failures:** a rejected `onSave` / `onDelete` shows an alert. An error named `MbcTimeoutError` (client-web's) says the outcome is unknown.

- [ ] **Step 1: Write the failing test**

`packages/master-web/src/settings/master-setting-editor.test.tsx`:

```tsx
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterSetting } from '../core/parse'
import type {
  MasterSettingCreateBody,
  MasterSettingUpdateBody,
  SequenceFormat,
} from '../core/setting-form'
import type { MasterSetting } from '../core/types'
import type { MasterRouting } from '../routing/routing'
import {
  MasterSettingEditor,
  type MasterSettingEditorProps,
} from './master-setting-editor'

const routing: MasterRouting = {
  href: (to) =>
    'settingId' in to
      ? `/${to.screen}/${encodeURIComponent(to.settingId)}`
      : `/${to.screen}`,
  navigate: vi.fn(),
}

const FORMATS: SequenceFormat[] = [
  { code: 'MASTER_DATA#SEQ', name: '商品番号', format: '%%no%%' },
]

function stored(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

function setup(overrides: Partial<MasterSettingEditorProps> = {}) {
  const onSave = vi.fn<MasterSettingEditorProps['onSave']>(async () => {})
  const props: MasterSettingEditorProps = {
    mode: 'edit',
    setting: stored(),
    routing,
    tenantCode: 'tenant-a',
    formats: FORMATS,
    onSave,
    ...overrides,
  }
  render(<MasterSettingEditor {...props} />)
  return { onSave, props }
}

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })
const lastBody = (fn: { mock: { calls: unknown[][] } }) =>
  fn.mock.calls.at(-1)?.[0] as MasterSettingCreateBody & MasterSettingUpdateBody

describe('MasterSettingEditor', () => {
  it('creates a setting: checks the code is free, then saves v0’s body', async () => {
    const checkCodeUnique = vi.fn(async () => true)
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      checkCodeUnique,
    })
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
    expect(
      within(screen.getByRole('table', { name: '項目一覧' })).getAllByRole(
        'row'
      )
    ).toHaveLength(4)
    await userEvent.type(input('コード'), ' NEW ')
    await userEvent.type(input('名称'), '新規')
    await userEvent.click(button('保存'))
    expect(checkCodeUnique).toHaveBeenCalledWith('NEW')
    const body = lastBody(onSave)
    expect(body).toMatchObject({ code: 'NEW', name: '新規' })
    expect(body.settingValue).toEqual(body.attributes)
    expect(body.attributes.fields.map((f) => f.physicalName)).toEqual([
      'code',
      'name',
      'seq',
    ])
  })

  it('refuses an empty or taken code before saving', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: undefined,
      checkCodeUnique: async () => false,
    })
    await userEvent.click(button('保存'))
    expect(input('コード')).toHaveAccessibleDescription('入力してください。')
    expect(input('コード')).toHaveFocus()
    expect(input('名称')).toHaveAccessibleDescription('入力してください。')
    await userEvent.type(input('コード'), 'USED')
    await userEvent.type(input('名称'), '名前')
    await userEvent.click(button('保存'))
    expect(input('コード')).toHaveAccessibleDescription(
      '既にこのコードは登録されています。'
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('opens a stored setting for viewing, then edits and saves it', async () => {
    const { onSave } = setup()
    expect(input('コード')).toBeDisabled()
    expect(input('名称')).toBeDisabled()
    expect(input('名称')).toHaveValue('商品')
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    await userEvent.click(button('編集'))
    expect(input('コード')).toBeDisabled()
    expect(button('保存')).toBeDisabled()
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    const body = lastBody(onSave)
    expect(body).not.toHaveProperty('settingValue')
    expect(body).toMatchObject({ code: 'PRODUCT', name: '商品2' })
    expect(body.attributes.extraFlag).toBe(true)
    // Saved: back to viewing the new values.
    expect(await screen.findByRole('button', { name: '編集' })).toBeVisible()
    expect(input('名称')).toHaveValue('商品2')
  })

  it('cancels editing back to the stored values', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), 'X')
    await userEvent.click(button('キャンセル'))
    expect(input('名称')).toHaveValue('商品')
    expect(button('編集')).toBeVisible()
  })

  it('adds, edits and removes fields before saving', async () => {
    const { onSave } = setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('項目追加'))
    const dialog = screen.getByRole('dialog', { name: '項目追加' })
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'コード' }),
      'note'
    )
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: '名称' }),
      '追記'
    )
    await userEvent.click(within(dialog).getByRole('button', { name: '登録' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('cell', { name: 'note' })).toBeVisible()

    await userEvent.click(button('「価格」の操作'))
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }))
    expect(screen.queryByRole('cell', { name: 'price' })).toBeNull()

    await userEvent.click(button('「名称」の操作'))
    await userEvent.click(await screen.findByRole('menuitem', { name: '編集' }))
    const edit = screen.getByRole('dialog', { name: '項目編集' })
    await userEvent.type(
      within(edit).getByRole('textbox', { name: '名称' }),
      '!'
    )
    await userEvent.click(within(edit).getByRole('button', { name: '登録' }))

    await userEvent.click(button('保存'))
    const names = lastBody(onSave).attributes.fields.map((f) => f.name)
    expect(names).toContain('追記')
    expect(names).toContain('名称!')
    expect(names).not.toContain('価格')
  })

  it('applies a setting JSON to the form, keeping the stored code', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('JSONエディタ'))
    const json = screen.getByRole('textbox', { name: 'JSON' })
    const current = JSON.parse((json as HTMLTextAreaElement).value)
    expect(current).toMatchObject({ code: 'PRODUCT', name: '商品' })

    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste('{"code":"P"}')
    await userEvent.click(button('データ反映'))
    expect(screen.getByRole('alert')).toHaveTextContent('JSON が無効です。')

    const next = { ...current, code: 'OTHER', name: '別名' }
    next.attributes.fields = next.attributes.fields.slice(0, 3)
    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste(JSON.stringify(next))
    await userEvent.click(button('データ反映'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(input('名称')).toHaveValue('別名')
    expect(input('コード')).toHaveValue('PRODUCT')
    expect(
      within(screen.getByRole('table', { name: '項目一覧' })).getAllByRole(
        'row'
      )
    ).toHaveLength(4)
  })

  it('deletes after confirmation and says when it failed', async () => {
    const onDelete = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce()
    setup({ onDelete })
    await userEvent.click(button('削除'))
    const confirm = screen.getByRole('alertdialog', {
      name: '削除してもよろしいですか？',
    })
    await userEvent.click(within(confirm).getByRole('button', { name: '削除' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'データ削除に失敗しました。'
    )
    await userEvent.click(button('削除'))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '削除',
      })
    )
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(2))
  })

  it('says when saving failed, and when the outcome is unknown', async () => {
    const timeout = Object.assign(new Error('late'), {
      name: 'MbcTimeoutError',
    })
    const onSave = vi
      .fn<MasterSettingEditorProps['onSave']>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(timeout)
    setup({ onSave })
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), '2')
    await userEvent.click(button('保存'))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('データ更新に失敗しました。')
    expect(alert).toHaveTextContent(
      '入力内容を確認した上で再度やり直してください。'
    )
    await userEvent.click(button('保存'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '時間内に結果を確認できませんでした。'
    )
    expect(button('保存')).toBeEnabled()
  })

  it('opens another tenant’s setting read-only with a way back', () => {
    const setting = { ...stored(), tenantCode: 'common' }
    setup({ setting, onDelete: async () => {}, canCopy: true })
    expect(
      screen.getByText('他のテナントの設定のため、編集できません。')
    ).toBeVisible()
    // v0: in the button bar and below the form.
    for (const link of screen.getAllByRole('link', { name: '戻る' }))
      expect(link).toHaveAttribute('href', '/settings')
    for (const name of ['編集', '削除', 'テナントへコピー', '項目追加'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(input('名称')).toBeDisabled()
  })

  it('links to the copy screens only when copying is allowed', () => {
    setup({ canCopy: true })
    expect(
      screen.getByRole('link', { name: 'テナントへコピー' })
    ).toHaveAttribute('href', `/copyRequest/${encodeURIComponent(stored().id)}`)
    expect(
      screen.getByRole('link', { name: 'コピー結果を確認' })
    ).toHaveAttribute('href', `/copyTasks/${encodeURIComponent(stored().id)}`)
  })

  it('reads and saves the host’s option flags', async () => {
    const setting = stored()
    setting.attributes.flagA = true
    const { onSave } = setup({
      setting,
      settingOptions: [
        { key: 'flagA', label: 'フラグA' },
        { key: 'flagB', label: 'フラグB' },
      ],
    })
    expect(screen.getByRole('switch', { name: 'フラグA' })).toBeChecked()
    await userEvent.click(button('編集'))
    await userEvent.click(screen.getByRole('switch', { name: 'フラグB' }))
    await userEvent.click(button('保存'))
    expect(lastBody(onSave).attributes).toMatchObject({
      flagA: true,
      flagB: true,
    })
  })

  it('shows loading, then a load failure with a reload button', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <MasterSettingEditor
        mode="edit"
        routing={routing}
        loading
        onSave={async () => {}}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(
      <MasterSettingEditor
        mode="edit"
        routing={routing}
        error={new Error('x')}
        onRetry={onRetry}
        onSave={async () => {}}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      '読み込みに失敗しました。'
    )
    await userEvent.click(button('再読み込み'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations and renders on the server', async () => {
    const element = (
      <MbcProvider locale="en">
        <main>
          <MasterSettingEditor
            mode="edit"
            setting={stored()}
            routing={routing}
            tenantCode="tenant-a"
            canCopy
            onSave={async () => {}}
            onDelete={async () => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(renderToString(element)).toContain('Fields')
    render(element)
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/src/settings/master-setting-editor.test.tsx`
Expected: FAIL: `./master-setting-editor` cannot be resolved.

- [ ] **Step 3: Implement**

`packages/master-web/src/settings/master-setting-editor.tsx`:

```tsx
'use client'

import { arrayMove } from '@dnd-kit/sortable'
import {
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
  Field,
  FieldError,
  FieldLabel,
  Input,
  Skeleton,
  Switch,
  Textarea,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import {
  settingToForm,
  toSettingPayload,
  validateSettingForm,
  type MasterSettingCreateBody,
  type MasterSettingUpdateBody,
  type SequenceFormat,
  type SettingFormValues,
  type SettingOption,
} from '../core/setting-form'
import { parseSettingJson, settingJson } from '../core/setting-json'
import type { MasterField, MasterSetting } from '../core/types'
import { RequiredMark } from '../form/required-mark'
import {
  formatFieldDefinitionError,
  formatMasterError,
} from '../i18n/format-error'
import { masterMessages } from '../i18n/master-messages'
import { masterSettingMessages } from '../i18n/master-setting-messages'
import { JsonDialog } from '../json/json-dialog'
import { ListError } from '../list/list-error'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import { FieldDialog } from './field-dialog'
import { FieldsTable, type FieldRow } from './fields-table'

export type MasterSettingEditorProps = {
  mode: 'create' | 'edit'
  /** The stored setting (edit). A new `id` or `version` restarts the editor. */
  setting?: MasterSetting
  routing: MasterRouting
  /** The current tenant: another tenant's setting opens read-only. */
  tenantCode?: string
  /** The setting is loading (edit). */
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRetry`. */
  error?: unknown
  onRetry?(): void
  /** Create: resolves `false` when the code is already used. */
  checkCodeUnique?(code: string): Promise<boolean>
  /**
   * Saves the setting; reject to show the failure. After an update the
   * editor shows the saved values; after a create, navigating is the host's.
   */
  onSave(body: MasterSettingCreateBody | MasterSettingUpdateBody): Promise<void>
  /** Deletes the setting after the user confirms; reject to show the failure. */
  onDelete?(): Promise<void>
  /** Shows the copy links (v0 showed them to its system tenant only). */
  canCopy?: boolean
  /** Extra on/off flags stored in `attributes`. */
  settingOptions?: readonly SettingOption[]
  /** Sequences an auto-numbered code field can use. */
  formats?: readonly SequenceFormat[]
}

const SECTION =
  'mbc:bg-emphasis mbc:text-emphasis-foreground mbc:flex mbc:items-end mbc:justify-start mbc:p-4 mbc:text-xl mbc:font-bold'
const NO_OPTIONS: readonly SettingOption[] = []
const NO_FORMATS: readonly SequenceFormat[] = []

type Snapshot = { values: SettingFormValues; rows: FieldRow[] }
type Failure = { title: string; hint?: string }

const isTimeout = (error: unknown) =>
  error instanceof Error && error.name === 'MbcTimeoutError'

/** v0's settings editor: view, edit, save, delete, fields and the JSON dialog. */
export function MasterSettingEditor(props: MasterSettingEditorProps) {
  const t = useMessages(masterSettingMessages).editor
  const m = useMessages(masterMessages)
  const { mode, setting, loading = false, error, onRetry } = props
  if (mode === 'edit' && (!setting || loading)) {
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
        <Skeleton className="mbc:h-32 mbc:w-full" />
        <Skeleton className="mbc:h-48 mbc:w-full" />
      </div>
    )
  }
  return (
    <EditorBody
      key={setting ? `${setting.id}:${setting.version}` : 'new'}
      {...props}
    />
  )
}

function EditorBody({
  mode,
  setting,
  routing,
  tenantCode,
  checkCodeUnique,
  onSave,
  onDelete,
  canCopy = false,
  settingOptions = NO_OPTIONS,
  formats = NO_FORMATS,
}: MasterSettingEditorProps) {
  const messages = useMessages(masterSettingMessages)
  const t = messages.editor
  const m = useMessages(masterMessages)
  const optionKeys = useMemo(
    () => settingOptions.map((option) => option.key),
    [settingOptions]
  )
  const owned =
    mode === 'create' ||
    tenantCode === undefined ||
    setting?.tenantCode === tenantCode

  const [baseline, setBaseline] = useState<Snapshot>(() => {
    const form = settingToForm(setting, optionKeys)
    const rows = form.fields.map((field, index) => ({
      key: `f${index}`,
      field,
    }))
    return { values: form.values, rows }
  })
  // Keys for rows added later (event handlers only).
  const nextKey = useRef(baseline.rows.length)
  const toRows = (fields: MasterField[]) =>
    fields.map((field) => ({ key: `f${nextKey.current++}`, field }))
  const [values, setValues] = useState(baseline.values)
  const [rows, setRows] = useState(baseline.rows)
  const [editing, setEditing] = useState(mode === 'create')
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})
  const [attempts, setAttempts] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; key?: string }>({
    open: false,
  })
  const formRef = useRef<HTMLFormElement>(null)
  const readOnly = !editing || !owned

  useEffect(() => {
    if (attempts > 0)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
  }, [attempts])

  const fields = rows.map((row) => row.field)
  const changed =
    JSON.stringify({ values, fields }) !==
    JSON.stringify({
      values: baseline.values,
      fields: baseline.rows.map((row) => row.field),
    })

  const fail = (reason: unknown, title: string) =>
    setFailure(
      isTimeout(reason) ? { title: t.timeout } : { title, hint: t.failedHint }
    )

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || readOnly) return
    setFailure(null)
    const found = validateSettingForm(values)
    const next: { code?: string; name?: string } = {
      code: found.code && formatMasterError(found.code, m.validation),
      name: found.name && formatMasterError(found.name, m.validation),
    }
    const failedTitle = mode === 'create' ? t.createFailed : t.updateFailed
    if (mode === 'create' && !next.code && !next.name && checkCodeUnique) {
      try {
        if (!(await checkCodeUnique(values.code.trim())))
          next.code = t.codeTaken
      } catch (reason) {
        fail(reason, failedTitle)
        return
      }
    }
    setErrors(next)
    if (next.code || next.name) {
      setAttempts((count) => count + 1)
      return
    }
    setSaving(true)
    try {
      if (mode === 'create')
        await onSave(toSettingPayload(values, fields, { mode: 'create' }))
      else if (setting) {
        await onSave(
          toSettingPayload(values, fields, {
            mode: 'update',
            previous: setting,
          })
        )
        setBaseline({ values, rows })
        setEditing(false)
      }
    } catch (reason) {
      fail(reason, failedTitle)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setValues(baseline.values)
    setRows(baseline.rows)
    setErrors({})
    setFailure(null)
    setEditing(false)
  }

  const remove = async () => {
    if (!onDelete) return
    setFailure(null)
    setDeleting(true)
    try {
      await onDelete()
    } catch (reason) {
      fail(reason, t.deleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  const applyJson = (text: string) => {
    const parsed = parseSettingJson(text)
    if (!parsed.ok) {
      const { error } = parsed
      if (error.key === 'invalidField')
        return (
          messages.json.field(error.params) +
          formatFieldDefinitionError(error.error, m.fieldDefinition)
        )
      return messages.json[error.key]
    }
    const form = settingToForm(parsed.setting, optionKeys)
    // The code of a stored setting cannot change.
    setValues({
      ...form.values,
      code: mode === 'edit' ? values.code : form.values.code,
    })
    setRows(toRows(form.fields))
    return undefined
  }

  const submitField = (field: MasterField) => {
    if (dialog.key === undefined)
      setRows((current) => [...current, ...toRows([field])])
    else
      setRows((current) =>
        current.map((row) => (row.key === dialog.key ? { ...row, field } : row))
      )
  }

  const editingRow = rows.find((row) => row.key === dialog.key)
  const setValue = <K extends keyof SettingFormValues>(
    key: K,
    value: SettingFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  return (
    <div data-mbc="" className="mbc:relative mbc:w-full">
      <form
        ref={formRef}
        noValidate
        onSubmit={save}
        className="mbc:bg-background"
      >
        <div
          role="group"
          aria-label={t.actions}
          className="mbc:bg-muted/50 mbc:p-4"
        >
          {owned ? (
            <div className="mbc:flex mbc:justify-between mbc:gap-4">
              {mode === 'edit' && !editing ? (
                <div className="mbc:flex mbc:flex-wrap mbc:gap-2">
                  <Button type="button" onClick={() => setEditing(true)}>
                    {t.edit}
                  </Button>
                  {canCopy && setting && (
                    <>
                      <Button asChild>
                        <MasterLink
                          routing={routing}
                          to={{ screen: 'copyRequest', settingId: setting.id }}
                        >
                          {t.copy}
                        </MasterLink>
                      </Button>
                      <Button asChild>
                        <MasterLink
                          routing={routing}
                          to={{ screen: 'copyTasks', settingId: setting.id }}
                        >
                          {t.copyResults}
                        </MasterLink>
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="mbc:flex mbc:flex-wrap mbc:gap-4">
                  <Button
                    type="submit"
                    loading={saving}
                    disabled={mode === 'edit' && !changed}
                  >
                    {t.save}
                  </Button>
                  {mode === 'edit' && (
                    <Button type="button" variant="secondary" onClick={cancel}>
                      {t.cancel}
                    </Button>
                  )}
                  <JsonDialog
                    text={() => settingJson(values, fields)}
                    fileName={messages.json.fileName}
                    onApply={applyJson}
                    disabled={saving}
                  />
                </div>
              )}
              {mode === 'edit' && onDelete && (
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
              )}
            </div>
          ) : (
            <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-4">
              <Button asChild>
                <MasterLink routing={routing} to={{ screen: 'settings' }}>
                  {t.back}
                </MasterLink>
              </Button>
              <p className="mbc:text-muted-foreground mbc:text-sm">
                {t.readOnly}
              </p>
            </div>
          )}
          {failure && (
            <Alert variant="destructive" role="alert" className="mbc:mt-4">
              <AlertTitle>{failure.title}</AlertTitle>
              {failure.hint && (
                <AlertDescription>{failure.hint}</AlertDescription>
              )}
            </Alert>
          )}
        </div>

        <div className="mbc:mt-4 mbc:px-4">
          <h2 className={SECTION}>{t.basics}</h2>
          <div className="mbc:bg-background mbc:grid mbc:gap-x-10 mbc:gap-y-2 mbc:p-6 mbc:pb-10 mbc:md:grid-cols-2">
            <Field invalid={errors.code !== undefined}>
              <FieldLabel className="mbc:font-semibold">
                {t.code}
                <RequiredMark />
              </FieldLabel>
              <Input
                value={values.code}
                onChange={(event) => setValue('code', event.target.value)}
                disabled={mode === 'edit' || readOnly}
                aria-required
              />
              <FieldError>{errors.code}</FieldError>
            </Field>
            <Field invalid={errors.name !== undefined}>
              <FieldLabel className="mbc:font-semibold">
                {t.name}
                <RequiredMark />
              </FieldLabel>
              <Input
                value={values.name}
                onChange={(event) => setValue('name', event.target.value)}
                disabled={readOnly}
                aria-required
              />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field className="mbc:md:col-span-2">
              <FieldLabel className="mbc:font-semibold">
                {t.description}
              </FieldLabel>
              <Textarea
                value={values.description}
                onChange={(event) =>
                  setValue('description', event.target.value)
                }
                disabled={readOnly}
              />
            </Field>
            {settingOptions.map((option) => (
              <Field key={option.key} className="mbc:mt-2">
                <FieldLabel className="mbc:font-semibold">
                  {option.label}
                </FieldLabel>
                <Switch
                  checked={values.options[option.key] === true}
                  onCheckedChange={(checked) =>
                    setValue('options', {
                      ...values.options,
                      [option.key]: checked,
                    })
                  }
                  disabled={readOnly}
                />
              </Field>
            ))}
          </div>

          <h2 className={SECTION}>{t.fields}</h2>
          <div className="mbc:bg-background mbc:p-6 mbc:pb-10">
            {owned && (
              <div className="mbc:mb-5 mbc:flex mbc:w-full mbc:items-start">
                <Button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDialog({ open: true })}
                >
                  <PlusIcon aria-hidden />
                  {messages.fieldDialog.add}
                </Button>
              </div>
            )}
            <FieldsTable
              rows={rows}
              formats={formats}
              readOnly={readOnly}
              onMove={(from, to) =>
                setRows((current) => arrayMove(current, from, to))
              }
              onEdit={(key) => setDialog({ open: true, key })}
              onRemove={(key) =>
                setRows((current) => current.filter((row) => row.key !== key))
              }
            />
          </div>
        </div>
      </form>
      <FieldDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        field={editingRow?.field}
        siblings={rows
          .filter((row) => row.key !== dialog.key)
          .map((row) => row.field)}
        formats={formats}
        onSubmit={submitField}
      />
      <div className="mbc:bg-background mbc:flex mbc:justify-evenly mbc:py-3">
        <Button asChild variant="outline" className="mbc:min-w-[200px]">
          <MasterLink routing={routing} to={{ screen: 'settings' }}>
            {t.back}
          </MasterLink>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm --filter @mbc-cqrs-serverless/master-web typecheck`
Expected: PASS (163 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/master-web
git commit -m "feat(master-web): MasterSettingEditor"
```

---

### Task 8: Export, playground page, smoke app, docs

**Files:**

- Modify: `packages/master-web/src/index.ts`, `packages/master-web/test/exports.test.tsx`
- Modify: `apps/playground/src/master-pages.tsx`, `apps/next-smoke/app/master-screens.tsx`
- Modify: `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`

**Interfaces:**

- Produces: the root entry exports `MasterSettingEditor` and `type MasterSettingEditorProps`. `JsonDialog`, `FieldDialog` and `FieldsTable` stay internal.
- The playground gains `#master/newSetting` and `#master/setting/<id>`, reached through the lists' 新規作成 button and the data list's 詳細 link:
  - settings live in an in-memory store, and saves and deletes take 600 ms;
  - PREF belongs to another tenant, so it opens read-only.

- [ ] **Step 1: Write the failing test**

In `packages/master-web/test/exports.test.tsx`, replace:

<!-- prettier-ignore -->
```tsx
        'MasterSettingList',
```

with:

<!-- prettier-ignore -->
```tsx
        'MasterSettingEditor',
        'MasterSettingList',
```

- [ ] **Step 2: Run it to verify it fails**

Run: `fnm exec --using=v24.13.0 -- pnpm vitest run packages/master-web/test/exports.test.tsx`
Expected: FAIL in "exports the core from the root…": the root lacks `MasterSettingEditor`.

- [ ] **Step 3: Implement the export**

In `packages/master-web/src/index.ts`, replace:

<!-- prettier-ignore -->
```ts
  MasterDataList,
```

with:

<!-- prettier-ignore -->
```ts
  MasterSettingEditor,
  type MasterSettingEditorProps,
} from './settings/master-setting-editor'
export {
  MasterDataList,
```

- [ ] **Step 4: Add the playground page**

Replace the whole file:

`apps/playground/src/master-pages.tsx`:

```tsx
import {
  initialDataListState,
  initialSettingListState,
  MasterDataList,
  MasterSettingEditor,
  MasterSettingList,
  parseMasterSetting,
  type BulkJsonItem,
  type ListSort,
  type MasterDataListItem,
  type MasterDataListState,
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

const dataRows: MasterDataListItem[] = Array.from({ length: 26 }, (_, i) => {
  const code = `P-${String(i + 1).padStart(3, '0')}`
  return {
    id: `MASTER#${TENANT}#PRODUCT#${code}`,
    pk: `MASTER#${TENANT}`,
    sk: `PRODUCT#${code}`,
    masterCode: code,
    name:
      i === 3
        ? '名前がとても長い商品で、表のセルで折り返されることを確かめるための行'
        : `商品 ${i + 1}`,
    seq: i,
    isDeleted: i === 25,
    attributes: {
      price: String((i + 1) * 120),
      released: `2026-${String((i % 12) + 1).padStart(2, '0')}-07T00:00:00+09:00`,
      spec: i % 3 === 0 ? { size: 'L' } : {},
    },
  }
})

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
  const source = setting.code === 'PRODUCT' ? dataRows : []
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

/**
 * `#master` (settings list), `#master/newSetting`, `#master/setting/<id>` and
 * `#master/data/<setting id>`, on in-memory data.
 */
export function MasterPage({ route }: { route: string }) {
  const [, screen, id] = route.split('/')
  const decoded = id === undefined ? undefined : decodeURIComponent(id)
  return (
    <div style={{ padding: 16 }}>
      {screen === 'data' && decoded ? (
        <DataPage key={decoded} settingId={decoded} />
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
  MasterSettingList,
```

with:

<!-- prettier-ignore -->
```tsx
  MasterSettingEditor,
  MasterSettingList,
```

In `apps/next-smoke/app/master-screens.tsx`, replace:

<!-- prettier-ignore -->
```tsx
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
```

with:

<!-- prettier-ignore -->
```tsx
      <MasterSettingEditor
        mode="edit"
        setting={setting}
        routing={routing}
        onSave={async () => {}}
        onDelete={async () => {}}
      />
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
```

- [ ] **Step 6: Update the docs**

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
Backend-dependent behaviour enters as async props: `checkCodeUnique(code)`, `generateCode(field)`, `onSave`, `onDelete`, `onRestore`, `onImport(items, onProgress)`, `onRequestCopy`.
```

with:

<!-- prettier-ignore -->
```md
Backend-dependent behaviour enters as async props: `checkCodeUnique(code)`, `generateCode(field)`, `onSave`, `onDelete`, `onRestore`, `onImport(items, onProgress)`, `onRequestCopy`. The settings editor also takes `formats`: the sequences an auto-numbered code can use (`{ code, name, format }`; v0 read them from the records of the `sequence_setting` master).
```

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
- Connected pages: `MbcMasterSettingListPage`, `MbcMasterSettingEditorPage` (`id?`), `MbcMasterDataListPage` (`settingId`), `MbcMasterDataEditorPage` (`settingId`, `id?`), `MbcMasterCopyRequestPage`, `MbcMasterCopyTaskListPage`, `MbcMasterCopyTaskDetailPage`. Common props: `routing`, `onSaved`, `onDeleted`, `onError`, `components`; list pages: `state` / `onStateChange` (internal state when omitted); copy pages and the settings editor: `canCopy`, `loadTenants(): Promise<{ code: string; name: string }[]>`; settings list: `inputSampleJson`, `mapRawItem`.
```

with:

<!-- prettier-ignore -->
```md
- Connected pages: `MbcMasterSettingListPage`, `MbcMasterSettingEditorPage` (`id?`), `MbcMasterDataListPage` (`settingId`), `MbcMasterDataEditorPage` (`settingId`, `id?`), `MbcMasterCopyRequestPage`, `MbcMasterCopyTaskListPage`, `MbcMasterCopyTaskDetailPage`. Common props: `routing`, `onSaved`, `onDeleted`, `onError`, `components`; list pages: `state` / `onStateChange` (internal state when omitted); copy pages and the settings editor: `canCopy`, `loadTenants(): Promise<{ code: string; name: string }[]>`; settings editor: `settingOptions`, and `formats` loaded from the `sequence_setting` master's data (v0's source; the code is overridable); settings list: `inputSampleJson`, `mapRawItem`.
```

In `docs/superpowers/specs/2026-10-06-master-web-rebuild-design.md`, replace:

<!-- prettier-ignore -->
```md
- **Forms:** react-hook-form with resolvers built from `/core` validators; async code-uniqueness runs on submit (v0 ran it in `validate`); errors are linked to inputs (`aria-invalid`, `aria-describedby`) and focus moves to the first error on submit.
- **Fields table:** dnd-kit sortable with keyboard sensor and translated announcements (survey creator's pattern); `code`, `name`, `seq` rows not removable.
- **State:** list state (page, page size, ordering, filters) internal or host-controlled; no URL access in the package.
- **Error handling:** every request failure reaches `onError` with the client error class; screens show an inline error with Retry for loads and a form-level alert for saves; an `MbcTimeoutError` on create says the outcome is unknown.
- **Accessibility:** axe-clean screens; labelled inputs; confirm dialogs for Delete and Restore; keyboard-operable table sorting, row selection, drag handles and editors' fallbacks.
```

with:

<!-- prettier-ignore -->
```md
- **Forms:** validation from `/core` on submit; async code-uniqueness runs on submit (v0 ran it in `validate`); errors are linked to inputs (`aria-invalid`, `aria-describedby`) and focus moves to the first error on submit. The settings editor's two fixed forms (the setting, the field dialog) keep their values in component state; react-hook-form arrives with the data editor (M5), whose inputs come from the setting.
- **Fields table:** dnd-kit sortable with keyboard sensor and translated announcements (survey creator's pattern); `code`, `name`, `seq` rows not removable.
- **State:** list state (page, page size, ordering, filters) internal or host-controlled; no URL access in the package.
- **Error handling:** every request failure reaches `onError` with the client error class; screens show an inline error with Retry for loads and a form-level alert for saves; an `MbcTimeoutError` on create says the outcome is unknown.
- **Accessibility:** axe-clean screens; labelled inputs; confirm dialogs for Delete and Restore; keyboard-operable table sorting, row selection, drag handles and editors' fallbacks. ui-web's destructive red is `#dc2626`: 4.83:1 with white text and on white (shadcn's `#ef4444` measured 3.76:1; M4).
```

In `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, replace:

<!-- prettier-ignore -->
```md
### Standard gate (every sub-plan)
```

with:

<!-- prettier-ignore -->
```md
Added by the M4 probe:

- ui-web's switches are 32×18px; they pass WCAG 2.5.8 through spacing, not size.
- Dropdown menus have a border of about 1.23:1 on white, heavier than a decorative line needs.
- On a phone the fields table scrolls sideways with no column pinned (v0 pinned three columns, which covered the screen at 375px; they stay pinned from `md` up).

### Standard gate (every sub-plan)
```

In `docs/superpowers/plans/2026-10-06-m0-master-orchestrator.md`, replace:

<!-- prettier-ignore -->
```md
  - Builds: `MasterSettingEditor` (code with async uniqueness, name, description, `settingOptions`), fields table (dnd-kit sortable + keyboard + announcements; `code`/`name`/`seq` fixed), field dialog (per-type options from `fieldTypes`, `validateFieldDefinition`), JSON dialog (edit / import / download), view/edit mode, delete confirm, copy buttons when `canCopy`, read-only mode; playground page.
```

with:

<!-- prettier-ignore -->
```md
  - Builds: `MasterSettingEditor` (code with async uniqueness, name, description, `settingOptions`), fields table (dnd-kit sortable + keyboard + announcements; `code`/`name`/`seq` fixed), field dialog (per-type options from `fieldTypes`, `validateFieldDefinition`), JSON dialog (edit / import / download), view/edit mode, delete confirm, copy buttons when `canCopy`, read-only mode; playground page. Also: `/core` `settingToForm`, `toSettingPayload` (create sends `settingValue`, update keeps unknown attribute keys), `validateSettingForm`, `parseSettingJson` / `settingJson` (v0's checks plus the field dialog's rules); auto-number `formats`; a shared `JsonDialog` (M5 reuses it); ui-web's destructive red darkened to pass 4.5:1.
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `fnm exec --using=v24.13.0 -- pnpm build && fnm exec --using=v24.13.0 -- pnpm vitest run --project master-web && fnm exec --using=v24.13.0 -- pnpm typecheck && fnm exec --using=v24.13.0 -- pnpm smoke && grep -c "名称登録" apps/next-smoke/.next/server/app/index.html`
Expected: PASS (master-web 163 tests); typecheck and the smoke build exit 0; grep prints `1`.

- [ ] **Step 8: Commit**

```bash
git add packages/master-web apps/playground apps/next-smoke docs
git commit -m "feat(master-web): export the settings editor; playground page, smoke and docs for M4"
```

---

### Task 9: Gate and hand-back

**Files:** none (verification only).

- [ ] **Step 1: Format and lint**

Run: `fnm exec --using=v24.13.0 -- pnpm format:check && fnm exec --using=v24.13.0 -- pnpm lint`
Expected: both exit 0. If `format:check` lists files, run `fnm exec --using=v24.13.0 -- pnpm format`, check the diff is whitespace only, and commit it as `style: format`.

- [ ] **Step 2: Full gate on React 19**

Run: `fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke`
Expected: both exit 0; every test passes (751 in all after this plan).

- [ ] **Step 3: Full gate on React 18, then restore**

```bash
fnm exec --using=v24.13.0 -- pnpm use-react 18
fnm exec --using=v24.13.0 -- pnpm verify && fnm exec --using=v24.13.0 -- pnpm smoke
fnm exec --using=v24.13.0 -- pnpm use-react 19
git status --porcelain
```

Expected: `verify` and `smoke` exit 0 on React 18; `git status --porcelain` prints nothing after the restore.

- [ ] **Step 4: Hand back**

Do not merge `m4-settings-editor` into `main` and do not tick M4 in the orchestrator — an independent review comes first. Report: the branch name, the commit range (`git log --oneline main..m4-settings-editor`), the gate results from Steps 2–3, and any step whose output did not match its `Expected:` line together with what you did about it.
