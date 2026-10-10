'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import {
  copyTaskError,
  copyTaskTenant,
  isCopyTaskDone,
  type CopyTask,
} from '../core/copy'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import type { MasterRouting } from '../routing/routing'
import type { DataTableColumn } from '../table/data-table'
import { CopyStatus, CopyTaskScreen, CopyTime } from './task-screen'

export type MasterCopyTaskDetailProps = {
  /** The setting that was copied (Back leads to its copy results). */
  settingId: string
  /** One copy request's tasks, one per destination tenant (`GET /api/tasks/:id`). */
  tasks: readonly CopyTask[]
  routing: MasterRouting
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRefresh`. */
  error?: unknown
  /** Loads the tasks again; without it the Refresh button is hidden. */
  onRefresh?(): void
}

/** v0's result of one copy request: one row per destination tenant. */
export function MasterCopyTaskDetail({
  settingId,
  tasks,
  routing,
  loading = false,
  error,
  onRefresh,
}: MasterCopyTaskDetailProps) {
  const t = useMessages(masterCopyMessages)
  const columns: DataTableColumn<CopyTask>[] = [
    {
      id: 'tenant',
      header: t.detail.tenant,
      cell: (task) => (
        <div className="mbc:text-center mbc:font-bold">
          {copyTaskTenant(task)}
        </div>
      ),
    },
    {
      id: 'status',
      header: t.detail.status,
      cell: (task) => <CopyStatus status={task.status} />,
    },
    {
      id: 'started',
      header: t.detail.started,
      cell: (task) => <CopyTime value={task.createdAt} />,
    },
    {
      id: 'ended',
      header: t.detail.ended,
      cell: (task) =>
        isCopyTaskDone(task) ? <CopyTime value={task.updatedAt} /> : t.none,
    },
    {
      id: 'message',
      header: t.detail.message,
      // v0 said "succeeded" for every task without an error, finished or not.
      cell: (task) =>
        copyTaskError(task) ??
        (isCopyTaskDone(task) ? t.detail.succeeded : t.none),
    },
    { id: 'taskId', header: t.detail.taskId, cell: (task) => task.sk },
  ]
  return (
    <CopyTaskScreen
      title={t.detail.title}
      labels={t.detail}
      columns={columns}
      tasks={tasks}
      routing={routing}
      back={{ screen: 'copyTasks', settingId }}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
    />
  )
}
