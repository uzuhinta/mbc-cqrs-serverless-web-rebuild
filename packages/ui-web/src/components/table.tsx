import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'

import { cn } from '../lib/cn'

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(function Table({ className, ...props }, ref) {
  return (
    <div
      data-mbc=""
      data-slot="table-container"
      className="mbc:relative mbc:w-full mbc:overflow-auto"
    >
      <table
        ref={ref}
        data-slot="table"
        className={cn('mbc:w-full mbc:caption-bottom mbc:text-sm', className)}
        {...props}
      />
    </div>
  )
})

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return (
    <thead
      ref={ref}
      data-slot="table-header"
      className={cn('mbc:[&_tr]:border-b', className)}
      {...props}
    />
  )
})

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return (
    <tbody
      ref={ref}
      data-slot="table-body"
      className={cn('mbc:[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
})

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableFooter({ className, ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      data-slot="table-footer"
      className={cn(
        'mbc:border-t mbc:border-border mbc:bg-muted/50 mbc:font-medium mbc:[&>tr]:last:border-b-0',
        className
      )}
      {...props}
    />
  )
})

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(function TableRow({ className, ...props }, ref) {
  return (
    <tr
      ref={ref}
      data-slot="table-row"
      className={cn(
        'mbc:border-b mbc:border-border mbc:transition-colors mbc:hover:bg-muted/50 mbc:data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
})

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      data-slot="table-head"
      className={cn(
        'mbc:px-4 mbc:text-left mbc:align-middle mbc:font-medium mbc:text-muted-foreground mbc:[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
})

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(function TableCell({ className, ...props }, ref) {
  return (
    <td
      ref={ref}
      data-slot="table-cell"
      className={cn(
        'mbc:p-2.5 mbc:align-middle mbc:[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
})

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(function TableCaption({ className, ...props }, ref) {
  return (
    <caption
      ref={ref}
      data-slot="table-caption"
      className={cn(
        'mbc:mt-4 mbc:text-sm mbc:text-muted-foreground',
        className
      )}
      {...props}
    />
  )
})
