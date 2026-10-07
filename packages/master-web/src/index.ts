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
