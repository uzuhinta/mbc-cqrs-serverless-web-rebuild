'use client'

import type { ReactNode } from 'react'

import type { MasterDataListItem } from '../core/list'
import type { MasterField, MasterSetting } from '../core/types'
import type { DataTableColumn } from '../table/data-table'
import { DataCell } from './data-cell'

const own = (record: Record<string, unknown> | undefined, key: string) =>
  record && Object.hasOwn(record, key) ? record[key] : undefined

/**
 * v0's data columns: the fields shown on the list, code and name first when
 * the setting lacks them. `code` renders a row's code (the data list links
 * it to the record; the copy form shows it as text).
 */
export function dataColumns(
  setting: MasterSetting,
  t: { code: string; name: string },
  code: (row: MasterDataListItem) => ReactNode
): DataTableColumn<MasterDataListItem>[] {
  const fields = setting.attributes.fields
  const shown = fields.filter((field) => field.isShowedOnList)
  const codeColumn = (header: string): DataTableColumn<MasterDataListItem> => ({
    id: 'code',
    header,
    sortable: true,
    width: '25%',
    cell: code,
  })
  const column = (field: MasterField): DataTableColumn<MasterDataListItem> => {
    const name = field.physicalName
    if (name === 'code') return codeColumn(field.name)
    if (name === 'name')
      return {
        id: 'name',
        header: field.name,
        sortable: true,
        cell: (row) => row.name,
      }
    if (name === 'seq')
      return {
        id: 'seq',
        header: field.name,
        sortable: true,
        cell: (row) => row.seq ?? '',
      }
    return {
      id: `attr-${name}`,
      header: field.name,
      cell: (row) => (
        <DataCell field={field} value={own(row.attributes, name)} />
      ),
    }
  }
  const columns = shown.map(column)
  if (fields.some((field) => field.physicalName === 'code')) return columns
  const lead = [codeColumn(t.code)]
  if (!shown.some((field) => field.physicalName === 'name'))
    lead.push({
      id: 'name',
      header: t.name,
      sortable: true,
      width: '25%',
      cell: (row) => row.name,
    })
  return [...lead, ...columns]
}
