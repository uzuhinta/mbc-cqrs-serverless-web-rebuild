import { describe, expect, it } from 'vitest'

import { buildCopyRequest, COPY_TYPES } from './copy'

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
