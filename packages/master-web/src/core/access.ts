/** A system the host offers, with its display name. */
export type SystemOption = { id: string; label: string }

/** One grant of `GET /api/master-access`; `*` matches any system or setting code. */
export type MasterAccessGrant = {
  systemId: string
  settingCode: string
  read: boolean
  write: boolean
}

/** `GET /api/master-access`: `enabled: false` means the backend has no access rules. */
export type MasterAccessAnswer = {
  enabled: boolean
  grants: readonly MasterAccessGrant[]
}

/** A row's owner as the backend sends it: missing or `null` means `shared`. */
export type SystemIdValue = string | null | undefined

export type MasterAccess = {
  /** False: the backend has no access rules (or the host did not opt in); everything is allowed. */
  enabled: boolean
  /** The grants are still loading; write actions wait. */
  loading: boolean
  /** The host's systems, for labels and the filter. */
  systems: readonly SystemOption[]
  /** The systems a new setting may choose: `systems` with any write grant. */
  writableSystems: readonly SystemOption[]
  canRead(systemId: SystemIdValue, settingCode: string): boolean
  canWrite(systemId: SystemIdValue, settingCode: string): boolean
  /** A `*`/`*` write grant: what the backend's copy requires. */
  canCopyAll: boolean
}

/** The reserved system for data every system receives. */
export const SHARED_SYSTEM_ID = 'shared'

const ANY = '*'

const allow = () => true

/** No access rules: everything is allowed, nothing new is shown. */
export const OPEN_ACCESS: MasterAccess = {
  enabled: false,
  loading: false,
  systems: [],
  writableSystems: [],
  canRead: allow,
  canWrite: allow,
  canCopyAll: true,
}

/** The owner a check uses: lower case, `shared` when there is none. */
function ownerOf(systemId: SystemIdValue): string {
  return systemId ? systemId.toLowerCase() : SHARED_SYSTEM_ID
}

/** Systems compare in lower case (the backend stores them so); setting codes exactly. */
const matchesSystem = (grant: string, owner: string) =>
  grant === ANY || grant.toLowerCase() === owner
const matchesCode = (grant: string, code: string) =>
  grant === ANY || grant === code

/**
 * The access a set of grants gives, by the backend's rules: grants are a
 * union, `write` implies `read`, `*` matches anything, systems compare in
 * lower case and setting codes exactly. Not enabled allows everything.
 */
export function masterAccess(
  answer: MasterAccessAnswer,
  systems: readonly SystemOption[]
): MasterAccess {
  if (!answer.enabled)
    return { ...OPEN_ACCESS, systems, writableSystems: systems }
  const grants = answer.grants
  const can =
    (write: boolean) =>
    (systemId: SystemIdValue, settingCode: string): boolean => {
      const owner = ownerOf(systemId)
      return grants.some(
        (grant) =>
          (write ? grant.write : grant.read || grant.write) &&
          matchesSystem(grant.systemId, owner) &&
          matchesCode(grant.settingCode, settingCode)
      )
    }
  return {
    enabled: true,
    loading: false,
    systems,
    writableSystems: systems.filter((system) =>
      grants.some(
        (grant) =>
          grant.write && matchesSystem(grant.systemId, ownerOf(system.id))
      )
    ),
    canRead: can(false),
    canWrite: can(true),
    canCopyAll: grants.some(
      (grant) =>
        grant.write && grant.systemId === ANY && grant.settingCode === ANY
    ),
  }
}

/** A system's display name from `systems`, else its id; no owner reads as `shared`. */
export function systemLabel(
  systems: readonly SystemOption[],
  systemId: SystemIdValue
): string {
  const owner = ownerOf(systemId)
  return (
    systems.find((system) => system.id.toLowerCase() === owner)?.label ??
    (systemId || SHARED_SYSTEM_ID)
  )
}
