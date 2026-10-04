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
} as const
