'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  buttonVariants,
} from '@mbc-cqrs-serverless/ui-web'

/** v0's ConfirmButton: a button that asks before it acts (delete, restore). */
export function ConfirmButton({
  label,
  title,
  confirm,
  cancel,
  onConfirm,
  loading = false,
  disabled = false,
  variant = 'destructive',
}: {
  label: string
  title: string
  confirm: string
  cancel: string
  onConfirm(): void
  loading?: boolean
  disabled?: boolean
  variant?: 'destructive' | 'default'
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          loading={loading}
          disabled={disabled}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancel}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant })}
            onClick={onConfirm}
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
