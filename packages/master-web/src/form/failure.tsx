'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@mbc-cqrs-serverless/ui-web'
import { isUnknownOutcome } from './outcome'
import { refusalOf, type RefusalTexts } from './refusal'

/** Why a save, delete or restore did not go through. */
export type Failure = { title: string; hint?: string }

/**
 * The editors' failure text. A timeout or a dropped connection
 * (`isUnknownOutcome`) means the outcome is unknown, so it gets its own text
 * instead of the hint. With access enabled (`refusal`), a refusal's reason
 * replaces the hint (`refusalOf`).
 */
export function failureOf(
  reason: unknown,
  title: string,
  t: { failedHint: string; timeout: string },
  refusal?: RefusalTexts
): Failure {
  if (isUnknownOutcome(reason)) return { title: t.timeout }
  return { title, hint: refusalOf(reason, refusal) ?? t.failedHint }
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
