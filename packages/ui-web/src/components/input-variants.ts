import { cva } from 'class-variance-authority'

export const inputVariants = cva(
  [
    'mbc:flex mbc:w-full mbc:min-w-0 mbc:rounded-md mbc:border mbc:border-input mbc:bg-transparent mbc:shadow-xs mbc:transition-[color,box-shadow] mbc:outline-none',
    'mbc:file:border-0 mbc:file:bg-transparent mbc:file:text-foreground mbc:file:font-medium',
    'mbc:placeholder:text-[#545454]',
    'mbc:selection:bg-primary mbc:selection:text-primary-foreground',
    'mbc:dark:bg-input/30',
    'mbc:disabled:cursor-not-allowed mbc:disabled:pointer-events-none mbc:disabled:opacity-50',
    'mbc:focus-visible:border-[#19647E]',
    'mbc:aria-invalid:border-[#FDA29B] mbc:aria-invalid:ring-[#FDA29B]/20 mbc:dark:aria-invalid:ring-[#FDA29B]/40',
  ],
  {
    variants: {
      size: {
        sm: 'mbc:h-8 mbc:px-2 mbc:py-1 mbc:text-xs mbc:file:h-6 mbc:file:text-xs mbc:placeholder:text-xs',
        md: 'mbc:h-9 mbc:px-3 mbc:py-1 mbc:text-sm mbc:file:h-7 mbc:file:text-sm mbc:placeholder:text-[14px]',
        'extra-md':
          'mbc:h-10 mbc:px-3 mbc:py-2 mbc:text-sm mbc:file:h-8 mbc:file:text-sm mbc:placeholder:text-sm',
        lg: 'mbc:h-[44px] mbc:px-4 mbc:py-2 mbc:text-base mbc:file:h-8 mbc:file:text-base mbc:placeholder:text-base',
      },
    },
    defaultVariants: { size: 'md' },
  }
)
