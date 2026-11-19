import { describe, expect, it } from 'vitest'

import {
  masterAccess,
  OPEN_ACCESS,
  SHARED_SYSTEM_ID,
  systemLabel,
  type MasterAccessGrant,
} from './access'

const systems = [
  { id: 'app-a', label: 'App A' },
  { id: 'app-b', label: 'App B' },
  { id: SHARED_SYSTEM_ID, label: '共通' },
]
const grant = (
  systemId: string,
  settingCode: string,
  read: boolean,
  write: boolean
): MasterAccessGrant => ({ systemId, settingCode, read, write })

describe('masterAccess', () => {
  it('allows everything when not enabled', () => {
    const access = masterAccess({ enabled: false, grants: [] }, systems)
    expect(access.enabled).toBe(false)
    expect(access.canRead('app-a', 'X')).toBe(true)
    expect(access.canWrite(undefined, 'X')).toBe(true)
    expect(access.canCopyAll).toBe(true)
    expect(access.writableSystems).toEqual(systems)
  })

  it('OPEN_ACCESS allows everything and shows no systems', () => {
    expect(OPEN_ACCESS.enabled).toBe(false)
    expect(OPEN_ACCESS.loading).toBe(false)
    expect(OPEN_ACCESS.systems).toEqual([])
    expect(OPEN_ACCESS.canWrite('app-a', 'X')).toBe(true)
  })

  it('denies everything with no grants', () => {
    const access = masterAccess({ enabled: true, grants: [] }, systems)
    expect(access.canRead('app-a', 'X')).toBe(false)
    expect(access.canWrite('app-a', 'X')).toBe(false)
    expect(access.writableSystems).toEqual([])
    expect(access.canCopyAll).toBe(false)
  })

  it('matches * for the system and for the setting code', () => {
    const access = masterAccess(
      {
        enabled: true,
        grants: [
          grant('*', 'ROUTE', false, true),
          grant('app-b', '*', true, false),
        ],
      },
      systems
    )
    expect(access.canWrite('app-a', 'ROUTE')).toBe(true)
    expect(access.canWrite('app-a', 'OTHER')).toBe(false)
    expect(access.canRead('app-b', 'OTHER')).toBe(true)
    expect(access.canWrite('app-b', 'OTHER')).toBe(false)
  })

  it('counts a missing, null or empty systemId as shared', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('shared', '*', false, true)] },
      systems
    )
    expect(access.canWrite(undefined, 'X')).toBe(true)
    expect(access.canWrite(null, 'X')).toBe(true)
    expect(access.canWrite('', 'X')).toBe(true)
    expect(access.canWrite('app-a', 'X')).toBe(false)
  })

  it('lets write imply read', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('app-a', '*', false, true)] },
      systems
    )
    expect(access.canRead('app-a', 'X')).toBe(true)
  })

  it('compares systems in lower case and setting codes exactly, as the backend does', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('App-A', 'ROUTE', true, true)] },
      systems
    )
    expect(access.canWrite('app-a', 'ROUTE')).toBe(true)
    expect(access.canWrite('APP-A', 'ROUTE')).toBe(true)
    expect(access.canWrite('app-a', 'route')).toBe(false)
    expect(access.writableSystems.map((s) => s.id)).toEqual(['app-a'])
  })

  it('lists a system with a write grant for any setting code as writable', () => {
    const access = masterAccess(
      {
        enabled: true,
        grants: [
          grant('app-a', 'ONE', false, true),
          grant('app-b', '*', true, false),
        ],
      },
      systems
    )
    expect(access.writableSystems.map((s) => s.id)).toEqual(['app-a'])
  })

  it('lists every system for a * write grant', () => {
    const access = masterAccess(
      { enabled: true, grants: [grant('*', 'X', false, true)] },
      systems
    )
    expect(access.writableSystems).toEqual(systems)
  })

  it('allows copy only with a */* write grant', () => {
    const only = (grants: MasterAccessGrant[]) =>
      masterAccess({ enabled: true, grants }, systems).canCopyAll
    expect(only([grant('*', '*', false, true)])).toBe(true)
    expect(only([grant('*', '*', true, false)])).toBe(false)
    expect(only([grant('app-a', '*', false, true)])).toBe(false)
    expect(only([grant('*', 'X', false, true)])).toBe(false)
  })
})

describe('systemLabel', () => {
  it('reads the label in lower case', () => {
    expect(systemLabel(systems, 'APP-A')).toBe('App A')
  })
  it('falls back to the id', () => {
    expect(systemLabel(systems, 'app-z')).toBe('app-z')
  })
  it('reads no owner as shared', () => {
    expect(systemLabel(systems, undefined)).toBe('共通')
    expect(systemLabel(systems, null)).toBe('共通')
    expect(systemLabel([], undefined)).toBe('shared')
  })
})
