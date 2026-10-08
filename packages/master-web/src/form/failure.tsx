'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@mbc-cqrs-serverless/ui-web'

/** Why a save, delete or restore did not go through. */
export type Failure = { title: string; hint?: string }

/**
 * The editors' failure text. An error named `MbcTimeoutError` (client-web's)
 * means the outcome is unknown, so it gets its own text instead of the hint.
 */
export function failureOf(
  reason: unknown,
  title: string,
  t: { failedHint: string; timeout: string }
): Failure {
  if (reason instanceof Error && reason.name === 'MbcTimeoutError')
    return { title: t.timeout }
  return { title, hint: t.failedHint }
}

export function FailureAlert({
  failure,
  className,
}: {
  failure: Failure
  className?: string
}) {
  return (
    <Alert variant="destructive" role="alert" className={cn(className)}>
      <AlertTitle>{failure.title}</AlertTitle>
      {failure.hint && <AlertDescription>{failure.hint}</AlertDescription>}
    </Alert>
  )
}
