export {
  createMasterApi,
  DEFAULT_MASTER_API_PATHS,
  settingCodeOfId,
  type MasterApi,
  type MasterApiOptions,
  type MasterApiPaths,
  type MasterListPage,
  type ReadOptions,
  SEQUENCE_SETTING_CODE,
  type WriteOptions,
} from './api'
export {
  BULK_BATCH_SIZE,
  MasterBulkError,
  type BulkImportOptions,
} from './bulk'
export {
  MbcMasterCopyRequestPage,
  MbcMasterCopyTaskDetailPage,
  MbcMasterCopyTaskListPage,
  type MbcMasterCopyRequestPageProps,
  type MbcMasterCopyTaskDetailPageProps,
  type MbcMasterCopyTaskListPageProps,
} from './copy-pages'
export {
  MbcMasterDataEditorPage,
  MbcMasterDataListPage,
  type MbcMasterDataEditorPageProps,
  type MbcMasterDataListPageProps,
} from './data-pages'
export {
  useCopyTask,
  useCopyTasks,
  useMasterApi,
  useMasterData,
  useMasterDataList,
  useMasterMutations,
  useMasterSetting,
  useMasterSettings,
  type CopyTaskQueryOptions,
  type QueryState,
} from './hooks'
export type { MbcPageProps } from './page-parts'
export {
  MbcMasterSettingEditorPage,
  MbcMasterSettingListPage,
  type MbcMasterSettingEditorPageProps,
  type MbcMasterSettingListPageProps,
} from './setting-pages'

// What hosts need from client-web to use /mbc, re-exported so a host that
// installs only master-web gets the same copy (one MbcClientProvider context).
export {
  createMbcClient,
  MbcAbortError,
  MbcApiError,
  MbcAuthError,
  MbcCommandError,
  MbcError,
  MbcRealtimeError,
  MbcTimeoutError,
  type MbcClient,
  type MbcClientConfig,
} from '@mbc-cqrs-serverless/client-web'
export {
  MbcClientProvider,
  useCommand,
  useMbcClient,
  type CommandStatus,
} from '@mbc-cqrs-serverless/client-web/react'
