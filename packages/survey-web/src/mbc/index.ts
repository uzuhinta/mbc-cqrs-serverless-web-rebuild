export {
  createSurveyTemplateApi,
  submitSurveyAnswer,
  toTemplateSummary,
  type SurveyTemplateApi,
  type SurveyTemplateListParams,
} from './api'
export {
  useSubmitSurveyAnswer,
  useSurveyTemplate,
  useSurveyTemplateMutations,
  useSurveyTemplates,
  type QueryState,
} from './hooks'
export {
  MbcSurveyTemplateEditorPage,
  MbcSurveyTemplateListPage,
  type TemplateListState,
} from './pages'

// What hosts need from client-web to use /mbc, re-exported so a host that
// installs only survey-web gets the same copy (one MbcClientProvider context).
export {
  createMbcClient,
  MbcAbortError,
  MbcApiError,
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
