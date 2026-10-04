import { cva } from 'class-variance-authority'

/**
 * Lives outside the "use client" button module so Server Components can call
 * it, e.g. `<Link className={buttonVariants({ variant: 'outline' })}>`.
 */
export const buttonVariants = cva(
  "mbc:inline-flex mbc:shrink-0 mbc:cursor-pointer mbc:items-center mbc:justify-center mbc:gap-2 mbc:whitespace-nowrap mbc:rounded-md mbc:text-sm mbc:font-medium mbc:outline-none mbc:transition-all mbc:focus-visible:ring-[3px] mbc:focus-visible:ring-ring/50 mbc:disabled:pointer-events-none mbc:disabled:opacity-50 mbc:aria-invalid:border-destructive mbc:aria-invalid:ring-destructive/20 mbc:dark:aria-invalid:ring-destructive/40 mbc:[&_svg:not([class*='size-'])]:size-4 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'mbc:bg-primary mbc:text-primary-foreground mbc:shadow-xs mbc:hover:bg-primary/90',
        destructive:
          'mbc:bg-destructive mbc:text-white mbc:shadow-xs mbc:hover:bg-destructive/90 mbc:focus-visible:ring-destructive/20 mbc:dark:bg-destructive/60 mbc:dark:focus-visible:ring-destructive/40',
        outline:
          'mbc:border mbc:border-brand mbc:bg-background mbc:text-brand mbc:shadow-xs mbc:hover:bg-background/90 mbc:hover:text-brand-accent/90',
        secondary:
          'mbc:bg-secondary mbc:text-secondary-foreground mbc:shadow-xs mbc:hover:bg-secondary/80',
        ghost:
          'mbc:hover:bg-accent mbc:hover:text-accent-foreground mbc:dark:hover:bg-accent/50',
        link: 'mbc:text-primary mbc:underline-offset-4 mbc:hover:underline',
      },
      size: {
        default: 'mbc:h-9 mbc:px-4 mbc:py-2 mbc:has-[>svg]:px-3',
        sm: 'mbc:h-8 mbc:gap-1.5 mbc:rounded-md mbc:px-3 mbc:has-[>svg]:px-2.5',
        lg: 'mbc:h-10 mbc:rounded-md mbc:px-6 mbc:text-base mbc:has-[>svg]:px-4',
        icon: 'mbc:size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
