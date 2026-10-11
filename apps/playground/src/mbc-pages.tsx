import type {
  MasterRouting,
  MasterTarget,
} from '@mbc-cqrs-serverless/master-web'
import {
  editorRenderers,
  JsonEditor,
} from '@mbc-cqrs-serverless/master-web/editors'
import {
  MbcClientProvider,
  MbcMasterCopyRequestPage,
  MbcMasterCopyTaskDetailPage,
  MbcMasterCopyTaskListPage,
  MbcMasterDataEditorPage,
  MbcMasterDataListPage,
  MbcMasterSettingEditorPage,
  MbcMasterSettingListPage,
} from '@mbc-cqrs-serverless/master-web/mbc'

import { createFakeMasterBackend } from './fake-master-backend'

const backend = createFakeMasterBackend()

const TENANTS = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
  { code: 'tenant-d', name: 'テナントD' },
]

const href = (to: MasterTarget) => {
  const id = encodeURIComponent
  switch (to.screen) {
    case 'setting':
      return `#mbc/setting/${id(to.id)}`
    case 'dataItem':
      return `#mbc/dataItem/${id(to.settingId)}/${id(to.id)}`
    case 'copyTask':
      return `#mbc/copyTask/${id(to.settingId)}/${id(to.taskId)}`
    case 'data':
    case 'newData':
    case 'copyRequest':
    case 'copyTasks':
      return `#mbc/${to.screen}/${id(to.settingId)}`
    default:
      return `#mbc/${to.screen}`
  }
}

const routing: MasterRouting = {
  href,
  navigate: (to) => {
    location.hash = href(to)
  },
}

/**
 * The connected pages on a fake master backend: `#mbc` (settings list),
 * `#mbc/newSetting`, `#mbc/setting/<id>`, `#mbc/data/<setting id>`,
 * `#mbc/newData/<setting id>`, `#mbc/dataItem/<setting id>/<id>`,
 * `#mbc/copyRequest/<setting id>`, `#mbc/copyTasks/<setting id>` and
 * `#mbc/copyTask/<setting id>/<task id>`.
 */
export function MbcMasterPage({ route }: { route: string }) {
  const [, screen, first, second] = route.split('/')
  const a = first === undefined ? undefined : decodeURIComponent(first)
  const b = second === undefined ? undefined : decodeURIComponent(second)
  const common = { routing }
  return (
    <MbcClientProvider client={backend}>
      <div style={{ padding: 16 }}>
        {screen === 'newSetting' ? (
          <MbcMasterSettingEditorPage
            key="new"
            {...common}
            canCopy
            jsonEditor={JsonEditor}
          />
        ) : screen === 'setting' && a ? (
          <MbcMasterSettingEditorPage
            key={a}
            {...common}
            id={a}
            canCopy
            jsonEditor={JsonEditor}
          />
        ) : screen === 'data' && a ? (
          <MbcMasterDataListPage
            key={a}
            {...common}
            settingId={a}
            jsonEditor={JsonEditor}
          />
        ) : screen === 'newData' && a ? (
          <MbcMasterDataEditorPage
            key={`new:${a}`}
            {...common}
            settingId={a}
            components={editorRenderers}
            jsonEditor={JsonEditor}
          />
        ) : screen === 'dataItem' && a && b ? (
          <MbcMasterDataEditorPage
            key={b}
            {...common}
            settingId={a}
            id={b}
            components={editorRenderers}
            jsonEditor={JsonEditor}
          />
        ) : screen === 'copyRequest' && a ? (
          <MbcMasterCopyRequestPage
            {...common}
            settingId={a}
            loadTenants={async () => TENANTS}
          />
        ) : screen === 'copyTasks' && a ? (
          <MbcMasterCopyTaskListPage
            key={a}
            {...common}
            settingId={a}
            pollMs={3000}
          />
        ) : screen === 'copyTask' && a && b ? (
          <MbcMasterCopyTaskDetailPage
            key={b}
            {...common}
            settingId={a}
            taskId={b}
            pollMs={3000}
          />
        ) : (
          <MbcMasterSettingListPage {...common} jsonEditor={JsonEditor} />
        )}
      </div>
    </MbcClientProvider>
  )
}
