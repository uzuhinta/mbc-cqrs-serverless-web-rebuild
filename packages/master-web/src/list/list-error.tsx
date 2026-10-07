'use client'

import { Alert, AlertDescription, Button } from '@mbc-cqrs-serverless/ui-web'

/** A list that failed to load: what happened and, when possible, a reload button. */
export function ListError({
  message,
  retry,
  onRetry,
}: {
  message: string
  retry: string
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription className="mbc:flex mbc:items-center mbc:justify-between mbc:gap-4">
        <span>{message}</span>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {retry}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
