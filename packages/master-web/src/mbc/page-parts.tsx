'use client'

import { useMbcClient } from '@mbc-cqrs-serverless/client-web/react'
import { Skeleton, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { useEffect, useRef, useState } from 'react'

import type { SystemOption } from '../core/access'
import { masterMessages } from '../i18n/master-messages'
import { ListError } from '../list/list-error'
import type { MasterRouting } from '../routing/routing'
import type { MasterApiPaths } from './api'

/** What every connected page takes. */
export type MbcPageProps = {
  routing: MasterRouting
  /** Every failed load or write, with client-web's error (also shown on the page). */
  onError?(error: unknown): void
  /** Where the requests go (`createMasterApi`'s `paths`). */
  paths?: Partial<MasterApiPaths>
  /**
   * The systems the screens may offer, with their names; include `shared`
   * to offer it. Passing it turns on system scoping: the page reads the
   * caller's grants (`GET /api/master-access`, backend v1.7+) and the
   * screens offer only what they allow. Without it nothing is asked.
   */
  systems?: readonly SystemOption[]
}

/** What the list pages also take. */
export type MbcListPageProps = {
  /** Adds the common tenant's rows the tenant does not have (backend v1.7+). */
  includeCommon?: boolean
}

/** The current tenant, read on every render (`client.tenantCode()`). */
export function useTenantCode(): string {
  return useMbcClient().tenantCode()
}

/**
 * Whether the client hears command results over realtime. Without it a
 * write ends once the backend has taken it, before it is stored.
 */
export function useHasRealtime(): boolean {
  return useMbcClient().messages !== undefined
}

/** Reports each new load failure to `onError`. */
export function useReport(
  error: unknown,
  onError: ((error: unknown) => void) | undefined
) {
  const latest = useRef(onError)
  useEffect(() => {
    latest.current = onError
  })
  useEffect(() => {
    if (error !== undefined && error !== null) latest.current?.(error)
  }, [error])
}

/** A write cut short by leaving the page (client-web aborts it), not a failure. */
function isAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'MbcAbortError' ||
      (error.name === 'MasterBulkError' && isAbort(error.cause)))
  )
}

/**
 * A write that reports its failure to `onError`, then rejects as before. A
 * write cut short by leaving the page is not reported: it was most likely
 * sent, and the host has moved on.
 */
export async function reported<T>(
  work: Promise<T>,
  onError: ((error: unknown) => void) | undefined
): Promise<T> {
  try {
    return await work
  } catch (error) {
    if (!isAbort(error)) onError?.(error)
    throw error
  }
}

/** A list's state: the host's when it passes one, the page's own otherwise. */
export function useListState<S>(
  state: S | undefined,
  onStateChange: ((state: S) => void) | undefined,
  initial: () => S
): [S, (state: S) => void] {
  const [own, setOwn] = useState(initial)
  const change = (next: S) => {
    if (state === undefined) setOwn(next)
    onStateChange?.(next)
  }
  return [state ?? own, change]
}

/** A page whose screen needs data that has not arrived: loading, or the failure. */
export function PageState({
  error,
  loadFailed,
  retry,
  onRetry,
}: {
  error: unknown
  loadFailed: string
  retry: string
  onRetry(): void
}) {
  const t = useMessages(masterMessages)
  return (
    <div data-mbc="" className="mbc:p-4">
      {error !== undefined && error !== null ? (
        <ListError message={loadFailed} retry={retry} onRetry={onRetry} />
      ) : (
        <div
          role="status"
          aria-label={t.table.loading}
          className="mbc:flex mbc:flex-col mbc:gap-3"
        >
          <Skeleton className="mbc:h-6 mbc:w-1/3" />
          <Skeleton className="mbc:h-4 mbc:w-full" />
          <Skeleton className="mbc:h-4 mbc:w-2/3" />
        </div>
      )}
    </div>
  )
}

/** The id the backend gives a setting: `MASTER#<tenant>#MASTER_SETTING#<code>`. */
export const settingIdOf = (tenantCode: string, code: string) =>
  `MASTER#${tenantCode}#MASTER_SETTING#${code}`

/** The id the backend gives a record: `MASTER#<tenant>#<setting code>#<code>`. */
export const dataIdOf = (
  tenantCode: string,
  settingCode: string,
  code: string
) => `MASTER#${tenantCode}#${settingCode}#${code}`
