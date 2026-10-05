/** v0 class strings for survey-web components (Tailwind v4 reading, rulings applied). */
export const V0 = {
  // renderers/question-wrapper.tsx
  'question.card':
    'bg-card text-card-foreground focus-within:ring-ring mb-8 rounded-lg border border-border p-6 shadow-sm transition-all duration-300 ease-in-out focus-within:ring-2',
  'question.label': 'text-lg font-semibold leading-relaxed tracking-tight',
  'question.description': 'text-muted-foreground mb-4 mt-1 text-sm font-normal',
  'question.body': 'mt-4',
  'question.error':
    'text-destructive dark:text-red-400 mt-2 text-sm font-medium',
  // single-choice / multiple-choice option rows — space-x-2 → gap-2
  'choice.row':
    'hover:bg-muted flex items-center gap-2 rounded-md p-2 transition-colors',
  'choice.other-row':
    'hover:bg-muted flex min-w-0 items-center gap-2 rounded-md p-2 transition-colors',
  'choice.label': 'w-full cursor-pointer font-normal',
  'choice.other-label': 'shrink-0 cursor-pointer whitespace-nowrap font-normal',
  'choice.other-input': 'ml-2 min-w-0 flex-1',
  // single-choice RadioGroup — space-y-1 → gap-1 (flex column)
  'single.group': 'flex flex-col gap-1',
} as const
