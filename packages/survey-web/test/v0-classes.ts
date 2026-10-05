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
  // linear-scale-renderer.tsx — flex-shrink-0/flex-grow (removed in Tailwind v4) → shrink-0/grow; space-y-2 → gap-2
  'scale.row': 'flex items-center justify-between gap-4',
  'scale.end-label': 'w-1/12 shrink-0 text-center text-sm',
  'scale.options': 'flex grow justify-around',
  'scale.option': 'flex flex-col items-center gap-2',
  'scale.number': 'text-muted-foreground text-sm',
  // rating-renderer.tsx icon
  'rating.icon': 'h-7 w-7 transition-colors sm:h-8 sm:w-8',
  // forms/survey-form.tsx — space-y-8 → explicit margins with the same collapsed result
  'form.root': 'mx-auto my-12 max-w-3xl',
  'form.header': 'mb-10 text-center',
  'form.title': 'text-4xl font-bold tracking-tight',
  'form.description': 'text-muted-foreground mt-2 text-lg',
  'form.section-title':
    'mb-6 border-b border-border pb-2 text-2xl font-semibold outline-none',
  'form.section-description': 'text-muted-foreground mb-6',
  'form.actions': 'mt-8 flex justify-between pt-4',
} as const
