/** What a copy contains, in the order v0 offers it. */
export const COPY_TYPES = ['BOTH', 'SETTING_ONLY', 'DATA_ONLY'] as const
export type CopyType = (typeof COPY_TYPES)[number]

/** `POST /api/master-setting/copy` body (the backend's MasterCopyDto). */
export type MasterCopyRequest = {
  masterSettingId: string
  targetTenants: string[]
  copyType: CopyType
  dataCopyOption?: { mode: 'ALL' | 'PARTIAL'; id?: string[] }
}

/**
 * v0's request: "all tenants" sends every tenant code; data-only copies the
 * chosen records, or all of them when none is chosen.
 */
export function buildCopyRequest({
  masterSettingId,
  copyType,
  targets,
  allTenants,
  dataIds = [],
}: {
  masterSettingId: string
  copyType: CopyType
  targets: 'all' | readonly string[]
  allTenants: readonly string[]
  dataIds?: readonly string[]
}): MasterCopyRequest {
  return {
    masterSettingId,
    targetTenants: [...(targets === 'all' ? allTenants : targets)],
    copyType,
    ...(copyType === 'DATA_ONLY' && {
      dataCopyOption:
        dataIds.length > 0
          ? { mode: 'PARTIAL' as const, id: [...dataIds] }
          : { mode: 'ALL' as const },
    }),
  }
}

/** A tenant a setting can be copied to (v0 read them from a host endpoint). */
export type MasterTenant = { code: string; name: string }

/** The task statuses v0 labels (the task package's `TaskStatusEnum`). */
export const COPY_TASK_STATUSES = [
  'CREATED',
  'QUEUED',
  'PROCESSING',
  'STARTED',
  'FINISHED',
  'COMPLETED',
  'ERRORED',
  'FAILED',
] as const
export type CopyTaskStatus = (typeof COPY_TASK_STATUSES)[number]

export function isCopyTaskStatus(value: unknown): value is CopyTaskStatus {
  return (COPY_TASK_STATUSES as readonly unknown[]).includes(value)
}

/**
 * A copy task: a row of `GET /api/tasks/sfn-task-parent` (one per copy
 * request) or of `GET /api/tasks/:id` (one per destination tenant). The
 * fields the copy screens read; the backend's others pass through.
 */
export type CopyTask = {
  id: string
  pk: string
  sk: string
  status?: string
  createdAt?: string
  updatedAt?: string
  /** A tenant's task: the copy request for that one tenant. */
  input?: unknown
  attributes?: {
    subTaskCount?: number
    subTaskRunningCount?: number
    subTaskSucceedCount?: number
    subTaskFailedCount?: number
    /** A failed task's error (the backend stores the stack). */
    error?: unknown
    [key: string]: unknown
  }
  [key: string]: unknown
}

const TASK_PREFIX = 'MASTER_COPY_'

/** v0's task name: the sort key without `MASTER_COPY_` (the setting code, then the task's own key). */
export function copyTaskName(task: Pick<CopyTask, 'sk'>): string {
  return task.sk.startsWith(TASK_PREFIX)
    ? task.sk.slice(TASK_PREFIX.length)
    : task.sk
}

/** The tenant a tenant's task copies to: its input's first target. */
export function copyTaskTenant(task: Pick<CopyTask, 'input'>): string {
  const input = task.input as { targetTenants?: unknown } | null | undefined
  const targets = input?.targetTenants
  const first = Array.isArray(targets) ? (targets as unknown[])[0] : undefined
  return typeof first === 'string' ? first : ''
}

/** The first line of a task's error (v0), or `undefined` when it has none. */
export function copyTaskError(
  task: Pick<CopyTask, 'attributes'>
): string | undefined {
  const error = task.attributes?.error
  if (error === undefined || error === null || error === '') return undefined
  const text = typeof error === 'string' ? error : JSON.stringify(error)
  return text.split('\n')[0]
}

/** v0 shows an end time only for a completed task. */
export function isCopyTaskDone(task: Pick<CopyTask, 'status'>): boolean {
  return task.status === 'COMPLETED'
}
