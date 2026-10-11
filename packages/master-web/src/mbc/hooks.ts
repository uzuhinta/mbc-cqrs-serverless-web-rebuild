'use client'

import { MbcAbortError } from '@mbc-cqrs-serverless/client-web'
import {
  useCommand,
  useMbcClient,
  useQuery,
  type QueryState,
} from '@mbc-cqrs-serverless/client-web/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { BulkJsonItem } from '../core/bulk'
import type { MasterCopyRequest } from '../core/copy'
import type { MasterDataListState, MasterSettingListState } from '../core/list'
import type {
  MasterDataCreateBody,
  MasterDataUpdateBody,
} from '../core/payload'
import type {
  MasterSettingCreateBody,
  MasterSettingUpdateBody,
} from '../core/setting-form'
import {
  createMasterApi,
  settingCodeOfId,
  type MasterApi,
  type MasterApiOptions,
  type MasterApiPaths,
  type WriteOptions,
} from './api'

export type { QueryState }

/** The copy result hooks reload every `pollMs` ms when it is set. */
export type CopyTaskQueryOptions = MasterApiOptions & { pollMs?: number }

/**
 * The API on the provider's client, and the scope its queries load in: the
 * current tenant (`client.tenantCode()`) and the paths. A tenant switch
 * loads again.
 */
function useMasterScope(options?: MasterApiOptions) {
  const client = useMbcClient()
  const paths = JSON.stringify(options?.paths ?? {})
  const api = useMemo(
    () =>
      createMasterApi(client, {
        paths: JSON.parse(paths) as Partial<MasterApiPaths>,
      }),
    [client, paths]
  )
  return { api, scope: `${client.tenantCode()}\u0000${paths}` }
}

/** `createMasterApi` on the provider's client, kept while the client and paths stay. */
export function useMasterApi(options?: MasterApiOptions): MasterApi {
  return useMasterScope(options).api
}

export function useMasterSettings(
  state: MasterSettingListState,
  options?: MasterApiOptions
) {
  const { api, scope } = useMasterScope(options)
  return useQuery(`${scope}\u0000${JSON.stringify(state)}`, (signal) =>
    api.settings.list(state, { signal })
  )
}

export function useMasterSetting(
  id: string | undefined,
  options?: MasterApiOptions
) {
  const { api, scope } = useMasterScope(options)
  return useQuery(
    `${scope}\u0000${id ?? ''}`,
    id ? (signal) => api.settings.get(id, { signal }) : null
  )
}

/** A setting's data; the setting's code is read from its id. */
export function useMasterDataList(
  settingId: string | undefined,
  state: MasterDataListState,
  options?: MasterApiOptions
) {
  const { api, scope } = useMasterScope(options)
  return useQuery(
    `${scope}\u0000${settingId ?? ''}\u0000${JSON.stringify(state)}`,
    settingId
      ? (signal) => api.data.list(settingCodeOfId(settingId), state, { signal })
      : null
  )
}

export function useMasterData(
  id: string | undefined,
  options?: MasterApiOptions
) {
  const { api, scope } = useMasterScope(options)
  return useQuery(
    `${scope}\u0000${id ?? ''}`,
    id ? (signal) => api.data.get(id, { signal }) : null
  )
}

/**
 * A query that loads again `pollMs` ms after each answer, and keeps showing
 * its last data while a reload runs, so rows stay on screen. Waiting for the
 * answer means a slow backend is never cut off by the next poll.
 */
function usePolled<T>(
  key: string,
  load: ((signal: AbortSignal) => Promise<T>) | null,
  pollMs: number | undefined
): QueryState<T> {
  const query = useQuery(key, load)
  const { refetch, loading } = query
  const active = load !== null
  useEffect(() => {
    if (!active || !pollMs || loading) return
    const timer = setTimeout(refetch, pollMs)
    return () => clearTimeout(timer)
  }, [active, pollMs, loading, refetch])
  const [kept, setKept] = useState<{ key: string; data: T }>()
  if (
    query.data !== undefined &&
    (kept?.key !== key || kept.data !== query.data)
  )
    setKept({ key, data: query.data })
  const data = query.data ?? (kept?.key === key ? kept.data : undefined)
  return { ...query, data }
}

export function useCopyTasks(
  settingCode: string | undefined,
  options?: CopyTaskQueryOptions
) {
  const { api, scope } = useMasterScope(options)
  return usePolled(
    `${scope}\u0000${settingCode ?? ''}`,
    settingCode ? (signal) => api.copy.tasks(settingCode, { signal }) : null,
    options?.pollMs
  )
}

export function useCopyTask(
  id: string | undefined,
  options?: CopyTaskQueryOptions
) {
  const { api, scope } = useMasterScope(options)
  return usePolled(
    `${scope}\u0000${id ?? ''}`,
    id ? (signal) => api.copy.task(id, { signal }) : null,
    options?.pollMs
  )
}

type Outcome<R> = { value?: R; error?: unknown }

/**
 * One write as a client-web command. `run` resolves `true`, or `undefined`
 * when it failed or was cancelled (the error is in `error`); `runOrThrow`
 * resolves with the write's result (a create's new id) and rejects with the
 * write's own error, so a screen can tell a timeout from a refusal.
 */
function useWrite<A extends unknown[], R = void>(
  paths: Partial<MasterApiPaths> | undefined,
  write: (api: MasterApi, options: WriteOptions, ...args: A) => Promise<R>
) {
  const command = useCommand(
    async ({ client, signal, onPhase }, outcome: Outcome<R>, ...args: A) => {
      try {
        outcome.value = await write(
          createMasterApi(client, { paths }),
          { signal, onPhase },
          ...args
        )
      } catch (error) {
        outcome.error = error
        throw error
      }
      return true as const
    }
  )
  const { run: start } = command
  const run = useCallback((...args: A) => start({}, ...args), [start])
  const runOrThrow = useCallback(
    async (...args: A): Promise<R> => {
      const outcome: Outcome<R> = {}
      if (await start(outcome, ...args)) return outcome.value as R
      throw outcome.error ?? new MbcAbortError()
    },
    [start]
  )
  return { ...command, run, runOrThrow }
}

/**
 * Every write, as client-web commands: each has `run(...)`, `runOrThrow(...)`,
 * `status` (`sending`, `waiting`, `done`, `error`) and `error`.
 */
export function useMasterMutations(options?: MasterApiOptions) {
  const paths = options?.paths
  return {
    createSetting: useWrite(paths, (api, o, body: MasterSettingCreateBody) =>
      api.settings.create(body, o)
    ),
    updateSetting: useWrite(
      paths,
      (api, o, id: string, body: MasterSettingUpdateBody) =>
        api.settings.update(id, body, o)
    ),
    deleteSetting: useWrite(paths, (api, o, id: string) =>
      api.settings.delete(id, o)
    ),
    createData: useWrite(paths, (api, o, body: MasterDataCreateBody) =>
      api.data.create(body, o)
    ),
    updateData: useWrite(
      paths,
      (api, o, id: string, body: MasterDataUpdateBody) =>
        api.data.update(id, body, o)
    ),
    deleteData: useWrite(paths, (api, o, id: string) => api.data.delete(id, o)),
    restoreData: useWrite(paths, (api, o, id: string) =>
      api.data.restore(id, o)
    ),
    importItems: useWrite(
      paths,
      (
        api,
        o,
        items: readonly BulkJsonItem[],
        onProgress?: (done: number, total: number) => void
      ) => api.bulk.importItems(items, onProgress, o)
    ),
    requestCopy: useWrite(paths, (api, o, body: MasterCopyRequest) =>
      api.copy.request(body, { signal: o.signal })
    ),
  }
}
