/** v0 template-screen class strings (Tailwind v4 reading, rulings applied). */
export const V0T = {
  // survey-template/components
  'list.root': 'flex flex-col gap-9',
  'list.header': 'mb-2 flex flex-row items-center justify-between gap-2',
  'list.search-box': 'w-full md:w-1/2 lg:w-1/3',
  'list.grid': 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
  'search.input':
    'rounded-full border border-[#636F80] bg-white placeholder:text-[#B7BDC6]',
  'create.button':
    'rounded-full border border-[#636F80] bg-[#EEEEEE] px-10! text-black transition-colors duration-200 hover:bg-[#B7BDC6]',
  'card.root':
    'from-background to-muted/20 hover:border-primary/20 group cursor-pointer border-2 bg-linear-to-br transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
  // edit-survey-template/components
  'actions.bar':
    'mt-9 flex flex-row items-center justify-center gap-8 self-center',
  'actions.button':
    'flex items-center rounded-full border border-[#636F80] bg-[#EEEEEE] text-black hover:bg-[#B7BDC6]',
} as const

export function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

/** v0's classes must all be present (ui-web base classes come first, as in v0). */
export const v0t = (key: keyof typeof V0T) => V0T[key].split(' ').sort()
