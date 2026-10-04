/** v0 class strings (Tailwind v4 reading, look rulings applied). */
export const V0 = {
  // ui/form/FormDescription.tsx
  'field.description': 'text-sm font-normal text-[#475467]',
  // ui/form/variants.ts formMessageVariants — text-error-400 → text-destructive
  'field.error': 'text-destructive text-sm',
  // ui/label.tsx
  label:
    'flex select-none items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
  // ui/input.tsx base + size md — aria-invalid:border-error-300 → border-[#FDA29B]
  'input.md':
    'flex w-full min-w-0 rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none file:border-0 file:bg-transparent file:text-foreground file:font-medium placeholder:text-[#545454] selection:bg-primary selection:text-primary-foreground dark:bg-input/30 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 focus-visible:border-[#19647E] aria-invalid:border-[#FDA29B] aria-invalid:ring-[#FDA29B]/20 dark:aria-invalid:ring-[#FDA29B]/40 h-9 px-3 py-1 text-sm file:h-7 file:text-sm placeholder:text-[14px]',
  // ui/textarea.tsx
  textarea:
    'field-sizing-content border-input shadow-xs placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  // ui/checkbox.tsx — icon size: v0 rendered lucide's default 24px inside a 19px box; size-3.5 (shadcn) is a spacing fix
  checkbox:
    'border-input shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-[#FDA29B] aria-invalid:ring-[#FDA29B]/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary dark:aria-invalid:ring-destructive/40 peer size-[19px] shrink-0 rounded-[4px] border bg-white outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
  // ui/radio-group.tsx
  'radio-group': 'grid gap-2',
  'radio-group.item':
    'border-primary text-primary ring-offset-background focus-visible:ring-ring aspect-square h-4 w-4 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  // ui/switch.tsx
  switch:
    'shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
  'switch.thumb':
    'bg-background dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0',
  // ui/card.tsx — `[.border-b]`/`[.border-t]` target the prefixed class now
  card: 'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
  'card.header':
    '@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.mbc\\:border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6',
  'card.title': 'font-semibold leading-none',
  'card.description': 'text-muted-foreground text-sm',
  'card.action':
    'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
  'card.content': 'px-6',
  'card.footer': '[.mbc\\:border-t]:pt-6 flex items-center px-6',
  // ui/alert.tsx
  'alert.destructive':
    'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
  'alert.title': 'mb-1 font-medium leading-none tracking-tight',
  'alert.description': 'text-sm [&_p]:leading-relaxed',
  // ui/badge.tsx (secondary — the variant survey uses)
  'badge.secondary':
    'inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-xs w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden font-bold border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
  // ui/separator.tsx
  separator:
    'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px',
  // ui/skeleton.tsx
  skeleton: 'bg-accent animate-pulse rounded-md',
  // ui/dialog.tsx — `!h-6 !w-6` → `h-6! w-6!`
  'dialog.overlay':
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=open]:animate-in fixed inset-0 z-50 bg-black/50',
  'dialog.content':
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 bg-background data-[state=closed]:animate-out data-[state=open]:animate-in fixed left-[50%] top-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
  'dialog.close':
    "rounded-xs ring-offset-background focus:outline-hidden focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute right-4 top-4 cursor-pointer opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-6 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  'dialog.title': 'text-lg font-semibold leading-none',
  'dialog.description': 'text-muted-foreground text-sm',
  'dialog.header': 'flex flex-col gap-2 text-center sm:text-left',
  'dialog.footer': 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
  // ui/alert-dialog.tsx
  'alert-dialog.content':
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 bg-background data-[state=closed]:animate-out data-[state=open]:animate-in fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
  'alert-dialog.title': 'text-lg font-semibold',
  // ui/popover.tsx
  'popover.content':
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin) bg-popover text-popover-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in z-50 w-72 rounded-md border p-4 shadow-md',
  // ui/dropdown-menu.tsx — `*:[svg]:!text-destructive` → `*:[svg]:text-destructive!`; checkbox/radio item corruption repaired
  'dropdown-menu.content':
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border p-1 shadow-md',
  'dropdown-menu.item':
    "data-[variant=destructive]:*:[svg]:text-destructive! outline-hidden focus:bg-primary/50 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:outline-none focus:text-black data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  'dropdown-menu.choice-item':
    "data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 outline-hidden focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm data-[disabled]:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  'dropdown-menu.label': 'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
  'dropdown-menu.separator': 'bg-border -mx-1 my-1 h-px',
} as const
