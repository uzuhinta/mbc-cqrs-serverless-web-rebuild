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

/**
 * `#mbc-scoped`: a backend with access rules. The user may write app-a's
 * masters, read the shared ones, and nothing of app-b.
 */
const scopedBackend = createFakeMasterBackend({
  grants: [
    { systemId: 'app-a', settingCode: '*', read: true, write: true },
    { systemId: 'shared', settingCode: '*', read: true, write: false },
  ],
})

const SYSTEMS = [
  { id: 'app-a', label: 'システムA' },
  { id: 'app-b', label: 'システムB' },
  { id: 'shared', label: '共通' },
]

const TENANTS = [
  { code: 'tenant-b', name: 'テナントB' },
  { code: 'tenant-c', name: 'テナントC' },
  { code: 'tenant-d', name: 'テナントD' },
]

const hrefIn = (base: string) => (to: MasterTarget) => {
  const id = encodeURIComponent
  switch (to.screen) {
    case 'setting':
      return `${base}/setting/${id(to.id)}`
    case 'dataItem':
      return `${base}/dataItem/${id(to.settingId)}/${id(to.id)}`
    case 'copyTask':
      return `${base}/copyTask/${id(to.settingId)}/${id(to.taskId)}`
    case 'data':
    case 'newData':
    case 'copyRequest':
    case 'copyTasks':
      return `${base}/${to.screen}/${id(to.settingId)}`
    default:
      return `${base}/${to.screen}`
  }
}

const routingIn = (base: string): MasterRouting => {
  const href = hrefIn(base)
  return {
    href,
    navigate: (to) => {
      location.hash = href(to)
    },
  }
}

const routing = routingIn('#mbc')
const scopedRouting = routingIn('#mbc-scoped')

/**
 * The connected pages on a fake master backend: `#mbc` (settings list),
 * `#mbc/newSetting`, `#mbc/setting/<id>`, `#mbc/data/<setting id>`,
 * `#mbc/newData/<setting id>`, `#mbc/dataItem/<setting id>/<id>`,
 * `#mbc/copyRequest/<setting id>`, `#mbc/copyTasks/<setting id>` and
 * `#mbc/copyTask/<setting id>/<task id>`. `#mbc-scoped/…` shows the same
 * pages with `systems` on a backend with access rules, and the list pages
 * with `includeCommon`.
 */
export function MbcMasterPage({ route }: { route: string }) {
  const [base, screen, first, second] = route.split('/')
  const a = first === undefined ? undefined : decodeURIComponent(first)
  const b = second === undefined ? undefined : decodeURIComponent(second)
  const scoped = base === 'mbc-scoped'
  const common = scoped
    ? { routing: scopedRouting, systems: SYSTEMS }
    : { routing }
  const lists = scoped ? { includeCommon: true } : {}
  return (
    <MbcClientProvider
      key={scoped ? 'scoped' : 'open'}
      client={scoped ? scopedBackend : backend}
    >
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
            {...lists}
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
          <MbcMasterSettingListPage
            {...common}
            {...lists}
            jsonEditor={JsonEditor}
          />
        )}
      </div>
    </MbcClientProvider>
  )
}
