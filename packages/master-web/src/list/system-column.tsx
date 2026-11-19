'use client'

import { systemLabel, type MasterAccess } from '../core/access'
import type { DataTableColumn } from '../table/data-table'

/** The system column of the list screens; its cell is the system's label. */
export function systemColumn<T extends { systemId?: string }>(
  access: MasterAccess,
  header: string
): DataTableColumn<T> {
  return {
    id: 'systemId',
    header,
    width: '15%',
    cell: (row) => (
      <div className="mbc:px-4">
        {systemLabel(access.systems, row.systemId)}
      </div>
    ),
  }
}
