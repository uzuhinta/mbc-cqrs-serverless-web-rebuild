'use client'

import { useQuery } from '@mbc-cqrs-serverless/client-web/react'
import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import type { MasterTenant } from '../core/copy'
import { initialDataListState, type MasterDataListState } from '../core/list'
import { MasterCopyRequestForm } from '../copy/master-copy-request-form'
import { MasterCopyTaskDetail } from '../copy/master-copy-task-detail'
import { MasterCopyTaskList } from '../copy/master-copy-task-list'
import { masterCopyMessages } from '../i18n/master-copy-messages'
import { settingCodeOfId } from './api'
import {
  useCopyTask,
  useCopyTasks,
  useMasterDataList,
  useMasterMutations,
  useMasterSetting,
} from './hooks'
import {
  PageState,
  reported,
  useListState,
  useReport,
  useTenantCode,
  type MbcPageProps,
} from './page-parts'

export type MbcMasterCopyRequestPageProps = MbcPageProps & {
  /** The setting to copy. */
  settingId: string
  /** The tenants it can be copied to (v0 read a host endpoint). */
  loadTenants(): Promise<MasterTenant[]>
  /** After a copy is requested. The page then goes to the setting's copy results. */
  onRequested?(): void
  /** The data search's state; the page keeps its own without it. */
  state?: MasterDataListState
  onStateChange?(state: MasterDataListState): void
}

/**
 * v0's copy request on the mbc backend. A new setting starts a fresh form;
 * a request goes on to the setting's copy results.
 */
export function MbcMasterCopyRequestPage(props: MbcMasterCopyRequestPageProps) {
  return <CopyRequest key={props.settingId} {...props} />
}

function CopyRequest({
  routing,
  onError,
  paths,
  settingId,
  loadTenants,
  onRequested,
  state,
  onStateChange,
}: MbcMasterCopyRequestPageProps) {
  const t = useMessages(masterCopyMessages).request
  const [current, change] = useListState(
    state,
    onStateChange,
    initialDataListState
  )
  const tenantCode = useTenantCode()
  const setting = useMasterSetting(settingId, { paths })
  // The form does not say when "chosen data" is picked: load the rows now.
  const list = useMasterDataList(settingId, current, { paths })
  const tenants = useQuery(tenantCode, () => loadTenants())
  const { requestCopy } = useMasterMutations({ paths })
  useReport(setting.error, onError)
  useReport(tenants.error, onError)
  useReport(list.error, onError)
  if (!setting.data || !tenants.data)
    return (
      <PageState
        error={setting.error ?? tenants.error}
        loadFailed={t.loadFailed}
        retry={t.retry}
        onRetry={() => {
          setting.refetch()
          tenants.refetch()
        }}
      />
    )
  return (
    <MasterCopyRequestForm
      setting={setting.data}
      tenants={tenants.data}
      items={list.data?.items ?? []}
      total={list.data?.total ?? 0}
      state={current}
      onStateChange={change}
      routing={routing}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      onRequestCopy={async (request) => {
        await reported(requestCopy.runOrThrow(request), onError)
        onRequested?.()
        routing.navigate({ screen: 'copyTasks', settingId })
      }}
    />
  )
}

export type MbcMasterCopyTaskListPageProps = MbcPageProps & {
  /** The setting whose copies are listed. */
  settingId: string
  /** Load again every `pollMs` ms after each answer (off without it). */
  pollMs?: number
}

/** v0's copy results of one setting on the mbc backend. */
export function MbcMasterCopyTaskListPage({
  routing,
  onError,
  paths,
  settingId,
  pollMs,
}: MbcMasterCopyTaskListPageProps) {
  const tasks = useCopyTasks(settingCodeOfId(settingId), { paths, pollMs })
  useReport(tasks.error, onError)
  return (
    <MasterCopyTaskList
      settingId={settingId}
      tasks={tasks.data ?? []}
      routing={routing}
      loading={tasks.loading}
      error={tasks.error}
      onRefresh={tasks.refetch}
    />
  )
}

export type MbcMasterCopyTaskDetailPageProps = MbcPageProps & {
  /** The setting that was copied. */
  settingId: string
  /** The copy request (a row of the copy results). */
  taskId: string
  /** Load again every `pollMs` ms after each answer (off without it). */
  pollMs?: number
}

/** v0's result of one copy request, per destination tenant, on the mbc backend. */
export function MbcMasterCopyTaskDetailPage({
  routing,
  onError,
  paths,
  settingId,
  taskId,
  pollMs,
}: MbcMasterCopyTaskDetailPageProps) {
  const tasks = useCopyTask(taskId, { paths, pollMs })
  useReport(tasks.error, onError)
  return (
    <MasterCopyTaskDetail
      settingId={settingId}
      tasks={tasks.data ?? []}
      routing={routing}
      loading={tasks.loading}
      error={tasks.error}
      onRefresh={tasks.refetch}
    />
  )
}
