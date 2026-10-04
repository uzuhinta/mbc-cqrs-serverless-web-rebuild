import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'mbc:inline-flex mbc:items-center mbc:justify-center mbc:rounded-2xl mbc:border mbc:border-border mbc:px-4 mbc:py-2 mbc:text-xs mbc:w-fit mbc:whitespace-nowrap mbc:shrink-0 mbc:[&>svg]:size-3 mbc:gap-1 mbc:[&>svg]:pointer-events-none mbc:focus-visible:border-ring mbc:focus-visible:ring-ring/50 mbc:focus-visible:ring-[3px] mbc:aria-invalid:ring-destructive/20 mbc:dark:aria-invalid:ring-destructive/40 mbc:aria-invalid:border-destructive mbc:transition-[color,box-shadow] mbc:overflow-hidden mbc:font-bold',
  {
    variants: {
      variant: {
        default:
          'mbc:border-transparent mbc:bg-[#B7BDC6] mbc:text-black mbc:[a&]:bg-accent mbc:[a&]:text-white mbc:[a&]:hover:bg-primary/90',
        secondary:
          'mbc:border-transparent mbc:bg-secondary mbc:text-secondary-foreground mbc:[a&]:hover:bg-secondary/90',
        destructive:
          'mbc:border-transparent mbc:bg-destructive mbc:text-white mbc:[a&]:hover:bg-destructive/90 mbc:focus-visible:ring-destructive/20 mbc:dark:focus-visible:ring-destructive/40 mbc:dark:bg-destructive/60',
        outline:
          'mbc:text-foreground mbc:[a&]:hover:bg-accent mbc:[a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)
