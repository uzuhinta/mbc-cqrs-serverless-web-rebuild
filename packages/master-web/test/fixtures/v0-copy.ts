import type { CopyTask } from '../../src/core/copy'

/** A time on 2026-10-10 in the runtime's time zone, stored as the backend stores it. */
export const at = (hour: number, minute: number, second = 0) =>
  new Date(2026, 9, 10, hour, minute, second).toISOString()

/** `GET /api/tasks/sfn-task-parent?masterSettingCode=PRODUCT`: newest first. */
export const COPY_REQUESTS: CopyTask[] = [
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B',
    status: 'PROCESSING',
    createdAt: at(10, 30),
    updatedAt: at(10, 31),
    attributes: {
      subTaskCount: 3,
      subTaskRunningCount: 1,
      subTaskSucceedCount: 1,
      subTaskFailedCount: 1,
    },
  },
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9A',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9A',
    status: 'COMPLETED',
    createdAt: at(9, 5, 7),
    updatedAt: at(9, 6, 40),
    attributes: {
      subTaskCount: 2,
      subTaskRunningCount: 0,
      subTaskSucceedCount: 2,
      subTaskFailedCount: 0,
    },
  },
]

/** `GET /api/tasks/:id` for the first request: one task per tenant. */
export const COPY_TENANT_TASKS: CopyTask[] = [
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B#0',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B#0',
    status: 'COMPLETED',
    createdAt: at(10, 30),
    updatedAt: at(10, 30, 45),
    input: {
      masterSettingId: 'MASTER#tenant-a#MASTER_SETTING#PRODUCT',
      targetTenants: ['tenant-b'],
      copyType: 'BOTH',
    },
  },
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B#1',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B#1',
    status: 'FAILED',
    createdAt: at(10, 30),
    updatedAt: at(10, 31),
    input: { targetTenants: ['tenant-c'], copyType: 'BOTH' },
    attributes: {
      error:
        'Error: Master setting does not exist\n    at copy (handler.js:12)',
    },
  },
  {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9B#2',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9B#2',
    status: 'PROCESSING',
    createdAt: at(10, 30),
    input: { targetTenants: ['tenant-d'], copyType: 'BOTH' },
  },
]
