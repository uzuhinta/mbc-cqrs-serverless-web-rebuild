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
