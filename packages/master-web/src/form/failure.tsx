'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@mbc-cqrs-serverless/ui-web'
import { isUnknownOutcome } from './outcome'

/** Why a save, delete or restore did not go through. */
export type Failure = { title: string; hint?: string }

/**
 * The editors' failure text. A timeout or a dropped connection
 * (`isUnknownOutcome`) means the outcome is unknown, so it gets its own text
 * instead of the hint.
 */
export function failureOf(
  reason: unknown,
  title: string,
  t: { failedHint: string; timeout: string }
): Failure {
  if (isUnknownOutcome(reason)) return { title: t.timeout }
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
