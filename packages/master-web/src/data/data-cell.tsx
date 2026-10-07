'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import { dateParts } from '../core/list'
import type { MasterField } from '../core/types'
import { masterDataMessages } from '../i18n/master-data-messages'

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

const text = (value: unknown) =>
  value === undefined || value === null
    ? null
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)

/** One list cell, formatted by the field's type as v0's data list did. */
export function DataCell({
  field,
  value,
}: {
  field: MasterField
  value: unknown
}) {
  const t = useMessages(masterDataMessages)
  switch (field.dataType) {
    case 'json': {
      // v0 showed only stored objects; a JSON string is shown the same way.
      const parsed = typeof value === 'string' ? parseJson(value) : value
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Object.keys(parsed).length === 0
      )
        return (
          <span className="mbc:text-muted-foreground mbc:italic">
            {t.list.emptyJson}
          </span>
        )
      return (
        <pre className="mbc:bg-muted mbc:max-h-24 mbc:overflow-y-auto mbc:rounded-md mbc:p-2 mbc:text-xs">
          <code>{JSON.stringify(parsed, null, 2)}</code>
        </pre>
      )
    }
    case 'boolean':
      return value === undefined || value === null ? null : (
        <>{String(value === true || value === 'true')}</>
      )
    case 'array':
      return <>{Array.isArray(value) ? JSON.stringify(value) : text(value)}</>
    case 'date': {
      const parts = dateParts(value)
      return <>{parts ? t.list.date(parts) : text(value)}</>
    }
    default:
      return <>{text(value)}</>
  }
}
