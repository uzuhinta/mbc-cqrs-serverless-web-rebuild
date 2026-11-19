'use client'

import { Badge, useMessages } from '@mbc-cqrs-serverless/ui-web'

import { isSameTenant } from '../core/tenant'
import { masterMessages } from '../i18n/master-messages'

/**
 * Marks a row of another tenant (with `includeCommon`, the common tenant's)
 * next to its code. Nothing for the page's own rows, or without a tenant.
 */
export function CommonMark({
  rowTenant,
  tenantCode,
}: {
  rowTenant: string | undefined
  tenantCode: string | undefined
}) {
  const m = useMessages(masterMessages)
  if (tenantCode === undefined || rowTenant === undefined) return null
  if (isSameTenant(rowTenant, tenantCode)) return null
  return (
    <Badge variant="secondary" className="mbc:ml-2">
      {m.access.common}
    </Badge>
  )
}
