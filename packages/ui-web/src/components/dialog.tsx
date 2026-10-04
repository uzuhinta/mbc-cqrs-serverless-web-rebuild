'use client'

import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
} from 'react'

import { usePortalContainer, useMessages } from '../i18n/provider'
import { uiMessages } from '../i18n/ui-messages'
import { cn } from '../lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogPortal(
  props: ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>
) {
  const container = usePortalContainer()
  return <DialogPrimitive.Portal container={container} {...props} />
}

export const DialogOverlay = forwardRef<
  ComponentRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-mbc=""
      data-slot="dialog-overlay"
      className={cn(
        'mbc:data-[state=closed]:fade-out-0 mbc:data-[state=open]:fade-in-0 mbc:data-[state=closed]:animate-out mbc:data-[state=open]:animate-in mbc:fixed mbc:inset-0 mbc:z-50 mbc:bg-black/50',
        className
      )}
      {...props}
    />
  )
})

export type DialogContentProps = ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & { showCloseButton?: boolean }

export const DialogContent = forwardRef<
  ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  { className, children, showCloseButton = true, ...props },
  ref
) {
  const t = useMessages(uiMessages)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-mbc=""
        data-slot="dialog-content"
        className={cn(
          'mbc:data-[state=closed]:fade-out-0 mbc:data-[state=open]:fade-in-0 mbc:data-[state=closed]:zoom-out-95 mbc:data-[state=open]:zoom-in-95 mbc:bg-background mbc:data-[state=closed]:animate-out mbc:data-[state=open]:animate-in mbc:fixed mbc:left-[50%] mbc:top-[50%] mbc:z-50 mbc:w-full mbc:max-w-[calc(100%-2rem)] mbc:translate-x-[-50%] mbc:translate-y-[-50%] mbc:gap-4 mbc:rounded-lg mbc:border mbc:border-border mbc:p-6 mbc:shadow-lg mbc:duration-200 mbc:sm:max-w-lg',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="mbc:rounded-xs mbc:ring-offset-background mbc:focus:outline-hidden mbc:focus:ring-ring mbc:data-[state=open]:bg-accent mbc:data-[state=open]:text-muted-foreground mbc:absolute mbc:right-4 mbc:top-4 mbc:cursor-pointer mbc:opacity-70 mbc:transition-opacity mbc:hover:opacity-100 mbc:focus:ring-2 mbc:focus:ring-offset-2 mbc:disabled:pointer-events-none mbc:[&_svg:not([class*='size-'])]:size-6 mbc:[&_svg]:pointer-events-none mbc:[&_svg]:shrink-0"
          >
            <X aria-hidden className="mbc:h-6! mbc:w-6!" />
            <span className="mbc:sr-only">{t.close}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})

export const DialogHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function DialogHeader({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="dialog-header"
      className={cn(
        'mbc:flex mbc:flex-col mbc:gap-2 mbc:text-center mbc:sm:text-left',
        className
      )}
      {...props}
    />
  )
})

export const DialogFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function DialogFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="dialog-footer"
      className={cn(
        'mbc:flex mbc:flex-col-reverse mbc:gap-2 mbc:sm:flex-row mbc:sm:justify-end',
        className
      )}
      {...props}
    />
  )
})

export const DialogTitle = forwardRef<
  ComponentRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn(
        'mbc:text-lg mbc:font-semibold mbc:leading-none',
        className
      )}
      {...props}
    />
  )
})

export const DialogDescription = forwardRef<
  ComponentRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn('mbc:text-muted-foreground mbc:text-sm', className)}
      {...props}
    />
  )
})
