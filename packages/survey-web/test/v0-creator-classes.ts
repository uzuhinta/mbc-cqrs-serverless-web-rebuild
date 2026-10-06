/** v0 creator class strings (Tailwind v4 reading; space-* → gap-*, flex-grow → grow, border colours stated). */
export const V0C = {
  // question-creator.tsx
  'question.selected':
    'rounded-lg border transition-all border-primary bg-card shadow-lg',
  // + dark:bg-card (review: v0's white card was unreadable in dark mode)
  'question.idle':
    'rounded-lg border transition-all hover:bg-muted/50 border-transparent bg-white dark:bg-card',
  'question.view': 'group relative cursor-pointer p-6',
  'question.label-input':
    'h-12 grow rounded-none border-0 border-b px-1 text-lg font-semibold shadow-none focus-visible:ring-0',
  'question.footer': 'flex items-center justify-end gap-2',
  // previews
  'preview.list': 'flex flex-col gap-2',
  'preview.row': 'flex items-center gap-3',
  'preview.radio': 'border-muted-foreground h-4 w-4 rounded-full border',
  'preview.checkbox': 'border-muted-foreground h-4 w-4 rounded-sm border',
  'preview.short':
    'text-muted-foreground pointer-events-none w-1/2 border-b border-dashed border-border text-sm',
  'preview.long':
    'text-muted-foreground pointer-events-none min-h-[80px] w-full rounded border border-dashed border-border p-3 text-sm',
  // section-header-creator.tsx
  'section.tab':
    'bg-primary text-primary-foreground absolute -top-1 left-0 z-10 rounded-md rounded-b-none px-3 py-1 text-xs font-semibold',
  'section.view':
    'bg-card cursor-pointer rounded-lg rounded-tl-none border border-border p-6 shadow-sm',
  // survey-creator.tsx title card
  'title.selected':
    'cursor-pointer rounded-lg border-l-8 p-6 border-primary bg-card shadow-lg',
  'title.idle':
    'cursor-pointer rounded-lg border-l-8 p-6 bg-muted/30 border-gray-300',
} as const

export function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

export const v0c = (key: keyof typeof V0C) => V0C[key].split(' ').sort()
