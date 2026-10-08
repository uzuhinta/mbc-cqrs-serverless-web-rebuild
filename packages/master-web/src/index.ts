// One MbcContext: hosts may import the provider from here or from ui-web.
export {
  MbcProvider,
  useMessages,
  type MbcProviderProps,
} from '@mbc-cqrs-serverless/ui-web'
export * from './core'
export { masterMessages, type MasterMessages } from './i18n/master-messages'
export {
  BulkImportDialog,
  type BulkImportDialogProps,
} from './bulk/bulk-import-dialog'
export { MasterLink } from './routing/master-link'
export type { MasterRouting, MasterTarget } from './routing/routing'
export {
  MasterSettingList,
  type MasterSettingListProps,
} from './settings/master-setting-list'
export {
  MasterSettingEditor,
  type MasterSettingEditorProps,
} from './settings/master-setting-editor'
export {
  MasterDataList,
  type MasterDataListProps,
} from './data/master-data-list'
export {
  MasterDataEditor,
  type MasterDataEditorProps,
} from './data/master-data-editor'
export {
  defaultRenderers,
  type FieldRenderer,
  type FieldRendererProps,
  type FieldRenderers,
} from './renderers/registry'
export {
  masterSettingMessages,
  type MasterSettingMessages,
} from './i18n/master-setting-messages'
export {
  masterDataMessages,
  type MasterDataMessages,
} from './i18n/master-data-messages'
