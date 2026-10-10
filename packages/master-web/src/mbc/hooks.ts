'use client'

import type { MbcClient } from '@mbc-cqrs-serverless/client-web'
import {
  useCommand,
  useMbcClient,
  useQuery,
  type QueryState,
} from '@mbc-cqrs-serverless/client-web/react'
import { useEffect, useMemo, useState } from 'react'

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
} from './api'

export type { QueryState }

/** The copy result hooks reload every `pollMs` ms when it is set. */
export type CopyTaskQueryOptions = MasterApiOptions & { pollMs?: number }

/** `createMasterApi` on the provider's client, kept while the client and paths stay. */
export function useMasterApi(options?: MasterApiOptions): MasterApi {
  const client = useMbcClient()
  const paths = JSON.stringify(options?.paths ?? {})
  return useMemo(
    () =>
      createMasterApi(client, {
        paths: JSON.parse(paths) as Partial<MasterApiPaths>,
      }),
    [client, paths]
  )
}

export function useMasterSettings(
  state: MasterSettingListState,
  options?: MasterApiOptions
) {
  const api = useMasterApi(options)
  return useQuery(JSON.stringify(state), (signal) =>
    api.settings.list(state, { signal })
  )
}

export function useMasterSetting(
  id: string | undefined,
  options?: MasterApiOptions
) {
  const api = useMasterApi(options)
  return useQuery(
    id ?? '',
    id ? (signal) => api.settings.get(id, { signal }) : null
  )
}

/** A setting's data; the setting's code is read from its id. */
export function useMasterDataList(
  settingId: string | undefined,
  state: MasterDataListState,
  options?: MasterApiOptions
) {
  const api = useMasterApi(options)
  return useQuery(
    `${settingId ?? ''}\u0000${JSON.stringify(state)}`,
    settingId
      ? (signal) => api.data.list(settingCodeOfId(settingId), state, { signal })
      : null
  )
}

export function useMasterData(
  id: string | undefined,
  options?: MasterApiOptions
) {
  const api = useMasterApi(options)
  return useQuery(
    id ?? '',
    id ? (signal) => api.data.get(id, { signal }) : null
  )
}

/**
 * A query that reloads every `pollMs` ms, and keeps showing its last data
 * while a reload runs, so rows stay on screen.
 */
function usePolled<T>(
  key: string,
  load: ((signal: AbortSignal) => Promise<T>) | null,
  pollMs: number | undefined
): QueryState<T> {
  const query = useQuery(key, load)
  const { refetch } = query
  const active = load !== null
  useEffect(() => {
    if (!active || !pollMs) return
    const timer = setInterval(refetch, pollMs)
    return () => clearInterval(timer)
  }, [active, pollMs, refetch])
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
  const api = useMasterApi(options)
  return usePolled(
    settingCode ?? '',
    settingCode ? (signal) => api.copy.tasks(settingCode, { signal }) : null,
    options?.pollMs
  )
}

export function useCopyTask(
  id: string | undefined,
  options?: CopyTaskQueryOptions
) {
  const api = useMasterApi(options)
  return usePolled(
    id ?? '',
    id ? (signal) => api.copy.task(id, { signal }) : null,
    options?.pollMs
  )
}

/**
 * Every write, as client-web commands: each has `run(...)`, `status`
 * (`sending`, `waiting`, `done`, `error`) and `error`.
 */
export function useMasterMutations(options?: MasterApiOptions) {
  const paths = options?.paths
  const api = (client: MbcClient) => createMasterApi(client, { paths })
  const createSetting = useCommand(
    async ({ client, signal, onPhase }, body: MasterSettingCreateBody) => {
      await api(client).settings.create(body, { signal, onPhase })
      return true as const
    }
  )
  const updateSetting = useCommand(
    async (
      { client, signal, onPhase },
      id: string,
      body: MasterSettingUpdateBody
    ) => {
      await api(client).settings.update(id, body, { signal, onPhase })
      return true as const
    }
  )
  const deleteSetting = useCommand(
    async ({ client, signal, onPhase }, id: string) => {
      await api(client).settings.delete(id, { signal, onPhase })
      return true as const
    }
  )
  const createData = useCommand(
    async ({ client, signal, onPhase }, body: MasterDataCreateBody) => {
      await api(client).data.create(body, { signal, onPhase })
      return true as const
    }
  )
  const updateData = useCommand(
    async (
      { client, signal, onPhase },
      id: string,
      body: MasterDataUpdateBody
    ) => {
      await api(client).data.update(id, body, { signal, onPhase })
      return true as const
    }
  )
  const deleteData = useCommand(
    async ({ client, signal, onPhase }, id: string) => {
      await api(client).data.delete(id, { signal, onPhase })
      return true as const
    }
  )
  const restoreData = useCommand(
    async ({ client, signal, onPhase }, id: string) => {
      await api(client).data.restore(id, { signal, onPhase })
      return true as const
    }
  )
  const importItems = useCommand(
    async (
      { client, signal, onPhase },
      items: readonly BulkJsonItem[],
      onProgress?: (done: number, total: number) => void
    ) => {
      await api(client).bulk.importItems(items, onProgress, {
        signal,
        onPhase,
      })
      return true as const
    }
  )
  const requestCopy = useCommand(
    async ({ client, signal }, body: MasterCopyRequest) => {
      await api(client).copy.request(body, { signal })
      return true as const
    }
  )
  return {
    createSetting,
    updateSetting,
    deleteSetting,
    createData,
    updateData,
    deleteData,
    restoreData,
    importItems,
    requestCopy,
  }
}
