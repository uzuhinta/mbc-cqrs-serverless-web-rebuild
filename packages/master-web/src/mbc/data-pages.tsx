'use client'

import { useMessages } from '@mbc-cqrs-serverless/ui-web'

import type { BulkMapper } from '../core/bulk'
import { initialDataListState, type MasterDataListState } from '../core/list'
import { MasterDataEditor } from '../data/master-data-editor'
import { MasterDataList } from '../data/master-data-list'
import { masterDataMessages } from '../i18n/master-data-messages'
import type { JsonTextEditor } from '../json/json-text'
import type { FieldRenderers } from '../renderers/registry'
import { settingCodeOfId } from './api'
import {
  useMasterApi,
  useMasterData,
  useMasterDataList,
  useMasterMutations,
  useMasterSetting,
} from './hooks'
import {
  dataIdOf,
  PageState,
  reported,
  useListState,
  useReport,
  useTenantCode,
  type MbcPageProps,
} from './page-parts'

export type MbcMasterDataListPageProps = MbcPageProps & {
  /** The setting whose records are listed. */
  settingId: string
  /** The list's filters, sort and page; the page keeps its own without it. */
  state?: MasterDataListState
  onStateChange?(state: MasterDataListState): void
  inputSampleJson?: string
  mapRawItem?: BulkMapper
  /** The import dialog's JSON editor instead of a text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
}

/**
 * v0's data list of one setting on the mbc backend, with bulk import.
 * Another setting starts a fresh list (its own search), also when a router
 * re-uses the page.
 */
export function MbcMasterDataListPage(props: MbcMasterDataListPageProps) {
  return <DataList key={props.settingId} {...props} />
}

function DataList({
  routing,
  onError,
  paths,
  settingId,
  state,
  onStateChange,
  inputSampleJson,
  mapRawItem,
  jsonEditor,
}: MbcMasterDataListPageProps) {
  const t = useMessages(masterDataMessages).list
  const [current, change] = useListState(
    state,
    onStateChange,
    initialDataListState
  )
  const setting = useMasterSetting(settingId, { paths })
  const list = useMasterDataList(settingId, current, { paths })
  const { importItems } = useMasterMutations({ paths })
  const tenantCode = useTenantCode()
  useReport(setting.error, onError)
  useReport(list.error, onError)
  if (!setting.data)
    return (
      <PageState
        error={setting.error}
        loadFailed={t.loadFailed}
        retry={t.retry}
        onRetry={setting.refetch}
      />
    )
  return (
    <MasterDataList
      setting={setting.data}
      items={list.data?.items ?? []}
      total={list.data?.total ?? 0}
      state={current}
      onStateChange={change}
      routing={routing}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      onImport={(items, onProgress) =>
        reported(importItems.runOrThrow(items, onProgress), onError)
      }
      onImported={list.refetch}
      tenantCode={tenantCode}
      inputSampleJson={inputSampleJson}
      mapRawItem={mapRawItem}
      jsonEditor={jsonEditor}
    />
  )
}

export type MbcMasterDataEditorPageProps = MbcPageProps & {
  /** The record's setting. */
  settingId: string
  /** The record to open; without it the page creates one. */
  id?: string
  /** After a save, with the record's id. A create then opens the record (v0). */
  onSaved?(id: string): void
  /** After a delete; the record stays open, deleted, with Restore (v0). */
  onDeleted?(): void
  /** Renderers that replace the built-ins, by field type (e.g. `/editors`). */
  components?: FieldRenderers
  /** The JSON dialog's editor instead of a text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
}

/**
 * v0's data editor on the mbc backend, numbering auto-numbered codes from
 * the sequence API. Another setting or record starts a fresh editor, and a
 * write still running for the last one is cut short (it does not move the
 * user).
 */
export function MbcMasterDataEditorPage(props: MbcMasterDataEditorPageProps) {
  return (
    <DataEditor key={`${props.settingId}\u0000${props.id ?? ''}`} {...props} />
  )
}

function DataEditor({
  routing,
  onError,
  paths,
  settingId,
  id,
  onSaved,
  onDeleted,
  components,
  jsonEditor,
}: MbcMasterDataEditorPageProps) {
  const api = useMasterApi({ paths })
  const tenantCode = useTenantCode()
  const setting = useMasterSetting(settingId, { paths })
  const data = useMasterData(id, { paths })
  const { createData, updateData, deleteData, restoreData } =
    useMasterMutations({ paths })
  useReport(setting.error, onError)
  useReport(data.error, onError)
  const settingCode = settingCodeOfId(settingId)
  return (
    <MasterDataEditor
      mode={id ? 'edit' : 'create'}
      setting={setting.data}
      data={data.data}
      routing={routing}
      tenantCode={tenantCode}
      loading={setting.loading || data.loading}
      error={setting.error ?? data.error}
      onRetry={() => {
        setting.refetch()
        data.refetch()
      }}
      checkCodeUnique={async (code) =>
        !(await reported(api.data.codeExists(settingCode, code), onError))
      }
      generateCode={(field, loaded) =>
        reported(api.sequence.generateCode(field, loaded), onError)
      }
      onSave={async (body) => {
        // A create's body carries the setting and the record's codes.
        if ('settingCode' in body) {
          await reported(createData.runOrThrow(body), onError)
          const created = dataIdOf(tenantCode, body.settingCode, body.code)
          onSaved?.(created)
          routing.navigate({ screen: 'dataItem', settingId, id: created })
          return
        }
        if (!id) return
        await reported(updateData.runOrThrow(id, body), onError)
        onSaved?.(id)
      }}
      onDelete={
        id
          ? async () => {
              await reported(deleteData.runOrThrow(id), onError)
              onDeleted?.()
            }
          : undefined
      }
      onRestore={
        id
          ? async () => {
              await reported(restoreData.runOrThrow(id), onError)
            }
          : undefined
      }
      components={components}
      jsonEditor={jsonEditor}
    />
  )
}
