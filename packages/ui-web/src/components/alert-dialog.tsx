'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
} from 'react'

import { usePortalContainer } from '../i18n/provider'
import { cn } from '../lib/cn'
import { buttonVariants } from './button-variants'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

export function AlertDialogPortal(
  props: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Portal>
) {
  const container = usePortalContainer()
  return <AlertDialogPrimitive.Portal container={container} {...props} />
}

export const AlertDialogOverlay = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      data-mbc=""
      data-slot="alert-dialog-overlay"
      className={cn(
        'mbc:data-[state=closed]:fade-out-0 mbc:data-[state=open]:fade-in-0 mbc:data-[state=closed]:animate-out mbc:data-[state=open]:animate-in mbc:fixed mbc:inset-0 mbc:z-50 mbc:bg-black/50',
        className
      )}
      {...props}
    />
  )
})

export const AlertDialogContent = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className, ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        data-mbc=""
        data-slot="alert-dialog-content"
        className={cn(
          'mbc:data-[state=closed]:fade-out-0 mbc:data-[state=open]:fade-in-0 mbc:data-[state=closed]:zoom-out-95 mbc:data-[state=open]:zoom-in-95 mbc:bg-background mbc:data-[state=closed]:animate-out mbc:data-[state=open]:animate-in mbc:fixed mbc:left-[50%] mbc:top-[50%] mbc:z-50 mbc:grid mbc:w-full mbc:max-w-[calc(100%-2rem)] mbc:translate-x-[-50%] mbc:translate-y-[-50%] mbc:gap-4 mbc:rounded-lg mbc:border mbc:p-6 mbc:shadow-lg mbc:duration-200 mbc:sm:max-w-lg',
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
})

export const AlertDialogHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function AlertDialogHeader({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="alert-dialog-header"
      className={cn(
        'mbc:flex mbc:flex-col mbc:gap-2 mbc:text-center mbc:sm:text-left',
        className
      )}
      {...props}
    />
  )
})

export const AlertDialogFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function AlertDialogFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="alert-dialog-footer"
      className={cn(
        'mbc:flex mbc:flex-col-reverse mbc:gap-2 mbc:sm:flex-row mbc:sm:justify-end',
        className
      )}
      {...props}
    />
  )
})

export const AlertDialogTitle = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      data-slot="alert-dialog-title"
      className={cn('mbc:text-lg mbc:font-semibold', className)}
      {...props}
    />
  )
})

export const AlertDialogDescription = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      data-slot="alert-dialog-description"
      className={cn('mbc:text-muted-foreground mbc:text-sm', className)}
      {...props}
    />
  )
})

export const AlertDialogAction = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Action>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(function AlertDialogAction({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(buttonVariants(), className)}
      {...props}
    />
  )
})

export const AlertDialogCancel = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Cancel>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(function AlertDialogCancel({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(buttonVariants({ variant: 'outline' }), className)}
      {...props}
    />
  )
})
