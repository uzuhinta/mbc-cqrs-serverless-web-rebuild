'use client'

import { useQuery } from '@mbc-cqrs-serverless/client-web/react'

import type { BulkMapper } from '../core/bulk'
import {
  initialDataListState,
  initialSettingListState,
  type MasterSettingListState,
} from '../core/list'
import type { SequenceFormat, SettingOption } from '../core/setting-form'
import type { JsonTextEditor } from '../json/json-text'
import { MasterSettingEditor } from '../settings/master-setting-editor'
import { MasterSettingList } from '../settings/master-setting-list'
import {
  useMasterApi,
  useMasterMutations,
  useMasterSetting,
  useMasterSettings,
} from './hooks'
import {
  reported,
  settingIdOf,
  useListState,
  useReport,
  useTenantCode,
  type MbcPageProps,
} from './page-parts'

/** The master v0 setting whose records are the sequences a code can use. */
export const SEQUENCE_SETTING_CODE = 'sequence_setting'

/** v0 read the first 100 sequences. */
const FORMATS_STATE = { ...initialDataListState(), pageSize: 100 }

export type MbcMasterSettingListPageProps = MbcPageProps & {
  /** The list's filters, sort and page; the page keeps its own without it. */
  state?: MasterSettingListState
  onStateChange?(state: MasterSettingListState): void
  inputSampleJson?: string
  mapRawItem?: BulkMapper
  /** The import dialog's JSON editor instead of a text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
  /** The back button; hidden without it. */
  onBack?(): void
}

/** v0's settings list on the mbc backend, with bulk import. */
export function MbcMasterSettingListPage({
  routing,
  onError,
  paths,
  state,
  onStateChange,
  inputSampleJson,
  mapRawItem,
  jsonEditor,
  onBack,
}: MbcMasterSettingListPageProps) {
  const [current, change] = useListState(
    state,
    onStateChange,
    initialSettingListState
  )
  const list = useMasterSettings(current, { paths })
  const { importItems } = useMasterMutations({ paths })
  const tenantCode = useTenantCode()
  useReport(list.error, onError)
  return (
    <MasterSettingList
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
      onBack={onBack}
    />
  )
}

export type MbcMasterSettingEditorPageProps = MbcPageProps & {
  /** The setting to open; without it the page creates one. */
  id?: string
  /** After a save, with the setting's id. The page then goes on as v0 did. */
  onSaved?(id: string): void
  /** After a delete. The page then goes to the settings list. */
  onDeleted?(): void
  /** Shows the copy links (v0 showed them to its system tenant only). */
  canCopy?: boolean
  settingOptions?: readonly SettingOption[]
  /** The sequences a code can use; read from the sequence master without it. */
  formats?: readonly SequenceFormat[]
  /** The master whose records are the sequences (v0: `sequence_setting`). */
  formatSettingCode?: string
  /** The JSON dialog's editor instead of a text box, e.g. `/editors`' JsonEditor. */
  jsonEditor?: JsonTextEditor
}

/**
 * v0's settings editor on the mbc backend. A create goes to the new
 * setting's data list, a delete to the settings list (v0). Another `id`
 * starts a fresh editor, also when a router re-uses the page.
 */
export function MbcMasterSettingEditorPage(
  props: MbcMasterSettingEditorPageProps
) {
  return <SettingEditor key={props.id ?? ''} {...props} />
}

function SettingEditor({
  routing,
  onError,
  paths,
  id,
  onSaved,
  onDeleted,
  canCopy,
  settingOptions,
  formats,
  formatSettingCode = SEQUENCE_SETTING_CODE,
  jsonEditor,
}: MbcMasterSettingEditorPageProps) {
  const api = useMasterApi({ paths })
  const tenantCode = useTenantCode()
  const setting = useMasterSetting(id, { paths })
  const { createSetting, updateSetting, deleteSetting } = useMasterMutations({
    paths,
  })
  // v0's sequences: the records of the sequence master, their key as the code.
  const sequences = useQuery(
    `${tenantCode}\u0000${formatSettingCode}`,
    formats
      ? null
      : (signal) => api.data.list(formatSettingCode, FORMATS_STATE, { signal })
  )
  useReport(setting.error, onError)
  useReport(sequences.error, onError)
  const loaded: SequenceFormat[] = (sequences.data?.items ?? []).map((row) => ({
    code: row.sk,
    name: row.name,
    format: String(row.attributes?.format ?? ''),
  }))
  return (
    <MasterSettingEditor
      mode={id ? 'edit' : 'create'}
      setting={setting.data}
      routing={routing}
      tenantCode={tenantCode}
      loading={setting.loading}
      error={setting.error}
      onRetry={setting.refetch}
      checkCodeUnique={async (code) =>
        !(await reported(api.settings.codeExists(code), onError))
      }
      onSave={async (body) => {
        if (id) {
          await reported(updateSetting.runOrThrow(id, body), onError)
          onSaved?.(id)
          return
        }
        // A create's body carries settingValue (v0).
        if (!('settingValue' in body)) return
        await reported(createSetting.runOrThrow(body), onError)
        const created = settingIdOf(tenantCode, body.code)
        onSaved?.(created)
        routing.navigate({ screen: 'data', settingId: created })
      }}
      onDelete={
        id
          ? async () => {
              await reported(deleteSetting.runOrThrow(id), onError)
              onDeleted?.()
              routing.navigate({ screen: 'settings' })
            }
          : undefined
      }
      canCopy={canCopy}
      settingOptions={settingOptions}
      formats={formats ?? loaded}
      jsonEditor={jsonEditor}
    />
  )
}
