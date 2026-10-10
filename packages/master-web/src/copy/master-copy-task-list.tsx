'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import { copyTaskName, isCopyTaskDone, type CopyTask } from '../core/copy'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { MasterLink } from '../routing/master-link'
import type { MasterRouting } from '../routing/routing'
import type { DataTableColumn } from '../table/data-table'
import { CopyStatus, CopyTaskScreen, CopyTime, ROW_LINK } from './task-screen'

export type MasterCopyTaskListProps = {
  /** The setting that was copied (the links and Back lead from it). */
  settingId: string
  /** Its copy requests, newest first (`GET /api/tasks/sfn-task-parent`). */
  tasks: readonly CopyTask[]
  routing: MasterRouting
  loading?: boolean
  /** A load failure; shown with a reload button that calls `onRefresh`. */
  error?: unknown
  /** Loads the tasks again; without it the Refresh button is hidden. */
  onRefresh?(): void
}

type Count =
  | 'subTaskCount'
  | 'subTaskRunningCount'
  | 'subTaskSucceedCount'
  | 'subTaskFailedCount'

/** v0's copy results of one setting: one row per copy request. */
export function MasterCopyTaskList({
  settingId,
  tasks,
  routing,
  loading = false,
  error,
  onRefresh,
}: MasterCopyTaskListProps) {
  const t = useMessages(masterCopyMessages)
  const count = (
    id: string,
    header: string,
    key: Count
  ): DataTableColumn<CopyTask> => ({
    id,
    header,
    cell: (task) => (
      <div className="mbc:text-center">{task.attributes?.[key]}</div>
    ),
  })
  const columns: DataTableColumn<CopyTask>[] = [
    {
      id: 'name',
      header: t.tasks.name,
      cell: (task) => (
        <MasterLink
          routing={routing}
          to={{ screen: 'copyTask', settingId, taskId: task.id }}
          className={ROW_LINK}
        >
          {copyTaskName(task)}
        </MasterLink>
      ),
    },
    {
      id: 'started',
      header: t.tasks.started,
      cell: (task) => <CopyTime value={task.createdAt} />,
    },
    {
      id: 'ended',
      header: t.tasks.ended,
      cell: (task) =>
        isCopyTaskDone(task) ? <CopyTime value={task.updatedAt} /> : t.none,
    },
    count('total', t.tasks.total, 'subTaskCount'),
    count('running', t.tasks.running, 'subTaskRunningCount'),
    count('succeeded', t.tasks.succeeded, 'subTaskSucceedCount'),
    count('failed', t.tasks.failed, 'subTaskFailedCount'),
    {
      id: 'status',
      header: t.tasks.status,
      cell: (task) => <CopyStatus status={task.status} />,
    },
  ]
  return (
    <CopyTaskScreen
      title={t.tasks.title}
      labels={t.tasks}
      columns={columns}
      tasks={tasks}
      routing={routing}
      back={{ screen: 'setting', id: settingId }}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
    />
  )
}
