import { describe, expect, it } from 'vitest'

import {
  buildCopyRequest,
  COPY_TASK_STATUSES,
  COPY_TYPES,
  copyTaskError,
  copyTaskName,
  copyTaskTenant,
  isCopyTaskDone,
  isCopyTaskStatus,
} from './copy'

describe('buildCopyRequest', () => {
  const base = {
    masterSettingId: 'MASTER#t#MASTER_SETTING#S',
    allTenants: ['t1', 't2'],
  }

  it('lists v0’s three copy types in v0’s order', () => {
    expect(COPY_TYPES).toEqual(['BOTH', 'SETTING_ONLY', 'DATA_ONLY'])
  })

  it('sends every tenant for "all", the chosen ones otherwise', () => {
    expect(
      buildCopyRequest({ ...base, copyType: 'BOTH', targets: 'all' })
    ).toEqual({
      masterSettingId: base.masterSettingId,
      targetTenants: ['t1', 't2'],
      copyType: 'BOTH',
    })
    expect(
      buildCopyRequest({ ...base, copyType: 'SETTING_ONLY', targets: ['t2'] })
        .targetTenants
    ).toEqual(['t2'])
  })

  it('copies chosen records, or all records when none is chosen', () => {
    expect(
      buildCopyRequest({
        ...base,
        copyType: 'DATA_ONLY',
        targets: 'all',
        dataIds: ['d1'],
      }).dataCopyOption
    ).toEqual({ mode: 'PARTIAL', id: ['d1'] })
    expect(
      buildCopyRequest({ ...base, copyType: 'DATA_ONLY', targets: 'all' })
        .dataCopyOption
    ).toEqual({ mode: 'ALL' })
  })
})

describe('copy tasks', () => {
  const task = {
    id: 'SFN_TASK#tenant-a#MASTER_COPY_PRODUCT#01J9',
    pk: 'SFN_TASK#tenant-a',
    sk: 'MASTER_COPY_PRODUCT#01J9',
  }

  it('knows v0’s eight statuses', () => {
    expect(COPY_TASK_STATUSES).toHaveLength(8)
    expect(isCopyTaskStatus('COMPLETED')).toBe(true)
    expect(isCopyTaskStatus('LOST')).toBe(false)
    expect(isCopyTaskStatus(undefined)).toBe(false)
  })

  it('names a task by its key without MASTER_COPY_', () => {
    expect(copyTaskName(task)).toBe('PRODUCT#01J9')
    expect(copyTaskName({ sk: 'OTHER#1' })).toBe('OTHER#1')
  })

  it('reads the tenant a tenant’s task copies to', () => {
    expect(
      copyTaskTenant({
        input: { masterSettingId: 'x', targetTenants: ['tenant-b'] },
      })
    ).toBe('tenant-b')
    expect(copyTaskTenant({ input: [{ targetTenants: ['tenant-b'] }] })).toBe(
      ''
    )
    expect(copyTaskTenant({})).toBe('')
  })

  it('shows the first line of an error, and nothing without one', () => {
    expect(
      copyTaskError({
        attributes: { error: 'Error: setting not found\n    at copy (x.js:1)' },
      })
    ).toBe('Error: setting not found')
    expect(copyTaskError({ attributes: { error: { code: 'E1' } } })).toBe(
      '{"code":"E1"}'
    )
    expect(copyTaskError({ attributes: { error: '' } })).toBeUndefined()
    expect(copyTaskError({})).toBeUndefined()
  })

  it('counts a task as done once it is completed (v0)', () => {
    expect(isCopyTaskDone({ status: 'COMPLETED' })).toBe(true)
    expect(isCopyTaskDone({ status: 'FAILED' })).toBe(false)
    expect(isCopyTaskDone({})).toBe(false)
  })
})
