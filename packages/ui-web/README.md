# @mbc-cqrs-serverless/ui-web

React UI primitives shared by the MBC CQRS Serverless web packages: Radix behaviour, Tailwind v4 styles compiled with the `mbc:` prefix, translated text (Japanese by default, English). React 18 and 19, ESM-only, SSR-safe.

## Install

```bash
pnpm add @mbc-cqrs-serverless/ui-web react react-dom
```

## Styles

Import one stylesheet once (if you use `survey-web` or `master-web`, import its `styles.css` instead — it contains every ui-web class it uses):

```ts
import '@mbc-cqrs-serverless/ui-web/styles.css'
```

Next and Vite declare CSS imports for TypeScript; elsewhere (plain `tsc`, some test setups), TypeScript 6 needs a declaration such as `declare module '*.css'` in a `.d.ts` file.

- `styles.css` (default): library utilities are unlayered and its base reset and tokens sit in your `@layer base`, so it works with Tailwind v3 (3.4 or later), Tailwind v4 or no Tailwind. Override library styles with your own CSS loaded after it.
- `styles.layer.css` (Tailwind v4 hosts that want their own utilities to win): the same rules in `@layer mbc`. Import it **before** Tailwind, because a layer's position is fixed where its name first appears:

```css
@import '@mbc-cqrs-serverless/ui-web/styles.layer.css';
@import 'tailwindcss';
```

- Tailwind v3 3.0–3.3: load the library CSS after your own (their preflight ties with library classes).
- `className` accepts `mbc:`-prefixed classes that replace a conflicting library class, but only classes the library already ships exist in its CSS; use your own classes for anything else.

## Theme

Colours and radius are CSS variables on `:root`; dark values apply under `.dark` or `[data-mbc-theme="dark"]`:

```css
:root {
  --mbc-primary: #1f2937;
  --mbc-brand: #417e96;
  --mbc-radius: 0.5rem;
}
```

Tokens: `--mbc-background`, `--mbc-foreground`, `--mbc-card`, `--mbc-popover`, `--mbc-primary`, `--mbc-secondary`, `--mbc-muted`, `--mbc-accent`, `--mbc-destructive` (each with `-foreground` where text sits on it), `--mbc-border`, `--mbc-input`, `--mbc-ring`, `--mbc-brand`, `--mbc-brand-accent`, `--mbc-radius`.

## Provider, locale and text

```tsx
import type { ReactNode } from 'react'
import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'

const messages = { ui: { pagination: { next: 'Next' } } }

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MbcProvider locale="en" messages={messages}>
      {children}
    </MbcProvider>
  )
}
```

- `locale`: `'ja'` (default) or `'en'`; anything else is treated as `'ja'`.
- `messages`: partial overrides per namespace (`ui` here; `survey`, `surveyCreator`, `surveyTemplates` in survey-web; `master`, `masterSetting`, `masterData`, `masterCopy` in master-web). Keep the object stable — a module constant or `useMemo` — because a new object re-renders every component that shows text.
- `dir`: `'ltr' | 'rtl'`; `portalContainer`: where dialogs, menus and popovers mount.

Add your own namespace with `defineMessages` and read it with `useMessages`:

```tsx
import { defineMessages, useMessages } from '@mbc-cqrs-serverless/ui-web'

type ShopMessages = { cart: string }
declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    shop: ShopMessages
  }
}
const shopMessages = defineMessages('shop', {
  ja: { cart: 'カート' },
  en: { cart: 'Cart' },
})

export function CartTitle() {
  return <h2>{useMessages(shopMessages).cart}</h2>
}
```

## Components

`Alert`, `AlertDialog`, `Badge`, `Button`, `Calendar`, `Card`, `Checkbox`, `Dialog`, `DropdownMenu`, `Field` (`FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `useFieldControl`), `Input`, `Label`, `Pagination`, `Popover`, `RadioGroup`, `Select`, `Separator`, `Skeleton`, `Switch`, `Tabs`, `Textarea`, and `cn`.

Components are client components (`"use client"`); the variant helpers `buttonVariants`, `badgeVariants`, `inputVariants` and `alertVariants` are plain functions you can call in Server Components:

```tsx
import { Button, buttonVariants } from '@mbc-cqrs-serverless/ui-web'

export function Actions() {
  return (
    <>
      <Button>Save</Button>
      <a className={buttonVariants({ variant: 'outline' })} href="/back">
        Back
      </a>
    </>
  )
}
```

`Field` wires a label, description and error to its control:

```tsx
import {
  Field,
  FieldError,
  FieldLabel,
  Input,
} from '@mbc-cqrs-serverless/ui-web'

export function Email({ error }: { error?: string }) {
  return (
    <Field invalid={Boolean(error)}>
      <FieldLabel required>メールアドレス</FieldLabel>
      <Input type="email" />
      <FieldError>{error}</FieldError>
    </Field>
  )
}
```

## Claude Code

The package ships a skill that teaches Claude Code how to set up and use these packages, written for the version you installed. Link it into your app once:

```bash
mkdir -p .claude/skills
ln -s ../../node_modules/@mbc-cqrs-serverless/ui-web/dist/skills/mbc-cqrs-serverless-web .claude/skills/mbc-cqrs-serverless-web
```

The link follows upgrades; a copy (`cp -R` instead of `ln -s`) has to be refreshed after each one. Every package ships the same skill, so link it from any one you installed.
