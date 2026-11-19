import {
  MbcApiError,
  type CommandOptions,
  type CommandRequest,
  type MbcClient,
} from '@mbc-cqrs-serverless/client-web'

import type { MasterAccessAnswer, MasterAccessGrant } from '../core/access'
import type { BulkJsonItem } from '../core/bulk'
import {
  copyTaskName,
  type CopyTask,
  type MasterCopyRequest,
} from '../core/copy'
import type {
  ListSort,
  MasterDataListItem,
  MasterDataListState,
  MasterSettingListItem,
  MasterSettingListState,
} from '../core/list'
import {
  parseMasterData,
  parseMasterSetting,
  publicRow,
  type ParseResult,
} from '../core/parse'
import {
  settingCodeOf,
  type MasterDataCreateBody,
  type MasterDataUpdateBody,
} from '../core/payload'
import type {
  MasterSettingCreateBody,
  MasterSettingUpdateBody,
} from '../core/setting-form'
import type { MasterData, MasterField, MasterSetting } from '../core/types'
import { importBulk } from './bulk'

/** Where each group of requests goes; a host whose backend wraps one points at its own path. */
export type MasterApiPaths = {
  /** `…/list`, `…/detail/:id`, `…/check-exist/:code`; create, update and delete. */
  setting: string
  /** `…/list`, `…/detail/:id`, `…/create`, `…/check-exist/:settingCode/:code`; update, delete, restore. */
  data: string
  bulk: string
  copy: string
  /** `…/sfn-task-parent` and `…/:id`. */
  tasks: string
  /** A code without a format. The sequence package mounts nowhere by itself: v0's host path. */
  sequence: string
  /** A code with a format. The package names this route `provided-setting`: v0's host path. */
  sequenceWithSetting: string
  /** The caller's grants (backend v1.7+). */
  access: string
}

export const DEFAULT_MASTER_API_PATHS: MasterApiPaths = {
  setting: '/api/master-setting',
  data: '/api/master-data',
  bulk: '/api/master-bulk',
  copy: '/api/master-setting/copy',
  tasks: '/api/tasks',
  sequence: '/api/sequence',
  sequenceWithSetting: '/api/sequence/with-provided-setting',
  access: '/api/master-access',
}

export type MasterApiOptions = { paths?: Partial<MasterApiPaths> }

export type ReadOptions = { signal?: AbortSignal }
/** A list read; `includeCommon` adds the common tenant's rows (backend v1.7+). */
export type ListOptions = ReadOptions & { includeCommon?: boolean }
export type WriteOptions = Pick<
  CommandOptions,
  'signal' | 'onPhase' | 'timeoutMs'
>

/** One page of a list, and how many items match in all. */
export type MasterListPage<T> = { items: T[]; total: number }

export type MasterApi = {
  settings: {
    list(
      state: MasterSettingListState,
      options?: ListOptions
    ): Promise<MasterListPage<MasterSettingListItem>>
    get(id: string, options?: ReadOptions): Promise<MasterSetting>
    /**
     * Resolves with the new setting's id as the backend wrote it (from its
     * answer's keys), or `undefined` when the answer has none.
     */
    create(
      body: MasterSettingCreateBody,
      options?: WriteOptions
    ): Promise<string | undefined>
    update(
      id: string,
      body: MasterSettingUpdateBody,
      options?: WriteOptions
    ): Promise<void>
    delete(id: string, options?: WriteOptions): Promise<void>
    /** Whether the current tenant already has a setting with this code. */
    codeExists(code: string, options?: ReadOptions): Promise<boolean>
  }
  data: {
    list(
      settingCode: string,
      state: MasterDataListState,
      options?: ListOptions
    ): Promise<MasterListPage<MasterDataListItem>>
    get(id: string, options?: ReadOptions): Promise<MasterData>
    /**
     * Resolves with the new record's id as the backend wrote it (from its
     * answer's keys), or `undefined` when the answer has none.
     */
    create(
      body: MasterDataCreateBody,
      options?: WriteOptions
    ): Promise<string | undefined>
    update(
      id: string,
      body: MasterDataUpdateBody,
      options?: WriteOptions
    ): Promise<void>
    /** A soft delete. */
    delete(id: string, options?: WriteOptions): Promise<void>
    restore(id: string, options?: WriteOptions): Promise<void>
    /** Whether the current tenant already has a record with this code. */
    codeExists(
      settingCode: string,
      code: string,
      options?: ReadOptions
    ): Promise<boolean>
  }
  bulk: {
    /** Batches of 100; a failure is a `MasterBulkError` naming its batch. */
    importItems(
      items: readonly BulkJsonItem[],
      onProgress?: (done: number, total: number) => void,
      options?: WriteOptions
    ): Promise<void>
  }
  sequence: {
    /** The next code of an auto-numbered field (v0's two requests). */
    generateCode(
      field: MasterField,
      setting: MasterSetting,
      options?: ReadOptions
    ): Promise<string>
  }
  access: {
    /**
     * The caller's grants. A backend without the route (404) or an answer
     * that is not one reads as `{ enabled: false, grants: [] }`; other
     * failures reject.
     */
    get(options?: ReadOptions): Promise<MasterAccessAnswer>
  }
  copy: {
    request(body: MasterCopyRequest, options?: ReadOptions): Promise<void>
    /** The setting's copy requests, newest first. */
    tasks(settingCode: string, options?: ReadOptions): Promise<CopyTask[]>
    /** One copy request's tasks, one per destination tenant. */
    task(id: string, options?: ReadOptions): Promise<CopyTask[]>
  }
}

const SETTING_MARKER = '#MASTER_SETTING#'

/** A setting's code from its id (`MASTER#<tenant>#MASTER_SETTING#<code>`). */
export function settingCodeOfId(id: string): string {
  const at = id.indexOf(SETTING_MARKER)
  return at < 0 ? id : id.slice(at + SETTING_MARKER.length)
}

const encode = encodeURIComponent

/** v0's sort parameter: the column, `-` first for descending. */
const orderBys = (sort?: ListSort) =>
  sort ? [`${sort.desc ? '-' : ''}${sort.column}`] : undefined

const filter = (value: string) => value.trim() || undefined

function pageOf<T>(answer: unknown): MasterListPage<T> {
  const { items, total } = (answer ?? {}) as {
    items?: unknown
    total?: unknown
  }
  return {
    items: Array.isArray(items) ? (items.map(publicRow) as T[]) : [],
    total: typeof total === 'number' ? total : 0,
  }
}

function parsed<T>(result: ParseResult<T>): T {
  if (!result.success) throw result.error
  return result.data
}

const ACCESS_DISABLED: MasterAccessAnswer = { enabled: false, grants: [] }

const isGrant = (value: unknown): value is MasterAccessGrant => {
  const { systemId, settingCode, read, write } = (value ?? {}) as Record<
    string,
    unknown
  >
  return (
    typeof systemId === 'string' &&
    typeof settingCode === 'string' &&
    typeof read === 'boolean' &&
    typeof write === 'boolean'
  )
}

/** `GET /api/master-access`; anything else than `{ enabled, grants }` means not enabled. */
function accessOf(answer: unknown): MasterAccessAnswer {
  const { enabled, grants } = (answer ?? {}) as Record<string, unknown>
  if (typeof enabled !== 'boolean' || !Array.isArray(grants))
    return ACCESS_DISABLED
  if (!enabled) return ACCESS_DISABLED
  return {
    enabled,
    grants: grants
      .filter(isGrant)
      .map(({ systemId, settingCode, read, write }) => ({
        systemId,
        settingCode,
        read,
        write,
      })),
  }
}

function tasksOf(answer: unknown): CopyTask[] {
  if (!Array.isArray(answer)) return []
  return answer.filter((task): task is CopyTask => {
    const { id, pk, sk } = (task ?? {}) as Partial<CopyTask>
    return (
      typeof id === 'string' && typeof pk === 'string' && typeof sk === 'string'
    )
  })
}

/** A write that changed nothing gets no request id: there is nothing to wait for. */
function isUnchanged(error: unknown): boolean {
  return (
    error instanceof MbcApiError && error.status >= 200 && error.status < 300
  )
}

/** The master v0 setting whose records are the sequences a code can use. */
export const SEQUENCE_SETTING_CODE = 'sequence_setting'

/**
 * The id of an item a create wrote, from the backend's answer: its `pk` and
 * `sk` without the version (`@1`), joined by `#` as the backend joins them.
 * Undefined when the answer has no keys. Use it, not one built from the
 * client's tenant: the backend may store the tenant in another case.
 */
function createdIdOf(answer: unknown): string | undefined {
  const { pk, sk } = (answer ?? {}) as { pk?: unknown; sk?: unknown }
  if (typeof pk !== 'string' || typeof sk !== 'string') return undefined
  const version = sk.lastIndexOf('@')
  return `${pk}#${version === -1 ? sk : sk.slice(0, version)}`
}

export function createMasterApi(
  client: MbcClient,
  options: MasterApiOptions = {}
): MasterApi {
  const paths = { ...DEFAULT_MASTER_API_PATHS, ...options.paths }
  /** Sends a write; resolves with the backend's answer (none when nothing changed). */
  const send = async (request: CommandRequest, settings?: WriteOptions) => {
    try {
      return (await client.command<unknown>(request, settings)).data
    } catch (error) {
      if (!isUnchanged(error)) throw error
    }
  }
  const write = async (request: CommandRequest, settings?: WriteOptions) => {
    await send(request, settings)
  }
  const exists = async (path: string, signal?: AbortSignal) =>
    (await client.post<unknown>(path, undefined, { signal })) === true

  return {
    settings: {
      async list(state, { signal, includeCommon } = {}) {
        return pageOf(
          await client.get<unknown>(`${paths.setting}/list`, {
            query: {
              code: filter(state.code),
              name: filter(state.name),
              keyword: filter(state.keyword),
              systemId: filter(state.systemId ?? ''),
              includeCommon: includeCommon || undefined,
              page: state.page,
              pageSize: state.pageSize,
              orderBys: orderBys(state.sort),
            },
            signal,
          })
        )
      },
      async get(id, { signal } = {}) {
        return parsed(
          parseMasterSetting(
            await client.get<unknown>(`${paths.setting}/detail/${encode(id)}`, {
              signal,
            })
          )
        )
      },
      create: async (body, settings) =>
        createdIdOf(
          await send({ method: 'POST', path: paths.setting, body }, settings)
        ),
      update: (id, body, settings) =>
        write(
          { method: 'PUT', path: `${paths.setting}/${encode(id)}`, body },
          settings
        ),
      delete: (id, settings) =>
        write(
          { method: 'DELETE', path: `${paths.setting}/${encode(id)}` },
          settings
        ),
      codeExists: (code, { signal } = {}) =>
        exists(`${paths.setting}/check-exist/${encode(code)}`, signal),
    },
    data: {
      async list(settingCode, state, { signal, includeCommon } = {}) {
        return pageOf(
          await client.get<unknown>(`${paths.data}/list`, {
            query: {
              settingCode,
              includeCommon: includeCommon || undefined,
              code: filter(state.code),
              keyword: filter(state.keyword),
              isDeleted: state.isDeleted,
              page: state.page,
              pageSize: state.pageSize,
              orderBys: orderBys(state.sort),
            },
            signal,
          })
        )
      },
      async get(id, { signal } = {}) {
        return parsed(
          parseMasterData(
            await client.get<unknown>(`${paths.data}/detail/${encode(id)}`, {
              signal,
            })
          )
        )
      },
      create: async (body, settings) =>
        createdIdOf(
          await send(
            { method: 'POST', path: `${paths.data}/create`, body },
            settings
          )
        ),
      update: (id, body, settings) =>
        write(
          { method: 'PUT', path: `${paths.data}/${encode(id)}`, body },
          settings
        ),
      delete: (id, settings) =>
        write(
          { method: 'DELETE', path: `${paths.data}/${encode(id)}` },
          settings
        ),
      restore: (id, settings) =>
        write(
          {
            method: 'PUT',
            path: `${paths.data}/${encode(id)}`,
            body: { isDeleted: false },
          },
          settings
        ),
      codeExists: (settingCode, code, { signal } = {}) =>
        exists(
          `${paths.data}/check-exist/${encode(settingCode)}/${encode(code)}`,
          signal
        ),
    },
    bulk: {
      importItems: (items, onProgress, settings) =>
        importBulk(client, paths.bulk, items, onProgress, settings),
    },
    sequence: {
      async generateCode(field, setting, { signal } = {}) {
        const code = settingCodeOf(setting)
        const formatted = Boolean(field.formatCode)
        const answer = await client.post<{ formattedNo?: unknown } | null>(
          formatted ? paths.sequenceWithSetting : paths.sequence,
          {
            tenantCode: client.tenantCode(),
            // v0: the format's own sequence, or one sequence per setting.
            typeCode: field.formatCode || `MASTER_SETTING#${code}`,
            rotateBy: 'none',
            params: { code1: code },
            prefix: field.prefix,
            postfix: field.postfix,
            ...(formatted && { format: field.dataFormat }),
          },
          { signal }
        )
        if (typeof answer?.formattedNo !== 'string')
          throw new MbcApiError(
            200,
            answer,
            'The sequence response has no formattedNo'
          )
        return answer.formattedNo
      },
    },
    access: {
      async get({ signal } = {}) {
        try {
          return accessOf(await client.get<unknown>(paths.access, { signal }))
        } catch (error) {
          if (error instanceof MbcApiError && error.status === 404)
            return ACCESS_DISABLED
          throw error
        }
      },
    },
    copy: {
      async request(body, { signal } = {}) {
        await client.post(paths.copy, body, { signal })
      },
      async tasks(settingCode, { signal } = {}) {
        const answer = await client.get<unknown>(
          `${paths.tasks}/sfn-task-parent`,
          { query: { masterSettingCode: settingCode }, signal }
        )
        // The backend matches the code as a prefix: PRODUCT also finds PRODUCT2.
        return tasksOf(answer).filter((task) =>
          copyTaskName(task).startsWith(`${settingCode}#`)
        )
      },
      async task(id, { signal } = {}) {
        // The backend lists the tasks under the key's parent, so v0 sends a
        // child's key: the request's id plus "#0".
        return tasksOf(
          await client.get<unknown>(`${paths.tasks}/${encode(`${id}#0`)}`, {
            signal,
          })
        )
      },
    },
  }
}
